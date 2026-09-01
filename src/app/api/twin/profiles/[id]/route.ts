import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { ok, badRequest, notFound, unauthorized, withErrorHandler } from '@/backend/lib/api-response';

const updateTwinSchema = z.object({
  healthScore: z.number().min(0).max(100).optional(),
  cashFlowHealth: z.number().min(0).max(100).optional(),
  riskAppetite: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
  creditWorthiness: z.number().min(0).max(100).optional(),
  liquidityScore: z.number().min(0).max(100).optional(),
  growthTrajectory: z.enum(['declining', 'stable', 'growing', 'rapid_growth']).optional(),
});

// GET /api/twin/profiles/[id] — Get single digital twin with relations
async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return unauthorized('Authentication required');
  const { id } = await params;

  const twin = await db.financialDigitalTwin.findUnique({
    where: { id },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          country: true,
          industry: true,
          status: true,
          createdAt: true,
          tenantId: true,
        },
      },
      metrics: {
        take: 10,
        orderBy: { periodDate: 'desc' },
      },
      predictions: {
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
      snapshots: {
        take: 5,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!twin || twin.business.tenantId !== user.tenantId) {
    return notFound('Digital twin not found');
  }

  return ok(twin);
}

// PUT /api/twin/profiles/[id] — Update digital twin fields
async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(request);
  const { id } = await params;
  const body = await request.json();
  const parsed = updateTwinSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((e) => e.message).join(', '));
  }

  // Verify twin exists and belongs to tenant
  const existing = await db.financialDigitalTwin.findUnique({
    where: { id },
    include: { business: { select: { tenantId: true } } },
  });

  if (!existing || existing.business.tenantId !== user.tenantId) {
    return notFound('Digital twin not found');
  }

  const twin = await db.financialDigitalTwin.update({
    where: { id },
    data: parsed.data,
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

  return ok(twin);
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/twin/profiles/[id]');
export const PUT = withApiTelemetry(withErrorHandler(putHandler), '/api/twin/profiles/[id]');
