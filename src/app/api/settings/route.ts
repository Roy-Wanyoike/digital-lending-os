import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { ok, badRequest, unauthorized, forbidden, notFound, withErrorHandler } from '@/backend/lib/api-response';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

const settingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  plan: z.string().min(1).max(50).optional(),
  maxBusinesses: z.number().int().min(1).optional(),
  maxUsers: z.number().int().min(1).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
});

const getHandler = withErrorHandler(async (req: NextRequest) => {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      status: true,
      maxBusinesses: true,
      maxUsers: true,
      features: true,
      ownerEmail: true,
      ownerName: true,
    },
  });

  if (!tenant) return notFound('Tenant not found');

  // Parse features JSON
  let features: Record<string, any> = {};
  try {
    features = JSON.parse(tenant.features || '{}');
  } catch {}

  return ok({
    ...tenant,
    features,
  });
});

const patchHandler = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  if (user.role !== 'admin') return forbidden();

  const body = await req.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Validation failed', parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    })));
  }

  const { name, plan, maxBusinesses, maxUsers, features } = parsed.data;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (plan !== undefined) updateData.plan = plan;
  if (maxBusinesses !== undefined) updateData.maxBusinesses = maxBusinesses;
  if (maxUsers !== undefined) updateData.maxUsers = maxUsers;
  if (features !== undefined) updateData.features = JSON.stringify(features);

  const tenant = await db.tenant.update({
    where: { id: user.tenantId },
    data: updateData,
    select: {
      id: true, name: true, slug: true, plan: true, status: true,
      maxBusinesses: true, maxUsers: true, features: true,
    },
  });

  return ok({
    ...tenant,
    features: JSON.parse(tenant.features || '{}'),
  });
});

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/settings');

export const PATCH = withApiTelemetry(withErrorHandler(patchHandler), '/api/settings');
