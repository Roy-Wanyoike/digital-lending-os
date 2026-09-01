import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { ok, created, badRequest, notFound, unauthorized, withErrorHandler } from '@/backend/lib/api-response';

const validPredictionTypes = ['revenue', 'cash_flow', 'risk', 'default_probability', 'growth_rate'] as const;
const validTimeframes = ['30d', '60d', '90d', '6m', '1y'] as const;

const createPredictionSchema = z.object({
  predictionType: z.enum(validPredictionTypes),
  timeframe: z.enum(validTimeframes),
});

function generateMockPrediction(
  predictionType: string,
  timeframe: string
): { predictedValue: number; confidence: number; lowerBound: number; upperBound: number } {
  const baseValues: Record<string, number> = {
    revenue: 150000,
    cash_flow: 45000,
    risk: 0.25,
    default_probability: 0.05,
    growth_rate: 0.12,
  };

  const base = baseValues[predictionType] ?? 100;

  const timeframeMultiplier: Record<string, number> = {
    '30d': 1.0,
    '60d': 1.08,
    '90d': 1.15,
    '6m': 1.3,
    '1y': 1.5,
  };

  const multiplier = timeframeMultiplier[timeframe] ?? 1.0;
  const variance = (timeframe === '30d' ? 0.05 : timeframe === '60d' ? 0.08 : timeframe === '90d' ? 0.1 : 0.15);

  const predictedValue = base * multiplier * (0.9 + Math.random() * 0.2);
  const confidence = 0.6 + Math.random() * 0.35;
  const spread = Math.abs(predictedValue * variance * (0.5 + Math.random()));
  const lowerBound = predictedValue - spread;
  const upperBound = predictedValue + spread;

  return {
    predictedValue: Math.round(predictedValue * 100) / 100,
    confidence: Math.round(confidence * 1000) / 1000,
    lowerBound: Math.round(Math.max(0, lowerBound) * 100) / 100,
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
    include: { business: { select: { tenantId: true } } },
  });

  if (!twin || twin.business.tenantId !== user.tenantId) {
    return notFound('Digital twin not found');
  }

  const { predictionType, timeframe } = parsed.data;
  const mock = generateMockPrediction(predictionType, timeframe);

  const prediction = await db.financialPrediction.create({
    data: {
      twinId: id,
      predictionType,
      timeframe,
      predictedValue: mock.predictedValue,
      confidence: mock.confidence,
      lowerBound: mock.lowerBound,
      upperBound: mock.upperBound,
      model: 'ensemble_v2',
    },
  });

  return created(prediction);
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/twin/profiles/[id]/predictions');
export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/twin/profiles/[id]/predictions');
