import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, successResponse, errorResponse } from '@/lib/auth/api-helpers';

interface TransactionItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  source: 'wallet' | 'payment';
  createdAt: Date;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return errorResponse('Authentication required', 401);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    // Fetch business IDs belonging to the tenant
    const tenantBusinessIds = (
      await db.business.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true },
      })
    ).map((b) => b.id);

    // --- Wallet transactions only ---
    if (type === 'wallet') {
      const walletWhere = {
        wallet: {
          business: {
            tenantId: user.tenantId,
          },
        },
      };

      const [transactions, total] = await Promise.all([
        db.walletTransaction.findMany({
          where: walletWhere,
          include: {
            wallet: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        db.walletTransaction.count({ where: walletWhere }),
      ]);

      const mapped = transactions.map((tx) => ({
        ...tx,
        source: 'wallet' as const,
      }));

      return successResponse({ data: mapped, total });
    }

    // --- Payment transactions only ---
    if (type === 'payment') {
      const paymentWhere = {
        intent: {
          OR: [
            { fromBusinessId: { in: tenantBusinessIds } },
            { toBusinessId: { in: tenantBusinessIds } },
          ],
        },
      };

      const [transactions, total] = await Promise.all([
        db.paymentTransaction.findMany({
          where: paymentWhere,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        db.paymentTransaction.count({ where: paymentWhere }),
      ]);

      const mapped = transactions.map((tx) => ({
        ...tx,
        source: 'payment' as const,
      }));

      return successResponse({ data: mapped, total });
    }

    // --- Default: merge both types, sorted by date ---
    const walletWhere = {
      wallet: {
        business: {
          tenantId: user.tenantId,
        },
      },
    };
    const paymentWhere = {
      intent: {
        OR: [
          { fromBusinessId: { in: tenantBusinessIds } },
          { toBusinessId: { in: tenantBusinessIds } },
        ],
      },
    };

    const [walletTransactions, paymentTransactions, walletCount, paymentCount] = await Promise.all([
      db.walletTransaction.findMany({
        where: walletWhere,
        include: {
          wallet: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.paymentTransaction.findMany({
        where: paymentWhere,
        orderBy: { createdAt: 'desc' },
      }),
      db.walletTransaction.count({ where: walletWhere }),
      db.paymentTransaction.count({ where: paymentWhere }),
    ]);

    const walletItems: TransactionItem[] = walletTransactions.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      currency: tx.currency,
      status: tx.status,
      description: tx.description,
      source: 'wallet' as const,
      createdAt: tx.createdAt,
      walletId: tx.walletId,
      wallet: tx.wallet,
    }));

    const paymentItems: TransactionItem[] = paymentTransactions.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      currency: tx.currency,
      status: tx.status,
      description: null,
      source: 'payment' as const,
      createdAt: tx.createdAt,
      provider: tx.provider,
      intentId: tx.intentId,
    }));

    // Merge and sort by createdAt descending
    const merged = [...walletItems, ...paymentItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const paginated = merged.slice(offset, offset + limit);
    const total = walletCount + paymentCount;

    return successResponse({ data: paginated, total });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch transactions';
    console.error('Transactions GET error:', error);
    return errorResponse(message);
  }
}
