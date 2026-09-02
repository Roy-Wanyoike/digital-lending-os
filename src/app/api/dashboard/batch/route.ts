// ─── Batch Dashboard Data Endpoint ───────────────────────────────
// GET /api/dashboard/batch
//
// Returns multiple datasets in a single request to eliminate
// the initial-load waterfall. The DashboardShell calls this on
// mount, then seeds the individual URL caches via seedCache().
//
// Response shape (after envelope unwrap by useApi):
//   { stats: DashboardStats, businesses: Business[] }

import { NextRequest } from 'next/server';import { db } from '@/lib/db'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper'
import { dashboardStatsCache } from '@/backend/lib/response-cache'
import { fetchDashboardStats } from '@/backend/lib/dashboard-stats-helper'
import { error, ok, unauthorized, withErrorHandler } from '@/backend/lib/api-response';

// Lazy-load cache manager
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

export const dynamic = 'force-dynamic'

async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user || !user.tenantId) {
      return unauthorized('Authentication required')
    }

    const cacheManager = await getCache()
    const tenantId = user.tenantId

    // ─── Fetch businesses ─────────────────────────────────────────────────
    const fetchBusinesses = () => db.business.findMany({
      where: { tenantId },
      include: {
        passport: { select: { credentialLevel: true, kycStatus: true, amlStatus: true, riskRating: true } },
        trustScore: { select: { overallScore: true } },
        digitalTwin: { select: { healthScore: true, growthTrajectory: true, riskAppetite: true } },
        _count: { select: { sentInvoices: true, receivedInvoices: true, verifications: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const businesses = cacheManager
      ? await cacheManager.getOrSet(`businesses:${tenantId}`, fetchBusinesses, { ttl: 5 * 60_000 })
      : await fetchBusinesses()

    // ─── Fetch dashboard stats (shared helper) ─────────────────
    const fetchStats = () => fetchDashboardStats(tenantId)

    // Stats: check in-memory cache first, then Redis, then DB
    const memKey = `stats:${tenantId}`
    const memCached = dashboardStatsCache.get(memKey)
    let stats = memCached
    if (!stats) {
      stats = cacheManager
        ? await cacheManager.getOrSet(`dashboard:stats:${tenantId}`, fetchStats, { ttl: 30_000 })
        : await fetchStats()
      dashboardStatsCache.set(memKey, stats)
    }

    // ─── Run both fetches in parallel ───────────────────────
    // (cache hits return instantly, DB queries run in parallel)
    return ok({ stats, businesses }, undefined, { maxAge: 5, swr: 10 })
  } catch (err: any) {console.error('Error fetching batch dashboard data:', err)
    return error('Failed to fetch dashboard data')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/dashboard/batch')
