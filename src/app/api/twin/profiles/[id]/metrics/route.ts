import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

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
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const period = searchParams.get('period');
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100);

    // Verify twin exists
    const twin = await db.financialDigitalTwin.findUnique({
      where: { id },
    });

    if (!twin) {
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
    return NextResponse.json(
      { error: 'Failed to list metrics' },
      { status: 500 }
    );
  }
}

// POST /api/twin/profiles/[id]/metrics — Add a metric entry & recalculate health
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = createMetricSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      );
    }

    // Verify twin exists
    const twin = await db.financialDigitalTwin.findUnique({
      where: { id },
    });

    if (!twin) {
      return NextResponse.json(
        { error: 'Digital twin not found' },
        { status: 404 }
      );
    }

    // Upsert metric (handle unique constraint on twinId + period + periodDate)
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
        // Positive signal: increase health score slightly
        const profitMargin = (revenue - expenses) / Math.max(revenue, 1);
        newHealthScore = Math.min(100, twin.healthScore + 1 + profitMargin * 2);
      } else {
        // Negative signal: decrease health score slightly
        const deficit = Math.abs(expenses - revenue) / Math.max(expenses, 1);
        newHealthScore = Math.max(0, twin.healthScore - 1 - deficit * 2);
      }
    }

    // Update twin health score
    const updatedTwin = await db.financialDigitalTwin.update({
      where: { id },
      data: {
        healthScore: Math.round(newHealthScore * 100) / 100,
      },
    });

    return NextResponse.json({ metric, updatedHealthScore: updatedTwin.healthScore }, { status: 201 });
  } catch (error) {
    console.error('Error creating metric:', error);
    return NextResponse.json(
      { error: 'Failed to create metric' },
      { status: 500 }
    );
  }
}