import Redis, { RedisOptions } from 'ioredis';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;
let isConnected = false;
let isInitialized = false;

/**
 * Initializes and returns the shared singleton Redis client.
 * Does not crash the application if Redis is unavailable; logs warnings gracefully.
 */
export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || ENV.REDIS_URL || 'redis://127.0.0.1:6379';
  const isTls = redisUrl.startsWith('rediss://') || process.env.REDIS_TLS === 'true';

  const options: RedisOptions = {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    retryStrategy(times) {
      if (times > 3) {
        return null;
      }
      return Math.min(times * 200, 1000);
    },
    connectTimeout: 2000,
    ...(isTls ? { tls: { rejectUnauthorized: false } } : {})
  };

  try {
    redisClient = new Redis(redisUrl, options);

    redisClient.on('connect', () => {
      isConnected = true;
      logger.info('⚡ [Redis] Connecting to fast-layer storage at', redisUrl.replace(/\/\/[^@]*@/, '//***@'));
    });

    redisClient.on('ready', () => {
      isConnected = true;
      logger.info('✅ [Redis] Connection ready and operational.');
    });

    redisClient.on('error', (err: any) => {
      isConnected = false;
      // Log concise warning rather than noisy stack trace
      logger.warn('⚠️ [Redis] Fast-layer connection warning:', err.message || err);
    });

    redisClient.on('close', () => {
      isConnected = false;
    });

    redisClient.on('reconnecting', () => {
      isConnected = false;
      logger.info('🔄 [Redis] Attempting reconnection to fast-layer...');
    });

    // Initiate non-blocking connection
    if (!isInitialized) {
      isInitialized = true;
      redisClient.connect().catch((err) => {
        isConnected = false;
        logger.warn('⚠️ [Redis] Initial connect deferred (offline mode active):', err.message);
      });
    }

    return redisClient;
  } catch (err: any) {
    logger.warn('⚠️ [Redis] Failed to initialize Redis instance:', err.message);
    // Return dummy client fallback
    redisClient = new Redis({ lazyConnect: true, enableOfflineQueue: false });
    return redisClient;
  }
}

/**
 * Checks if Redis is currently connected and responsive.
 */
export function isRedisConnected(): boolean {
  return isConnected && redisClient?.status === 'ready';
}

/**
 * Closes the Redis connection cleanly during graceful shutdown.
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (_) {
      redisClient.disconnect();
    } finally {
      redisClient = null;
      isConnected = false;
      isInitialized = false;
    }
  }
}
