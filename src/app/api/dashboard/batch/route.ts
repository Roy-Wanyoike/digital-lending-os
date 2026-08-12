// ─── Batch Dashboard Data Endpoint ────────────────────────────
// GET /api/dashboard/batch
//
// Returns multiple datasets in a single request to eliminate
// the initial-load waterfall. The DashboardShell calls this on
// mount, then seeds the individual URL caches via seedCache().
//
// Response shape (after envelope unwrap by useApi):
//   { stats: DashboardStats, businesses: Business[] }

import { NextRequest } from 'next/server';import { db } from '@/lib/db'
import { getApiUser } from '@/lib/auth/api-helpers'
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper'
import { dashboardStatsCache } from '@/backend/lib/response-cache'
import { getTenantBusinessIds } from '@/backend/lib/tenant-cache'
import { AuthError } from '@/lib/auth/api-helpers'
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

    // ─── Fetch businesses ─────────────────────────────────────────
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

    // ─── Fetch dashboard stats ────────────────────────────────────
    const fetchStats = async () => {
      const tenantBusinessIds = await getTenantBusinessIds(tenantId, db)
      const escrowTenantFilter = {
        OR: [
          { buyerId: { in: tenantBusinessIds } },
          { sellerId: { in: tenantBusinessIds } },
        ],
      }
      const paymentIntentTenantFilter = {
        OR: [
          { fromBusinessId: { in: tenantBusinessIds } },
          { toBusinessId: { in: tenantBusinessIds } },
        ],
      }

      const [
        totalBusinesses, verifiedBusinesses, activeEscrows, totalEscrowVolume,
        completedPayments, recentDisputes, activeRelationships,
        escrowsByStatusRaw, businessesByCountryRaw, paymentsByMethodRaw,
        recentTransactions, trustScores,
      ] = await Promise.all([
        db.business.count({ where: { tenantId } }),
        db.business.count({ where: { tenantId, status: 'verified' } }),
        db.escrowTransaction.count({ where: { ...escrowTenantFilter, status: { in: ['created', 'funded', 'in_escrow', 'partial_release'] } } }),
        db.escrowTransaction.aggregate({ where: escrowTenantFilter, _sum: { amount: true } }),
        db.paymentIntent.count({ where: { ...paymentIntentTenantFilter, status: 'completed' } }),
        db.dispute.count({ where: { status: { in: ['open', 'under_review'] }, escrow: escrowTenantFilter } }),
        db.businessRelationship.count({ where: { OR: [{ fromBusinessId: { in: tenantBusinessIds } }, { toBusinessId: { in: tenantBusinessIds } }], status: 'active' } }),
        db.escrowTransaction.groupBy({ by: ['status'], _count: { status: true }, where: escrowTenantFilter }),
        db.business.groupBy({ by: ['country'], _count: { country: true }, where: { tenantId } }),
        db.paymentIntent.groupBy({ by: ['paymentMethod'], _count: { paymentMethod: true }, where: { paymentMethod: { not: null }, ...paymentIntentTenantFilter } }),
        db.escrowTransaction.findMany({ where: escrowTenantFilter, take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, txRef: true, amount: true, currency: true, status: true, createdAt: true, buyer: { select: { name: true } }, seller: { select: { name: true } } } }),
        db.trustScore.findMany({ where: { businessId: { in: tenantBusinessIds } }, select: { overallScore: true } }),
      ])

      const escrowsByStatus: Record<string, number> = { created: 0, funded: 0, in_escrow: 0, completed: 0, disputed: 0 }
      for (const row of escrowsByStatusRaw) { if (row.status in escrowsByStatus) escrowsByStatus[row.status] = row._count.status }

      const businessesByCountry: Record<string, number> = {}
      for (const row of businessesByCountryRaw) { businessesByCountry[row.country] = row._count.country }

      const paymentsByMethod: Record<string, number> = {}
      for (const row of paymentsByMethodRaw) { if (row.paymentMethod) paymentsByMethod[row.paymentMethod] = row._count.paymentMethod }

      const recentTransactionsFlat = recentTransactions.map((tx: any) => ({
        id: tx.id, txRef: tx.txRef, amount: tx.amount, currency: tx.currency, status: tx.status, createdAt: tx.createdAt, buyerName: tx.buyer.name, sellerName: tx.seller.name,
      }))

      const trustScoreDistribution = { excellent: 0, good: 0, average: 0, poor: 0 }
      for (const ts of trustScores) {
        if (ts.overallScore >= 80) trustScoreDistribution.excellent++
        else if (ts.overallScore >= 60) trustScoreDistribution.good++
        else if (ts.overallScore >= 40) trustScoreDistribution.average++
        else trustScoreDistribution.poor++
      }

      const averageTrustScore = trustScores.length > 0
        ? Math.round((trustScores.reduce((sum: any, ts: any) => sum + (ts.overallScore ?? 0), 0) / trustScores.length) * 100) / 100
        : 0

      return { totalBusinesses, verifiedBusinesses, activeEscrows, totalEscrowVolume: totalEscrowVolume._sum?.amount ?? 0, totalPaymentsProcessed: completedPayments, averageTrustScore, recentDisputes, activeRelationships, escrowsByStatus, businessesByCountry, paymentsByMethod, recentTransactions: recentTransactionsFlat, trustScoreDistribution }
    }

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

    // ─── Run both fetches in parallel ─────────────────────────────
    // (cache hits return instantly, DB queries run in parallel)
    return ok({ stats, businesses }, undefined, { maxAge: 5, swr: 10 })
  } catch (err: any) {console.error('Error fetching batch dashboard data:', err)
    return error('Failed to fetch dashboard data')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/dashboard/batch')
