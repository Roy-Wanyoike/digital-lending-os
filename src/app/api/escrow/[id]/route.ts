import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/auth/api-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);

    const escrow = await prisma.escrowTransaction.findFirst({
      where: { id: params.id, tenantId: user.tenantId },
      include: {
        buyer: { select: { id: true, email: true, name: true } },
        seller: { select: { id: true, email: true, name: true } },
      },
    });

    if (!escrow) return errorResponse('Escrow transaction not found', 404);
    return successResponse(escrow);
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('Escrow GET by ID error:', error);
    return errorResponse('Failed to fetch escrow transaction', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { action, releaseTo } = body;

    const escrow = await prisma.escrowTransaction.findFirst({
      where: { id: params.id, tenantId: user.tenantId },
    });

    if (!escrow) return errorResponse('Escrow transaction not found', 404);

    if (action === 'release') {
      if (escrow.buyerId !== user.id && user.role !== 'ADMIN') {
        return errorResponse('Only buyer or admin can release funds', 403);
      }
      const updated = await prisma.escrowTransaction.update({
        where: { id: params.id },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });
      return successResponse(updated);
    }

    if (action === 'dispute') {
      const updated = await prisma.escrowTransaction.update({
        where: { id: params.id },
        data: { status: 'DISPUTED' },
      });
      return successResponse(updated);
    }

    return errorResponse('Invalid action. Use "release" or "dispute"', 400);
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('Escrow PATCH error:', error);
    return errorResponse('Failed to update escrow transaction', 500);
  }
}
