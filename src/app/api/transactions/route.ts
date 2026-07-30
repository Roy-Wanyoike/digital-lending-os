import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, successResponse, errorResponse } from '@/lib/auth/api-helpers';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

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

/** Maximum number of transactions per page. */
const MAX_LIMIT = 200;
/** Default page size for the merge query. */
const MERGE_DEFAULT_LIMIT = 20;

async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return errorResponse('Authentication required', 401);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    // Fetch business IDs belonging to the tenant
    const tenantBusinessIds = (
      await db.business.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true },
      })
    ).map((b) => b.id);

    if (tenantBusinessIds.length === 0) {
      return successResponse({ data: [], total: 0 });
    }

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
            wallet: { select: { id: true, currency: true, balance: true, businessId: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        db.walletTransaction.count({ where: walletWhere }),
      ]);

      const mapped = transactions.map((tx) => ({
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
          include: {
            intent: { select: { id: true, sourceCurrency: true, targetCurrency: true, status: true, fromBusinessId: true, toBusinessId: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        db.paymentTransaction.count({ where: paymentWhere }),
      ]);

      const mapped = transactions.map((tx) => ({
        id: tx.id,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        description: null,
        source: 'payment' as const,
        createdAt: tx.createdAt,
        provider: tx.provider,
        intentId: tx.intentId,
        intent: tx.intent,
      }));

      return successResponse({ data: mapped, total });
    }

    // --- Default: merge both types, sorted by date ---
    // Fetch over-sized batches from each source, then merge-sort and paginate in memory.
    // We fetch (offset + limit) from each source to ensure we have enough records
    // after merging. This avoids loading the entire table into memory.
    const mergeFetchSize = offset + limit;

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
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          description: true,
          createdAt: true,
          walletId: true,
          wallet: { select: { id: true, currency: true, balance: true, businessId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: mergeFetchSize,
      }),
      db.paymentTransaction.findMany({
        where: paymentWhere,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
          provider: true,
          intentId: true,
          intent: { select: { id: true, sourceCurrency: true, targetCurrency: true, status: true, fromBusinessId: true, toBusinessId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: mergeFetchSize,
      }),
      db.walletTransaction.count({ where: walletWhere }),
      db.paymentTransaction.count({ where: paymentWhere }),
    ]);

    const walletItems: TransactionItem[] = walletTransactions.map((tx) => ({
      ...tx,
      source: 'wallet' as const,
    }));

    const paymentItems: TransactionItem[] = paymentTransactions.map((tx) => ({
      ...tx,
      description: null,
      source: 'payment' as const,
    }));

    // Merge and sort by createdAt descending
    const merged = [...walletItems, ...paymentItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const paginated = merged.slice(offset, offset + limit);
    const total = walletCount + paymentCount;

    return successResponse({ data: paginated, total });
  } catch (error: unknown) {
    console.error('Transactions GET error:', error);
    // Do not leak internal error details to the client
    const isAuthError = error && typeof error === 'object' && 'statusCode' in error;
    if (isAuthError) {
      const authErr = error as { statusCode: number; message: string };
      return errorResponse(authErr.message, authErr.statusCode);
    }
    return errorResponse('Failed to fetch transactions', 500);
  }
}

export const GET = withApiTelemetry(getHandler, '/api/transactions');
