/**
 * Redis Rate Limiter Adapter
 *
 * Sliding-window rate limiting using Redis INCR + EXPIRE.
 * Falls back to in-memory Map when Redis is unavailable.
 */

import { getRedisClient } from './redis-manager';

// ── Types ────────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

// ── In-Memory Fallback Store ─────────────────────────────────────────────────

interface InMemoryRateEntry {
  count: number;
  windowStart: number; // Unix ms
  windowMs: number;
}

const rateStore = new Map<string, InMemoryRateEntry>();

// Clean up expired entries every 5 minutes
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).__rateLimitPurge === 'undefined') {
  (globalThis as any).__rateLimitPurge = true;
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateStore) {
      if (now > entry.windowStart + entry.windowMs) {
        rateStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  if (timer.unref) timer.unref();
}

// ── Rate Limiter Factory ─────────────────────────────────────────────────────

/**
 * Create a rate limiter with the given configuration.
 *
 * Uses Redis INCR + EXPIRE for atomic sliding window counting.
 * Falls back to in-memory Map when Redis is unavailable.
 *
 * @example
 * ```ts
 * const limiter = redisRateLimit({ keyPrefix: 'login', windowMs: 60000, maxRequests: 5 });
 * const result = await limiter('user-123');
 * if (!result.allowed) {
 *   console.log(`Rate limited. Retry after ${result.resetMs}ms`);
 * }
 * ```
 */
export function redisRateLimit(config: RateLimitConfig): (key: string) => Promise<RateLimitResult> {
  const { keyPrefix, windowMs, maxRequests } = config;
  const fullPrefix = (process.env.REDIS_KEY_PREFIX || 'ys') + ':rl:' + keyPrefix + ':';
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async function checkRateLimit(key: string): Promise<RateLimitResult> {
    const redisKey = fullPrefix + key;
    const now = Date.now();

    // Try Redis first
    const client = await getRedisClient();
    if (client) {
      try {
        const result = await client.incr(redisKey);

        if (result === 1) {
          // First request — set expiry (TTL = window)
          await client.expire(redisKey, windowSeconds);
        }

        const ttlSeconds = await client.ttl(redisKey);
        const resetMs = ttlSeconds > 0 ? ttlSeconds * 1000 : 0;
        const remaining = Math.max(0, maxRequests - result);

        return {
          allowed: result <= maxRequests,
          remaining,
          resetMs,
        };
      } catch {
        // Fall through to in-memory
      }
    }

    // In-memory fallback
    const entry = rateStore.get(redisKey);
    if (!entry || now > entry.windowStart + entry.windowMs) {
      // New window
      rateStore.set(redisKey, { count: 1, windowStart: now, windowMs });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetMs: windowMs,
      };
    }

    entry.count++;
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetMs = entry.windowStart + entry.windowMs - now;

    if (entry.count > maxRequests) {
      return { allowed: false, remaining: 0, resetMs };
    }

    return { allowed: true, remaining, resetMs };
  };
}
