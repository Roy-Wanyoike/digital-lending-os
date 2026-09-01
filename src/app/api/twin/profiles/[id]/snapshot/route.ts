import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/api-helpers';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { created, notFound, withErrorHandler } from '@/backend/lib/api-response';

interface BusinessSignals {
  failedTxCount: number;
  failedTxRate: number;
  totalTxCount: number;
  disputeCount: number;
  complianceFlags: number;
  pendingCompliance: number;
  fraudAlerts: number;
  overdueInvoices: number;
  collectionCases: number;
  collectionOutstanding: number;
  walletBalance: number;
  creditVolume30d: number;
  creditVolume60dPrior: number;
  trustScore: number | null;
  trustPaymentScore: number | null;
  kycStatus: string | null;
  amlStatus: string | null;
  accountAgeDays: number;
  activeWalletCount: number;
  uniqueCounterparties30d: number;
}

async function gatherBusinessSignals(businessId: string): Promise<BusinessSignals> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);

  const wallets = await db.wallet.findMany({
    where: { businessId, status: 'active' },
    select: { id: true, availableBalance: true },
  });
  const walletIds = wallets.map((w: { id: string; availableBalance: number }) => w.id);
  const walletBalance = wallets.reduce((s: number, w: { id: string; availableBalance: number }) => s + w.availableBalance, 0);

  const [failedTxCount, totalTxCount, creditVolume30d, creditVolume60dPrior, uniqueCounterparties30d] = walletIds.length > 0
    ? await Promise.all([
        db.walletTransaction.count({
          where: { walletId: { in: walletIds }, status: 'failed', createdAt: { gte: thirtyDaysAgo } },
        }),
        db.walletTransaction.count({
          where: { walletId: { in: walletIds }, createdAt: { gte: thirtyDaysAgo } },
        }),
        db.walletTransaction.aggregate({
          _sum: { amount: true },
          where: { walletId: { in: walletIds }, type: 'credit', status: 'completed', createdAt: { gte: thirtyDaysAgo } },
        }),
        db.walletTransaction.aggregate({
          _sum: { amount: true },
          where: { walletId: { in: walletIds }, type: 'credit', status: 'completed', createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
        }),
        db.walletTransaction.groupBy({
          by: ['counterpartyId'],
          where: { walletId: { in: walletIds }, counterpartyId: { not: null }, createdAt: { gte: thirtyDaysAgo } },
        }),
      ])
    : [0, 0, { _sum: { amount: 0 } }, { _sum: { amount: 0 } }, []];

  const [disputeCount, complianceFlags, pendingCompliance, fraudAlerts, overdueInvoices] = await Promise.all([
    db.escrowTransaction.count({
      where: {
        OR: [{ buyerId: businessId }, { sellerId: businessId }],
        disputes: { some: { status: { in: ['open', 'under_review', 'escalated'] } } },
      },
    }),
    db.complianceScreening.count({
      where: { businessId, result: { in: ['match', 'potential_match', 'alert'] }, status: 'completed' },
    }),
    db.complianceScreening.count({
      where: { businessId, status: { in: ['pending', 'in_progress'] } },
    }),
    db.fraudAlert.count({
      where: { businessId, status: { in: ['open', 'investigating', 'confirmed_fraud'] } },
    }),
    db.invoice.count({
      where: { OR: [{ senderId: businessId }, { receiverId: businessId }], status: 'overdue' },
    }),
  ]);

  const collectionAgg = await db.collectionCase.aggregate({
    _sum: { outstandingAmount: true },
    _count: true,
    where: { businessId, status: { in: ['active', 'paused'] } },
  });

  const trustScoreRec = await db.trustScore.findUnique({
    where: { businessId },
    select: { overallScore: true, paymentScore: true },
  });

  const passport = await db.commercePassport.findUnique({
    where: { businessId },
    select: { kycStatus: true, amlStatus: true },
  });

  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { createdAt: true },
  });

  return {
    failedTxCount,
    failedTxRate: totalTxCount > 0 ? failedTxCount / totalTxCount : 0,
    totalTxCount,
    disputeCount,
    complianceFlags,
    pendingCompliance,
    fraudAlerts,
    overdueInvoices,
    collectionCases: collectionAgg._count,
    collectionOutstanding: collectionAgg._sum.outstandingAmount ?? 0,
    walletBalance,
    creditVolume30d: creditVolume30d._sum.amount ?? 0,
    creditVolume60dPrior: creditVolume60dPrior._sum.amount ?? 0,
    trustScore: trustScoreRec?.overallScore ?? null,
    trustPaymentScore: trustScoreRec?.paymentScore ?? null,
    kycStatus: passport?.kycStatus ?? null,
    amlStatus: passport?.amlStatus ?? null,
    accountAgeDays: business ? (now.getTime() - business.createdAt.getTime()) / 86400000 : 0,
    activeWalletCount: wallets.length,
    uniqueCounterparties30d: uniqueCounterparties30d.length,
  };
}

/**
 * Derive risk factors from real negative signals.
 */
function deriveRiskFactors(s: BusinessSignals): string[] {
  const risks: string[] = [];

  if (s.failedTxRate > 0.1) {
    risks.push(`High transaction failure rate: ${(s.failedTxRate * 100).toFixed(1)}% of recent transactions failed (${s.failedTxCount} failures in last 30 days)`);
  }
  if (s.disputeCount > 0) {
    risks.push(`${s.disputeCount} active escrow dispute${s.disputeCount > 1 ? 's' : ''} requiring resolution`);
  }
  if (s.complianceFlags > 0) {
    risks.push(`${s.complianceFlags} compliance screening match${s.complianceFlags > 1 ? 'es' : ''} flagged — review required`);
  }
  if (s.fraudAlerts > 0) {
    risks.push(`${s.fraudAlerts} open fraud alert${s.fraudAlerts > 1 ? 's' : ''} under investigation`);
  }
  if (s.overdueInvoices > 0) {
    risks.push(`${s.overdueInvoices} overdue invoice${s.overdueInvoices > 1 ? 's' : ''} outstanding`);
  }
  if (s.collectionCases > 0) {
    risks.push(`${s.collectionCases} active collection case${s.collectionCases > 1 ? 's' : ''} with $${s.collectionOutstanding.toLocaleString()} outstanding`);
  }
  if (s.pendingCompliance > 0) {
    risks.push(`${s.pendingCompliance} compliance screening${s.pendingCompliance > 1 ? 's' : ''} pending completion`);
  }
  if (s.kycStatus && s.kycStatus !== 'verified') {
    risks.push(`KYC verification status is "${s.kycStatus}" — not fully verified`);
  }
  if (s.amlStatus && s.amlStatus !== 'cleared') {
    risks.push(`AML check status is "${s.amlStatus}" — not cleared`);
  }
  if (s.walletBalance < 0) {
    risks.push(`Negative wallet balance of $${Math.abs(s.walletBalance).toLocaleString()}`);
  }
  if (s.uniqueCounterparties30d <= 1 && s.totalTxCount > 5) {
    risks.push('High customer concentration — 90-day transactions from 1 counterparty or fewer');
  }

  // Cap at 5 most important
  return risks.slice(0, 5);
}

/**
 * Derive opportunities from real positive signals.
 */
function deriveOpportunities(s: BusinessSignals): string[] {
  const opportunities: string[] = [];

  const revenueGrowth = s.creditVolume60dPrior > 0
    ? ((s.creditVolume30d - s.creditVolume60dPrior) / s.creditVolume60dPrior) * 100
    : s.creditVolume30d > 0 ? 100 : 0;

  if (revenueGrowth > 20) {
    opportunities.push(`Strong revenue growth of ${revenueGrowth.toFixed(1)}% month-over-month — consider scaling operations`);
  }
  if (s.walletBalance > 50000) {
    opportunities.push(`Healthy cash reserves of $${s.walletBalance.toLocaleString()} — consider short-term investment or trade finance`);
  }
  if (s.trustScore !== null && s.trustScore >= 75) {
    opportunities.push(`High trust score of ${s.trustScore.toFixed(0)}/100 — leverage for preferential payment terms`);
  }
  if (s.trustPaymentScore !== null && s.trustPaymentScore >= 80) {
    opportunities.push(`Excellent payment score of ${s.trustPaymentScore.toFixed(0)}/100 — qualifies for early-payment discount programs`);
  }
  if (s.failedTxRate < 0.02 && s.totalTxCount > 10) {
    opportunities.push(`Low transaction failure rate of ${(s.failedTxRate * 100).toFixed(1)}% — reliable payment processing infrastructure`);
  }
  if (s.uniqueCounterparties30d >= 10) {
    opportunities.push(`Diverse customer base with ${s.uniqueCounterparties30d} active counterparties — strong market position`);
  }
  if (s.activeWalletCount >= 3) {
    opportunities.push(`${s.activeWalletCount} active currency wallets — well-positioned for cross-border expansion`);
  }
  if (s.kycStatus === 'verified' && s.amlStatus === 'cleared') {
    opportunities.push('Full KYC/AML compliance — eligible for enhanced credential levels and higher limits');
  }
  if (s.accountAgeDays > 365) {
    opportunities.push(`Established account (${Math.floor(s.accountAgeDays / 365)} year${Math.floor(s.accountAgeDays / 365) > 1 ? 's' : ''} old) — strong track record for credit assessment`);
  }

  return opportunities.slice(0, 5);
}

/**
 * Generate a structured AI summary from real data signals.
 */
function generateStructuredSummary(
  healthScore: number,
  cashFlowHealth: number,
  creditWorthiness: number,
  liquidityScore: number,
  growthTrajectory: string,
  signals: BusinessSignals,
  riskFactors: string[],
  opportunities: string[],
): string {
  const healthLabel =
    healthScore >= 75 ? 'strong' : healthScore >= 50 ? 'moderate' : 'concerning';

  const trajectoryLabel =
    growthTrajectory === 'rapid_growth'
      ? 'rapid growth trajectory'
      : growthTrajectory === 'growing'
        ? 'steady growth trajectory'
        : growthTrajectory === 'stable'
          ? 'stable financial position'
          : 'declining trend';

  const cashFlowLabel =
    cashFlowHealth >= 70 ? 'healthy' : cashFlowHealth >= 40 ? 'adequate' : 'stressed';

  const parts: string[] = [
    `The financial digital twin exhibits a ${healthLabel} overall health score of ${healthScore.toFixed(1)}/100, with a ${trajectoryLabel}.`,
    `Cash flow health is ${cashFlowLabel} at ${cashFlowHealth.toFixed(1)}/100, credit worthiness at ${creditWorthiness.toFixed(1)}/100, and liquidity at ${liquidityScore.toFixed(1)}/100.`,
  ];

  // Add data-backed details
  const details: string[] = [];
  details.push(`The business processed ${signals.totalTxCount} transactions in the last 30 days with a ${(signals.failedTxRate * 100).toFixed(1)}% failure rate.`);
  if (signals.creditVolume30d > 0 || signals.creditVolume60dPrior > 0) {
    const growthPct = signals.creditVolume60dPrior > 0
      ? (((signals.creditVolume30d - signals.creditVolume60dPrior) / signals.creditVolume60dPrior) * 100).toFixed(1)
      : 'N/A';
    details.push(`Credit volume was $${signals.creditVolume30d.toLocaleString()} in the last 30 days (${growthPct}% change from prior period).`);
  }
  details.push(`Wallet balance stands at $${signals.walletBalance.toLocaleString()} across ${signals.activeWalletCount} active wallet${signals.activeWalletCount !== 1 ? 's' : ''}.`);

  if (signals.trustScore !== null) {
    details.push(`Overall trust score: ${signals.trustScore.toFixed(0)}/100.`);
  }

  if (riskFactors.length > 0) {
    parts.push(`Key risk factors: ${riskFactors.join('. ')}.`);
  }
  if (opportunities.length > 0) {
    parts.push(`Notable opportunities: ${opportunities.join('. ')}.`);
  }

  parts.push(details.join(' '));
  parts.push('Continued monitoring and proactive risk management are recommended to sustain financial stability.');

  return parts.join(' ');
}

// POST /api/twin/profiles/[id]/snapshot — Generate a financial snapshot
async function postHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(request);
  const { id } = await params;

  // Verify twin exists and belongs to tenant
  const twin = await db.financialDigitalTwin.findUnique({
    where: { id },
    include: { business: { select: { tenantId: true, id: true } } },
  });

  if (!twin || twin.business.tenantId !== user.tenantId) {
    return notFound('Digital twin not found');
  }

  // Determine snapshot type: event_driven if recent snapshot exists within 24h, otherwise daily
  const recentSnapshot = await db.financialSnapshot.findFirst({
    where: {
      twinId: id,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  const snapshotType = recentSnapshot ? 'event_driven' : 'daily';

  // Gather real business signals
  const signals = await gatherBusinessSignals(twin.business.id);
  const riskFactors = deriveRiskFactors(signals);
  const opportunities = deriveOpportunities(signals);

  const aiSummary = generateStructuredSummary(
    twin.healthScore,
    twin.cashFlowHealth,
    twin.creditWorthiness,
    twin.liquidityScore,
    twin.growthTrajectory,
    signals,
    riskFactors,
    opportunities,
  );

  const snapshot = await db.financialSnapshot.create({
    data: {
      twinId: id,
      snapshotType,
      healthScore: twin.healthScore,
      cashFlowHealth: twin.cashFlowHealth,
      creditWorthiness: twin.creditWorthiness,
      liquidityScore: twin.liquidityScore,
      topRiskFactors: JSON.stringify(riskFactors),
      topOpportunities: JSON.stringify(opportunities),
      aiSummary,
    },
  });

  return created(snapshot);
}

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/twin/profiles/[id]/snapshot');
