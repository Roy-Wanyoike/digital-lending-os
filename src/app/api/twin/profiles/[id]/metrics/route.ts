import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { ok, created, badRequest, notFound, unauthorized, withErrorHandler } from '@/backend/lib/api-response';

const validPeriods = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const;

const createMetricSchema = z.object({
  period: z.enum(validPeriods),
  periodDate: z.string().min(1, 'periodDate is required'),
  revenue: z.number().optional().nullable(),
  expenses: z.number().optional().nullable(),
  netIncome: z.number().optional().nullable(),
  cashBalance: z.number().optional().nullable(),
  transactionCount: z.number().int().optional().nullable(),
  averageTransactionValue: z.number().optional().nullable(),
  paymentSuccessRate: z.number().min(0).max(100).optional().nullable(),
  disputeRate: z.number().min(0).max(100).optional().nullable(),
  customerCount: z.number().int().optional().nullable(),
  supplierCount: z.number().int().optional().nullable(),
});

/**
 * Fetch real business data and compute a weighted health score.
 *
 * Weights:
 *   - Revenue trend (30%): current month revenue vs previous month
 *   - Payment success rate (25%): successful / total transactions
 *   - Account activity (20%): number of transactions in last 30 days
 *   - Customer diversity (15%): unique counterparties
 *   - Compliance status (10%): any pending/failed compliance checks
 */
async function computeRealHealthScore(businessId: string): Promise<number> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);

  const wallets = await db.wallet.findMany({
    where: { businessId, status: 'active' },
    select: { id: true },
  });
  const walletIds = wallets.map((w: { id: string }) => w.id);

  if (walletIds.length === 0) return 50;

  // ── Revenue trend (30%) ──
  const currentMonthRevenue = await db.walletTransaction.aggregate({
    _sum: { amount: true },
    where: {
      walletId: { in: walletIds },
      type: 'credit',
      status: 'completed',
      createdAt: { gte: thirtyDaysAgo },
    },
  });
  const currentRev = currentMonthRevenue._sum.amount ?? 0;

  const previousMonthRevenue = await db.walletTransaction.aggregate({
    _sum: { amount: true },
    where: {
      walletId: { in: walletIds },
      type: 'credit',
      status: 'completed',
      createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
    },
  });
  const previousRev = previousMonthRevenue._sum.amount ?? 0;

  let revenueTrendScore = 50;
  if (previousRev > 0) {
    const growth = (currentRev - previousRev) / previousRev;
    revenueTrendScore = Math.min(100, Math.max(0, 50 + growth * 100));
  } else if (currentRev > 0) {
    revenueTrendScore = 70; // new revenue, positive signal
  }

  // ── Payment success rate (25%) ──
  const completedCount = await db.walletTransaction.count({
    where: { walletId: { in: walletIds }, status: 'completed', createdAt: { gte: thirtyDaysAgo } },
  });
  const failedCount = await db.walletTransaction.count({
    where: { walletId: { in: walletIds }, status: 'failed', createdAt: { gte: thirtyDaysAgo } },
  });
  const totalCount = completedCount + failedCount;
  const paymentSuccessRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 100;
  // Scale: 95%+ → 100, 80% → 50, 50% → 0
  const paymentScore = Math.min(100, Math.max(0, (paymentSuccessRate - 50) * 2));

  // ── Account activity (20%) ──
  const recentTxCount = await db.walletTransaction.count({
    where: { walletId: { in: walletIds }, createdAt: { gte: thirtyDaysAgo } },
  });
  // Scale: 0 → 0, 50 → 50, 100+ → 100
  const activityScore = Math.min(100, (recentTxCount / 100) * 100);

  // ── Customer diversity (15%) ──
  const uniqueCounterparties = await db.walletTransaction.groupBy({
    by: ['counterpartyId'],
    where: {
      walletId: { in: walletIds },
      counterpartyId: { not: null },
      createdAt: { gte: thirtyDaysAgo },
    },
  });
  // Scale: 0 → 0, 5 → 50, 20+ → 100
  const diversityScore = Math.min(100, (uniqueCounterparties.length / 20) * 100);

  // ── Compliance status (10%) ──
  const failedCompliance = await db.complianceScreening.count({
    where: {
      businessId,
      result: { in: ['match', 'potential_match', 'alert'] },
      status: 'completed',
    },
  });
  const pendingCompliance = await db.complianceScreening.count({
    where: { businessId, status: { in: ['pending', 'in_progress'] } },
  });
  // 100 if clean, deductions for flags
  const complianceScore = Math.max(0, 100 - failedCompliance * 25 - pendingCompliance * 10);

  // Weighted average
  const healthScore =
    revenueTrendScore * 0.3 +
    paymentScore * 0.25 +
    activityScore * 0.2 +
    diversityScore * 0.15 +
    complianceScore * 0.1;

  return Math.round(healthScore * 100) / 100;
}

// GET /api/twin/profiles/[id]/metrics — List metrics for a twin
async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return unauthorized('Authentication required');
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  const period = searchParams.get('period');
  const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100);

  // Verify twin exists and belongs to tenant
  const twin = await db.financialDigitalTwin.findUnique({
    where: { id },
    include: { business: { select: { tenantId: true } } },
  });

  if (!twin || twin.business.tenantId !== user.tenantId) {
    return notFound('Digital twin not found');
  }

  const where: Record<string, unknown> = { twinId: id };
  if (period && validPeriods.includes(period as typeof validPeriods[number])) {
    where.period = period;
  }

  const metrics = await db.financialMetric.findMany({
    where,
    orderBy: { periodDate: 'desc' },
    take: limit,
  });

  return ok(metrics);
}

// POST /api/twin/profiles/[id]/metrics — Add a metric entry & recalculate health
async function postHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(request);
  const { id } = await params;
  const body = await request.json();
  const parsed = createMetricSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((e) => e.message).join(', '));
  }

  // Verify twin exists and belongs to tenant
  const twin = await db.financialDigitalTwin.findUnique({
    where: { id },
    include: { business: { select: { tenantId: true, id: true } } },
  });

  if (!twin || twin.business.tenantId !== user.tenantId) {
    return notFound('Digital twin not found');
  }

  // Upsert metric
  const metric = await db.financialMetric.upsert({
    where: {
      twinId_period_periodDate: {
        twinId: id,
        period: parsed.data.period,
        periodDate: parsed.data.periodDate,
      },
    },
    update: {
      revenue: parsed.data.revenue ?? undefined,
      expenses: parsed.data.expenses ?? undefined,
      netIncome: parsed.data.netIncome ?? undefined,
      cashBalance: parsed.data.cashBalance ?? undefined,
      transactionCount: parsed.data.transactionCount ?? undefined,
      averageTransactionValue: parsed.data.averageTransactionValue ?? undefined,
      paymentSuccessRate: parsed.data.paymentSuccessRate ?? undefined,
      disputeRate: parsed.data.disputeRate ?? undefined,
      customerCount: parsed.data.customerCount ?? undefined,
      supplierCount: parsed.data.supplierCount ?? undefined,
    },
    create: {
      twinId: id,
      period: parsed.data.period,
      periodDate: parsed.data.periodDate,
      revenue: parsed.data.revenue,
      expenses: parsed.data.expenses,
      netIncome: parsed.data.netIncome,
      cashBalance: parsed.data.cashBalance,
      transactionCount: parsed.data.transactionCount,
      averageTransactionValue: parsed.data.averageTransactionValue,
      paymentSuccessRate: parsed.data.paymentSuccessRate,
      disputeRate: parsed.data.disputeRate,
      customerCount: parsed.data.customerCount,
      supplierCount: parsed.data.supplierCount,
    },
  });

  // Recalculate health score from real business data using weighted model
  const newHealthScore = await computeRealHealthScore(twin.business.id);

  const updatedTwin = await db.financialDigitalTwin.update({
    where: { id },
    data: {
      healthScore: newHealthScore,
    },
  });

  return created({ metric, updatedHealthScore: updatedTwin.healthScore });
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/twin/profiles/[id]/metrics');
export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/twin/profiles/[id]/metrics');
