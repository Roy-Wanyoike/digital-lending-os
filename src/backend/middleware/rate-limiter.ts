// ─── In-Memory Rate Limiter ────────────────────────────────────
// Sliding-window rate limiter backed by a Map.  Each key (typically an IP)
// stores an array of request timestamps.  Stale entries are pruned on every
// check, so the Map never grows unboundedly even without a separate cleanup
// timer.

interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

// Default: 5 attempts per 60-second window for login
const DEFAULT_MAX_REQUESTS = 5
const DEFAULT_WINDOW_MS = 60 * 1000

export interface RateLimitResult {
  allowed: boolean
  retryAfterMs?: number
}

/**
 * Check whether the given key is within the rate limit.
 *
 * @param key   Identifier (e.g. IP address or "ip:email" combo)
 * @param maxRequests  Max number of requests allowed within the window
 * @param windowMs     Window duration in milliseconds
 * @returns `allowed: true` if the request should proceed, or
 *          `allowed: false` with `retryAfterMs` if the limit is exceeded.
 */
export function rateLimit(
  key: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowMs: number = DEFAULT_WINDOW_MS,
): RateLimitResult {
  const now = Date.now()
  const windowStart = now - windowMs

  let entry = store.get(key)

  if (!entry) {
    // First request for this key
    store.set(key, { timestamps: [now] })
    return { allowed: true }
  }

  // Prune timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart)

  if (entry.timestamps.length >= maxRequests) {
    // Rate limited — compute how long until the oldest timestamp expires
    const oldestInWindow = entry.timestamps[0]
    const retryAfterMs = oldestInWindow + windowMs - now
    return { allowed: false, retryAfterMs }
  }

  // Within limit — record this request
  entry.timestamps.push(now)
  store.set(key, entry)
  return { allowed: true }
}

/**
 * Optional: remove expired entries to free memory.
 * Safe to call periodically (e.g. every minute) from a setInterval or cron.
 */
export function pruneExpired(windowMs: number = DEFAULT_WINDOW_MS): void {
  const now = Date.now()
  const windowStart = now - windowMs

  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart)
    if (entry.timestamps.length === 0) {
      store.delete(key)
    }
  }
}

// Auto-prune every 5 minutes to keep memory bounded
if (typeof setInterval !== 'undefined') {
  setInterval(() => pruneExpired(), 5 * 60 * 1000)
}
