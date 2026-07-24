import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, errorResponse, successResponse } from '@/lib/auth/api-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    // Only SUPER_ADMIN can see all tenants; others see only their own
    if (user.role === 'SUPER_ADMIN') {
      const tenants = await prisma.tenant.findMany({
        include: {
          _count: {
            select: {
              businesses: true,
              accounts: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return successResponse({ tenants });
    }

    // Regular users see their own tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      include: {
        _count: {
          select: {
            businesses: true,
            accounts: true,
          },
        },
      },
    });

    if (!tenant) return errorResponse('Tenant not found', 404);
    return successResponse({ tenants: [tenant] });
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('Tenants GET error:', error);
    return errorResponse('Failed to fetch tenants', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ['SUPER_ADMIN']);
    const body = await req.json();
    const { name, slug, plan, settings } = body;

    if (!name || !slug) return errorResponse('Name and slug are required', 400);

    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) return errorResponse('Tenant slug already exists', 409);

    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        plan: plan || 'FREE',
        settings: settings || {},
      },
    });

    return successResponse(tenant, 201);
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    if (error.message === 'Insufficient permissions') return errorResponse(error.message, 403);
    console.error('Tenants POST error:', error);
    return errorResponse('Failed to create tenant', 500);
  }
}
