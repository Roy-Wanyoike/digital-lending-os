/**
 * Unified Redis Client Manager
 *
 * Lazy singleton that returns ioredis instances when REDIS_URL is set,
 * otherwise falls back to an in-memory Map implementation for local dev.
 *
 * Features:
 *  - Connection pooling (multiple ioredis clients via round-robin)
 *  - Exponential backoff reconnection
 *  - Health check with latency measurement
 *  - Graceful fallback to in-memory when Redis is unavailable
 */

import type Redis from 'ioredis';

// ── Types ────────────────────────────────────────────────────────────────────

export interface RedisHealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  error?: string;
  isUsingFallback: boolean;
  poolSize: number;
}

interface InMemoryEntry {
  value: string;
  expiresAt: number; // 0 = no expiry
}

// ── In-Memory Fallback ───────────────────────────────────────────────────────

const fallbackStore = new Map<string, InMemoryEntry>();
const MAX_FALLBACK_SIZE = 10_000;

function fallbackEvictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of fallbackStore) {
    if (entry.expiresAt > 0 && now > entry.expiresAt) {
      fallbackStore.delete(key);
    }
  }
}

function fallbackEvictOldest(): void {
  while (fallbackStore.size > MAX_FALLBACK_SIZE) {
    const oldest = fallbackStore.keys().next().value;
    if (oldest !== undefined) fallbackStore.delete(oldest);
    else break;
  }
}

// Periodically purge expired entries
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).__redisFallbackPurge === 'undefined') {
  (globalThis as any).__redisFallbackPurge = true;
  const timer = setInterval(fallbackEvictExpired, 60_000);
  if (timer.unref) timer.unref();
}

// ── Client Pool ──────────────────────────────────────────────────────────────

let clientPool: Redis[] = [];
let poolIndex = 0;
let clientInitialized = false;
let clientAvailable = false;
let initPromise: Promise<void> | null = null;

/**
 * Lazily create and connect the Redis client pool.
 * Returns nothing — callers should use getRedisClient() which handles fallback.
 */
async function ensureClients(): Promise<void> {
  if (clientInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) {
        clientInitialized = true;
        clientAvailable = false;
        return;
      }

      const poolSize = parseInt(process.env.REDIS_POOL_SIZE || '1', 10);
      const IoRedis = (await import('ioredis')).default;

      for (let i = 0; i < poolSize; i++) {
        const client = new IoRedis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 3,
          connectTimeout: 5000,
          commandTimeout: 3000,
          retryStrategy(times: number): number | null {
            if (times > 10) return null; // stop retrying
            // Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms, ... capped at 5s
            const delay = Math.min(50 * Math.pow(2, times), 5000);
            return delay;
          },
          enableReadyCheck: true,
          // TLS support for rediss:// URLs
          tls: redisUrl.startsWith('rediss:') ? {} : undefined,
        });

        client.on('ready', () => {
          clientAvailable = true;
        });

        client.on('error', (err: Error) => {
          // Mark unavailable — getRedisClient will fall back to in-memory
          if (!clientAvailable) {
            clientAvailable = false;
          }
          // Only log once on first error to avoid log spam
          if (!(client as unknown as Record<string, unknown>)['_ysErrorLogged']) {
            (client as unknown as Record<string, unknown>)['_ysErrorLogged'] = true;
            console.error(
              `[RedisManager] Connection error (pool slot ${i}):`,
              err.message
            );
          }
        });

        client.on('close', () => {
          // If all clients are closed, mark unavailable
          if (clientPool.every((c) => c.status !== 'ready')) {
            clientAvailable = false;
          }
        });

        try {
          await client.connect();
          clientPool.push(client);
        } catch {
          console.warn(
            `[RedisManager] Failed to connect pool slot ${i}, using reduced pool`
          );
        }
      }

      clientInitialized = true;
      clientAvailable = clientPool.length > 0;
    } catch {
      clientInitialized = true;
      clientAvailable = false;
    }
  })();

  return initPromise;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get a Redis client from the pool (round-robin).
 * Returns null when Redis is not configured or all connections failed;
 * callers should fall back to in-memory in that case.
 *
 * Lazy: the pool is created on first call, not at module load time.
 */
export async function getRedisClient(): Promise<Redis | null> {
  await ensureClients();

  if (!clientAvailable || clientPool.length === 0) {
    return null;
  }

  // Round-robin selection
  const client = clientPool[poolIndex % clientPool.length];
  poolIndex = (poolIndex + 1) % clientPool.length;

  // Only return if connected
  if (client.status === 'ready' || client.status === 'connecting') {
    return client;
  }

  return null;
}

/**
 * Get a dedicated Redis client for pub/sub (new connection, not from pool).
 * Pub/sub requires a dedicated connection since entering subscriber mode
 * makes the connection unable to perform normal commands.
 */
export async function getRedisSubscriberClient(): Promise<Redis | null> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  try {
    const IoRedis = (await import('ioredis')).default;
    const client = new IoRedis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      commandTimeout: 3000,
      retryStrategy(times: number): number | null {
        if (times > 10) return null;
        return Math.min(50 * Math.pow(2, times), 5000);
      },
      tls: redisUrl.startsWith('rediss:') ? {} : undefined,
    });

    await client.connect();
    return client;
  } catch {
    return null;
  }
}

/**
 * Ping Redis and return latency + health status.
 */
export async function getRedisHealth(): Promise<RedisHealthResult> {
  if (!clientInitialized) {
    await ensureClients();
  }

  if (!clientAvailable || clientPool.length === 0) {
    return {
      status: 'degraded',
      latencyMs: 0,
      error: 'Redis not configured — using in-memory fallback',
      isUsingFallback: true,
      poolSize: 0,
    };
  }

  // Try the first connected client
  const client = clientPool.find((c) => c.status === 'ready');
  if (!client) {
    return {
      status: 'unhealthy',
      latencyMs: 0,
      error: 'No connected Redis client in pool',
      isUsingFallback: true,
      poolSize: clientPool.length,
    };
  }

  const start = Date.now();
  try {
    const result = await client.ping();
    const latencyMs = Date.now() - start;
    return {
      status: latencyMs < 50 ? 'healthy' : 'degraded',
      latencyMs,
      isUsingFallback: false,
      poolSize: clientPool.length,
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: (err as Error).message,
      isUsingFallback: true,
      poolSize: clientPool.length,
    };
  }
}

/**
 * Gracefully close all Redis connections.
 * Call during process shutdown.
 */
export async function closeRedisClients(): Promise<void> {
  const promises = clientPool.map((client) =>
    client.quit().catch(() => { /* ignore */ })
  );
  await Promise.all(promises);
  clientPool = [];
  clientInitialized = false;
  clientAvailable = false;
  initPromise = null;
}

// ── In-Memory Fallback Helpers (exported for adapters) ───────────────────────

/**
 * In-memory fallback store for when Redis is unavailable.
 * Used internally by adapters — prefer adapter methods over direct access.
 */
export const inMemoryFallback = {
  get(key: string): string | null {
    const entry = fallbackStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      fallbackStore.delete(key);
      return null;
    }
    return entry.value;
  },

  set(key: string, value: string, ttlSeconds?: number): void {
    fallbackStore.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0,
    });
    fallbackEvictOldest();
  },

  del(key: string): boolean {
    return fallbackStore.delete(key);
  },

  exists(key: string): boolean {
    const entry = fallbackStore.get(key);
    if (!entry) return false;
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      fallbackStore.delete(key);
      return false;
    }
    return true;
  },

  keys(pattern: string): string[] {
    const allKeys = Array.from(fallbackStore.keys());
    if (pattern === '*') return allKeys;
    const regex = new RegExp(
      '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return allKeys.filter((k) => regex.test(k));
  },

  flush(): void {
    fallbackStore.clear();
  },

  size(): number {
    return fallbackStore.size;
  },
};
