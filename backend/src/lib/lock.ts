import { createRequire } from 'module';
import type { Lock } from 'redlock';
import type RedlockType from 'redlock';

// CJS/ESM interop: esbuild bundles as CJS so `import Redlock from 'redlock'` resolves
// to the module object (not the class). Using createRequire ensures we always get the
// constructor correctly in both `tsx watch` (ESM) and the esbuild CJS production bundle.
const _require = createRequire(import.meta.url);
const _redlockModule = _require('redlock');
const RedlockClass: typeof RedlockType = _redlockModule.default ?? _redlockModule;

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

let redlockInstance: RedlockType | null = null;
const inMemoryLocks = new Map<string, Promise<void>>();

function getRedlock(): RedlockType {
  if (!redlockInstance) {
    const redis = getRedisClient();
    redlockInstance = new RedlockClass([redis], {
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
   * Gracefully uses an in-memory asynchronous mutex if Redis is not connected.
   */
  static async withLock<T>(
    resources: string | string[],
    ttlMs = 5000,
    fn: () => Promise<T>
  ): Promise<T> {
    const rawKeys = Array.isArray(resources) ? resources : [resources];
    const sortedKeys = Array.from(new Set(rawKeys)).sort();

    // Use Redlock if Redis is connected
    if (isRedisConnected()) {
      const redlock = getRedlock();
      let lock: Lock;
      try {
        lock = await redlock.acquire(sortedKeys, ttlMs);
      } catch (err: any) {
        throw new ResourceLockedError(`Resource [${sortedKeys.join(', ')}] is currently locked by another operation.`);
      }

      try {
        return await fn();
      } finally {
        try {
          await lock.release();
        } catch (releaseErr: any) {
          console.warn('⚠️ [Redlock] Lock release warning:', releaseErr.message);
        }
      }
    }

    // In-memory mutex serialization fallback when Redis is offline
    const primaryKey = sortedKeys.join('::');
    const existingLock = inMemoryLocks.get(primaryKey) || Promise.resolve();
    let releaseMutex: () => void = () => {};

    const currentLock = new Promise<void>((resolve) => {
      releaseMutex = resolve;
    });

    inMemoryLocks.set(primaryKey, existingLock.then(() => currentLock));

    try {
      await existingLock;
      return await fn();
    } finally {
      releaseMutex();
      if (inMemoryLocks.get(primaryKey) === existingLock.then(() => currentLock)) {
        inMemoryLocks.delete(primaryKey);
      }
    }
  }

  /**
   * Evaluates optimistic concurrency: ensures target record's updatedAt matches expected state.
   */
  static verifyOptimisticVersion(
    currentUpdatedAt: string | undefined | null,
    expectedUpdatedAt: string | undefined | null,
    resourceName = 'Record'
  ): void {
    if (expectedUpdatedAt && currentUpdatedAt && currentUpdatedAt !== expectedUpdatedAt) {
      const err: any = new Error(`${resourceName} has been modified by another concurrent action. Please refresh the page and try again.`);
      err.statusCode = 409;
      err.errorCode = 'ERR_OPTIMISTIC_LOCK_CONFLICT';
      throw err;
    }
  }
}
