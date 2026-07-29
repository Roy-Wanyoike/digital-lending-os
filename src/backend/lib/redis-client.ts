/**
 * Redis client wrapper — in-memory Map fallback when no Redis server is available.
 *
 * In production, swap the store for real ioredis. The interface stays identical.
 * TTL strategy (seconds):
 *   - dashboard stats: 30s
 *   - user profile: 5min (300s)
 *   - payment methods: 10min (600s)
 *   - exchange rates: 60s
 *   - fraud rules: 5min (300s)
 */

// ── In-memory store ─────────────────────────────────────────────────────────

type CacheEntry<T = unknown> = {
  value: T
  expiresAt: number // Unix ms
}

const store = new Map<string, CacheEntry>()

function isExpired(entry: CacheEntry): boolean {
  return Date.now() > entry.expiresAt
}

// Periodically purge expired entries (every 60s)
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).__cachePurge === 'undefined') {
  (globalThis as any).__cachePurge = true
  setInterval(() => {
    for (const [key, entry] of store) {
      if (isExpired(entry)) store.delete(key)
    }
  }, 60_000)
}

// ── TTL presets (seconds) ──────────────────────────────────────────────────

export const CACHE_TTL = {
  /** Dashboard stats — 30s */
  DASHBOARD_STATS: 30,
  /** User profile — 5min */
  USER_PROFILE: 300,
  /** Payment methods — 10min */
  PAYMENT_METHODS: 600,
  /** Exchange rates — 60s */
  EXCHANGE_RATES: 60,
  /** Fraud rules — 5min */
  FRAUD_RULES: 300,
} as const

// ── Core API ────────────────────────────────────────────────────────────────

/**
 * Get a cached value by key. Returns null on miss or expiry.
 */
export async function getCache<T = unknown>(key: string): Promise<T | null> {
  const entry = store.get(key)
  if (!entry) return null
  if (isExpired(entry)) {
    store.delete(key)
    return null
  }
  return entry.value as T
}

/**
 * Set a cache value with TTL in seconds.
 */
export async function setCache<T = unknown>(key: string, value: T, ttlSeconds: number): Promise<void> {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}

/**
 * Invalidate one or more cache keys (supports glob-like * suffix).
 */
export async function invalidateCache(patternOrKey: string): Promise<number> {
  if (!patternOrKey.includes('*')) {
    return store.delete(patternOrKey) ? 1 : 0
  }
  // Simple prefix match for patterns like "stats:*"
  const prefix = patternOrKey.replace(/\*$/, '')
  let count = 0
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key)
      count++
    }
  }
  return count
}

/**
 * Cache a value with automatic TTL. Returns the cached/fresh value.
 * If the key already exists and is not expired, returns the cached value.
 * Otherwise calls `fetcher`, caches the result, and returns it.
 */
export async function cacheWithTTL<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
): Promise<T> {
  const cached = await getCache<T>(key)
  if (cached !== null) return cached

  const fresh = await fetcher()
  await setCache(key, fresh, ttlSeconds)
  return fresh
}

/**
 * Build a cache key from tenant ID and sub-key.
 * Format: `tenant:{tenantId}:{subKey}`
 */
export function tenantKey(tenantId: string, subKey: string): string {
  return `tenant:${tenantId}:${subKey}`
}

/**
 * Build a cache key from user ID and sub-key.
 * Format: `user:{userId}:{subKey}`
 */
export function userKey(userId: string, subKey: string): string {
  return `user:${userId}:${subKey}`
}
