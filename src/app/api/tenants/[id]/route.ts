import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, errorResponse, successResponse } from '@/lib/auth/api-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);

    // Only allow users to view their own tenant (unless SUPER_ADMIN)
    if (user.tenantId !== params.id && user.role !== 'SUPER_ADMIN') {
      return errorResponse('Access denied', 403);
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { businesses: true, accounts: true },
        },
      },
    });

    if (!tenant) return errorResponse('Tenant not found', 404);
    return successResponse(tenant);
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('Tenant GET error:', error);
    return errorResponse('Failed to fetch tenant', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(req, ['SUPER_ADMIN', 'ADMIN']);
    const body = await req.json();

    if (user.tenantId !== params.id && user.role !== 'SUPER_ADMIN') {
      return errorResponse('Access denied', 403);
    }

    const tenant = await prisma.tenant.update({
      where: { id: params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.plan && { plan: body.plan }),
        ...(body.settings && { settings: body.settings }),
      },
    });

    return successResponse(tenant);
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    if (error.message === 'Insufficient permissions') return errorResponse(error.message, 403);
    console.error('Tenant PATCH error:', error);
    return errorResponse('Failed to update tenant', 500);
  }
}
