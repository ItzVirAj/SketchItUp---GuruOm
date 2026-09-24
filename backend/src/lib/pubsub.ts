import Redis from 'ioredis';
import { createBullMQRedisConnection } from './queue-connection';
import { getRedisClient, isRedisConnected } from './redis';

let pubClient: Redis | null = null;
let subClient: Redis | null = null;
const activeListeners: Map<string, Set<(message: any) => void>> = new Map();

/**
 * Publishes a realtime message on a tenant-scoped channel.
 * Channel format: events:{tenant_id}
 */
export async function publishTenantEvent(tenantId: string, eventType: string, payload: any): Promise<void> {
  if (!isRedisConnected()) return;

  try {
    if (!pubClient) {
      pubClient = getRedisClient();
    }

    const channel = `events:${tenantId || 't_default'}`;
    const message = JSON.stringify({
      eventType,
      payload,
      timestamp: new Date().toISOString(),
      originNode: process.env.NODE_ID || 'node-primary'
    });

    await pubClient.publish(channel, message);
  } catch (err: any) {
    console.warn(`⚠️ [PubSub] Publish failed on "${tenantId}":`, err.message);
  }
}

/**
 * Subscribes to realtime messages on a tenant channel across all backend nodes.
 */
export async function subscribeTenantEvents(
  tenantId: string,
  callback: (data: { eventType: string; payload: any; timestamp: string; originNode: string }) => void
): Promise<() => void> {
  const channel = `events:${tenantId || 't_default'}`;

  if (!activeListeners.has(channel)) {
    activeListeners.set(channel, new Set());
  }
  activeListeners.get(channel)!.add(callback);

  if (isRedisConnected()) {
    try {
      if (!subClient) {
        subClient = createBullMQRedisConnection();
        subClient.on('message', (chan, rawMsg) => {
          const listeners = activeListeners.get(chan);
          if (listeners && listeners.size > 0) {
            try {
              const parsed = JSON.parse(rawMsg);
              listeners.forEach(fn => fn(parsed));
            } catch (_) {}
          }
        });
      }

      await subClient.subscribe(channel);
    } catch (err: any) {
      console.warn(`⚠️ [PubSub] Subscription failed on "${channel}":`, err.message);
    }
  }

  // Return unsubscribe cleanup function
  return () => {
    const listeners = activeListeners.get(channel);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0 && subClient) {
        subClient.unsubscribe(channel).catch(() => {});
      }
    }
  };
}

/**
 * Cleans up PubSub connections during server shutdown.
 */
export async function closePubSub(): Promise<void> {
  if (subClient) {
    try {
      await subClient.quit();
    } catch (_) {
      subClient.disconnect();
    } finally {
      subClient = null;
    }
  }
}
