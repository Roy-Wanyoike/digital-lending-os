import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers';
import { getTenantBusinessIds } from '@/backend/lib/tenant-cache';
import { ok, created, badRequest, unauthorized, notFound, withErrorHandler } from '@/backend/lib/api-response';
import { logAudit } from '@/lib/audit-logger';
import { getLogger } from '@/backend/lib/telemetry/logger';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

const log = getLogger().withContext({ route: '/api/withdrawals' });

// GET /api/withdrawals — List withdrawals for the tenant's wallets
const getWithdrawalsHandler = withErrorHandler(async (request: NextRequest) => {
  const user = await getApiUser(request);
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const status = searchParams.get('status');
  const walletId = searchParams.get('walletId');

  // Find wallet IDs belonging to businesses in this tenant
  const tenantBusinessIds = await getTenantBusinessIds(user.tenantId, db);

  const tenantWalletIds = tenantBusinessIds.length > 0
    ? (await db.wallet.findMany({
        where: { businessId: { in: tenantBusinessIds } },
        select: { id: true },
      })).map((w: any) => w.id)
    : [];

  // Build where clause — wallet-scoped
  const where: any = { walletId: { in: tenantWalletIds } };
  if (walletId) where.walletId = walletId;
  if (status) where.status = status;

  const [withdrawals, total] = await Promise.all([
    db.withdrawal.findMany({
      where,
      include: {
        wallet: { select: { id: true, currency: true, businessId: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.withdrawal.count({ where }),
  ]);

  return ok(withdrawals, { page, limit, total, pages: Math.ceil(total / limit) });
});

export const GET = withApiTelemetry(getWithdrawalsHandler, '/api/withdrawals');

// POST /api/withdrawals — Create a new withdrawal
export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireAuth(request);

  const body = await request.json();
  const { walletId, amount, paymentMethod, provider, bankName, bankAccount, bankCode, recipientName, notes } = body;

  if (!walletId || !amount || !paymentMethod) {
    return badRequest('walletId, amount, and paymentMethod are required');
  }

  // Verify wallet belongs to a business in the user's tenant
  const wallet = await db.wallet.findFirst({
    where: { id: walletId },
  });

  if (!wallet) return notFound('Wallet not found');

  // Check the wallet's business belongs to the user's tenant
  const business = await db.business.findFirst({
    where: { id: wallet.businessId, tenantId: user.tenantId },
    select: { id: true },
  });

  if (!business) return notFound('Wallet not found');

  const parsedAmount = parseFloat(amount);
  const feeAmount = 0; // fee calculation handled elsewhere if needed
  const netAmount = parsedAmount - feeAmount;

  const withdrawal = await db.withdrawal.create({
    data: {
      withdrawalRef: `WDR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      walletId,
      amount: parsedAmount,
      currency: wallet.currency,
      paymentMethod,
      provider: provider || null,
      bankName: bankName || null,
      bankAccount: bankAccount || null,
      bankCode: bankCode || null,
      recipientName: recipientName || null,
      feeAmount,
      netAmount,
      notes: notes || null,
      status: 'pending',
    },
  });

  // Audit log the withdrawal initiation
  logAudit('withdrawal.initiate', user.id, `Withdrawal of ${wallet.currency} ${parsedAmount} initiated`, {
    withdrawalId: withdrawal.id,
    withdrawalRef: withdrawal.withdrawalRef,
    walletId,
    amount: parsedAmount,
    currency: wallet.currency,
    paymentMethod,
    tenantId: user.tenantId,
  });

  log.info('Withdrawal created', { withdrawalId: withdrawal.id, walletId, amount: parsedAmount });
  return created(withdrawal);
});
