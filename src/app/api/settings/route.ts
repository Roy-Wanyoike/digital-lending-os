import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getApiUser, requireAuth, AuthError, errorResponse, successResponse, requireAdmin } from '@/lib/auth/api-helpers';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

const settingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  plan: z.string().min(1).max(50).optional(),
  maxBusinesses: z.number().int().min(1).optional(),
  maxUsers: z.number().int().min(1).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
});
async function getHandler(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);

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

    if (!tenant) return errorResponse('Tenant not found', 404);

    // Parse features JSON
    let features: Record<string, any> = {};
    try {
      features = JSON.parse(tenant.features || '{}');
    } catch {}

    return successResponse({
      ...tenant,
      features,
    });
  } catch (error: any) {
    console.error('Settings GET error:', error);
    return errorResponse('Failed to fetch settings', 500);
  }
}

async function patchHandler(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user.role !== 'admin') return errorResponse('Insufficient permissions', 403);

    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((i) => i.message).join(', '), 400);
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

    return successResponse({
      ...tenant,
      features: JSON.parse(tenant.features || '{}'),
    });
  } catch (error: any) {
    console.error('Settings PATCH error:', error);
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return errorResponse('Failed to update settings', 500);
  }
}

export const GET = withApiTelemetry(getHandler, '/api/settings');

export const PATCH = withApiTelemetry(patchHandler, '/api/settings');
