import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers';
import { getTenantBusinessIds } from '@/backend/lib/tenant-cache';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { dashboardStatsCache } from '@/backend/lib/response-cache';
import { badRequest, error, ok, unauthorized, withErrorHandler } from '@/backend/lib/api-response';

// Lazy-load cache manager — graceful fallback if Redis/OTel not installed
let _cacheManager: any = undefined;
let _cacheAttempted = false;
async function getCache() {
  if (_cacheAttempted) return _cacheManager;
  _cacheAttempted = true;
  try {
    const mod = await import('@/backend/lib/cache/cache-manager');
    _cacheManager = mod.default;
  } catch {
    _cacheManager = undefined;
  }
  return _cacheManager;
}

// GET /api/dashboard/stats — Dashboard aggregation stats
async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user || !user.tenantId) {
      return unauthorized('Authentication required');
    }

    const cacheManager = await getCache();

    const fetchStats = async () => {
      // Fetch business IDs belonging to the tenant (cached)
      const tenantBusinessIds = await getTenantBusinessIds(user.tenantId, db);

      const escrowTenantFilter = {
        OR: [
          { buyerId: { in: tenantBusinessIds } },
          { sellerId: { in: tenantBusinessIds } },
        ],
      };
      const paymentIntentTenantFilter = {
        OR: [
          { fromBusinessId: { in: tenantBusinessIds } },
          { toBusinessId: { in: tenantBusinessIds } },
        ],
      };
      const relationshipTenantFilter = {
        OR: [
          { fromBusinessId: { in: tenantBusinessIds } },
          { toBusinessId: { in: tenantBusinessIds } },
        ],
      };

      // Run independent queries in parallel
      const [
        totalBusinesses,
        verifiedBusinesses,
        activeEscrows,
        totalEscrowVolume,
        completedPayments,
        recentDisputes,
        activeRelationships,
        escrowsByStatusRaw,
        businessesByCountryRaw,
        paymentsByMethodRaw,
        recentTransactions,
        trustScores,
      ] = await Promise.all([
        db.business.count({ where: { tenantId: user.tenantId } }),
        db.business.count({ where: { tenantId: user.tenantId, status: 'verified' } }),
        db.escrowTransaction.count({
          where: {
            ...escrowTenantFilter,
            status: { in: ['created', 'funded', 'in_escrow', 'partial_release'] },
          },
        }),
        db.escrowTransaction.aggregate({
          where: escrowTenantFilter,
          _sum: { amount: true },
        }),
        db.paymentIntent.count({
          where: { ...paymentIntentTenantFilter, status: 'completed' },
        }),
        db.dispute.count({
          where: {
            status: { in: ['open', 'under_review'] },
            escrow: escrowTenantFilter,
          },
        }),
        db.businessRelationship.count({
          where: {
            ...relationshipTenantFilter,
            status: 'active',
          },
        }),
        db.escrowTransaction.groupBy({
          by: ['status'],
          _count: { status: true },
          where: escrowTenantFilter,
        }),
        db.business.groupBy({
          by: ['country'],
          _count: { country: true },
          where: { tenantId: user.tenantId },
        }),
        db.paymentIntent.groupBy({
          by: ['paymentMethod'],
          _count: { paymentMethod: true },
          where: {
            paymentMethod: { not: null },
            ...paymentIntentTenantFilter,
          },
        }),
        db.escrowTransaction.findMany({
          where: escrowTenantFilter,
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            txRef: true,
            amount: true,
            currency: true,
            status: true,
            createdAt: true,
            buyer: { select: { name: true } },
            seller: { select: { name: true } },
          },
        }),
        db.trustScore.findMany({
          where: { businessId: { in: tenantBusinessIds } },
          select: { overallScore: true },
        }),
      ]);

      // Build escrowsByStatus
      const escrowsByStatus: Record<string, number> = {
        created: 0,
        funded: 0,
        in_escrow: 0,
        completed: 0,
        disputed: 0,
      };
      for (const row of escrowsByStatusRaw) {
        if (row.status in escrowsByStatus) {
          escrowsByStatus[row.status] = row._count.status;
        }
      }

      // Build businessesByCountry
      const businessesByCountry: Record<string, number> = {};
      for (const row of businessesByCountryRaw) {
        businessesByCountry[row.country] = row._count.country;
      }

      // Build paymentsByMethod
      const paymentsByMethod: Record<string, number> = {};
      for (const row of paymentsByMethodRaw) {
        if (row.paymentMethod) {
          paymentsByMethod[row.paymentMethod] = row._count.paymentMethod;
        }
      }

      // Build recentTransactions (flatten for API response)
      const recentTransactionsFlat = recentTransactions.map((tx: any) => ({
        id: tx.id,
        txRef: tx.txRef,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        buyerName: tx.buyer.name,
        sellerName: tx.seller.name,
        createdAt: tx.createdAt,
      }));

      // Build trustScoreDistribution
      const trustScoreDistribution = { excellent: 0, good: 0, average: 0, poor: 0 };
      for (const ts of trustScores) {
        if (ts.overallScore >= 80) trustScoreDistribution.excellent++;
        else if (ts.overallScore >= 60) trustScoreDistribution.good++;
        else if (ts.overallScore >= 40) trustScoreDistribution.average++;
        else trustScoreDistribution.poor++;
      }

      // Calculate average trust score
      const averageTrustScore =
        trustScores.length > 0
          ? Math.round(
              (trustScores.reduce((sum: any, ts: any) => sum + (ts.overallScore ?? 0), 0) / trustScores.length) * 100
            ) / 100
          : 0;

      return {
        totalBusinesses,
        verifiedBusinesses,
        activeEscrows,
        totalEscrowVolume: totalEscrowVolume._sum?.amount ?? 0,
        totalPaymentsProcessed: completedPayments,
        averageTrustScore,
        recentDisputes,
        activeRelationships,
        escrowsByStatus,
        businessesByCountry,
        paymentsByMethod,
        recentTransactions: recentTransactionsFlat,
        trustScoreDistribution,
      };
    };

    // First-level: synchronous in-memory cache (2s TTL) — zero async overhead
    const memKey = `stats:${user.tenantId}`;
    const memCached = dashboardStatsCache.get(memKey);
    if (memCached) {
      return ok(memCached , undefined, { noCache: true })
    }

    // Second-level: Redis-backed cache (30s TTL) with singleflight stampede protection
    const data = cacheManager
      ? await cacheManager.getOrSet(`dashboard:stats:${user.tenantId}`, fetchStats, { ttl: 30_000 })
      : await fetchStats();

    // Populate first-level cache for subsequent requests within 2s
    dashboardStatsCache.set(memKey, data);

    return ok(data, undefined, { maxAge: 5, swr: 10 });
  } catch (err: any) {console.error('Error fetching dashboard stats:', err);
    return error('Failed to fetch dashboard stats');
  }
}

// POST /api/dashboard/stats — Force-refresh cached stats
async function postHandler(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user.tenantId) {
      return badRequest('Tenant ID required');
    }

    // Invalidate both cache layers
    dashboardStatsCache.invalidate(`stats:${user.tenantId}`);
    const cacheManager = await getCache();
    const cacheKey = `dashboard:stats:${user.tenantId}`;
    if (cacheManager) {
      await cacheManager.delete(cacheKey);
    }

    return ok({ message: 'Cache invalidated' })
  } catch (error: any) {console.error('Error invalidating dashboard stats cache:', error);
    return error('Failed to invalidate cache');
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/dashboard/stats');
export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/dashboard/stats');
