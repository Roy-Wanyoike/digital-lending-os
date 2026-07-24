import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, tenantScope, errorResponse, successResponse } from '@/lib/auth/api-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);

    const link = await prisma.paymentLink.findFirst({
      where: { id: params.id, ...tenantScope(user.tenantId) },
      include: {
        business: { select: { id: true, name: true } },
        _count: { select: { transactions: true } },
      },
    });

    if (!link) return errorResponse('Payment link not found', 404);
    return successResponse(link);
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('PaymentLink GET by ID error:', error);
    return errorResponse('Failed to fetch payment link', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const link = await prisma.paymentLink.findFirst({
      where: { id: params.id, ...tenantScope(user.tenantId) },
    });

    if (!link) return errorResponse('Payment link not found', 404);

    const updated = await prisma.paymentLink.update({
      where: { id: params.id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.amount !== undefined && { amount: parseFloat(body.amount) }),
        ...(body.active !== undefined && { active: body.active }),
        ...(body.description !== undefined && { description: body.description }),
      },
    });

    return successResponse(updated);
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('PaymentLink PATCH error:', error);
    return errorResponse('Failed to update payment link', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);

    const link = await prisma.paymentLink.findFirst({
      where: { id: params.id, ...tenantScope(user.tenantId) },
    });

    if (!link) return errorResponse('Payment link not found', 404);

    await prisma.paymentLink.delete({ where: { id: params.id } });
    return successResponse({ message: 'Payment link deleted' });
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('PaymentLink DELETE error:', error);
    return errorResponse('Failed to delete payment link', 500);
  }
}
