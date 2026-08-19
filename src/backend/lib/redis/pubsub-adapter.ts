/**
 * Redis Pub/Sub Adapter
 *
 * Publish/subscribe with JSON serialization, channel prefixing,
 * and in-memory fallback when Redis is unavailable.
 *
 * Note: Redis pub/sub requires a dedicated subscriber connection.
 * Wildcard subscriptions use psubscribe when Redis is available.
 */

import { getRedisClient, getRedisSubscriberClient } from './redis-manager';
import type Redis from 'ioredis';

// ── Configuration ────────────────────────────────────────────────────────────

const CHANNEL_PREFIX = (process.env.REDIS_KEY_PREFIX || 'ys') + ':events:';

function prefixChannel(channel: string): string {
  return CHANNEL_PREFIX + channel;
}

// ── In-Memory Fallback ───────────────────────────────────────────────────────

type MessageHandler = (message: unknown, channel: string) => void;

const inMemoryHandlers = new Map<string, Set<MessageHandler>>();

function inMemoryPublish(channel: string, message: unknown): void {
  const handlers = inMemoryHandlers.get(channel);
  if (!handlers || handlers.size === 0) return;

  // Also check wildcard subscribers (channels ending with '*')
 const allHandlers: MessageHandler[] = [];

  // Exact match
  for (const h of handlers) {
    allHandlers.push(h);
  }

  // Wildcard match
  for (const [pattern, patternHandlers] of inMemoryHandlers) {
    if (pattern.endsWith('*') && channel.startsWith(pattern.slice(0, -1))) {
      for (const h of patternHandlers) {
        if (!allHandlers.includes(h)) {
          allHandlers.push(h);
        }
      }
    }
  }

  for (const handler of allHandlers) {
    try {
      handler(message, channel);
    } catch (err) {
      console.error(`[PubSub] Error in handler for "${channel}":`, err);
    }
  }
}

// ── Redis Subscriber Connection ─────────────────────────────────────────────

let subscriberClient: Redis | null = null;
let subscriberPromise: Promise<Redis | null> | null = null;
const redisHandlers = new Map<string, Set<MessageHandler>>();
let subscriberReady = false;

async function ensureSubscriber(): Promise<Redis | null> {
  if (subscriberReady && subscriberClient) return subscriberClient;
  if (subscriberPromise) return subscriberPromise;

  subscriberPromise = (async () => {
    const client = await getRedisSubscriberClient();
    if (!client) return null;

    client.on('message', (channel: string, message: string) => {
      // Strip prefix for handler lookup
      const bareChannel = channel.startsWith(CHANNEL_PREFIX)
        ? channel.slice(CHANNEL_PREFIX.length)
        : channel;

      try {
        const parsed = JSON.parse(message);
        dispatchToHandlers(bareChannel, parsed);
      } catch {
        dispatchToHandlers(bareChannel, message);
      }
    });

    client.on('pmessage', (pattern: string, channel: string, message: string) => {
      const bareChannel = channel.startsWith(CHANNEL_PREFIX)
        ? channel.slice(CHANNEL_PREFIX.length)
        : channel;

      try {
        const parsed = JSON.parse(message);
        dispatchToHandlers(bareChannel, parsed);
      } catch {
        dispatchToHandlers(bareChannel, message);
      }
    });

    subscriberClient = client;
    subscriberReady = true;
    return client;
  })();

  return subscriberPromise;
}

function dispatchToHandlers(channel: string, message: unknown): void {
  // Exact match
  const handlers = redisHandlers.get(channel);
  if (handlers) {
    for (const handler of handlers) {
      try {
        handler(message, channel);
      } catch (err) {
        console.error(`[PubSub] Error in Redis handler for "${channel}":`, err);
      }
    }
  }

  // Wildcard match
  for (const [pattern, patternHandlers] of redisHandlers) {
    if (pattern.endsWith('*') && channel.startsWith(pattern.slice(0, -1))) {
      for (const handler of patternHandlers) {
        try {
          handler(message, channel);
        } catch (err) {
          console.error(`[PubSub] Error in wildcard handler for "${pattern}":`, err);
        }
      }
    }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export const redisPubSub = {
  /**
   * Publish a message to a channel.
   * Message is JSON-serialized.
   * Also delivers to in-memory subscribers for same-process delivery.
   */
  async publish(channel: string, message: unknown): Promise<void> {
    const fullChannel = prefixChannel(channel);
    const serialized = JSON.stringify(message);

    // Always deliver in-process via in-memory bus
    inMemoryPublish(channel, message);

    // Also publish via Redis for cross-process delivery
    const client = await getRedisClient();
    if (client) {
      try {
        await client.publish(fullChannel, serialized);
      } catch {
        // In-memory delivery already happened, so silent fail
      }
    }
  },

  /**
   * Subscribe to a channel.
   * Supports wildcard patterns (e.g., 'wallet.*').
   * Handler receives (message, channel) where message is already parsed.
   */
  async subscribe(channel: string, handler: MessageHandler): Promise<void> {
    // Register in-memory handler (for same-process and fallback)
    if (!inMemoryHandlers.has(channel)) {
      inMemoryHandlers.set(channel, new Set());
    }
    inMemoryHandlers.get(channel)!.add(handler);

    // Also subscribe via Redis for cross-process messages
    const subscriber = await ensureSubscriber();
    if (subscriber) {
      // Register Redis handler
      if (!redisHandlers.has(channel)) {
        redisHandlers.set(channel, new Set());
      }
      redisHandlers.get(channel)!.add(handler);

      const fullChannel = prefixChannel(channel);
      try {
        if (channel.endsWith('*')) {
          await subscriber.psubscribe(fullChannel);
        } else {
          await subscriber.subscribe(fullChannel);
        }
      } catch {
        // In-memory subscription already active
      }
    }
  },

  /**
   * Unsubscribe from a channel.
   * Removes the specific handler. If no handlers remain, unsubscribes from Redis.
   */
  async unsubscribe(channel: string, handler?: MessageHandler): Promise<void> {
    // Remove from in-memory
    if (handler) {
      inMemoryHandlers.get(channel)?.delete(handler);
      if (inMemoryHandlers.get(channel)?.size === 0) {
        inMemoryHandlers.delete(channel);
      }
    } else {
      inMemoryHandlers.delete(channel);
    }

    // Remove from Redis
    if (subscriberClient) {
      if (handler) {
        redisHandlers.get(channel)?.delete(handler);
        if (redisHandlers.get(channel)?.size === 0) {
          redisHandlers.delete(channel);
          const fullChannel = prefixChannel(channel);
          try {
            if (channel.endsWith('*')) {
              await subscriberClient.punsubscribe(fullChannel);
            } else {
              await subscriberClient.unsubscribe(fullChannel);
            }
          } catch {
            // ignore
          }
        }
      } else {
        redisHandlers.delete(channel);
        const fullChannel = prefixChannel(channel);
        try {
          if (channel.endsWith('*')) {
            await subscriberClient.punsubscribe(fullChannel);
          } else {
            await subscriberClient.unsubscribe(fullChannel);
          }
        } catch {
          // ignore
        }
      }
    }
  },
};
