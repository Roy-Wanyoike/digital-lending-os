import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, errorResponse, successResponse, requireAdmin } from '@/lib/auth/api-helpers';

export async function GET(req: NextRequest) {
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

export async function PATCH(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);
    if (user.role !== 'admin') return errorResponse('Insufficient permissions', 403);

    const body = await req.json();
    const { name, plan, maxBusinesses, maxUsers, features } = body;

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
    return errorResponse('Failed to update settings', 500);
  }
}
