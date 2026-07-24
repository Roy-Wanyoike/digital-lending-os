import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, tenantScope, errorResponse, successResponse } from '@/lib/auth/api-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const where = tenantScope(user.tenantId);

    // Non-admin users only see their own wallets
    if (user.role === 'USER' || user.role === 'VIEWER') {
      where.accountId = user.id;
    }

    const wallets = await prisma.wallet.findMany({
      where,
      include: {
        account: { select: { id: true, email: true, name: true } },
        business: { select: { id: true, name: true } },
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get balances
    const walletsData = await Promise.all(
      wallets.map(async (wallet) => {
        const totalCredit = await prisma.walletTransaction.aggregate({
          where: { walletId: wallet.id, type: 'CREDIT', status: 'COMPLETED' },
          _sum: { amount: true },
        });
        const totalDebit = await prisma.walletTransaction.aggregate({
          where: { walletId: wallet.id, type: 'DEBIT', status: 'COMPLETED' },
          _sum: { amount: true },
        });

        return {
          ...wallet,
          availableBalance: (wallet.balance || 0),
          totalCredit: totalCredit._sum.amount || 0,
          totalDebit: totalDebit._sum.amount || 0,
        };
      })
    );

    return successResponse({ wallets: walletsData });
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('Wallets GET error:', error);
    return errorResponse('Failed to fetch wallets', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { currency, businessId, label } = body;

    if (!currency) return errorResponse('currency is required', 400);

    // Check if wallet already exists for this currency
    const existing = await prisma.wallet.findFirst({
      where: {
        accountId: user.id,
        currency,
        tenantId: user.tenantId,
      },
    });

    if (existing) return errorResponse('Wallet already exists for this currency', 409);

    const wallet = await prisma.wallet.create({
      data: {
        accountId: user.id,
        currency,
        balance: 0,
        tenantId: user.tenantId,
        businessId: businessId || user.businessId || null,
        label: label || null,
      },
    });

    return successResponse(wallet, 201);
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('Wallets POST error:', error);
    return errorResponse('Failed to create wallet', 500);
  }
}
