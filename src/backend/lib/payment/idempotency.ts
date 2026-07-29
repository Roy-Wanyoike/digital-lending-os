// ─── Idempotency Guard & Middleware ─────────────────────────────────
//
// Generic idempotency guard using in-memory Map with TTL support.
// Production would use Redis (SET NX EX) for distributed locking.
// Includes Next.js API route middleware for Idempotency-Key header.
//

import type { NextRequest, NextResponse } from 'next/server'

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

// ── IdempotencyGuard ───────────────────────────────────────────────

export class IdempotencyGuard {
  private cache: Map<string, IdempotencyEntry> = new Map()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  /**
   * @param defaultTtlMs Default TTL for entries in milliseconds
   * @param cleanupIntervalMs How often to purge expired entries
   */
  constructor(
    private defaultTtlMs: number = 5 * 60 * 1000, // 5 minutes
    private cleanupIntervalMs: number = 60 * 1000, // 1 minute
  ) {
    this.startCleanup()
  }

  /**
   * Attempt to acquire a lock for the given key.
   * Returns true if the lock was acquired (first request).
   * Returns false if already processing or a completed response exists.
   */
  acquire(lockKey: string, ttlMs?: number): AcquireResult {
    const effectiveTtl = ttlMs ?? this.defaultTtlMs
    const now = Date.now()
    const existing = this.cache.get(lockKey)

    // Check for existing entry
    if (existing) {
      // Expired entry — clean up and allow new acquisition
      if (now > existing.expiresAt) {
        this.cache.delete(lockKey)
      } else {
        // Still active
        if (existing.status === 'processing') {
          return { acquired: false, alreadyProcessing: true }
        }
        // Completed or failed — return cached result
        return { acquired: false, alreadyProcessing: false, completedResponse: existing }
      }
    }

    // Acquire lock
    const entry: IdempotencyEntry = {
      key: lockKey,
      status: 'processing',
      createdAt: now,
      expiresAt: now + effectiveTtl,
    }
    this.cache.set(lockKey, entry)
    return { acquired: true, alreadyProcessing: false }
  }

  /**
   * Release a processing lock and store the response for future deduplication.
   */
  complete<T>(lockKey: string, response: T, status: number = 200, headers?: Record<string, string>): void {
    const entry = this.cache.get(lockKey)
    if (!entry) {
      return
    }
    entry.status = 'completed'
    entry.response = response as unknown as undefined
    entry.responseStatus = status
    entry.responseHeaders = headers
  }

  /**
   * Mark a processing entry as failed (allows retry after short TTL).
   */
  fail(lockKey: string): void {
    const entry = this.cache.get(lockKey)
    if (!entry) return
    entry.status = 'failed'
    entry.expiresAt = Date.now() + 30_000 // 30 seconds
  }

  /**
   * Release a lock without storing a response.
   */
  release(lockKey: string): void {
    this.cache.delete(lockKey)
  }

  /**
   * Check if a key is currently being processed.
   */
  isProcessing(lockKey: string): boolean {
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
  getCachedResponse<T = unknown>(lockKey: string): IdempotencyEntry<T> | undefined {
    const entry = this.cache.get(lockKey)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(lockKey)
      return undefined
    }
    if (entry.status === 'completed') return entry as IdempotencyEntry<T>
    return undefined
  }

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
   * Get the number of entries currently in the cache.
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

  // ── Private ──────────────────────────────────────────────────

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

    const result = guard.acquire(lockKey, ttlMs)

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

      guard.complete(lockKey, parsedBody, response.status, headersToCache)

      return response
    } catch (error) {
      guard.fail(lockKey)
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
  const acquireResult = guard.acquire(key, ttlMs)

  if (!acquireResult.acquired) {
    if (acquireResult.completedResponse && acquireResult.completedResponse.response) {
      return acquireResult.completedResponse.response as T
    }
    throw new Error(`Operation with key '${key}' is already in progress`)
  }

  try {
    const result = await operation()
    guard.complete(key, result)
    return result
  } catch (error) {
    guard.fail(key)
    throw error
  }
}
