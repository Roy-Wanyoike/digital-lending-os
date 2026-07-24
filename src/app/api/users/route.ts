import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin, tenantScope, errorResponse, successResponse } from '@/lib/auth/api-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    if (user.role === 'SUPER_ADMIN') {
      // Super admin can see all users
      const users = await prisma.account.findMany({
        include: {
          tenant: { select: { id: true, name: true } },
          _count: {
            select: { wallets: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return successResponse({ users });
    }

    // Regular users see only users in their tenant
    const users = await prisma.account.findMany({
      where: tenantScope(user.tenantId),
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        tenant: { select: { id: true, name: true } },
        _count: { select: { wallets: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({ users });
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('Users GET error:', error);
    return errorResponse('Failed to fetch users', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    const body = await req.json();
    const { email, name, role } = body;

    if (!email || !name) return errorResponse('email and name are required', 400);

    const existing = await prisma.account.findFirst({
      where: { email, tenantId: user.tenantId },
    });
    if (existing) return errorResponse('User already exists in this tenant', 409);

    const newUser = await prisma.account.create({
      data: {
        email,
        name,
        role: role || 'USER',
        tenantId: user.tenantId,
        active: true,
      },
    });

    return successResponse(newUser, 201);
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    if (error.message === 'Insufficient permissions') return errorResponse(error.message, 403);
    console.error('Users POST error:', error);
    return errorResponse('Failed to create user', 500);
  }
}
