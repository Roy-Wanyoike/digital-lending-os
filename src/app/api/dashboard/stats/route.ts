import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/dashboard/stats — Dashboard aggregation stats
export async function GET() {
  try {
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
      db.business.count(),

      // Verified businesses
      db.business.count({ where: { status: 'verified' } }),

      // Active escrows (created, funded, in_escrow, partial_release)
      db.escrowTransaction.count({
        where: { status: { in: ['created', 'funded', 'in_escrow', 'partial_release'] } },
      }),

      // Total escrow volume (sum of all escrow amounts)
      db.escrowTransaction.aggregate({ _sum: { amount: true } }),

      // Total payments processed (completed payment intents)
      db.paymentIntent.count({ where: { status: 'completed' } }),

      // Recent disputes (open / under_review)
      db.dispute.count({
        where: { status: { in: ['open', 'under_review'] } },
      }),

      // Active relationships
      db.businessRelationship.count({ where: { status: 'active' } }),

      // Escrows grouped by status
      db.escrowTransaction.groupBy({
        by: ['status'],
        _count: { status: true },
      }),

      // Businesses grouped by country
      db.business.groupBy({
        by: ['country'],
        _count: { country: true },
      }),

      // Payment intents grouped by method
      db.paymentIntent.groupBy({
        by: ['paymentMethod'],
        _count: { paymentMethod: true },
        where: { paymentMethod: { not: null } },
      }),

      // Recent transactions — latest 5 escrow transactions with buyer/seller names
      db.escrowTransaction.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { name: true } },
          seller: { select: { name: true } },
        },
      }),

      // All trust scores for distribution
      db.trustScore.findMany({
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
            (trustScores.reduce((sum, ts) => sum + ts.overallScore, 0) / trustScores.length) * 100
          ) / 100
        : 0;

    return NextResponse.json({
      totalBusinesses,
      verifiedBusinesses,
      activeEscrows,
      totalEscrowVolume: totalEscrowVolume._sum.amount ?? 0,
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
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}