import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, requireRole, AuthError } from '@/lib/auth/api-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id } = await params;

    // Only allow users to view their own tenant (unless SUPER_ADMIN)
    if (user.tenantId !== id && user.role !== 'SUPER_ADMIN') {
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id } = await params;

    if (user.tenantId !== id && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only allow ADMIN or SUPER_ADMIN to update tenant
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.plan !== undefined) updateData.plan = body.plan;
    if (body.ownerEmail !== undefined) updateData.ownerEmail = body.ownerEmail;
    if (body.ownerName !== undefined) updateData.ownerName = body.ownerName;
    if (body.maxBusinesses !== undefined) updateData.maxBusinesses = body.maxBusinesses;
    if (body.maxUsers !== undefined) updateData.maxUsers = body.maxUsers;
    if (body.features !== undefined) updateData.features = typeof body.features === 'object' ? JSON.stringify(body.features) : body.features;
    if (body.status !== undefined) updateData.status = body.status;

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
