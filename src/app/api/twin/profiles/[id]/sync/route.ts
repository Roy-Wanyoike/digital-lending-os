import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/api-helpers';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { ok, notFound, withErrorHandler } from '@/backend/lib/api-response';

interface MonthlyMetricRow {
  period: 'monthly';
  periodDate: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  cashBalance: number;
  transactionCount: number;
  averageTransactionValue: number;
  paymentSuccessRate: number;
  disputeRate: number;
  customerCount: number;
  supplierCount: number;
}

/**
 * Aggregate real wallet transactions by month for the last 6 months.
 */
async function aggregateRealMonthlyMetrics(businessId: string): Promise<MonthlyMetricRow[]> {
  const now = new Date();
  const wallets = await db.wallet.findMany({
    where: { businessId, status: 'active' },
    select: { id: true, availableBalance: true, currency: true },
  });
  const walletIds = wallets.map((w: { id: string; availableBalance: number; currency: string }) => w.id);
  const totalCashBalance = wallets.reduce((s: number, w: { id: string; availableBalance: number; currency: string }) => s + w.availableBalance, 0);

  const metrics: MonthlyMetricRow[] = [];

  for (let i = 1; i <= 6; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const periodDate = monthStart.toISOString().slice(0, 10);

    if (walletIds.length === 0) {
      metrics.push({
        period: 'monthly',
        periodDate,
        revenue: 0,
        expenses: 0,
        netIncome: 0,
        cashBalance: 0,
        transactionCount: 0,
        averageTransactionValue: 0,
        paymentSuccessRate: 100,
        disputeRate: 0,
        customerCount: 0,
        supplierCount: 0,
      });
      continue;
    }

    const [creditAgg, debitAgg, completedCount, failedCount, totalTxValue, uniqueCustomers, uniqueSuppliers] = await Promise.all([
      db.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { walletId: { in: walletIds }, type: 'credit', status: 'completed', createdAt: { gte: monthStart, lt: monthEnd } },
      }),
      db.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { walletId: { in: walletIds }, type: 'debit', status: 'completed', createdAt: { gte: monthStart, lt: monthEnd } },
      }),
      db.walletTransaction.count({
        where: { walletId: { in: walletIds }, status: 'completed', createdAt: { gte: monthStart, lt: monthEnd } },
      }),
      db.walletTransaction.count({
        where: { walletId: { in: walletIds }, status: 'failed', createdAt: { gte: monthStart, lt: monthEnd } },
      }),
      db.walletTransaction.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { walletId: { in: walletIds }, createdAt: { gte: monthStart, lt: monthEnd } },
      }),
      db.walletTransaction.groupBy({
        by: ['counterpartyId'],
        where: { walletId: { in: walletIds }, type: 'credit', counterpartyId: { not: null }, createdAt: { gte: monthStart, lt: monthEnd } },
      }),
      db.walletTransaction.groupBy({
        by: ['counterpartyId'],
        where: { walletId: { in: walletIds }, type: 'debit', counterpartyId: { not: null }, createdAt: { gte: monthStart, lt: monthEnd } },
      }),
    ]);

    const revenue = Math.round((creditAgg._sum.amount ?? 0) * 100) / 100;
    const expenses = Math.round((debitAgg._sum.amount ?? 0) * 100) / 100;
    const netIncome = Math.round((revenue - expenses) * 100) / 100;
    const transactionCount = completedCount + failedCount;
    const averageTransactionValue = totalTxValue._count > 0
      ? Math.round((totalTxValue._sum.amount / totalTxValue._count) * 100) / 100
      : 0;
    const paymentSuccessRate = transactionCount > 0
      ? Math.round((completedCount / transactionCount) * 10000) / 100
      : 100;

    // Dispute rate from escrow disputes opened in this month
    const disputeCount = await db.escrowTransaction.count({
      where: {
        OR: [{ buyerId: businessId }, { sellerId: businessId }],
        disputes: { some: { createdAt: { gte: monthStart, lt: monthEnd } } },
      },
    });
    const disputeRate = transactionCount > 0
      ? Math.round((disputeCount / transactionCount) * 10000) / 100
      : 0;

    metrics.push({
      period: 'monthly',
      periodDate,
      revenue,
      expenses,
      netIncome,
      cashBalance: Math.round(totalCashBalance * 100) / 100,
      transactionCount,
      averageTransactionValue,
      paymentSuccessRate,
      disputeRate,
      customerCount: uniqueCustomers.length,
      supplierCount: uniqueSuppliers.length,
    });
  }

  return metrics;
}

// POST /api/twin/profiles/[id]/sync — Trigger a sync from external sources
async function postHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(request);
  const { id } = await params;

  const twin = await db.financialDigitalTwin.findUnique({
    where: { id },
    include: { business: { select: { tenantId: true, id: true } } },
  });

  if (!twin || twin.business.tenantId !== user.tenantId) {
    return notFound('Digital twin not found');
  }

  // Aggregate real metrics for last 6 months
  const realMetrics = await aggregateRealMonthlyMetrics(twin.business.id);

  // Upsert each metric
  for (const m of realMetrics) {
    await db.financialMetric.upsert({
      where: {
        twinId_period_periodDate: {
          twinId: id,
          period: m.period,
          periodDate: m.periodDate,
        },
      },
      update: {
        revenue: m.revenue,
        expenses: m.expenses,
        netIncome: m.netIncome,
        cashBalance: m.cashBalance,
        transactionCount: m.transactionCount,
        averageTransactionValue: m.averageTransactionValue,
        paymentSuccessRate: m.paymentSuccessRate,
        disputeRate: m.disputeRate,
        customerCount: m.customerCount,
        supplierCount: m.supplierCount,
      },
      create: {
        twinId: id,
        period: m.period,
        periodDate: m.periodDate,
        revenue: m.revenue,
        expenses: m.expenses,
        netIncome: m.netIncome,
        cashBalance: m.cashBalance,
        transactionCount: m.transactionCount,
        averageTransactionValue: m.averageTransactionValue,
        paymentSuccessRate: m.paymentSuccessRate,
        disputeRate: m.disputeRate,
        customerCount: m.customerCount,
        supplierCount: m.supplierCount,
      },
    });
  }

  // Recalculate scores from the most recent month's real data
  // realMetrics[0] is the most recent completed month (1 month ago)
  const latest = realMetrics[0];
  const prior = realMetrics[1]; // 2 months ago for trend comparison
  const revenue = latest.revenue;
  const expenses = latest.expenses;
  const cashBalance = latest.cashBalance;
  const paymentSuccessRate = latest.paymentSuccessRate;
  const disputeRate = latest.disputeRate;

  // Health score: profit margin + payment health + cash position
  let healthScore = 50;
  if (revenue > 0) {
    const profitMargin = (revenue - expenses) / revenue;
    healthScore = 40 + profitMargin * 40 + (paymentSuccessRate / 100) * 15 + (cashBalance > 0 ? 5 : -10);
  } else if (expenses > 0) {
    healthScore = 30 - (paymentSuccessRate < 80 ? 10 : 0);
  }

  // Cash flow health: payment success rate is primary driver
  const cashFlowHealth = Math.min(100, Math.max(0,
    30 + (paymentSuccessRate - 70) * 2.33 - disputeRate * 5 + (cashBalance > 10000 ? 10 : cashBalance > 0 ? 5 : -10)
  ));

  // Credit worthiness: payment score + health
  const creditWorthiness = Math.min(100, Math.max(0,
    30 + (paymentSuccessRate - 70) * 2 - disputeRate * 4 + (healthScore > 70 ? 15 : healthScore > 50 ? 5 : -5)
  ));

  // Liquidity: cash balance driven
  const liquidityScore = Math.min(100, Math.max(0,
    20 +
    (cashBalance > 100000 ? 40 : cashBalance > 50000 ? 30 : cashBalance > 10000 ? 20 : cashBalance > 1000 ? 10 : 0) +
    (paymentSuccessRate > 90 ? 10 : 0) +
    (disputeRate > 5 ? -10 : 0)
  ));

  // Growth trajectory from revenue trend
  let growthTrajectory = 'stable';
  if (prior.revenue > 0) {
    const growthRatio = revenue / prior.revenue;
    if (growthRatio >= 1.3) growthTrajectory = 'rapid_growth';
    else if (growthRatio >= 1.1) growthTrajectory = 'growing';
    else if (growthRatio < 0.85) growthTrajectory = 'declining';
  } else if (revenue > 0) {
    growthTrajectory = 'growing';
  }

  const updatedTwin = await db.financialDigitalTwin.update({
    where: { id },
    data: {
      healthScore: Math.round(healthScore * 100) / 100,
      cashFlowHealth: Math.round(cashFlowHealth * 100) / 100,
      creditWorthiness: Math.round(creditWorthiness * 100) / 100,
      liquidityScore: Math.round(liquidityScore * 100) / 100,
      growthTrajectory,
      lastSyncAt: new Date(),
    },
    include: {
      business: {
        select: { id: true, name: true, country: true, industry: true },
      },
    },
  });

  // Generate a post-sync snapshot with real signals
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const wallets = await db.wallet.findMany({
    where: { businessId: twin.business.id, status: 'active' },
    select: { id: true },
  });
  const walletIds = wallets.map((w: { id: string }) => w.id);

  const [openDisputes, complianceFlags, fraudAlerts, overdueInvoices] = await Promise.all([
    db.escrowTransaction.count({
      where: {
        OR: [{ buyerId: twin.business.id }, { sellerId: twin.business.id }],
        disputes: { some: { status: { in: ['open', 'under_review', 'escalated'] } } },
      },
    }),
    db.complianceScreening.count({
      where: { businessId: twin.business.id, result: { in: ['match', 'potential_match', 'alert'] } },
    }),
    db.fraudAlert.count({
      where: { businessId: twin.business.id, status: { in: ['open', 'investigating', 'confirmed_fraud'] } },
    }),
    db.invoice.count({
      where: { OR: [{ senderId: twin.business.id }, { receiverId: twin.business.id }], status: 'overdue' },
    }),
  ]);

  // Real risk factors from signals
  const riskFactors: string[] = [];
  if (latest.paymentSuccessRate < 90) riskFactors.push(`Payment success rate at ${latest.paymentSuccessRate.toFixed(1)}% — below 90% threshold`);
  if (latest.disputeRate > 3) riskFactors.push(`Dispute rate of ${latest.disputeRate.toFixed(1)}% exceeds healthy range`);
  if (openDisputes > 0) riskFactors.push(`${openDisputes} active dispute${openDisputes > 1 ? 's' : ''} requiring attention`);
  if (complianceFlags > 0) riskFactors.push(`${complianceFlags} compliance screening flag${complianceFlags > 1 ? 's' : ''} detected`);
  if (fraudAlerts > 0) riskFactors.push(`${fraudAlerts} fraud alert${fraudAlerts > 1 ? 's' : ''} under review`);
  if (overdueInvoices > 0) riskFactors.push(`${overdueInvoices} overdue invoice${overdueInvoices > 1 ? 's' : ''}`);
  if (revenue < expenses) riskFactors.push(`Net loss of $${Math.abs(revenue - expenses).toLocaleString()} this month`);
  if (cashBalance < 1000) riskFactors.push(`Low cash balance of $${cashBalance.toLocaleString()}`);
  if (riskFactors.length === 0) riskFactors.push('No significant risk factors detected');

  // Real opportunities from signals
  const opportunities: string[] = [];
  if (revenue > expenses * 1.2) opportunities.push(`Healthy profit margin of ${(((revenue - expenses) / revenue) * 100).toFixed(1)}%`);
  if (latest.paymentSuccessRate >= 95) opportunities.push(`Excellent payment success rate of ${latest.paymentSuccessRate.toFixed(1)}%`);
  if (latest.customerCount >= 10) opportunities.push(`Diverse customer base with ${latest.customerCount} active counterparties`);
  if (growthTrajectory === 'rapid_growth' || growthTrajectory === 'growing') opportunities.push(`Positive growth trajectory (${growthTrajectory.replace('_', ' ')})`);
  if (cashBalance > 50000) opportunities.push(`Strong cash reserves of $${cashBalance.toLocaleString()}`);
  if (opportunities.length === 0) opportunities.push('Focus on improving payment success rate and growing customer base');

  const healthLabel = healthScore >= 75 ? 'strong' : healthScore >= 50 ? 'moderate' : 'concerning';
  const aiSummary = `Post-sync analysis: The financial twin exhibits a ${healthLabel} health score of ${healthScore.toFixed(1)}/100 following the latest data synchronization. Revenue of $${revenue.toLocaleString()} against expenses of $${expenses.toLocaleString()} yields a net ${revenue > expenses ? 'surplus' : 'deficit'} of $${Math.abs(revenue - expenses).toLocaleString()}. Cash balance stands at $${cashBalance.toLocaleString()} with a ${paymentSuccessRate.toFixed(1)}% payment success rate across ${latest.transactionCount} transactions. ${latest.customerCount} unique customers and ${latest.supplierCount} suppliers were active. Key risks: ${riskFactors[0].toLowerCase()}. Top opportunities: ${opportunities[0].toLowerCase()}.`;

  await db.financialSnapshot.create({
    data: {
      twinId: id,
      snapshotType: 'event_driven',
      healthScore: updatedTwin.healthScore,
      cashFlowHealth: updatedTwin.cashFlowHealth,
      creditWorthiness: updatedTwin.creditWorthiness,
      liquidityScore: updatedTwin.liquidityScore,
      topRiskFactors: JSON.stringify(riskFactors.slice(0, 5)),
      topOpportunities: JSON.stringify(opportunities.slice(0, 5)),
      aiSummary,
    },
  });

  return ok(updatedTwin);
}

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/twin/profiles/[id]/sync');
