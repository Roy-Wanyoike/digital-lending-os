import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getApiUser } from '@/lib/auth/api-helpers'
import { ok, unauthorized, withErrorHandler } from '@/backend/lib/api-response'

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

const getHandler = withErrorHandler(async (request: NextRequest) => {
  const user = await getApiUser(request)
  if (!user) return unauthorized()

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || ''
  const country = searchParams.get('country') || ''

  const where: Record<string, unknown> = { isActive: true }
  if (type) {
    where.type = type
  }

  const cacheManager = await getCache()
  const fetchMethods = async () => {
    const methods = await db.globalPaymentMethod.findMany({
      where,
      orderBy: [{ type: 'asc' }, { methodName: 'asc' }],
    })

    let filtered = methods
    if (country) {
      filtered = methods.filter((method: any) => {
        try {
          const countries: string[] = JSON.parse(method.countries)
          return countries.includes(country.toUpperCase())
        } catch {
          return false
        }
      })
    }
    return filtered
  }

  const filtered = cacheManager
    ? await cacheManager.getOrSet(`payment-methods:global:${type}:${country}`, fetchMethods, { ttl: 10 * 60_000 })
    : await fetchMethods()

  return ok(filtered)
});

export const GET = withApiTelemetry(getHandler, '/api/payment-methods/global');
