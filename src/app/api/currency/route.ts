import { NextRequest, NextResponse } from 'next/server'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
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
 */
async function getHandler(req: NextRequest) {
  const url = new URL(req.url)
  const forwardUrl = new URL('/api/payments/rates' + url.search, req.url)

  const cacheManager = await getCache()
  if (cacheManager) {
    try {
      const data = await cacheManager.getOrSet(
        'currency:rates',
        async () => {
          const res = await fetch(forwardUrl.toString(), { headers: req.headers })
          return res.json()
        },
        { ttl: 60_000 },
      )
      return NextResponse.json(data)
    } catch {
      // Cache lookup failed, fall through to uncached fetch
    }
  }

  return fetch(forwardUrl.toString(), { headers: req.headers })
}

export const GET = withApiTelemetry(getHandler, '/api/currency');
