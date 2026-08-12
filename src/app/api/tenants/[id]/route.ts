import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { ok, unauthorized, badRequest, notFound, forbidden, withErrorHandler } from '@/backend/lib/api-response';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

const patchTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  plan: z.string().optional(),
  ownerEmail: z.string().email().optional(),
  ownerName: z.string().min(1).max(200).optional(),
  maxBusinesses: z.number().int().min(1).optional(),
  maxUsers: z.number().int().min(1).optional(),
  features: z.record(z.string(), z.unknown()).or(z.array(z.unknown())).optional(),
  status: z.enum(['active', 'suspended', 'trial', 'churned']).optional(),
});

const getHandler = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getApiUser(req);
  if (!user) {
    return unauthorized();
  }
  const { id } = await params;

  // Only allow users to view their own tenant (unless admin)
  if (user.tenantId !== id && user.role !== 'admin') {
    return forbidden();
  }

  const tenant = await db.tenant.findUnique({
    where: { id },
    include: {
      _count: {
        select: { businesses: true, accounts: true },
      },
    },
  });

  if (!tenant) {
    return notFound('Tenant not found');
  }
  return ok(tenant);
});

const patchHandler = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireAuth(req);
  const { id } = await params;

  if (user.tenantId !== id && user.role !== 'admin') {
    return forbidden();
  }

  // Only allow admin to update tenant
  if (user.role !== 'admin') {
    return forbidden();
  }

  const body = await req.json();
  const parsed = patchTenantSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Validation failed', parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    })));
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.plan !== undefined) updateData.plan = parsed.data.plan;
  if (parsed.data.ownerEmail !== undefined) updateData.ownerEmail = parsed.data.ownerEmail;
  if (parsed.data.ownerName !== undefined) updateData.ownerName = parsed.data.ownerName;
  if (parsed.data.maxBusinesses !== undefined) updateData.maxBusinesses = parsed.data.maxBusinesses;
  if (parsed.data.maxUsers !== undefined) updateData.maxUsers = parsed.data.maxUsers;
  if (parsed.data.features !== undefined) updateData.features = JSON.stringify(parsed.data.features);
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

  const tenant = await db.tenant.update({
    where: { id },
    data: updateData,
  });

  return ok(tenant);
});

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/tenants/[id]');

export const PATCH = withApiTelemetry(withErrorHandler(patchHandler), '/api/tenants/[id]');
