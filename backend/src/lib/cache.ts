import { getRedisClient, isRedisConnected } from './redis';

export interface CacheResult<T> {
  data: T;
  isCached: boolean;
}

export class CacheService {
  /**
   * Generates a consistent, tenant-scoped collision-safe cache key.
   * Format: cache:{tenant_id}:{resource}:{qualifier}
   */
  static buildKey(tenantId: string, resource: string, qualifier = 'all'): string {
    const cleanTenant = tenantId ? (tenantId.startsWith('t_') ? tenantId : `t_${tenantId}`) : 't_default';
    const cleanResource = resource.toLowerCase().trim();
    const cleanQualifier = qualifier.toLowerCase().trim();
    return `cache:${cleanTenant}:${cleanResource}:${cleanQualifier}`;
  }

  /**
   * Fetches data from cache or falls back to fetchFn, caching the result with TTL.
   * Fail-open: If Redis is offline or errors, seamlessly executes fetchFn without throwing.
   */
  static async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const redis = getRedisClient();

    // Check if Redis is ready and active
    if (isRedisConnected()) {
      try {
        const cachedRaw = await redis.get(key);
        if (cachedRaw !== null) {
          try {
            const parsed = JSON.parse(cachedRaw) as T;
            return parsed;
          } catch (parseErr) {
            console.warn(`⚠️ [Cache] JSON parse error for key "${key}", invalidating and refetching.`);
            await redis.del(key).catch(() => {});
          }
        }
      } catch (redisErr: any) {
        console.warn(`⚠️ [Cache] Redis read failure on key "${key}" (failing open to DB):`, redisErr.message);
      }
    }

    // Cache Miss or Redis Offline: Fetch from primary data source
    const freshData = await fetchFn();

    // Store in Redis asynchronously if connected
    if (isRedisConnected() && freshData !== undefined) {
      try {
        const serialized = JSON.stringify(freshData);
        await redis.setex(key, ttlSeconds, serialized);
      } catch (writeErr: any) {
        console.warn(`⚠️ [Cache] Redis write failure on key "${key}":`, writeErr.message);
      }
    }

    return freshData;
  }

  /**
   * Fetches data from cache or falls back to fetchFn, returning both data and hit/miss status.
   */
  static async getOrSetWithMeta<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>
  ): Promise<CacheResult<T>> {
    const redis = getRedisClient();

    if (isRedisConnected()) {
      try {
        const cachedRaw = await redis.get(key);
        if (cachedRaw !== null) {
          try {
            const parsed = JSON.parse(cachedRaw) as T;
            return { data: parsed, isCached: true };
          } catch (parseErr) {
            await redis.del(key).catch(() => {});
          }
        }
      } catch (redisErr: any) {
        console.warn(`⚠️ [Cache] Read error on "${key}":`, redisErr.message);
      }
    }

    const freshData = await fetchFn();

    if (isRedisConnected() && freshData !== undefined) {
      try {
        await redis.setex(key, ttlSeconds, JSON.stringify(freshData));
      } catch (writeErr: any) {
        console.warn(`⚠️ [Cache] Write error on "${key}":`, writeErr.message);
      }
    }

    return { data: freshData, isCached: false };
  }

  /**
   * Retrieves a single cached item by key.
   */
  static async get<T>(key: string): Promise<T | null> {
    if (!isRedisConnected()) return null;
    try {
      const raw = await getRedisClient().get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /**
   * Directly sets a value in cache with a TTL in seconds.
   */
  static async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!isRedisConnected()) return;
    try {
      await getRedisClient().setex(key, ttlSeconds, JSON.stringify(value));
    } catch (err: any) {
      console.warn(`⚠️ [Cache] Direct set failure on "${key}":`, err.message);
    }
  }

  /**
   * Targeted invalidation of a specific key.
   */
  static async invalidate(key: string): Promise<void> {
    if (!isRedisConnected()) return;
    try {
      await getRedisClient().del(key);
    } catch (err: any) {
      console.warn(`⚠️ [Cache] Invalidation failure on "${key}":`, err.message);
    }
  }

  /**
   * Non-blocking pattern invalidation using SCAN cursor iteration (never uses blocking KEYS).
   */
  static async invalidatePattern(pattern: string): Promise<number> {
    if (!isRedisConnected()) return 0;
    const redis = getRedisClient();
    let totalDeleted = 0;
    let cursor = '0';

    try {
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys && keys.length > 0) {
          const deleted = await redis.del(...keys);
          totalDeleted += deleted;
        }
      } while (cursor !== '0');

      return totalDeleted;
    } catch (err: any) {
      console.warn(`⚠️ [Cache] Pattern invalidation failure for "${pattern}":`, err.message);
      return 0;
    }
  }
}

/**
 * Extracts the tenant identifier from the incoming request or JWT context.
 */
export function extractTenantId(req?: any): string {
  if (!req) return 't_default';
  const rawId = req.user?.orgId || req.headers?.['x-tenant-id'] || '00000000-0000-0000-0000-000000000001';
  return String(rawId).startsWith('t_') ? String(rawId) : `t_${rawId}`;
}
