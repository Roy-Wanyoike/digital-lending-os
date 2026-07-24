import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin, tenantScope, errorResponse, successResponse } from '@/lib/auth/api-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const where = tenantScope(user.tenantId);

    const businesses = await prisma.business.findMany({
      where,
      include: {
        _count: {
          select: {
            wallets: true,
            paymentLinks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({ businesses });
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('Businesses GET error:', error);
    return errorResponse('Failed to fetch businesses', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    const body = await req.json();
    const { name, description, industry, website, logoUrl } = body;

    if (!name) return errorResponse('Business name is required', 400);

    const business = await prisma.business.create({
      data: {
        name,
        description: description || '',
        industry: industry || '',
        website: website || '',
        logoUrl: logoUrl || '',
        tenantId: user.tenantId,
        ownerId: user.id,
      },
    });

    return successResponse(business, 201);
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    if (error.message === 'Insufficient permissions') return errorResponse(error.message, 403);
    console.error('Businesses POST error:', error);
    return errorResponse('Failed to create business', 500);
  }
}
