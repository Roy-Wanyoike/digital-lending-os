import { NextRequest } from 'next/server';import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { error, ok, withErrorHandler } from '@/backend/lib/api-response';

// Lazy-load cache manager — graceful fallback if Redis/OTel not installed
let _cacheManager: any = undefined
let _cacheAttempted = false
async function getCache() {
  if (_cacheAttempted) return _cacheManager
  _cacheAttempted = true
  try {
    const mod = await import('@/backend/lib/cache/cache-manager')
    _cacheManager = mod.default
  } catch {
    _cacheManager = undefined
  }
  return _cacheManager
}

/**
 * GET /api/currency — Exchange rates (cached proxy to /api/payments/rates)
 * Returns the upstream response body, wrapped in { data } for consistency.
 */
async function getHandler(req: NextRequest) {
  const url = new URL(req.url)
  const forwardUrl = new URL('/api/payments/rates' + url.search, req.url)

  const cacheManager = await getCache()
  if (cacheManager) {
    try {
      const upstream = await cacheManager.getOrSet(
        'currency:rates',
        async () => {
          const res = await fetch(forwardUrl.toString(), { headers: req.headers })
          return res.json()
        },
        { ttl: 60_000 },
      )
      // The upstream /api/payments/rates returns { data, meta? } already,
      // so extract data to avoid double-wrapping with ok().
      return ok(upstream.data)
    } catch {
      // Cache lookup failed, fall through to uncached fetch
    }
  }

  try {
    const res = await fetch(forwardUrl.toString(), { headers: req.headers })
    const data = await res.json()
    return ok(data.data)
  } catch (err) {
    console.error('[currency] Uncached fetch failed:', err)
    return error('Failed to fetch exchange rates')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/currency');
