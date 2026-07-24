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

    const [deposits, total] = await Promise.all([
      prisma.deposit.findMany({
        where,
        include: {
          wallet: { select: { id: true, currency: true } },
          account: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.deposit.count({ where }),
    ]);

    return successResponse({
      deposits,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('Deposits GET error:', error);
    return errorResponse('Failed to fetch deposits', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { walletId, amount, currency, method, description } = body;

    if (!walletId || !amount) {
      return errorResponse('walletId and amount are required', 400);
    }

    // Verify wallet belongs to user's tenant
    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, ...tenantScope(user.tenantId) },
    });

    if (!wallet) return errorResponse('Wallet not found', 404);

    const deposit = await prisma.deposit.create({
      data: {
        accountId: user.id,
        tenantId: user.tenantId,
        walletId,
        amount: parseFloat(amount),
        currency: currency || wallet.currency,
        method: method || 'manual',
        description: description || `Deposit of ${amount} ${currency || wallet.currency}`,
        referenceId: `DEP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        status: 'PENDING',
      },
    });

    return successResponse(deposit, 201);
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('Deposits POST error:', error);
    return errorResponse('Failed to create deposit', 500);
  }
}
