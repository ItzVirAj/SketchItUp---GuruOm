import Redis, { RedisOptions } from 'ioredis';
import { ENV } from '../config/env';

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
    enableOfflineQueue: false,
    connectTimeout: 2000,
    commandTimeout: 1000,
    retryStrategy(times) {
      if (times > 2) {
        // Stop retrying if Redis is offline / not installed locally
        return null;
      }
      return 2000;
    }
  };

  if (isTls) {
    options.tls = {
      rejectUnauthorized: false
    };
  }

  try {
    redisClient = new Redis(redisUrl, options);

    redisClient.on('connect', () => {
      isConnected = true;
      console.log('⚡ [Redis] Connecting to fast-layer storage at', redisUrl.replace(/\/\/[^@]*@/, '//***@'));
    });

    redisClient.on('ready', () => {
      isConnected = true;
      console.log('✅ [Redis] Connection ready and operational.');
    });

    redisClient.on('error', (err: any) => {
      isConnected = false;
      // Log concise warning rather than noisy stack trace
      console.warn('⚠️ [Redis] Fast-layer connection warning:', err.message || err);
    });

    redisClient.on('close', () => {
      isConnected = false;
    });

    redisClient.on('reconnecting', () => {
      isConnected = false;
      console.log('🔄 [Redis] Attempting reconnection to fast-layer...');
    });

    // Initiate non-blocking connection
    if (!isInitialized) {
      isInitialized = true;
      redisClient.connect().catch((err) => {
        isConnected = false;
        console.warn('⚠️ [Redis] Initial connect deferred (offline mode active):', err.message);
      });
    }

    return redisClient;
  } catch (err: any) {
    console.warn('⚠️ [Redis] Failed to initialize Redis instance:', err.message);
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
