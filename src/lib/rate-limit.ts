/**
 * Digital Lending OS - Rate Limiting Middleware
 * 
 * In-memory rate limiter for Next.js API routes with TTL-based cleanup.
 * Designed for financial applications requiring strict rate limiting.
 * 
 * Features:
 * - Different limits for different route types (auth, payments, admin, general)
 * - Map-based storage with automatic TTL cleanup
 * - Thread-safe for serverless environments
 * - Memory-efficient with configurable cleanup intervals
 * 
 * Rate Limits:
 * - Auth routes: 10 requests/minute per IP (brute force protection)
 * - Payment routes: 30 requests/minute per IP (sensitive operations)
 * - Admin routes: 60 requests/minute per IP
 * - General API: 100 requests/minute per IP
 * 
 * @module rate-limit
 */

// ============================================================
// Types & Interfaces
// ============================================================

/**
 * Rate limit category with specific configuration
 */
export interface RateLimitConfig {
  /** Maximum requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Human-readable description of this limit */
  description: string;
}

/**
 * Information about a single client's rate limit status
 */
export interface RateLimitInfo {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of remaining requests in current window */
  remaining: number;
  /** Timestamp when the window resets (Unix ms) */
  resetAt: number;
  /** Total limit for this window */
  limit: number;
  /** Current request count in window */
  current: number;
  /** Time until reset in milliseconds */
  retryAfterMs: number;
}

/**
 * Result of checking rate limit
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Detailed rate limit information */
  info: RateLimitInfo;
  /** HTTP status code to return if limited (429) */
  statusCode: number;
  /** Error message if rate limited */
  error?: string;
  /** Headers to include in response */
  headers: Record<string, string>;
}

/**
 * Options for creating a rate limiter instance
 */
export interface RateLimiterOptions {
  /** Custom prefix for storage keys (default: 'rl') */
  prefix?: string;
  /** Interval between cleanup runs in ms (default: 60000) */
  cleanupIntervalMs?: number;
  /** Whether to skip rate limiting in development (default: false) */
  skipInDevelopment?: boolean;
}

// ============================================================
// Default Configurations
// ============================================================

/**
 * Predefined rate limit configurations for different route types.
 * Financial applications require stricter limits on sensitive endpoints.
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  /**
   * Authentication routes - strictest limits to prevent brute force attacks
   * 10 requests per minute per IP
   */
  auth: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    description: 'Authentication requests (login, register, password reset)',
  },

  /**
   * Payment routes - sensitive financial operations
   * 30 requests per minute per IP
   */
  payment: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    description: 'Payment operations (STK Push, disbursements)',
  },

  /**
   * Admin routes - administrative operations
   * 60 requests per minute per IP
   */
  admin: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
    description: 'Administrative operations',
  },

  /**
   * General API routes - standard rate limiting
   * 100 requests per minute per IP
   */
  general: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    description: 'General API requests',
  },

  /**
   * Webhook routes - higher limit for callback handling
   * 300 requests per minute (shared across all IPs for webhooks)
   */
  webhook: {
    maxRequests: 300,
    windowMs: 60 * 1000, // 1 minute
    description: 'Webhook callback processing',
  },

  /**
   * Strict rate limit for highly sensitive operations
   * 5 requests per minute (e.g., PIN verification, OTP)
   */
  strict: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    description: 'Highly sensitive operations (PIN, OTP)',
  },
} as const;

/**
 * Route path patterns mapped to rate limit categories
 */
export const ROUTE_RATE_LIMIT_MAP: Array<{
  pattern: RegExp;
  category: keyof typeof RATE_LIMITS;
}> = [
  { pattern: /^\/api\/auth/i, category: 'auth' },
  { pattern: /^\/api\/payments\/stkpush/i, category: 'payment' },
  { pattern: /^\/api\/payments\/disburse/i, category: 'payment' },
  { pattern: /^\/api\/payments\/balance/i, category: 'payment' },
  { pattern: /^\/api\/staff\/actions/i, category: 'admin' },
  { pattern: /^\/api\/tenants/i, category: 'admin' },
  { pattern: /^\/api\/webhook/i, category: 'webhook' },
];

// ============================================================
// Storage Implementation
// ============================================================

/**
 * Internal structure for tracking request counts
 */
interface RequestRecord {
  /** Number of requests in current window */
  count: number;
  /** Window start timestamp */
  windowStart: number;
  /** When this record should expire (for cleanup) */
  expiresAt: number;
}

/**
 * In-memory store for rate limit data.
 * Uses a Map for O(1) lookups and automatic cleanup of expired entries.
 */
class RateLimitStore {
  private store: Map<string, RequestRecord> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private readonly cleanupIntervalMs: number;

  constructor(cleanupIntervalMs: number = 60000) {
    this.cleanupIntervalMs = cleanupIntervalMs;
    this.startCleanup();
  }

  /**
   * Get or create a rate limit record for the given key
   */
  getOrCreate(key: string, windowMs: number): RequestRecord {
    const now = Date.now();
    const existing = this.store.get(key);

    // If record exists and is within window, return it
    if (existing && now < existing.windowStart + windowMs) {
      return existing;
    }

    // Create new record
    const record: RequestRecord = {
      count: 0,
      windowStart: now,
      expiresAt: now + windowMs + 1000, // Small buffer after window ends
    };

    this.store.set(key, record);
    return record;
  }

  /**
   * Increment the request count for a key
   */
  increment(key: string): number {
    const record = this.store.get(key);
    if (!record) {
      return 0;
    }
    record.count++;
    return record.count;
  }

  /**
   * Get current count without incrementing
   */
  getCount(key: string): number {
    return this.store.get(key)?.count ?? 0;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Get total number of stored keys (for monitoring)
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Remove all expired entries from the store
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, record] of this.store.entries()) {
      if (now > record.expiresAt) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0 && process.env.NODE_ENV === 'development') {
      console.log(`[RateLimit] Cleaned up ${cleaned} expired entries`);
    }

    return cleaned;
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanup(): void {
    // Only set up timer if not already running and we're in Node.js environment
    if (this.cleanupTimer === null && typeof globalThis !== 'undefined') {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, this.cleanupIntervalMs);

      // Don't prevent process exit in serverless environments
      if (this.cleanupTimer?.unref) {
        this.cleanupTimer.unref();
      }
    }
  }

  /**
   * Stop cleanup interval (for testing/shutdown)
   */
  stopCleanup(): void {
    if (this.cleanupTimer !== null) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.store.clear();
  }
}

// Global singleton store instance
let globalStore: RateLimitStore | null = null;

/**
 * Get or create the global rate limit store
 */
function getGlobalStore(cleanupIntervalMs?: number): RateLimitStore {
  if (!globalStore) {
    globalStore = new RateLimitStore(cleanupIntervalMs);
  }
  return globalStore;
}

// ============================================================
// Core Rate Limiter Class
// ============================================================

/**
 * Rate Limiter class for checking and enforcing rate limits.
 * 
 * @example
 * ```typescript
 * import { createRateLimiter } from '@/lib/rate-limit';
 * 
 * const limiter = createRateLimiter('auth');
 * const result = await limiter.check(request);
 * 
 * if (!result.success) {
 *   return NextResponse.json(result.error, { status: result.statusCode, headers: result.headers });
 * }
 * ```
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private store: RateLimitStore;
  private prefix: string;
  private skipInDevelopment: boolean;

  constructor(
    category: keyof typeof RATE_LIMITS | RateLimitConfig,
    options: RateLimiterOptions = {}
  ) {
    this.config = typeof category === 'string' ? RATE_LIMITS[category] : category;
    this.prefix = options.prefix || 'rl';
    this.skipInDevelopment = options.skipInDevelopment ?? false;
    this.store = getGlobalStore(options.cleanupIntervalMs);
  }

  /**
   * Check if a request should be rate limited based on IP address.
   * 
   * @param identifier - Unique identifier for the client (typically IP address)
   * @returns Rate limit check result with headers and status info
   */
  check(identifier: string): RateLimitResult {
    // Skip in development if configured
    if (this.skipInDevelopment && process.env.NODE_ENV === 'development') {
      return this.createSuccessResult(this.config.maxRequests, 0);
    }

    const key = `${this.prefix}:${identifier}`;
    const now = Date.now();
    
    // Get or create record for this identifier
    const record = this.store.getOrCreate(key, this.config.windowMs);
    
    // Check if we're in a new window (record was just created or expired)
    const isNewWindow = now >= record.windowStart + this.config.windowMs;
    
    if (isNewWindow) {
      // Reset for new window
      record.count = 1;
      record.windowStart = now;
      record.expiresAt = now + this.config.windowMs + 1000;
      
      return this.createSuccessResult(this.config.maxRequests - 1, 1);
    }

    // Increment and check
    const currentCount = this.store.increment(key);
    const remaining = Math.max(0, this.config.maxRequests - currentCount);
    const resetAt = record.windowStart + this.config.windowMs;

    if (currentCount > this.config.maxRequests) {
      // Rate limited
      return {
        success: false,
        info: {
          allowed: false,
          remaining: 0,
          resetAt,
          limit: this.config.maxRequests,
          current: currentCount,
          retryAfterMs: resetAt - now,
        },
        statusCode: 429,
        error: `Rate limit exceeded. ${this.config.description}. Please try again after ${Math.ceil((resetAt - now) / 1000)} seconds.`,
        headers: {
          'X-RateLimit-Limit': String(this.config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
          'Retry-After': String(Math.ceil((resetAt - now) / 1000)),
        },
      };
    }

    // Success - request allowed
    return this.createSuccessResult(remaining, currentCount, resetAt);
  }

  /**
   * Check rate limit from a NextRequest object.
   * Extracts IP automatically.
   */
  checkRequest(request: Request): RateLimitResult {
    const identifier = this.extractIdentifier(request);
    return this.check(identifier);
  }

  /**
   * Create a successful rate limit result
   */
  private createSuccessResult(
    remaining: number,
    current: number,
    resetAt?: number
  ): RateLimitResult {
    const actualResetAt = resetAt || Date.now() + this.config.windowMs;
    
    return {
      success: true,
      info: {
        allowed: true,
        remaining,
        resetAt: actualResetAt,
        limit: this.config.maxRequests,
        current,
        retryAfterMs: 0,
      },
      statusCode: 200,
      headers: {
        'X-RateLimit-Limit': String(this.config.maxRequests),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(Math.ceil(actualResetAt / 1000)),
      },
    };
  }

  /**
   * Extract unique identifier from request (IP address)
   */
  private extractIdentifier(request: Request): string {
    // Try various headers for IP extraction
    // Order matters: X-Forwarded-For is most common behind load balancers
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      // Take first IP in chain (original client)
      return forwardedFor.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
      return realIp.trim();
    }

    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    if (cfConnectingIp) {
      return cfConnectingIp.trim();
    }

    // Fallback - use a hash of available info
    const userAgent = request.headers.get('user-agent') || 'unknown';
    return `unknown:${userAgent.slice(0, 32)}`;
  }

  /**
   * Get the current configuration
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  /**
   * Reset rate limit for a specific identifier (admin use)
   */
  reset(identifier: string): boolean {
    const key = `${this.prefix}:${identifier}`;
    return this.store.delete(key);
  }
}

// ============================================================
// Factory Functions & Convenience Methods
// ============================================================

/**
 * Create a new rate limiter instance for a specific category.
 * 
 * @param category - Predefined rate limit category or custom config
 * @param options - Optional configuration options
 * @returns Configured RateLimiter instance
 * 
 * @example
 * ```typescript
 * // Use predefined category
 * const authLimiter = createRateLimiter('auth');
 * 
 * // With custom options
 * const paymentLimiter = createRateLimiter('payment', { skipInDevelopment: true });
 * 
 * // With custom config
 * const customLimiter = createRateLimiter({
 *   maxRequests: 50,
 *   windowMs: 60000,
 *   description: 'Custom limit'
 * });
 * ```
 */
export function createRateLimiter(
  category: keyof typeof RATE_LIMITS | RateLimitConfig,
  options: RateLimiterOptions = {}
): RateLimiter {
  return new RateLimiter(category, options);
}

/**
 * Determine the appropriate rate limit category based on request path.
 * 
 * @param pathname - The URL pathname to categorize
 * @returns Rate limit category name
 */
export function getRateLimitCategory(pathname: string): keyof typeof RATE_LIMITS {
  for (const entry of ROUTE_RATE_LIMIT_MAP) {
    if (entry.pattern.test(pathname)) {
      return entry.category;
    }
  }
  
  // Default to general rate limiting
  return 'general';
}

/**
 * Check rate limit for a request with auto-detection of category.
 * 
 * @param request - The incoming request
 * @returns Rate limit result
 */
export function checkRateLimit(request: Request): RateLimitResult {
  const url = new URL(request.url);
  const category = getRateLimitCategory(url.pathname);
  const limiter = createRateLimiter(category);
  return limiter.checkRequest(request);
}

/**
 * Higher-order function to wrap Next.js route handlers with rate limiting.
 * 
 * @param category - Rate limit category or custom config
 * @param handler - The original route handler
 * @returns Wrapped handler that checks rate limit before executing
 * 
 * @example
 * ```typescript
 * export const POST = withRateLimit('auth', async (request: NextRequest) => {
 *   // Handler logic - only executes if not rate limited
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withRateLimit<T extends unknown[] = []>(
  category: keyof typeof RATE_LIMITS | RateLimitConfig,
  handler: (request: Request, ...args: T) => Promise<Response> | Response
): (request: Request, ...args: T) => Promise<Response> {
  const limiter = createRateLimiter(category);

  return async (request: Request, ...args: T): Promise<Response> => {
    const result = limiter.checkRequest(request);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too Many Requests',
          message: result.error,
          code: 'RATE_LIMITED',
        }),
        {
          status: result.statusCode,
          headers: {
            'Content-Type': 'application/json',
            ...result.headers,
          },
        }
      );
    }

    // Add rate limit headers to successful response
    const response = await handler(request, ...args);
    
    // Clone response to add headers
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    // Add rate limit headers
    Object.entries(result.headers).forEach(([key, value]) => {
      newResponse.headers.set(key, value);
    });

    return newResponse;
  };
}

// ============================================================
// Export singleton for advanced usage
// ============================================================

/**
 * Get access to the underlying store for monitoring/admin purposes.
 * Use sparingly - primarily for testing and diagnostics.
 */
export function getRateLimitStore(): RateLimitStore {
  return getGlobalStore();
}

// Export types
export type {
  RateLimitConfig,
  RateLimitInfo,
  RateLimitResult,
  RateLimiterOptions,
};
