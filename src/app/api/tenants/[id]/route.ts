import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers';

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
async function getHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id } = await params;

    // Only allow users to view their own tenant (unless admin)
    if (user.tenantId !== id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
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
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    return NextResponse.json({ data: tenant });
  } catch (error) {
    console.error('Tenant GET error:', error);
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 });
  }
}

async function patchHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;

    if (user.tenantId !== id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only allow admin to update tenant
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = patchTenantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      );
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

    return NextResponse.json({ data: tenant });
  } catch (error) {
    console.error('Tenant PATCH error:', error);
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
  }
}

export const GET = withApiTelemetry(getHandler, '/api/tenants/[id]');

export const PATCH = withApiTelemetry(patchHandler, '/api/tenants/[id]');
