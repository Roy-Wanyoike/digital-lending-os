import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, tenantScope, errorResponse, successResponse } from '@/lib/auth/api-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    const where: any = { tenantId: user.tenantId };
    if (user.role === 'USER' || user.role === 'VIEWER') {
      where.accountId = user.id;
    }
    if (status) where.status = status;

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        include: {
          wallet: { select: { id: true, currency: true } },
          account: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.withdrawal.count({ where }),
    ]);

    return successResponse({
      withdrawals,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('Withdrawals GET error:', error);
    return errorResponse('Failed to fetch withdrawals', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { walletId, amount, currency, method, destination, description } = body;

    if (!walletId || !amount || !method) {
      return errorResponse('walletId, amount, and method are required', 400);
    }

    // Verify wallet belongs to user's tenant and check balance
    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, ...tenantScope(user.tenantId) },
    });

    if (!wallet) return errorResponse('Wallet not found', 404);

    if (wallet.balance < parseFloat(amount)) {
      return errorResponse('Insufficient wallet balance', 400);
    }

    // Create withdrawal in a transaction (deduct from wallet balance)
    const withdrawal = await prisma.$transaction(async (tx) => {
      // Deduct from wallet
      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: { decrement: parseFloat(amount) } },
      });

      // Create withdrawal record
      return tx.withdrawal.create({
        data: {
          accountId: user.id,
          tenantId: user.tenantId,
          walletId,
          amount: parseFloat(amount),
          currency: currency || wallet.currency,
          method, // bank_transfer, mobile_money, crypto
          destination: destination || null,
          description: description || `Withdrawal of ${amount} ${currency || wallet.currency}`,
          referenceId: `WDR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          status: 'PENDING',
        },
      });
    });

    return successResponse(withdrawal, 201);
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('Withdrawals POST error:', error);
    return errorResponse('Failed to create withdrawal', 500);
  }
}
