import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, AuthError } from '@/lib/auth/api-helpers';

function generateMockMonthlyMetrics(months: number) {
  const metrics: {
    period: string;
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
  }[] = [];
  const now = new Date();

  for (let i = 1; i <= months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const periodDate = date.toISOString().slice(0, 10);

    const trend = 1 + (months - i) * 0.03;
    const baseRevenue = 120000 * trend;
    const baseExpenses = 85000 * trend;

    const revenue = Math.round(baseRevenue * (0.85 + Math.random() * 0.3) * 100) / 100;
    const expenses = Math.round(baseExpenses * (0.9 + Math.random() * 0.2) * 100) / 100;

    metrics.push({
      period: 'monthly' as const,
      periodDate,
      revenue,
      expenses,
      netIncome: Math.round((revenue - expenses) * 100) / 100,
      cashBalance: Math.round((50000 + Math.random() * 150000) * 100) / 100,
      transactionCount: Math.round(80 + Math.random() * 120),
      averageTransactionValue: Math.round((800 + Math.random() * 2000) * 100) / 100,
      paymentSuccessRate: Math.round((85 + Math.random() * 14) * 100) / 100,
      disputeRate: Math.round(Math.random() * 5 * 100) / 100,
      customerCount: Math.round(30 + Math.random() * 70),
      supplierCount: Math.round(10 + Math.random() * 20),
    });
  }

  return metrics;
}

// POST /api/twin/profiles/[id]/sync — Trigger a sync from external sources
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    const { id } = await params;

    const twin = await db.financialDigitalTwin.findUnique({
      where: { id },
      include: { business: { select: { tenantId: true } } },
    });

    if (!twin) {
      return NextResponse.json(
        { error: 'Digital twin not found' },
        { status: 404 }
      );
    }
    if (twin.business.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'Digital twin not found' },
        { status: 404 }
      );
    }

    // Generate mock metrics for last 3 months (monthly)
    const mockMetrics = generateMockMonthlyMetrics(3);

    // Upsert each metric
    for (const m of mockMetrics) {
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

    // Recalculate scores based on latest metric
    const latestMetric = mockMetrics[0];
    const revenue = latestMetric.revenue ?? 0;
    const expenses = latestMetric.expenses ?? 0;
    const cashBalance = latestMetric.cashBalance ?? 0;
    const paymentSuccessRate = latestMetric.paymentSuccessRate ?? 80;
    const disputeRate = latestMetric.disputeRate ?? 2;

    let healthScore = 50;
    if (revenue > expenses && cashBalance > 0) {
      const profitMargin = (revenue - expenses) / Math.max(revenue, 1);
      healthScore = Math.min(100, 60 + profitMargin * 40 + (cashBalance > 50000 ? 10 : 0));
    } else {
      const deficit = Math.abs(expenses - revenue) / Math.max(expenses, 1);
      healthScore = Math.max(0, 50 - deficit * 30);
    }

    const cashFlowHealth = Math.min(100, Math.max(0,
      50 + (paymentSuccessRate - 90) * 2 - disputeRate * 5 + (cashBalance > 0 ? 10 : -15)
    ));

    const creditWorthiness = Math.min(100, Math.max(0,
      40 + (paymentSuccessRate - 80) * 1.5 - disputeRate * 3 + (healthScore > 70 ? 15 : 0)
    ));

    const liquidityScore = Math.min(100, Math.max(0,
      30 + (cashBalance > 100000 ? 30 : cashBalance > 50000 ? 20 : cashBalance > 0 ? 10 : -10) +
      (paymentSuccessRate > 90 ? 10 : 0)
    ));

    let growthTrajectory = 'stable';
    if (revenue > expenses * 1.3) growthTrajectory = 'rapid_growth';
    else if (revenue > expenses * 1.1) growthTrajectory = 'growing';
    else if (revenue < expenses * 0.9) growthTrajectory = 'declining';

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

    // Generate a post-sync snapshot
    const riskFactors = [
      'High accounts receivable aging',
      'Currency exposure in 3 markets',
      'Concentration risk — top 3 clients represent 70% of revenue',
      'Rising supplier payment delays',
      'Cash reserves below 2-month operating expenses',
      'Dependency on single payment processor',
      'Seasonal revenue volatility detected',
    ].sort(() => Math.random() - 0.5).slice(0, 3);

    const opportunities = [
      'Expand to 2 new markets',
      'Negotiate better payment terms',
      'Diversify supplier base to reduce risk',
      'Implement dynamic pricing to boost margins',
      'Leverage trade finance for faster cash conversion',
      'Automate invoice processing to reduce DSO',
    ].sort(() => Math.random() - 0.5).slice(0, 3);

    const healthLabel = healthScore >= 75 ? 'strong' : healthScore >= 50 ? 'moderate' : 'concerning';
    const aiSummary = `Post-sync analysis: The financial twin exhibits a ${healthLabel} health score of ${healthScore.toFixed(1)}/100 following the latest data synchronization. Revenue of $${revenue.toLocaleString()} against expenses of $${expenses.toLocaleString()} yields a net ${revenue > expenses ? 'surplus' : 'deficit'} of $${Math.abs(revenue - expenses).toLocaleString()}. Cash balance stands at $${cashBalance.toLocaleString()} with a ${paymentSuccessRate.toFixed(1)}% payment success rate. Key risks: ${riskFactors[0].toLowerCase()} and ${riskFactors[1].toLowerCase()}. Top opportunities: ${opportunities[0].toLowerCase()} and ${opportunities[1].toLowerCase()}.`;

    await db.financialSnapshot.create({
      data: {
        twinId: id,
        snapshotType: 'event_driven',
        healthScore: updatedTwin.healthScore,
        cashFlowHealth: updatedTwin.cashFlowHealth,
        creditWorthiness: updatedTwin.creditWorthiness,
        liquidityScore: updatedTwin.liquidityScore,
        topRiskFactors: JSON.stringify(riskFactors),
        topOpportunities: JSON.stringify(opportunities),
        aiSummary,
      },
    });

    return NextResponse.json(updatedTwin);
  } catch (error) {
    console.error('Error syncing twin:', error);
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json(
      { error: 'Failed to sync digital twin' },
      { status: 500 }
    );
  }
}
