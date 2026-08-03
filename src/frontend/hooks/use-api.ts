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
}

export interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// Simple in-memory cache for deduplicating concurrent requests.
// Keyed by URL. Cleared when refetch() is called.
const _fetchCache = new Map<string, Promise<any>>()

export function invalidateCache(url?: string) {
  if (url) {
    _fetchCache.delete(url)
  } else {
    _fetchCache.clear()
  }
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
 */
export function useApi<T>(url: string, options: UseApiOptions = {}): UseApiResult<T> {
  const { headers, enabled = true, onAuthError } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)
  const mountedRef = useRef(true)

  // Router for auth-redirect on 401 responses.
  // useRouter() is safe here — this hook is only called from client components
  // that live inside the Next.js router context.
  const routerRef = useRef<ReturnType<typeof useRouter> | null>(null)
  const router = useRouter()
  routerRef.current = router

  const refetch = useCallback(() => {
    _fetchCache.delete(url)
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
    setLoading(true)
    setError(null)

    // Check for in-flight duplicate request
    const cacheKey = `${url}__${key}`
    let pending = _fetchCache.get(cacheKey)
    if (!pending) {
      pending = fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      })
        .then(r => {
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
            setError(errMsg)
            return null
          }
          return r.json()
        })
        .catch(err => {
          if (err.name === 'AbortError') return null
          throw err
        })
      _fetchCache.set(cacheKey, pending)
    }

    pending
      .then(d => {
        if (cancelled || !mountedRef.current) return

        if (d === null || d === undefined) {
          setData(null)
          setLoading(false)
          return
        }

        // Auto-unwrap { data: T } envelope
        if (typeof d === 'object' && !Array.isArray(d) && 'data' in d) {
          const unwrapped = (d as any).data
          if (unwrapped === undefined || unwrapped === null) {
            setData(null)
          } else if (Array.isArray(unwrapped) || typeof unwrapped !== 'object' || !('error' in unwrapped)) {
            setData(unwrapped as T)
          } else {
            setError('Unexpected response format')
            setData(null)
          }
        } else if (typeof d === 'object' && 'error' in d) {
          setError((d as any).error || 'Request failed')
          setData(null)
        } else {
          setData(d as T)
        }
        setLoading(false)
      })
      .catch(err => {
        if (cancelled || !mountedRef.current) return
        setError(err.name === 'AbortError' ? null : 'Network error — check your connection')
        setData(null)
        setLoading(false)
      })
      .finally(() => {
        _fetchCache.delete(cacheKey)
      })

    return () => {
      cancelled = true
      mountedRef.current = false
      controller.abort()
    }
  }, [url, key, enabled, headers, onAuthError])

  return { data, loading, error, refetch }
}

