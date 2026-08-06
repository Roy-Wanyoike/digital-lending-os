import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { getTenantBusinessIds } from '@/backend/lib/tenant-cache';
import { ok, created, badRequest, unauthorized, notFound, withErrorHandler } from '@/backend/lib/api-response';
import { logAudit } from '@/lib/audit-logger';
import { getLogger } from '@/backend/lib/telemetry/logger';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

const log = getLogger().withContext({ route: '/api/withdrawals' });

const withdrawalCreateSchema = z.object({
  walletId: z.string().min(1, 'Wallet ID is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0').max(10_000_000, 'Amount exceeds maximum limit'),
  paymentMethod: z.enum(['bank_transfer', 'mobile_money', 'external', 'crypto'], {
    message: 'paymentMethod must be one of: bank_transfer, mobile_money, external, crypto',
  }),
  provider: z.string().max(50).optional(),
  bankName: z.string().max(200).optional(),
  bankAccount: z.string().max(100).optional(),
  bankCode: z.string().max(50).optional(),
  recipientName: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

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
  const parsed = withdrawalCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Validation failed', parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })));
  }

  const { walletId, amount, paymentMethod, provider, bankName, bankAccount, bankCode, recipientName, notes } = parsed.data;

  // Verify wallet belongs to a business in the user's tenant (single query via relation)
  const wallet = await db.wallet.findFirst({
    where: { id: walletId, business: { tenantId: user.tenantId } },
  });

  if (!wallet) return notFound('Wallet not found');

  const feeAmount = 0; // fee calculation handled elsewhere if needed
  const netAmount = amount - feeAmount;

  const withdrawal = await db.withdrawal.create({
    data: {
      withdrawalRef: `WDR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      walletId,
      amount,
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
  logAudit('withdrawal.initiate', user.id, `Withdrawal of ${wallet.currency} ${amount} initiated`, {
    withdrawalId: withdrawal.id,
    withdrawalRef: withdrawal.withdrawalRef,
    walletId,
    amount,
    currency: wallet.currency,
    paymentMethod,
    tenantId: user.tenantId,
  });

  log.info('Withdrawal created', { withdrawalId: withdrawal.id, walletId, amount });
  return created(withdrawal);
});
