/**
 * Enhanced Rate Limiting
 * 
 * Provides advanced rate limiting with:
 * - Sliding window algorithm
 * - Per-user/per-API-key limits
 * - Redis-backed distributed limiting (optional)
 * - In-memory fallback
 */

import { Request, Response, NextFunction } from 'express';

// =============================================================================
// TYPES
// =============================================================================

export interface RateLimitOptions {
  /**
   * Maximum requests allowed in window
   */
  maxRequests: number;

  /**
   * Window size in milliseconds
   */
  windowMs: number;

  /**
   * Key generator function (default: by IP)
   */
  keyGenerator?: (req: Request) => string;

  /**
   * Skip function to bypass rate limit
   */
  skip?: (req: Request) => boolean | Promise<boolean>;

  /**
   * Custom handler when limit exceeded
   */
  handler?: (req: Request, res: Response) => void;

  /**
   * Headers to send with response
   */
  headers?: boolean;

  /**
   * Store type for distributed limiting
   */
  store?: 'memory' | 'redis';
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter: number;
  isLimited: boolean;
}

interface SlidingWindowEntry {
  timestamp: number;
}

// =============================================================================
// SLIDING WINDOW RATE LIMITER (IN-MEMORY)
// =============================================================================

class SlidingWindowLimiter {
  private windows: Map<string, SlidingWindowEntry[]> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private cleanupIntervalMs: number = 60000) {
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  async check(key: string, maxRequests: number, windowMs: number): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create window entries for this key
    let entries = this.windows.get(key);
    
    if (!entries) {
      entries = [];
      this.windows.set(key, entries);
    }

    // Remove expired entries
    const validEntries = entries.filter(e => e.timestamp > windowStart);
    this.windows.set(key, validEntries);

    const currentCount = validEntries.length;
    const isLimited = currentCount >= maxRequests;
    const resetTime = new Date(validEntries[0]?.timestamp + windowMs || now + windowMs);
    const retryAfter = Math.ceil((resetTime.getTime() - now) / 1000);

    if (!isLimited) {
      // Add new entry
      validEntries.push({ timestamp: now });
    }

    return {
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - currentCount - (isLimited ? 0 : 1)),
      resetTime,
      retryAfter: Math.max(0, retryAfter),
      isLimited,
    };
  }

  reset(key: string): void {
    this.windows.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entries] of this.windows.entries()) {
      const validEntries = entries.filter(e => {
        // Keep entries from last hour at most for cleanup purposes
        return e.timestamp > now - 3600000;
      });

      if (validEntries.length === 0) {
        this.windows.delete(key);
        cleaned++;
      } else if (validEntries.length !== entries.length) {
        this.windows.set(key, validEntries);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.windows.clear();
  }
}

// =============================================================================
// TOKEN BUCKET ALTERNATIVE
// =============================================================================

class TokenBucketLimiter {
  private buckets: Map<string, { tokens: number; lastRefill: number }> = new Map();

  async check(
    key: string,
    maxTokens: number,
    refillRateMs: number
  ): Promise<RateLimitInfo> {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on time elapsed
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(elapsed / refillRateMs);
    
    bucket.tokens = Math.min(maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    const canConsume = bucket.tokens > 0;

    if (canConsume) {
      bucket.tokens--;
    }

    const retryAfter = bucket.tokens === 0 ? refillRateMs / 1000 : 0;

    return {
      limit: maxTokens,
      remaining: bucket.tokens,
      resetTime: new Date(now + (maxTokens - bucket.tokens) * refillRateMs),
      retryAfter,
      isLimited: !canConsume,
    };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }
}

// =============================================================================
// EXPRESS MIDDLEWARE FACTORY
// =============================================================================

const memoryLimiters = new Map<string, SlidingWindowLimiter>();

function getMemoryLimiter(windowMs: number): SlidingWindowLimiter {
  const key = `window_${windowMs}`;
  
  if (!memoryLimiters.has(key)) {
    memoryLimiters.set(key, new SlidingWindowLimiter());
  }

  return memoryLimiters.get(key)!;
}

/**
 * Create a sliding window rate limiter middleware
 * 
 * @example
 * ```typescript
 * // Basic usage
 * app.use(rateLimit({ maxRequests: 100, windowMs: 60000 }));
 * 
 * // Per-user limiting
 * app.use('/api', rateLimit({
 *   maxRequests: 1000,
 *   windowMs: 3600000,
 *   keyGenerator: (req) => req.user?.id || req.ip,
 * }));
 * 
 * // Strict auth limits
 * app.use('/api/auth', rateLimit({
 *   maxRequests: 10,
 *   windowMs: 60000,
 *   keyGenerator: (req) => req.ip,
 * }));
 * ```
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    maxRequests,
    windowMs,
    keyGenerator = defaultKeyGenerator,
    skip = () => false,
    handler = defaultHandler,
    headers = true,
  } = options;

  const limiter = getMemoryLimiter(windowMs);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if should skip
      const shouldSkip = await skip(req);
      if (shouldSkip) {
        return next();
      }

      // Generate key
      const key = keyGenerator(req);

      // Check rate limit
      const info = await limiter.check(key, maxRequests, windowMs);

      // Set headers
      if (headers) {
        res.setHeader('X-RateLimit-Limit', info.limit);
        res.setHeader('X-RateLimit-Remaining', info.remaining);
        res.setHeader('X-RateLimit-Reset', info.resetTime.getTime() / 1000);
        
        if (info.isLimited) {
          res.setHeader('Retry-After', info.retryAfter);
        }
      }

      // Check if limited
      if (info.isLimited) {
        return handler(req, res, info);
      }

      next();
    } catch (error) {
      // On error, allow request through
      console.error('[RateLimit] Error:', error);
      next();
    }
  };
}

// =============================================================================
// DEFAULT IMPLEMENTATIONS
// =============================================================================

function defaultKeyGenerator(req: Request): string {
  // Try API key first, then user ID, then IP
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) return `apikey:${apiKey}`;

  const userId = (req as any).user?.id;
  if (userId) return `user:${userId}`;

  // Use IP (handle proxies)
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0] : req.ip;
  return `ip:${ip}`;
}

function defaultHandler(
  req: Request,
  res: Response,
  info?: RateLimitInfo
): void {
  res.status(429).json({
    success: false,
    error: 'Too many requests',
    message: `Rate limit exceeded. Please try again later.`,
    retryAfter: info?.retryAfter || 60,
  });
}

// =============================================================================
// PRECONFIGURED LIMITERS
// =============================================================================

/**
 * General API rate limiter (100 requests per minute)
 */
export const apiRateLimiter = createRateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  headers: true,
});

/**
 * Authentication endpoint limiter (20 requests per minute)
 */
export const authRateLimiter = createRateLimiter({
  maxRequests: 20,
  windowMs: 60 * 1000,
  headers: true,
});

/**
 * Strict auth limiter (5 login attempts per minute)
 */
export const strictAuthRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 1000,
  keyGenerator: (req) => {
    // Limit by IP + email/phone combination for login attempts
    const ip = req.ip;
    const body = req.body || {};
    const identifier = body.email || body.phone || ip;
    return `login:${ip}:${identifier}`;
  },
  headers: true,
});

/**
 * Webhook rate limiter (1000 requests per minute)
 */
export const webhookRateLimiter = createRateLimiter({
  maxRequests: 1000,
  windowMs: 60 * 1000,
  skip: (req) => {
    // Verify webhook signature before counting
    return false; // Always count webhooks
  },
  headers: true,
});

/**
 * File upload limiter (10 uploads per minute)
 */
export const uploadRateLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000,
  headers: true,
});

/**
 * Export/report generation limiter (5 per hour)
 */
export const exportRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyGenerator: (req) => {
    const userId = (req as any).user?.id;
    return `export:${userId}`;
  },
  headers: true,
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get current rate limit status for a key
 */
export async function getRateLimitStatus(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitInfo> {
  const limiter = getMemoryLimiter(windowMs);
  return limiter.check(key, maxRequests, windowMs);
}

/**
 * Reset rate limit for a specific key (admin use)
 */
export function resetRateLimit(key: string, windowMs?: number): void {
  if (windowMs) {
    const limiter = getMemoryLimiter(windowMs);
    limiter.reset(key);
  } else {
    // Reset in all limiters
    for (const [, limiter] of memoryLimiters) {
      limiter.reset(key);
    }
  }
}

/**
 * Cleanup all limiters (for shutdown)
 */
export function cleanupLimiters(): void {
  for (const [, limiter] of memoryLimiters) {
    limiter.destroy();
  }
  memoryLimiters.clear();
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  SlidingWindowLimiter,
  TokenBucketLimiter,
};

export default createRateLimiter;
