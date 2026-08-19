import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
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

// GET /api/twin/profiles/[id]/metrics — List metrics for a twin
async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const period = searchParams.get('period');
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100);

    // Verify twin exists and belongs to tenant
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

    const where: Record<string, unknown> = { twinId: id };
    if (period && validPeriods.includes(period as typeof validPeriods[number])) {
      where.period = period;
    }

    const metrics = await db.financialMetric.findMany({
      where,
      orderBy: { periodDate: 'desc' },
      take: limit,
    });

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error listing metrics:', error);
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json(
      { error: 'Failed to list metrics' },
      { status: 500 }
    );
  }
}

// POST /api/twin/profiles/[id]/metrics — Add a metric entry & recalculate health
async function postHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const parsed = createMetricSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 }
      );
    }

    // Verify twin exists and belongs to tenant
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

    // Recalculate health score based on latest metrics
    const latestMetrics = await db.financialMetric.findMany({
      where: { twinId: id },
      orderBy: { periodDate: 'desc' },
      take: 1,
    });

    let newHealthScore = twin.healthScore;

    if (latestMetrics.length > 0) {
      const m = latestMetrics[0];
      const revenue = m.revenue ?? 0;
      const expenses = m.expenses ?? 0;
      const cashBalance = m.cashBalance ?? 0;

      if (revenue > expenses && cashBalance > 0) {
        const profitMargin = (revenue - expenses) / Math.max(revenue, 1);
        newHealthScore = Math.min(100, twin.healthScore + 1 + profitMargin * 2);
      } else {
        const deficit = Math.abs(expenses - revenue) / Math.max(expenses, 1);
        newHealthScore = Math.max(0, twin.healthScore - 1 - deficit * 2);
      }
    }

    const updatedTwin = await db.financialDigitalTwin.update({
      where: { id },
      data: {
        healthScore: Math.round(newHealthScore * 100) / 100,
      },
    });

    return NextResponse.json({ metric, updatedHealthScore: updatedTwin.healthScore }, { status: 201 });
  } catch (error) {
    console.error('Error creating metric:', error);
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json(
      { error: 'Failed to create metric' },
      { status: 500 }
    );
  }
}

export const GET = withApiTelemetry(getHandler, '/api/twin/profiles/[id]/metrics');

export const POST = withApiTelemetry(postHandler, '/api/twin/profiles/[id]/metrics');
