import Redis, { RedisOptions } from 'ioredis';
import { ENV } from '../config/env';

/**
 * Creates dedicated ioredis connections for BullMQ.
 * BullMQ requires specific options (maxRetriesPerRequest: null, enableReadyCheck: false).
 */
export function createBullMQRedisConnection(): Redis {
  const redisUrl = process.env.REDIS_URL || ENV.REDIS_URL || 'redis://127.0.0.1:6379';
  const isTls = redisUrl.startsWith('rediss://') || process.env.REDIS_TLS === 'true';

  const options: RedisOptions = {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 5000,
    retryStrategy(times) {
      if (times > 5) return 10000;
      return Math.min(times * 1000, 3000);
    }
  };

  if (isTls) {
    options.tls = { rejectUnauthorized: false };
  }

  const client = new Redis(redisUrl, options);

  client.on('error', (err: any) => {
    // Quiet connection warnings for worker resilience
    if (!err.message?.includes('ECONNREFUSED')) {
      console.warn('⚠️ [BullMQ-Redis] Connection warning:', err.message);
    }
  });

  return client;
}
