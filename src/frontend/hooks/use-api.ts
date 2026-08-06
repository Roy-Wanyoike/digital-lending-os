'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ─── Type-safe API data-fetching hook ──────────────────────────────────
// Zero UI dependencies — no framer-motion, no Card, no lucide.
// Tree-shakeable: only imported by tabs that need it.

export interface UseApiOptions {
  /** Custom headers to merge with defaults */
  headers?: Record<string, string>
  /** Disable automatic fetch on mount (useful for POST-triggered flows) */
  enabled?: boolean
  /** Callback on auth error (401). Default: redirect to /login. */
  onAuthError?: () => void
  /**
   * Stale-while-revalidate TTL in ms. Default: 30 000 (30s).
   * While cached data is fresh, no request is made.
   * While cached data is stale, stale data is shown immediately and a
   * background revalidation request is fired.
   * Set to 0 to disable SWR caching (always fetch).
   */
  dedupWindowMs?: number
}

export interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// ─── Stale-while-revalidate cache entry ─────────────────────────────

interface CacheEntry<T = any> {
  data: T
  etag?: string
  /** Timestamp when data was fetched */
  fetchedAt: number
}

// In-flight request deduplication cache.
// Keyed by URL. Prevents duplicate concurrent requests.
const _inflight = new Map<string, Promise<any>>()

// Stale-while-revalidate data cache.
// Keyed by URL (without cache-busting keys).
// Entries survive across component mounts/unmounts.
const _dataCache = new Map<string, CacheEntry>()

// Maximum entries in the data cache to prevent memory leaks
const MAX_DATA_CACHE_SIZE = 200

// Default SWR window: 30 seconds fresh, revalidate after that
const DEFAULT_DEDUP_WINDOW_MS = 30_000

/** Remove oldest entries if cache exceeds max size */
function evictOldest() {
  if (_dataCache.size <= MAX_DATA_CACHE_SIZE) return
  // Convert to array, sort by fetchedAt ascending, delete oldest
  const entries = Array.from(_dataCache.entries()).sort((a, b) => a[1].fetchedAt - b[1].fetchedAt)
  const toRemove = entries.length - MAX_DATA_CACHE_SIZE
  for (let i = 0; i < toRemove; i++) {
    _dataCache.delete(entries[i][0])
  }
}

/**
 * Prefetch a URL into the SWR data cache WITHOUT triggering a re-render.
 * Used for hover/visible prefetching — data is ready when the component mounts.
 * Returns a promise that resolves to the data (or null on error).
 * Deduplicates: if a request for this URL is already in-flight, shares it.
 */
export function prefetchUrl<T = any>(url: string, options: { dedupWindowMs?: number } = {}): Promise<T | null> {
  const { dedupWindowMs = DEFAULT_DEDUP_WINDOW_MS } = options
  if (!url || dedupWindowMs <= 0) return Promise.resolve(null)

  const stable = stableUrl(url)
  const cached = _dataCache.get(stable)
  if (cached && (Date.now() - cached.fetchedAt) < dedupWindowMs) {
    return Promise.resolve(cached.data as T)
  }

  // Check for in-flight request — share it
  let pending = _inflight.get(stable)
  if (!pending) {
    const fetchHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
    if (cached?.etag) fetchHeaders['If-None-Match'] = cached.etag

    pending = fetch(url, { headers: fetchHeaders })
      .then(r => {
        if (r.status === 304) {
          if (cached) _dataCache.set(stable, { ...cached, fetchedAt: Date.now() })
          return { __stale: true, data: cached?.data, etag: cached?.etag }
        }
        if (!r.ok) return null
        return r.json().then(json => ({
          __stale: false,
          data: json,
          etag: r.headers.get('ETag') || undefined,
        }))
      })
      .catch(() => null)
    _inflight.set(stable, pending)
  }

  return pending.then(result => {
    _inflight.delete(stable)
    if (!result) return null

    let responseData = result.__stale ? result.data : result.data
    if (responseData === null || responseData === undefined) return null

    // Auto-unwrap { data: T } envelope
    let unwrapped: any = responseData
    if (typeof responseData === 'object' && !Array.isArray(responseData) && 'data' in responseData) {
      unwrapped = responseData.data
    }

    if (dedupWindowMs > 0 && !result.__stale) {
      _dataCache.set(stable, { data: unwrapped, etag: result.etag, fetchedAt: Date.now() })
      evictOldest()
    }
    return unwrapped as T
  })
}

/**
 * Statically populate the SWR cache with known data.
 * Used after a batch fetch to seed individual URL caches.
 */
export function seedCache(url: string, data: any) {
  const stable = stableUrl(url)
  _dataCache.set(stable, { data, fetchedAt: Date.now() })
}

/**
 * Invalidate cached data for a specific URL or all URLs.
 * Triggers a fresh fetch on the next render for affected hooks.
 */
export function invalidateCache(url?: string) {
  if (url) {
    const stable = stableUrl(url)
    _inflight.delete(stable)
    _dataCache.delete(stable)
  } else {
    _inflight.clear()
    _dataCache.clear()
  }
}

// ─── Stable URL key (strip cache-busting query params) ─────────────

/** Strip `&k=N` cache-busting params for cache lookup */
function stableUrl(url: string): string {
  return url.replace(/[&?]k=\d+/, '')
}

/**
 * Generic data-fetching hook for the Youngsend dashboard.
 *
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useApi<WalletData[]>('/api/wallets')
 * ```
 *
 * Features:
 * - Auto-unwraps `{ data: T }` envelope from API routes
 * - Handles error responses with `{ error: string }` shape
 * - 401 → redirects to /login (configurable via onAuthError)
 * - AbortController cleanup on unmount / URL change
 * - Refetch via cache-busting key increment
 * - Stale-while-revalidate: serves cached data while revalidating in background
 * - ETag support: sends If-None-Match to skip full response when unchanged
 * - In-flight deduplication: concurrent requests to same URL share one fetch
 */
export function useApi<T>(url: string, options: UseApiOptions = {}): UseApiResult<T> {
  const { headers, enabled = true, onAuthError, dedupWindowMs = DEFAULT_DEDUP_WINDOW_MS } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)
  const mountedRef = useRef(true)

  // Router for auth-redirect on 401 responses.
  const routerRef = useRef<ReturnType<typeof useRouter> | null>(null)
  const router = useRouter()
  routerRef.current = router

  const refetch = useCallback(() => {
    const stable = stableUrl(url)
    _inflight.delete(stable)
    _dataCache.delete(stable)
    setKey(k => k + 1)
  }, [url])

  useEffect(() => {
    if (!url || !enabled) {
      setLoading(false)
      return
    }

    let cancelled = false
    mountedRef.current = true
    const controller = new AbortController()
    const stable = stableUrl(url)

    // Check SWR data cache
    const cached = dedupWindowMs > 0 ? _dataCache.get(stable) : undefined
    const now = Date.now()
    const isFresh = cached && (now - cached.fetchedAt) < dedupWindowMs
    const isStale = cached && (now - cached.fetchedAt) >= dedupWindowMs

    // If we have fresh cached data, serve it immediately — no network request
    if (isFresh) {
      if (cancelled || !mountedRef.current) return
      setData(cached.data as T)
      setLoading(false)
      setError(null)
      return
    }

    // If we have stale data, show it immediately but revalidate in background
    if (isStale) {
      if (mountedRef.current && !cancelled) {
        setData(cached.data as T)
        setLoading(false)
        // Don't clear error — we'll update it if revalidation fails
      }
    } else {
      // No cache at all — show loading state
      setLoading(true)
      setError(null)
    }

    // Check for in-flight duplicate request (dedup)
    let pending = _inflight.get(stable)
    if (!pending) {
      // Build request headers with ETag support
      const fetchHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      }
      if (cached?.etag) {
        fetchHeaders['If-None-Match'] = cached.etag
      }

      pending = fetch(url, {
        signal: controller.signal,
        headers: fetchHeaders,
      })
        .then(r => {
          // Handle 304 Not Modified — data unchanged, refresh cache timestamp
          if (r.status === 304) {
            if (cached) {
              _dataCache.set(stable, { ...cached, fetchedAt: Date.now() })
            }
            return { __stale: true, data: cached?.data }
          }
          // Handle 401 — redirect to login
          if (r.status === 401) {
            if (onAuthError) {
              onAuthError()
            } else if (routerRef.current) {
              routerRef.current.push('/login')
            }
            return null
          }
          if (!r.ok) {
            const errMsg = `Request failed with status ${r.status}`
            // Only set error if this is a primary fetch (not background revalidation)
            if (!isStale) setError(errMsg)
            return null
          }
          return r.json().then(json => ({
            __stale: false,
            data: json,
            etag: r.headers.get('ETag') || undefined,
          }))
        })
        .catch(err => {
          if (err.name === 'AbortError') return null
          throw err
        })
      _inflight.set(stable, pending)
    }

    pending
      .then(result => {
        if (cancelled || !mountedRef.current) return
        if (!result) {
          if (!isStale) {
            setData(null)
            setLoading(false)
          }
          return
        }

        let responseData = result.__stale ? result.data : result.data

        if (responseData === null || responseData === undefined) {
          if (!isStale) {
            setData(null)
            setLoading(false)
          }
          return
        }

        // Auto-unwrap { data: T } envelope
        let unwrapped: any = responseData
        if (typeof responseData === 'object' && !Array.isArray(responseData) && 'data' in responseData) {
          unwrapped = (responseData as any).data
          if (unwrapped === undefined || unwrapped === null) {
            if (!isStale) { setData(null); setLoading(false) }
            return
          } else if (!Array.isArray(unwrapped) && typeof unwrapped === 'object' && 'error' in unwrapped) {
            if (!isStale) {
              const rawErr = (unwrapped as any).error;
              setError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Unexpected response format'));
              setData(null); setLoading(false);
            }
            return
          }
        } else if (typeof responseData === 'object' && 'error' in responseData) {
          if (!isStale) {
            const rawErr = (responseData as any).error;
            setError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Request failed'));
            setData(null); setLoading(false);
          }
          return
        }

        // Update state
        setData(unwrapped as T)
        setLoading(false)
        setError(null)

        // Update data cache
        if (dedupWindowMs > 0 && !result.__stale) {
          _dataCache.set(stable, {
            data: unwrapped,
            etag: result.etag,
            fetchedAt: Date.now(),
          })
          evictOldest()
        }
      })
      .catch(err => {
        if (cancelled || !mountedRef.current) return
        // For background revalidation, don't overwrite stale data with error
        if (!isStale) {
          setError(err.name === 'AbortError' ? null : 'Network error — check your connection')
          setData(null)
          setLoading(false)
        }
      })
      .finally(() => {
        _inflight.delete(stable)
      })

    return () => {
      cancelled = true
      mountedRef.current = false
      controller.abort()
    }
  }, [url, key, enabled, headers, onAuthError, dedupWindowMs])

  return { data, loading, error, refetch }
}
