// Shared dashboard stats aggregation logic.
// Both /api/dashboard/stats and /api/dashboard/batch delegate here
// so the Prisma queries and post-processing live in one place.

import { db } from '@/lib/db';
import { getTenantBusinessIds } from '@/backend/lib/tenant-cache';

export interface DashboardStats {
  totalBusinesses: number;
  verifiedBusinesses: number;
  activeEscrows: number;
  totalEscrowVolume: number;
  totalPaymentsProcessed: number;
  averageTrustScore: number;
  recentDisputes: number;
  activeRelationships: number;
  escrowsByStatus: Record<string, number>;
  businessesByCountry: Record<string, number>;
  paymentsByMethod: Record<string, number>;
  recentTransactions: Array<{
    id: string;
    txRef: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: Date;
    buyerName: string;
    sellerName: string;
  }>;
  trustScoreDistribution: { excellent: number; good: number; average: number; poor: number };
}

export async function fetchDashboardStats(tenantId: string): Promise<DashboardStats> {
  const tenantBusinessIds = await getTenantBusinessIds(tenantId, db);

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
    db.business.count({ where: { tenantId } }),
    db.business.count({ where: { tenantId, status: 'verified' } }),
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
      where: { tenantId },
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
  type RecentTx = {
    id: string;
    txRef: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: Date;
    buyer: { name: string };
    seller: { name: string };
  };
  const recentTransactionsFlat = recentTransactions.map((tx: RecentTx) => ({
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
          (trustScores.reduce(
            (sum: number, ts: { overallScore: number | null }) =>
              sum + (ts.overallScore ?? 0),
            0,
          ) /
            trustScores.length) *
            100,
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
}
