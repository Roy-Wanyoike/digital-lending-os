/**
 * Cache Pub/Sub — Youngsend Caching Layer
 *
 * Distributed cache invalidation across multiple instances using Redis Pub/Sub.
 * When one instance invalidates a cache entry, all instances receive the message
 * and clear their local state.
 *
 * Channel format: cache:invalidate:{prefix}
 * Message format: JSON { prefix, pattern, tags?, timestamp, sourceId }
 */

import { getCacheClient, CacheClient } from './client';

// ─── Types ──────────────────────────────────────────────────────

export interface InvalidationMessage {
  prefix: string;
  pattern?: string;
  tags?: string[];
  timestamp: number;
  sourceId: string;
  namespace?: string;
}

export type InvalidationHandler = (message: InvalidationMessage) => void | Promise<void>;

export interface PubSubConfig {
  channelPrefix?: string;
  instanceId?: string;
}

// ─── Channel Naming ──────────────────────────────────────────────────────

const DEFAULT_CHANNEL_PREFIX = 'cache:invalidate';

function buildChannelName(prefix: string, channelPrefix?: string): string {
  return `${channelPrefix || DEFAULT_CHANNEL_PREFIX}:${prefix}`;
}

function generateInstanceId(): string {
  return `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Pub/Sub Manager ──────────────────────────────────────────────────────

export class CachePubSub {
  private subscriber: CacheClient;
  private publisher: CacheClient;
  private handlers = new Map<string, Set<InvalidationHandler>>();
  private subscribedChannels = new Set<string>();
  private instanceId: string;
  private channelPrefix: string;
  private isReady = false;

  constructor(config?: PubSubConfig, client?: CacheClient) {
    this.channelPrefix = config?.channelPrefix || DEFAULT_CHANNEL_PREFIX;
    this.instanceId = config?.instanceId || generateInstanceId();
    this.subscriber = client ? client.duplicate() : getCacheClient().duplicate();
    this.publisher = client || getCacheClient();
  }

  async init(): Promise<void> {
    if (this.isReady) return;
    if (!process.env.REDIS_URL) return;

    const rawSubscriber = (this.subscriber as any).client;
    if (rawSubscriber && typeof rawSubscriber.on === 'function') {
      rawSubscriber.on('message', (channel: string, message: string) => {
        this.handleMessage(channel, message);
      });
    }

    this.isReady = true;
  }

  async subscribe(prefix: string, handler: InvalidationHandler): Promise<void> {
    await this.init();

    if (!this.handlers.has(prefix)) {
      this.handlers.set(prefix, new Set());
    }
    this.handlers.get(prefix)!.add(handler);

    if (!process.env.REDIS_URL) return;

    const channel = buildChannelName(prefix, this.channelPrefix);
    if (this.subscribedChannels.has(channel)) return;

    const rawSubscriber = (this.subscriber as any).client;
    if (rawSubscriber && typeof rawSubscriber.subscribe === 'function') {
      await rawSubscriber.subscribe(channel);
      this.subscribedChannels.add(channel);
    }
  }

  async unsubscribe(prefix: string, handler?: InvalidationHandler): Promise<void> {
    if (handler) {
      this.handlers.get(prefix)?.delete(handler);
    } else {
      this.handlers.delete(prefix);
    }

    if (!process.env.REDIS_URL) return;

    const channel = buildChannelName(prefix, this.channelPrefix);
    if (handler && this.handlers.has(prefix) && this.handlers.get(prefix)!.size > 0) {
      return;
    }

    const rawSubscriber = (this.subscriber as any).client;
    if (rawSubscriber && typeof rawSubscriber.unsubscribe === 'function') {
      await rawSubscriber.unsubscribe(channel);
      this.subscribedChannels.delete(channel);
    }
  }

  async publish(message: Omit<InvalidationMessage, 'timestamp' | 'sourceId'>): Promise<void> {
    await this.init();

    const fullMessage: InvalidationMessage = {
      ...message,
      timestamp: Date.now(),
      sourceId: this.instanceId,
    };

    const channel = buildChannelName(message.prefix, this.channelPrefix);

    if (!process.env.REDIS_URL) {
      this.handleMessage(channel, JSON.stringify(fullMessage));
      return;
    }

    const rawPublisher = (this.publisher as any).client;
    if (rawPublisher && typeof rawPublisher.publish === 'function') {
      await rawPublisher.publish(channel, JSON.stringify(fullMessage));
    }
  }

  async invalidatePrefix(prefix: string, namespace?: string): Promise<void> {
    await this.publish({ prefix, pattern: `${prefix}*`, namespace });
  }

  async invalidateTags(prefix: string, tags: string[], namespace?: string): Promise<void> {
    await this.publish({ prefix, tags, namespace });
  }

  async disconnect(): Promise<void> {
    this.handlers.clear();
    this.subscribedChannels.clear();
    await this.subscriber.quit();
  }

  getInstanceId(): string {
    return this.instanceId;
  }

  getSubscriptionCount(): number {
    return this.subscribedChannels.size;
  }

  private async handleMessage(channel: string, rawMessage: string): Promise<void> {
    let message: InvalidationMessage;
    try {
      message = JSON.parse(rawMessage);
    } catch {
      return;
    }

    if (message.sourceId === this.instanceId) return;

    const prefix = channel.replace(`${this.channelPrefix}:`, '');
    const handlers = this.handlers.get(prefix);
    if (!handlers) return;

    const promises: Promise<void>[] = [];
    for (const handler of handlers) {
      try {
        const result = handler(message);
        if (result instanceof Promise) {
          promises.push(result.catch(() => {}));
        }
      } catch {
        /* handler error */
      }
    }

    await Promise.all(promises);
  }
}

// ─── Singleton ──────────────────────────────────────────────────────

let _pubsub: CachePubSub | null = null;

export function getCachePubSub(config?: PubSubConfig): CachePubSub {
  if (!_pubsub) {
    _pubsub = new CachePubSub(config);
  }
  return _pubsub;
}
