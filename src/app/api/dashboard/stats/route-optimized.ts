import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'
import { cacheWithTTL, tenantKey, CACHE_TTL, invalidateCache } from '@/backend/lib/redis-client'
import { getCacheHeaders } from '@/backend/middleware/cache-control'

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const cacheKey = tenantKey(user.tenantId, 'dashboard:stats')
    const cached = await cacheWithTTL(cacheKey, () => fetchDashboardStats(user.tenantId), CACHE_TTL.DASHBOARD_STATS)
    return NextResponse.json({ data: cached }, { headers: { ...getCacheHeaders('api-stats'), 'X-Cache': 'HIT' } })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}

async function fetchDashboardStats(tenantId: string) {
  const ids = (await db.business.findMany({ where: { tenantId }, select: { id: true } })).map(b => b.id)
  const ef = { OR: [{ buyerId: { in: ids } }, { sellerId: { in: ids } }] }
  const pf = { OR: [{ fromBusinessId: { in: ids } }, { toBusinessId: { in: ids } }] }
  const [a,b,c,d,e,f,g,h,i,j,k,l] = await Promise.all([
    db.business.count({ where: { tenantId } }),
    db.business.count({ where: { tenantId, status: 'verified' } }),
    db.escrowTransaction.count({ where: { ...ef, status: { in: ['created','funded','in_escrow','partial_release'] } } }),
    db.escrowTransaction.aggregate({ where: ef, _sum: { amount: true } }),
    db.paymentIntent.count({ where: { ...pf, status: 'completed' } }),
    db.dispute.count({ where: { status: { in: ['open','under_review'] }, escrow: ef } }),
    db.businessRelationship.count({ where: { ...pf, status: 'active' } }),
    db.escrowTransaction.groupBy({ by: ['status'], _count: { status: true }, where: ef }),
    db.business.groupBy({ by: ['country'], _count: { country: true }, where: { tenantId } }),
    db.paymentIntent.groupBy({ by: ['paymentMethod'], _count: { paymentMethod: true }, where: { paymentMethod: { not: null }, ...pf } }),
    db.escrowTransaction.findMany({ where: ef, take: 5, orderBy: { createdAt: 'desc' }, include: { buyer: { select: { name: true } }, seller: { select: { name: true } } } }),
    db.trustScore.findMany({ where: { businessId: { in: ids } }, select: { overallScore: true } }),
  ])
  const escrowsByStatus: Record<string,number> = { created:0, funded:0, in_escrow:0, completed:0, disputed:0 }
  for (const row of h) { if (row.status in escrowsByStatus) escrowsByStatus[row.status] = row._count.status }
  const businessesByCountry: Record<string,number> = {}
  for (const row of i) businessesByCountry[row.country] = row._count.country
  const paymentsByMethod: Record<string,number> = {}
  for (const row of j) { if (row.paymentMethod) paymentsByMethod[row.paymentMethod] = row._count.paymentMethod }
  const recentTransactionsFlat = k.map((tx: any) => ({ id: tx.id, txRef: tx.txRef, amount: tx.amount, currency: tx.currency, status: tx.status, buyerName: tx.buyer.name, sellerName: tx.seller.name, createdAt: tx.createdAt }))
  const trustScoreDistribution = { excellent:0, good:0, average:0, poor:0 }
  for (const ts of l) { if (ts.overallScore >= 80) trustScoreDistribution.excellent++; else if (ts.overallScore >= 60) trustScoreDistribution.good++; else if (ts.overallScore >= 40) trustScoreDistribution.average++; else trustScoreDistribution.poor++ }
  const averageTrustScore = l.length > 0 ? Math.round((l.reduce((s: number, t: any) => s + (t.overallScore ?? 0), 0) / l.length) * 100) / 100 : 0
  return { totalBusinesses: a, verifiedBusinesses: b, activeEscrows: c, totalEscrowVolume: d._sum?.amount ?? 0, totalPaymentsProcessed: e, averageTrustScore, recentDisputes: f, activeRelationships: g, escrowsByStatus, businessesByCountry, paymentsByMethod, recentTransactions: recentTransactionsFlat, trustScoreDistribution }
}
