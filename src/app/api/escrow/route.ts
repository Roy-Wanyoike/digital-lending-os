import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, tenantScope, errorResponse, successResponse } from '@/lib/auth/api-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const where = tenantScope(user.tenantId);

    const escrows = await prisma.escrowTransaction.findMany({
      where,
      include: {
        buyer: { select: { id: true, email: true } },
        seller: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({ escrows });
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('Escrow GET error:', error);
    return errorResponse('Failed to fetch escrow transactions', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { amount, currency, description, sellerId, buyerWalletId, sellerWalletId } = body;

    if (!amount || !sellerId) return errorResponse('amount and sellerId are required', 400);

    const escrow = await prisma.escrowTransaction.create({
      data: {
        amount: parseFloat(amount),
        currency: currency || 'KES',
        description: description || '',
        buyerId: user.id,
        sellerId,
        buyerWalletId: buyerWalletId || null,
        sellerWalletId: sellerWalletId || null,
        tenantId: user.tenantId,
        status: 'PENDING',
      },
    });

    return successResponse(escrow, 201);
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('Escrow POST error:', error);
    return errorResponse('Failed to create escrow transaction', 500);
  }
}
