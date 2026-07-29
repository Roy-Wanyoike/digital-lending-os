import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getApiUser } from '@/lib/auth/api-helpers'

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

export async function GET(request: NextRequest) {
  const user = await getApiUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  try {
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
        filtered = methods.filter((method) => {
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

    return NextResponse.json({ data: filtered })
  } catch (error) {
    console.error('Error listing global payment methods:', error)
    return NextResponse.json({ error: 'Failed to list global payment methods' }, { status: 500 })
  }
}
