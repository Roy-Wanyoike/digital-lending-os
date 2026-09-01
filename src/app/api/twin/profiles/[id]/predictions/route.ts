import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { ok, created, badRequest, notFound, unauthorized, withErrorHandler } from '@/backend/lib/api-response';

const validPredictionTypes = ['revenue_forecast', 'cash_flow', 'payment_success_rate', 'growth_trajectory'] as const;
const validTimeframes = ['30d', '60d', '90d', '6m', '1y'] as const;

const createPredictionSchema = z.object({
  predictionType: z.enum(validPredictionTypes),
  timeframe: z.enum(validTimeframes),
});

/**
 * Simple linear regression: y = a + b*x
 * Returns { slope, intercept, values } so callers can project forward.
 */
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/** Coefficient of variation — lower means more consistent data */
function coefficientOfVariation(values: number[]): number {
  if (values.length === 0) return 1;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 1;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / Math.abs(mean);
}

/** Moving average (window of `w` points) */
function movingAverage(values: number[], w: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - w + 1);
    const window = values.slice(start, i + 1);
    result.push(window.reduce((a, b) => a + b, 0) / window.length);
  }
  return result;
}

/**
 * Timeframe → number of months to project forward.
 */
function timeframeToMonths(tf: string): number {
  switch (tf) {
    case '30d': return 1;
    case '60d': return 2;
    case '90d': return 3;
    case '6m':  return 6;
    case '1y':  return 12;
    default:    return 3;
  }
}

interface PredictionResult {
  predictedValue: number;
  confidence: number;
  lowerBound: number;
  upperBound: number;
}

/**
 * Generate a real-data-driven prediction for a twin profile.
 *
 * Uses the business's last 6 months of wallet transaction data and
 * applies simple statistical methods (moving average, linear trend)
 * to project forward.
 */
async function generatePredictions(
  twinId: string,
  businessId: string,
  predictionType: string,
  timeframe: string,
): Promise<PredictionResult> {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const forwardMonths = timeframeToMonths(timeframe);

  const wallets = await db.wallet.findMany({
    where: { businessId, status: 'active' },
    select: { id: true },
  });
  const walletIds = wallets.map((w: { id: string }) => w.id);

  // Build monthly buckets for the last 6 months
  const monthlyData: { month: Date; revenue: number; expenses: number; txCount: number; failedCount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i, 1);

    if (walletIds.length === 0) {
      monthlyData.push({ month: start, revenue: 0, expenses: 0, txCount: 0, failedCount: 0 });
      continue;
    }

    const [creditAgg, debitAgg, txCount, failedCount] = await Promise.all([
      db.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { walletId: { in: walletIds }, type: 'credit', status: 'completed', createdAt: { gte: start, lt: end } },
      }),
      db.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { walletId: { in: walletIds }, type: 'debit', status: 'completed', createdAt: { gte: start, lt: end } },
      }),
      db.walletTransaction.count({
        where: { walletId: { in: walletIds }, status: 'completed', createdAt: { gte: start, lt: end } },
      }),
      db.walletTransaction.count({
        where: { walletId: { in: walletIds }, status: 'failed', createdAt: { gte: start, lt: end } },
      }),
    ]);

    monthlyData.push({
      month: start,
      revenue: creditAgg._sum.amount ?? 0,
      expenses: debitAgg._sum.amount ?? 0,
      txCount,
      failedCount,
    });
  }

  // Extract series
  const revenues = monthlyData.map((d) => d.revenue);
  const netIncomes = monthlyData.map((d) => d.revenue - d.expenses);
  const successRates = monthlyData.map((d) => {
    const total = d.txCount + d.failedCount;
    return total > 0 ? (d.txCount / total) * 100 : 100;
  });

  // ── Confidence based on data variance ──
  const revenueCV = coefficientOfVariation(revenues.filter((v) => v > 0));
  // CV < 0.2 → high confidence (0.85), CV > 1 → low (0.4)
  const baseConfidence = Math.max(0.4, Math.min(0.9, 0.9 - revenueCV * 0.5));
  // Reduce confidence for longer timeframes
  const timeframeDiscount = 1 - (forwardMonths / 12) * 0.3;
  const confidence = Math.round(baseConfidence * timeframeDiscount * 1000) / 1000;

  let predictedValue: number;
  let lowerBound: number;
  let upperBound: number;

  switch (predictionType) {
    case 'revenue_forecast': {
      // 3-month moving average + linear trend projection
      const ma = movingAverage(revenues, 3);
      const lastMA = ma[ma.length - 1] ?? 0;
      const { slope } = linearRegression(revenues);
      predictedValue = lastMA + slope * forwardMonths;
      const spread = Math.abs(predictedValue * revenueCV * 0.5 * (forwardMonths / 3));
      lowerBound = Math.max(0, predictedValue - spread);
      upperBound = predictedValue + spread;
      break;
    }

    case 'cash_flow': {
      // Project net income (revenue - expenses)
      const ma = movingAverage(netIncomes, 3);
      const lastMA = ma[ma.length - 1] ?? 0;
      const { slope } = linearRegression(netIncomes);
      predictedValue = lastMA + slope * forwardMonths;
      const cfCV = coefficientOfVariation(netIncomes.filter((v) => v > 0));
      const spread = Math.abs(predictedValue * Math.max(cfCV, 0.1) * (forwardMonths / 3));
      lowerBound = predictedValue - spread;
      upperBound = predictedValue + spread;
      break;
    }

    case 'payment_success_rate': {
      // Predict success rate percentage
      const { intercept, slope } = linearRegression(successRates);
      predictedValue = intercept + slope * (6 + forwardMonths);
      predictedValue = Math.min(100, Math.max(0, predictedValue));
      const spread = 5 * (forwardMonths / 3); // wider spread for longer timeframes
      lowerBound = Math.max(0, predictedValue - spread);
      upperBound = Math.min(100, predictedValue + spread);
      break;
    }

    case 'growth_trajectory': {
      // Growth rate as percentage (month-over-month)
      const growthRates: number[] = [];
      for (let i = 1; i < revenues.length; i++) {
        if (revenues[i - 1] > 0) {
          growthRates.push(((revenues[i] - revenues[i - 1]) / revenues[i - 1]) * 100);
        }
      }
      const { intercept, slope } = linearRegression(growthRates);
      predictedValue = intercept + slope * forwardMonths;
      const grCV = coefficientOfVariation(growthRates);
      const spread = Math.abs(predictedValue * Math.max(grCV, 0.05) * (forwardMonths / 3));
      lowerBound = predictedValue - spread;
      upperBound = predictedValue + spread;
      break;
    }

    default:
      predictedValue = 0;
      lowerBound = 0;
      upperBound = 0;
  }

  return {
    predictedValue: Math.round(predictedValue * 100) / 100,
    confidence,
    lowerBound: Math.round(lowerBound * 100) / 100,
    upperBound: Math.round(upperBound * 100) / 100,
  };
}

// GET /api/twin/profiles/[id]/predictions — List predictions for a twin
async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return unauthorized('Authentication required');
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  const predictionType = searchParams.get('predictionType');
  const timeframe = searchParams.get('timeframe');

  // Verify twin exists and belongs to tenant
  const twin = await db.financialDigitalTwin.findUnique({
    where: { id },
    include: { business: { select: { tenantId: true } } },
  });

  if (!twin || twin.business.tenantId !== user.tenantId) {
    return notFound('Digital twin not found');
  }

  const where: Record<string, unknown> = { twinId: id };
  if (predictionType) {
    where.predictionType = predictionType;
  }
  if (timeframe) {
    where.timeframe = timeframe;
  }

  const predictions = await db.financialPrediction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return ok(predictions);
}

// POST /api/twin/profiles/[id]/predictions — Generate a prediction
async function postHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(request);
  const { id } = await params;
  const body = await request.json();
  const parsed = createPredictionSchema.safeParse(body);

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

  const { predictionType, timeframe } = parsed.data;

  const result = await generatePredictions(id, twin.business.id, predictionType, timeframe);

  const prediction = await db.financialPrediction.create({
    data: {
      twinId: id,
      predictionType,
      timeframe,
      predictedValue: result.predictedValue,
      confidence: result.confidence,
      lowerBound: result.lowerBound,
      upperBound: result.upperBound,
      model: 'statistical_v1',
    },
  });

  return created(prediction);
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/twin/profiles/[id]/predictions');
export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/twin/profiles/[id]/predictions');
