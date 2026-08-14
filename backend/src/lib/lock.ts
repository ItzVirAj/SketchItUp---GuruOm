import Redlock, { Lock } from 'redlock';
import { getRedisClient, isRedisConnected } from './redis';

export class ResourceLockedError extends Error {
  statusCode = 409;
  constructor(message = 'Resource is currently being modified by another operation. Please retry.') {
    super(message);
    this.name = 'ResourceLockedError';
  }
}

export class LockServiceUnavailableError extends Error {
  statusCode = 503;
  constructor(message = 'Unable to process — locking service is currently unavailable. Please retry.') {
    super(message);
    this.name = 'LockServiceUnavailableError';
  }
}

let redlockInstance: Redlock | null = null;

function getRedlock(): Redlock {
  if (!redlockInstance) {
    const redis = getRedisClient();
    redlockInstance = new Redlock([redis], {
      driftFactor: 0.01,
      retryCount: 10,
      retryDelay: 100, // ms between retries
      retryJitter: 50,  // ms random jitter to prevent thundering herd
      automaticExtensionThreshold: 500
    });

    redlockInstance.on('error', (err: any) => {
      // Ignore routine contention errors; log system-level issues quietly
      if (!err.message?.includes('exceeded its maximum attempts')) {
        console.warn('⚠️ [Redlock] Distributed lock warning:', err.message || err);
      }
    });
  }

  return redlockInstance;
}

export class LockService {
  /**
   * Generates a tenant-scoped distributed lock key.
   * Format: lock:{tenant_id}:{resource}:{identifier}
   */
  static buildKey(tenantId: string, resource: string, identifier: string): string {
    const cleanTenant = tenantId ? (tenantId.startsWith('t_') ? tenantId : `t_${tenantId}`) : 't_default';
    const cleanResource = resource.toLowerCase().trim();
    const cleanIdentifier = identifier.trim();
    return `lock:${cleanTenant}:${cleanResource}:${cleanIdentifier}`;
  }

  /**
   * Executes an operation inside a distributed lock with automatic release and deadlock prevention.
   * Sorts multi-resource keys alphabetically to prevent circular wait deadlocks.
   * 
   * @param resources Single lock key or array of lock keys
   * @param ttlMs Safety net TTL in milliseconds (default 5000ms)
   * @param fn Critical section operation
   */
  static async withLock<T>(
    resources: string | string[],
    ttlMs = 5000,
    fn: () => Promise<T>
  ): Promise<T> {
    // Fail-Closed: Exclusivity cannot be guaranteed if Redis is disconnected
    if (!isRedisConnected()) {
      throw new LockServiceUnavailableError();
    }

    const redlock = getRedlock();
    const rawKeys = Array.isArray(resources) ? resources : [resources];
    
    // Sort keys alphabetically to guarantee deterministic acquisition order (deadlock prevention)
    const sortedKeys = Array.from(new Set(rawKeys)).sort();

    let lock: Lock;
    try {
      lock = await redlock.acquire(sortedKeys, ttlMs);
    } catch (err: any) {
      // Could not acquire lock within retry limit
      throw new ResourceLockedError(`Resource [${sortedKeys.join(', ')}] is currently locked by another operation.`);
    }

    try {
      // Execute critical section while holding the lock
      return await fn();
    } finally {
      // Always release lock
      try {
        await lock.release();
      } catch (releaseErr: any) {
        // Lock might have already expired if operation exceeded TTL
        console.warn('⚠️ [Redlock] Lock release warning:', releaseErr.message);
      }
    }
  }
}
