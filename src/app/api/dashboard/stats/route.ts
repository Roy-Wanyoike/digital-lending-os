import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, AuthError } from '@/lib/auth/api-helpers';

// GET /api/dashboard/stats — Dashboard aggregation stats
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Fetch business IDs belonging to the tenant
    const tenantBusinessIds = (await db.business.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    })).map(b => b.id);

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
      // Total businesses
      db.business.count({ where: { tenantId: user.tenantId } }),

      // Verified businesses
      db.business.count({ where: { tenantId: user.tenantId, status: 'verified' } }),

      // Active escrows (created, funded, in_escrow, partial_release)
      db.escrowTransaction.count({
        where: {
          ...escrowTenantFilter,
          status: { in: ['created', 'funded', 'in_escrow', 'partial_release'] },
        },
      }),

      // Total escrow volume (sum of all escrow amounts)
      db.escrowTransaction.aggregate({
        where: escrowTenantFilter,
        _sum: { amount: true },
      }),

      // Total payments processed (completed payment intents)
      db.paymentIntent.count({
        where: { ...paymentIntentTenantFilter, status: 'completed' },
      }),

      // Recent disputes (open / under_review)
      db.dispute.count({
        where: {
          status: { in: ['open', 'under_review'] },
          escrow: escrowTenantFilter,
        },
      }),

      // Active relationships
      db.businessRelationship.count({
        where: {
          ...relationshipTenantFilter,
          status: 'active',
        },
      }),

      // Escrows grouped by status
      db.escrowTransaction.groupBy({
        by: ['status'],
        _count: { status: true },
        where: escrowTenantFilter,
      }),

      // Businesses grouped by country
      db.business.groupBy({
        by: ['country'],
        _count: { country: true },
        where: { tenantId: user.tenantId },
      }),

      // Payment intents grouped by method
      db.paymentIntent.groupBy({
        by: ['paymentMethod'],
        _count: { paymentMethod: true },
        where: {
          paymentMethod: { not: null },
          ...paymentIntentTenantFilter,
        },
      }),

      // Recent transactions — latest 5 escrow transactions with buyer/seller names
      db.escrowTransaction.findMany({
        where: escrowTenantFilter,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { name: true } },
          seller: { select: { name: true } },
        },
      }),

      // All trust scores for distribution
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
    const recentTransactionsFlat = recentTransactions.map((tx) => ({
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
            (trustScores.reduce((sum, ts) => sum + (ts.overallScore ?? 0), 0) / trustScores.length) * 100
          ) / 100
        : 0;

    return NextResponse.json({
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
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}