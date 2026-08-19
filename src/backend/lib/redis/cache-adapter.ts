/**
 * Redis Cache Adapter
 *
 * High-level cache operations with JSON serialization, key prefixing,
 * TTL support, and silent fallback to in-memory when Redis is unavailable.
 */

import { getRedisClient, inMemoryFallback, getRedisHealth } from './redis-manager';
import type { RedisHealthResult } from './redis-manager';

// ── Configuration ────────────────────────────────────────────────────────────

const KEY_PREFIX = (process.env.REDIS_KEY_PREFIX || 'ys') + ':cache:';

function prefixKey(key: string): string {
  return KEY_PREFIX + key;
}

// ── Adapter ──────────────────────────────────────────────────────────────────

/**
 * Redis-backed cache with JSON serialization and silent in-memory fallback.
 */
export const redisCache = {
  /**
   * Get a value from cache, deserializing from JSON.
   * Returns null on miss or expiry.
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const fullKey = prefixKey(key);

    const client = await getRedisClient();
    if (client) {
      try {
        const raw = await client.get(fullKey);
        if (raw === null) return null;
        return JSON.parse(raw) as T;
      } catch {
        // Fall through to in-memory
      }
    }

    // In-memory fallback
    const fallbackRaw = inMemoryFallback.get(fullKey);
    if (fallbackRaw === null) return null;
    try {
      return JSON.parse(fallbackRaw) as T;
    } catch {
      return null;
    }
  },

  /**
   * Set a value in cache with optional TTL (in seconds).
   * Values are JSON-serialized.
   */
  async set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const fullKey = prefixKey(key);
    const raw = JSON.stringify(value);

    const client = await getRedisClient();
    if (client) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await client.set(fullKey, raw, 'EX', ttlSeconds);
        } else {
          await client.set(fullKey, raw);
        }
      } catch {
        // Fall through to in-memory
      }
    }

    // Always update in-memory fallback for seamless degradation
    inMemoryFallback.set(fullKey, raw, ttlSeconds);
  },

  /**
   * Delete a key from cache.
   */
  async del(key: string): Promise<boolean> {
    const fullKey = prefixKey(key);

    const client = await getRedisClient();
    if (client) {
      try {
        await client.del(fullKey);
      } catch {
        // Fall through to in-memory
      }
    }

    return inMemoryFallback.del(fullKey);
  },

  /**
   * Check if a key exists in cache.
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = prefixKey(key);

    const client = await getRedisClient();
    if (client) {
      try {
        const result = await client.exists(fullKey);
        if (result === 1) return true;
      } catch {
        // Fall through to in-memory
      }
    }

    return inMemoryFallback.exists(fullKey);
  },

  /**
   * Get all keys matching a pattern (uses Redis KEYS or in-memory glob).
   * Pattern is applied after the key prefix.
   */
  async keys(pattern: string): Promise<string[]> {
    const fullPattern = prefixKey(pattern);

    const client = await getRedisClient();
    if (client) {
      try {
        const rawKeys = await client.keys(fullPattern);
        // Strip the prefix from results
        return rawKeys.map((k) => k.slice(KEY_PREFIX.length));
      } catch {
        // Fall through to in-memory
      }
    }

    const fallbackKeys = inMemoryFallback.keys(fullPattern);
    return fallbackKeys.map((k) => k.slice(KEY_PREFIX.length));
  },

  /**
   * Flush all cache entries (both Redis and in-memory fallback).
   */
  async flush(): Promise<void> {
    const client = await getRedisClient();
    if (client) {
      try {
        // Use SCAN-based deletion for safety in production
        const stream = client.scanStream({
          match: KEY_PREFIX + '*',
          count: 100,
        });
        const pipeline = client.pipeline();
        let keyCount = 0;

        await new Promise<void>((resolve) => {
          stream.on('data', (resultKeys: string[]) => {
            for (const key of resultKeys) {
              pipeline.del(key);
              keyCount++;
            }
          });
          stream.on('end', () => {
            if (keyCount > 0) {
              pipeline.exec().catch(() => { /* ignore */ });
            }
            resolve();
          });
          stream.on('error', () => resolve());
        });
      } catch {
        // Fall through to in-memory flush
      }
    }

    inMemoryFallback.flush();
  },

  /**
   * Health check — returns Redis health status.
   */
  async health(): Promise<RedisHealthResult> {
    return getRedisHealth();
  },
};
