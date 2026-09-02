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
 * Generic data-fetching hook for the Digital Lending OS dashboard.
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

  // ── Read SWR cache during render (synchronous Map lookup, no side effects) ──
  const stable = stableUrl(url)
  const cacheEntry = dedupWindowMs > 0 ? _dataCache.get(stable) : undefined
  const isCacheFresh = !!(cacheEntry && (Date.now() - cacheEntry.fetchedAt) < dedupWindowMs)

  // ── Fetch state (tracks async network fetch results) ──
  const [fetchData, setFetchData] = useState<T | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetchDone, setFetchDone] = useState(false)
  const [key, setKey] = useState(0)
  const mountedRef = useRef(true)

  // Router for auth-redirect on 401 responses.
  const routerRef = useRef<ReturnType<typeof useRouter> | null>(null)
  const router = useRouter()

  useEffect(() => {
    routerRef.current = router
  }, [router])

  const refetch = useCallback(() => {
    const s = stableUrl(url)
    _inflight.delete(s)
    _dataCache.delete(s)
    setFetchData(null)
    setFetchError(null)
    setFetchDone(false)
    setKey(k => k + 1)
  }, [url])

  // ── Fetch effect — only starts the async network request ──
  // No synchronous setState; all state updates happen in .then()/.catch() callbacks.
  useEffect(() => {
    if (!url || !enabled) return

    // Re-check cache freshness inside the effect (same logic as render-time).
    const s = stableUrl(url)
    const cached = dedupWindowMs > 0 ? _dataCache.get(s) : undefined
    if (cached && (Date.now() - cached.fetchedAt) < dedupWindowMs) return  // Fresh cache — skip fetch

    const isStale = !!cached  // Not fresh (checked above) but has stale entry

    let cancelled = false
    mountedRef.current = true
    const controller = new AbortController()

    // Check for in-flight duplicate request (dedup)
    let pending = _inflight.get(s)
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
              _dataCache.set(s, { ...cached, fetchedAt: Date.now() })
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
            if (!isStale) setFetchError(errMsg)
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
      _inflight.set(s, pending)
    }

    pending
      .then(result => {
        if (cancelled || !mountedRef.current) return
        if (!result) {
          if (!isStale) {
            setFetchData(null)
            setFetchDone(true)
          }
          return
        }

        let responseData = result.__stale ? result.data : result.data

        if (responseData === null || responseData === undefined) {
          if (!isStale) {
            setFetchData(null)
            setFetchDone(true)
          }
          return
        }

        // Auto-unwrap { data: T } envelope
        let unwrapped: any = responseData
        if (typeof responseData === 'object' && !Array.isArray(responseData) && 'data' in responseData) {
          unwrapped = (responseData as any).data
          if (unwrapped === undefined || unwrapped === null) {
            if (!isStale) { setFetchData(null); setFetchDone(true) }
            return
          } else if (!Array.isArray(unwrapped) && typeof unwrapped === 'object' && 'error' in unwrapped) {
            if (!isStale) {
              const rawErr = (unwrapped as any).error;
              setFetchError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Unexpected response format'));
              setFetchData(null); setFetchDone(true);
            }
            return
          }
        } else if (typeof responseData === 'object' && 'error' in responseData) {
          if (!isStale) {
            const rawErr = (responseData as any).error;
            setFetchError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Request failed'));
            setFetchData(null); setFetchDone(true);
          }
          return
        }

        // Update fetch state
        setFetchData(unwrapped as T)
        setFetchDone(true)
        setFetchError(null)

        // Update data cache
        if (dedupWindowMs > 0 && !result.__stale) {
          _dataCache.set(s, {
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
          setFetchError(err.name === 'AbortError' ? null : 'Network error — check your connection')
          setFetchData(null)
          setFetchDone(true)
        }
      })
      .finally(() => {
        _inflight.delete(s)
      })

    return () => {
      cancelled = true
      mountedRef.current = false
      controller.abort()
    }
  }, [url, key, enabled, headers, onAuthError, dedupWindowMs])

  // ── Derive effective state from cache + fetch results ──
  // When a cache entry exists (fresh or stale), it takes priority.
  // Fetch state is used only when no cache entry exists.
  const hasCache = !!cacheEntry
  const data: T | null = hasCache ? (cacheEntry!.data as T) : (fetchDone ? fetchData : null)
  const loading = !!url && enabled && !hasCache && !fetchDone
  const error = hasCache ? null : (fetchDone ? fetchError : null)

  return { data, loading, error, refetch }
}
