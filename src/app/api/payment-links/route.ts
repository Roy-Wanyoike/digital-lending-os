import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, tenantScope, errorResponse, successResponse } from '@/lib/auth/api-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const where = tenantScope(user.tenantId);

    const paymentLinks = await prisma.paymentLink.findMany({
      where,
      include: {
        business: { select: { id: true, name: true } },
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({ paymentLinks });
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('PaymentLinks GET error:', error);
    return errorResponse('Failed to fetch payment links', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { title, description, amount, currency, businessId, expiresIn, metadata } = body;

    if (!title || !amount) return errorResponse('title and amount are required', 400);

    // Verify business belongs to tenant if businessId provided
    if (businessId) {
      const business = await prisma.business.findFirst({
        where: { id: businessId, ...tenantScope(user.tenantId) },
      });
      if (!business) return errorResponse('Business not found', 404);
    }

    const paymentLink = await prisma.paymentLink.create({
      data: {
        title,
        description: description || '',
        amount: parseFloat(amount),
        currency: currency || 'KES',
        businessId: businessId || null,
        tenantId: user.tenantId,
        createdBy: user.id,
        active: true,
        metadata: metadata || {},
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
      },
    });

    return successResponse(paymentLink, 201);
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('PaymentLinks POST error:', error);
    return errorResponse('Failed to create payment link', 500);
  }
}
