// ─── Idempotency Guard & Middleware ─────────────────────────────────
//
// Generic idempotency guard that optionally uses Redis (via CacheClient)
// as the backing store for distributed locking across multiple server instances.
// Falls back to an in-memory Map when Redis is not available.
// Includes Next.js API route middleware for Idempotency-Key header.
//

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// ── Types ──────────────────────────────────────────────────────────

export interface IdempotencyEntry<T = unknown> {
  key: string
  status: 'processing' | 'completed' | 'failed'
  response?: T
  responseStatus?: number
  responseHeaders?: Record<string, string>
  createdAt: number
  expiresAt: number
}

export interface AcquireResult {
  acquired: boolean
  alreadyProcessing: boolean
  completedResponse?: IdempotencyEntry
}

// ── Cache client type (duck-typed to avoid hard import at module level) ──

interface SimpleCacheClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlMs?: number): Promise<void>
  del(key: string | string[]): Promise<number>
  isAvailable(): boolean
}

// ── IdempotencyGuard ───────────────────────────────────────────────

/** Redis key prefix for namespacing idempotency entries */
const IDEM_KEY_PREFIX = 'idem:'

export class IdempotencyGuard {
  /** In-memory fallback / local hot cache */
  private cache: Map<string, IdempotencyEntry> = new Map()
  /** Optional Redis-backed cache client */
  private redisClient: SimpleCacheClient | null = null
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  /**
   * @param defaultTtlMs Default TTL for entries in milliseconds
   * @param cleanupIntervalMs How often to purge expired entries (in-memory only)
   */
  constructor(
    private defaultTtlMs: number = 5 * 60 * 1000, // 5 minutes
    private cleanupIntervalMs: number = 60 * 1000, // 1 minute
  ) {
    this.initRedis()
    this.startCleanup()
  }

  /**
   * Attempt to initialise the Redis cache client.
   * Errors are silently swallowed — the in-memory Map is always available.
   */
  private initRedis(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getCacheClient } = require('../cache/client')
      const client = getCacheClient()
      if (client && typeof client.get === 'function' && client.isAvailable()) {
        this.redisClient = client as unknown as SimpleCacheClient
      }
    } catch {
      // Cache module unavailable — in-memory only
    }
  }

  /** Build the namespaced Redis key */
  private rk(key: string): string {
    return `${IDEM_KEY_PREFIX}${key}`
  }

  // ── Public async API (Redis-aware) ────────────────────────────

  /**
   * Attempt to acquire a lock for the given key.
   * Returns true if the lock was acquired (first request).
   * Returns false if already processing or a completed response exists.
   */
  async acquire(lockKey: string, ttlMs?: number): Promise<AcquireResult> {
    const effectiveTtl = ttlMs ?? this.defaultTtlMs
    const now = Date.now()

    // ── Try Redis path ──────────────────────────────────────────
    if (this.redisClient) {
      try {
        return await this.acquireRedis(lockKey, effectiveTtl, now)
      } catch (err) {
        // Redis error — fall through to in-memory path
        console.error('[IdempotencyGuard] Redis acquire failed, falling back to in-memory:', err)
      }
    }

    // ── In-memory fallback (original logic) ─────────────────────
    return this.acquireLocal(lockKey, effectiveTtl, now)
  }

  /**
   * Release a processing lock and store the response for future deduplication.
   */
  async complete<T>(lockKey: string, response: T, status: number = 200, headers?: Record<string, string>): Promise<void> {
    const entry = this.cache.get(lockKey)
    if (!entry) return

    // Update local cache
    entry.status = 'completed'
    entry.response = response as unknown as undefined
    entry.responseStatus = status
    entry.responseHeaders = headers

    // Persist to Redis
    if (this.redisClient) {
      try {
        const remainingTtl = Math.max(0, entry.expiresAt - Date.now())
        await this.redisClient.set(this.rk(lockKey), JSON.stringify(entry), remainingTtl)
      } catch (err) {
        console.error('[IdempotencyGuard] Redis complete failed:', err)
      }
    }
  }

  /**
   * Mark a processing entry as failed (allows retry after short TTL).
   */
  async fail(lockKey: string): Promise<void> {
    const entry = this.cache.get(lockKey)
    if (!entry) return

    entry.status = 'failed'
    entry.expiresAt = Date.now() + 30_000 // 30 seconds

    if (this.redisClient) {
      try {
        await this.redisClient.set(this.rk(lockKey), JSON.stringify(entry), 30_000)
      } catch (err) {
        console.error('[IdempotencyGuard] Redis fail failed:', err)
      }
    }
  }

  /**
   * Release a lock without storing a response.
   */
  async release(lockKey: string): Promise<void> {
    this.cache.delete(lockKey)

    if (this.redisClient) {
      try {
        await this.redisClient.del(this.rk(lockKey))
      } catch (err) {
        console.error('[IdempotencyGuard] Redis release failed:', err)
      }
    }
  }

  /**
   * Check if a key is currently being processed.
   */
  async isProcessing(lockKey: string): Promise<boolean> {
    // ── Try Redis ───────────────────────────────────────────────
    if (this.redisClient) {
      try {
        const raw = await this.redisClient.get(this.rk(lockKey))
        if (raw) {
          const entry: IdempotencyEntry = JSON.parse(raw) as IdempotencyEntry
          if (Date.now() <= entry.expiresAt && entry.status === 'processing') {
            // Warm local cache
            this.cache.set(lockKey, entry)
            return true
          }
        }
        // Key missing or expired in Redis — not processing
        return false
      } catch (err) {
        console.error('[IdempotencyGuard] Redis isProcessing failed, falling back:', err)
      }
    }

    // ── In-memory fallback ───────────────────────────────────────
    const entry = this.cache.get(lockKey)
    if (!entry) return false
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(lockKey)
      return false
    }
    return entry.status === 'processing'
  }

  /**
   * Get cached response for a completed request (or undefined if none).
   */
  async getCachedResponse<T = unknown>(lockKey: string): Promise<IdempotencyEntry<T> | undefined> {
    // ── Try Redis ───────────────────────────────────────────────
    if (this.redisClient) {
      try {
        const raw = await this.redisClient.get(this.rk(lockKey))
        if (raw) {
          const entry: IdempotencyEntry = JSON.parse(raw) as IdempotencyEntry
          if (Date.now() <= entry.expiresAt && entry.status === 'completed') {
            // Warm local cache
            this.cache.set(lockKey, entry)
            return entry as IdempotencyEntry<T>
          }
        }
        // Not in Redis or expired
        return undefined
      } catch (err) {
        console.error('[IdempotencyGuard] Redis getCachedResponse failed, falling back:', err)
      }
    }

    // ── In-memory fallback ───────────────────────────────────────
    const entry = this.cache.get(lockKey)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(lockKey)
      return undefined
    }
    if (entry.status === 'completed') return entry as IdempotencyEntry<T>
    return undefined
  }

  // ── Static helpers (unchanged) ─────────────────────────────────

  /**
   * Generate a payment idempotency key.
   */
  static paymentKey(paymentIntentId: string): string {
    return `idempotency:${paymentIntentId}`
  }

  /**
   * Generate a transition idempotency key (used by state machine).
   */
  static transitionKey(paymentId: string, targetState: string): string {
    return `txn:${paymentId}:${targetState}`
  }

  /**
   * Validate an Idempotency-Key header format.
   */
  static validateKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false
    if (key.length > 255 || key.length < 1) return false
    return /^[a-zA-Z0-9_-]+$/.test(key)
  }

  /**
   * Get the number of entries currently in the local cache.
   * (Only reflects in-memory entries, not Redis.)
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * Clear all entries (useful for testing).
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Destroy the guard and stop cleanup interval.
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.cache.clear()
  }

  // ── Private: Redis acquire path ────────────────────────────────

  private async acquireRedis(lockKey: string, effectiveTtl: number, now: number): Promise<AcquireResult> {
    const key = this.rk(lockKey)
    const raw = await this.redisClient!.get(key)

    if (raw) {
      const entry: IdempotencyEntry = JSON.parse(raw) as IdempotencyEntry

      // Still within TTL
      if (now <= entry.expiresAt) {
        // Warm local cache
        this.cache.set(lockKey, entry)

        if (entry.status === 'processing') {
          return { acquired: false, alreadyProcessing: true }
        }
        // Completed or failed — return cached result
        return { acquired: false, alreadyProcessing: false, completedResponse: entry }
      }

      // Expired in Redis — clean it up
      await this.redisClient!.del(key)
    }

    // Acquire lock: write 'processing' entry to Redis with TTL
    const entry: IdempotencyEntry = {
      key: lockKey,
      status: 'processing',
      createdAt: now,
      expiresAt: now + effectiveTtl,
    }
    await this.redisClient!.set(key, JSON.stringify(entry), effectiveTtl)

    // Also keep in local cache for fast access
    this.cache.set(lockKey, entry)

    return { acquired: true, alreadyProcessing: false }
  }

  // ── Private: In-memory acquire path ────────────────────────────

  private acquireLocal(lockKey: string, effectiveTtl: number, now: number): AcquireResult {
    const existing = this.cache.get(lockKey)

    if (existing) {
      if (now > existing.expiresAt) {
        this.cache.delete(lockKey)
      } else {
        if (existing.status === 'processing') {
          return { acquired: false, alreadyProcessing: true }
        }
        return { acquired: false, alreadyProcessing: false, completedResponse: existing }
      }
    }

    const entry: IdempotencyEntry = {
      key: lockKey,
      status: 'processing',
      createdAt: now,
      expiresAt: now + effectiveTtl,
    }
    this.cache.set(lockKey, entry)
    return { acquired: true, alreadyProcessing: false }
  }

  // ── Private: Cleanup timer (in-memory only) ────────────────────

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.cache) {
        if (now > entry.expiresAt) {
          this.cache.delete(key)
        }
      }
    }, this.cleanupIntervalMs)

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }
}

// ── Singleton ──────────────────────────────────────────────────────

let _guard: IdempotencyGuard | null = null

export function getIdempotencyGuard(): IdempotencyGuard {
  if (!_guard) {
    _guard = new IdempotencyGuard()
  }
  return _guard
}

// ── Next.js Idempotency Middleware ──────────────────────────────────

export interface IdempotencyMiddlewareOptions {
  guard?: IdempotencyGuard
  ttlMs?: number
  headerName?: string
  required?: boolean
}

type ApiHandler = (req: NextRequest, ctx?: { params?: Record<string, string> }) => Promise<NextResponse>

export function withIdempotency(
  handler: ApiHandler,
  options: IdempotencyMiddlewareOptions = {},
): ApiHandler {
  const {
    guard = getIdempotencyGuard(),
    ttlMs,
    headerName = 'Idempotency-Key',
    required = true,
  } = options

  return async (req: NextRequest, ctx) => {
    const idempotencyKey = req.headers.get(headerName)

    if (!idempotencyKey) {
      if (required) {
        return NextResponse.json(
          { error: 'Idempotency-Key header is required', code: 'IDEMPOTENCY_KEY_REQUIRED' },
          { status: 400 },
        )
      }
      return handler(req, ctx)
    }

    if (!IdempotencyGuard.validateKey(idempotencyKey)) {
      return NextResponse.json(
        {
          error: 'Invalid Idempotency-Key format. Use alphanumeric, hyphens, underscores. Max 255 chars.',
          code: 'IDEMPOTENCY_KEY_INVALID',
        },
        { status: 400 },
      )
    }

    const userId = req.headers.get('x-user-id') ?? 'anonymous'
    const lockKey = `${userId}:${idempotencyKey}`

    const result = await guard.acquire(lockKey, ttlMs)

    if (!result.acquired) {
      if (result.alreadyProcessing) {
        return NextResponse.json(
          {
            error: 'Request with this Idempotency-Key is currently being processed',
            code: 'IDEMPOTENCY_CONFLICT',
          },
          {
            status: 409,
            headers: { 'Retry-After': '5' },
          },
        )
      }

      if (result.completedResponse) {
        const cached = result.completedResponse
        return new NextResponse(JSON.stringify(cached.response), {
          status: cached.responseStatus ?? 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Replayed': 'true',
            ...(cached.responseHeaders ?? {}),
          },
        })
      }
    }

    try {
      const response = await handler(req, ctx)

      const responseClone = response.clone()
      const body = await responseClone.text()
      let parsedBody: unknown
      try {
        parsedBody = JSON.parse(body)
      } catch {
        parsedBody = body
      }

      const headersToCache: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        if (key !== 'set-cookie') {
          headersToCache[key] = value
        }
      })

      await guard.complete(lockKey, parsedBody, response.status, headersToCache)

      return response
    } catch (error) {
      await guard.fail(lockKey)
      throw error
    }
  }
}

// ── Idempotent Operation Runner ─────────────────────────────────────

export async function withIdempotentOperation<T>(
  key: string,
  operation: () => Promise<T>,
  guard: IdempotencyGuard = getIdempotencyGuard(),
  ttlMs?: number,
): Promise<T> {
  const acquireResult = await guard.acquire(key, ttlMs)

  if (!acquireResult.acquired) {
    if (acquireResult.completedResponse && acquireResult.completedResponse.response) {
      return acquireResult.completedResponse.response as T
    }
    throw new Error(`Operation with key '${key}' is already in progress`)
  }

  try {
    const result = await operation()
    await guard.complete(key, result)
    return result
  } catch (error) {
    await guard.fail(key)
    throw error
  }
}
