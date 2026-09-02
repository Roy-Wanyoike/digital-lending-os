/**
 * Distributed Rate Limiter — Digital Lending OS Caching Layer
 *
 * Three algorithms:
 *  1. Sliding Window Counter (default) — accurate, memory-efficient
 *  2. Token Bucket — smooth traffic, burst tolerance
 *  3. Fixed Window — simple, may allow double rate at boundaries
 *
 * Supports per-user, per-IP, per-endpoint limits.
 * Returns standard rate limit headers:
 *   X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 */

import { getCacheClient, CacheClient } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RateLimitAlgorithm = 'sliding-window' | 'token-bucket' | 'fixed-window';

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Algorithm to use */
  algorithm?: RateLimitAlgorithm;
  /** Key prefix for this limiter */
  keyPrefix?: string;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** Total limit for the window */
  limit: number;
  /** Unix timestamp (seconds) when the window resets */
  resetAt: number;
  /** Milliseconds until reset */
  resetMs: number;
  /** Current usage count */
  used: number;
  /** Rate limit headers to set on the response */
  headers: Record<string, string>;
}

export interface RateLimitIdentifier {
  userId?: string;
  ip?: string;
  endpoint?: string;
  custom?: string;
}

// ─── Lua Scripts (Sliding Window Counter) ────────────────────────────────────

const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

local windowStart = now - window

-- Remove expired entries
redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

-- Count requests in current window
local count = redis.call('ZCARD', key)

if count < limit then
  redis.call('ZADD', key, now, now .. ':' .. math.random())
  redis.call('PEXPIRE', key, window + 1000)
  return {count + 1, limit, now + window}
else
  return {count, limit, now + window}
end
`;

// ─── Lua Scripts (Token Bucket) ─────────────────────────────────────────────

const TOKEN_BUCKET_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local refillRate = tonumber(ARGV[3])

local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(bucket[1])
local lastRefill = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  lastRefill = now
end

-- Refill tokens based on elapsed time
local elapsed = (now - lastRefill) / 1000
tokens = math.min(capacity, tokens + (elapsed * refillRate))

if tokens >= 1 then
  tokens = tokens - 1
  redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
  redis.call('PEXPIRE', key, math.ceil(capacity / refillRate) * 1000 + 1000)
  local resetAt = now + math.ceil((capacity - tokens) / refillRate) * 1000
  return {1, capacity, tokens, resetAt}
else
  local resetAt = now + math.ceil((1 - tokens) / refillRate) * 1000
  return {0, capacity, tokens, resetAt}
end
`;

// ─── Lua Scripts (Fixed Window) ─────────────────────────────────────────────

const FIXED_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

local windowKey = key .. ':' .. math.floor(now / window)

local count = tonumber(redis.call('GET', windowKey) or '0')

if count < limit then
  count = count + 1
  redis.call('SET', windowKey, count, 'PX', window + 1000)
  local windowEnd = (math.floor(now / window) + 1) * window
  return {count, limit, windowEnd}
else
  local windowEnd = (math.floor(now / window) + 1) * window
  return {count, limit, windowEnd}
end
`;

// ─── Rate Limiter ────────────────────────────────────────────────────────────

export class RateLimiter {
  private client: CacheClient;
  private config: Required<RateLimitConfig>;
  private useLua: boolean;

  constructor(config: RateLimitConfig, client?: CacheClient) {
    this.client = client || getCacheClient();
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      algorithm: config.algorithm || 'sliding-window',
      keyPrefix: config.keyPrefix || 'dlo:rl',
    };
    // Check if we have a real Redis client (not in-memory fallback)
    this.useLua = this.client.isAvailable() && !!process.env.REDIS_URL;
  }

  private buildKey(id: RateLimitIdentifier): string {
    const parts = [this.config.keyPrefix];
    if (id.userId) parts.push(`user:${id.userId}`);
    else if (id.ip) parts.push(`ip:${id.ip}`);
    else parts.push('anon');

    if (id.endpoint) parts.push(`ep:${id.endpoint}`);
    if (id.custom) parts.push(id.custom);

    return parts.join(':');
  }

  /**
   * Check rate limit for an identifier.
   * Returns a result with `allowed` flag and standard headers.
   */
  async check(id: RateLimitIdentifier): Promise<RateLimitResult> {
    const key = this.buildKey(id);
    const now = Date.now();

    switch (this.config.algorithm) {
      case 'sliding-window':
        return this.slidingWindow(key, now);
      case 'token-bucket':
        return this.tokenBucket(key, now);
      case 'fixed-window':
        return this.fixedWindow(key, now);
      default:
        return this.slidingWindow(key, now);
    }
  }

  private async slidingWindow(key: string, now: number): Promise<RateLimitResult> {
    if (!this.useLua) return this.fallbackSlidingWindow(key, now);

    // Use raw client for EVAL (not available through CacheClient interface)
    const rawClient = (this.client as any).client;
    if (!rawClient || typeof rawClient.eval !== 'function') {
      return this.fallbackSlidingWindow(key, now);
    }

    try {
      const result = await rawClient.eval(
        SLIDING_WINDOW_LUA,
        1,
        key,
        String(now),
        String(this.config.windowMs),
        String(this.config.maxRequests)
      );

      const [used, limit, resetAtMs] = result;
      const allowed = used <= limit;
      const remaining = Math.max(0, limit - used);
      const resetAt = Math.ceil(resetAtMs / 1000);

      return this.buildResult(allowed, used, limit, remaining, resetAt, resetAtMs - now);
    } catch {
      return this.fallbackSlidingWindow(key, now);
    }
  }

  private async fallbackSlidingWindow(key: string, now: number): Promise<RateLimitResult> {
    // In-memory fallback using simple counter
    const windowKey = `${key}:${Math.floor(now / this.config.windowMs)}`;
    const raw = await this.client.get(windowKey);
    let count = raw ? parseInt(raw, 10) : 0;

    const allowed = count < this.config.maxRequests;
    if (allowed) {
      count++;
      await this.client.set(windowKey, String(count), this.config.windowMs + 1000);
    }

    const resetAtMs = (Math.floor(now / this.config.windowMs) + 1) * this.config.windowMs;
    const remaining = Math.max(0, this.config.maxRequests - count);

    return this.buildResult(allowed, count, this.config.maxRequests, remaining, Math.ceil(resetAtMs / 1000), resetAtMs - now);
  }

  private async tokenBucket(key: string, now: number): Promise<RateLimitResult> {
    if (!this.useLua) return this.fallbackTokenBucket(key, now);

    const rawClient = (this.client as any).client;
    if (!rawClient || typeof rawClient.eval !== 'function') {
      return this.fallbackTokenBucket(key, now);
    }

    try {
      const refillRate = this.config.maxRequests / (this.config.windowMs / 1000);
      const result = await rawClient.eval(
        TOKEN_BUCKET_LUA,
        1,
        key,
        String(now),
        String(this.config.maxRequests),
        String(refillRate)
      );

      const [allowed, limit, tokens, resetAtMs] = result;
      const remaining = Math.max(0, Math.floor(tokens));
      const resetAt = Math.ceil(resetAtMs / 1000);

      return this.buildResult(!!allowed, limit - remaining, limit, remaining, resetAt, resetAtMs - now);
    } catch {
      return this.fallbackTokenBucket(key, now);
    }
  }

  private async fallbackTokenBucket(key: string, now: number): Promise<RateLimitResult> {
    const raw = await this.client.get(key);
    let tokens = this.config.maxRequests;
    let lastRefill = now;

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        tokens = parsed.tokens;
        lastRefill = parsed.lastRefill;
      } catch { /* ignore */ }
    }

    const elapsed = (now - lastRefill) / 1000;
    const refillRate = this.config.maxRequests / (this.config.windowMs / 1000);
    tokens = Math.min(this.config.maxRequests, tokens + elapsed * refillRate);

    const allowed = tokens >= 1;
    if (allowed) tokens -= 1;

    await this.client.set(
      key,
      JSON.stringify({ tokens, lastRefill: now }),
      this.config.windowMs + 1000
    );

    const remaining = Math.max(0, Math.floor(tokens));
    const resetAtMs = now + Math.ceil((this.config.maxRequests - tokens) / refillRate) * 1000;

    return this.buildResult(allowed, this.config.maxRequests - remaining, this.config.maxRequests, remaining, Math.ceil(resetAtMs / 1000), resetAtMs - now);
  }

  private async fixedWindow(key: string, now: number): Promise<RateLimitResult> {
    if (!this.useLua) return this.fallbackFixedWindow(key, now);

    const rawClient = (this.client as any).client;
    if (!rawClient || typeof rawClient.eval !== 'function') {
      return this.fallbackFixedWindow(key, now);
    }

    try {
      const result = await rawClient.eval(
        FIXED_WINDOW_LUA,
        1,
        key,
        String(now),
        String(this.config.windowMs),
        String(this.config.maxRequests)
      );

      const [used, limit, resetAtMs] = result;
      const allowed = used <= limit;
      const remaining = Math.max(0, limit - used);

      return this.buildResult(allowed, used, limit, remaining, Math.ceil(resetAtMs / 1000), resetAtMs - now);
    } catch {
      return this.fallbackFixedWindow(key, now);
    }
  }

  private async fallbackFixedWindow(key: string, now: number): Promise<RateLimitResult> {
    const windowKey = `${key}:${Math.floor(now / this.config.windowMs)}`;
    const raw = await this.client.get(windowKey);
    let count = raw ? parseInt(raw, 10) : 0;

    const allowed = count < this.config.maxRequests;
    if (allowed) {
      count++;
      await this.client.set(windowKey, String(count), this.config.windowMs + 1000);
    }

    const resetAtMs = (Math.floor(now / this.config.windowMs) + 1) * this.config.windowMs;
    const remaining = Math.max(0, this.config.maxRequests - count);

    return this.buildResult(allowed, count, this.config.maxRequests, remaining, Math.ceil(resetAtMs / 1000), resetAtMs - now);
  }

  private buildResult(
    allowed: boolean,
    used: number,
    limit: number,
    remaining: number,
    resetAt: number,
    resetMs: number
  ): RateLimitResult {
    return {
      allowed,
      remaining,
      limit,
      resetAt,
      resetMs,
      used,
      headers: {
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(resetAt),
      },
    };
  }

  /**
   * Reset rate limit for an identifier.
   */
  async reset(id: RateLimitIdentifier): Promise<void> {
    const key = this.buildKey(id);
    await this.client.del(key);
  }
}

// ─── Predefined Limiters ─────────────────────────────────────────────────────

/** API rate limiter: 100 requests per minute */
export function createApiLimiter(maxPerMinute = 100): RateLimiter {
  return new RateLimiter({
    maxRequests: maxPerMinute,
    windowMs: 60_000,
    algorithm: 'sliding-window',
    keyPrefix: 'dlo:rl:api',
  });
}

/** Auth rate limiter: 5 login attempts per minute */
export function createAuthLimiter(maxPerMinute = 5): RateLimiter {
  return new RateLimiter({
    maxRequests: maxPerMinute,
    windowMs: 60_000,
    algorithm: 'fixed-window',
    keyPrefix: 'dlo:rl:auth',
  });
}

/** Payment rate limiter: 30 payments per minute */
export function createPaymentLimiter(maxPerMinute = 30): RateLimiter {
  return new RateLimiter({
    maxRequests: maxPerMinute,
    windowMs: 60_000,
    algorithm: 'sliding-window',
    keyPrefix: 'dlo:rl:payment',
  });
}

/** Webhook rate limiter: 1000 per minute (bursty) */
export function createWebhookLimiter(maxPerMinute = 1000): RateLimiter {
  return new RateLimiter({
    maxRequests: maxPerMinute,
    windowMs: 60_000,
    algorithm: 'token-bucket',
    keyPrefix: 'dlo:rl:webhook',
  });
}

/** Global rate limiter: 10,000 requests per minute per IP */
export function createGlobalLimiter(maxPerMinute = 10_000): RateLimiter {
  return new RateLimiter({
    maxRequests: maxPerMinute,
    windowMs: 60_000,
    algorithm: 'sliding-window',
    keyPrefix: 'dlo:rl:global',
  });
}
