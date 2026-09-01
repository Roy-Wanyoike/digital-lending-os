import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { ok, created, badRequest, notFound, unauthorized, conflict, withErrorHandler } from '@/backend/lib/api-response';

const createTwinSchema = z.object({
  businessId: z.string().min(1, 'businessId is required'),
});

// GET /api/twin/profiles — List financial digital twins
async function getHandler(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return unauthorized('Authentication required');

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('businessId');
  const minHealthScore = searchParams.get('minHealthScore');
  const growthTrajectory = searchParams.get('growthTrajectory');

  const where: Record<string, unknown> = { business: { tenantId: user.tenantId } };

  if (businessId) {
    where.businessId = businessId;
  }
  if (minHealthScore) {
    where.healthScore = { gte: parseFloat(minHealthScore) };
  }
  if (growthTrajectory) {
    where.growthTrajectory = growthTrajectory;
  }

  const twins = await db.financialDigitalTwin.findMany({
    where,
    include: {
      business: {
        select: {
          id: true,
          name: true,
          country: true,
          industry: true,
        },
      },
      metrics: {
        orderBy: { periodDate: 'asc' },
        take: 6,
      },
      predictions: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return ok(twins);
}

// POST /api/twin/profiles — Create a financial digital twin
async function postHandler(request: NextRequest) {
  const user = await requireAuth(request);
  const body = await request.json();
  const parsed = createTwinSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((e) => e.message).join(', '));
  }

  const { businessId } = parsed.data;

  // Check business exists and belongs to tenant
  const business = await db.business.findUnique({
    where: { id: businessId },
  });

  if (!business || business.tenantId !== user.tenantId) {
    return notFound('Business not found');
  }

  // Check business doesn't already have a twin
  const existingTwin = await db.financialDigitalTwin.findUnique({
    where: { businessId },
  });

  if (existingTwin) {
    return conflict('This business already has a financial digital twin');
  }

  const twin = await db.financialDigitalTwin.create({
    data: {
      businessId,
      healthScore: 50.0,
      cashFlowHealth: 50.0,
      riskAppetite: 'moderate',
      creditWorthiness: 50.0,
      liquidityScore: 50.0,
      growthTrajectory: 'stable',
      aiModelVersion: 'v1.0',
    },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          country: true,
          industry: true,
        },
      },
    },
  });

  return created(twin);
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/twin/profiles');
export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/twin/profiles');
