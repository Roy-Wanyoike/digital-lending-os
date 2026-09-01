import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { getTenantBusinessIds } from '@/backend/lib/tenant-cache';
import { ok, created, badRequest, unauthorized, notFound, withErrorHandler } from '@/backend/lib/api-response';
import { logAudit } from '@/lib/audit-logger';
import { getLogger } from '@/backend/lib/telemetry/logger';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { calculateFee } from '@/backend/lib/payment/config';
import type { PaymentProviderCode } from '@/backend/lib/payment/types';

const log = getLogger().withContext({ route: '/api/withdrawals' });

// ─── Withdrawal Fee Calculation ──────────────────────────
// Tiered fee structure used when no provider-specific config applies.
//   Amount < $100:    2%  (min $1)
//   $100 – $1,000:   1.5% (min $2)
//   Amount > $1,000:  1%  (min $5)

interface WithdrawalFeeBreakdown {
  feePercent: number;
  feeAmount: number;
  minFeeApplied: boolean;
}

function calculateWithdrawalFee(amount: number): WithdrawalFeeBreakdown {
  let feePercent: number;
  let minFee: number;

  if (amount < 100) {
    feePercent = 2;
    minFee = 1;
  } else if (amount <= 1000) {
    feePercent = 1.5;
    minFee = 2;
  } else {
    feePercent = 1;
    minFee = 5;
  }

  const rawFee = Math.round(amount * (feePercent / 100) * 100) / 100;
  const feeAmount = Math.max(minFee, rawFee);
  const minFeeApplied = rawFee < minFee;

  return { feePercent, feeAmount, minFeeApplied };
}

/**
 * Resolves the withdrawal fee. If a recognised provider is supplied the
 * provider's own fee table (calculateFee) is used; otherwise the built-in
 * tiered withdrawal fee structure applies.
 */
function resolveWithdrawalFee(
  amount: number,
  provider: string | undefined,
  currency: string,
): { feeAmount: number; netAmount: number; breakdown: Record<string, unknown> } {
  // Known provider codes from the payment config
  const knownProviders: PaymentProviderCode[] = ['stripe', 'paystack', 'intasend', 'flutterwave', 'paya'];

  if (provider && knownProviders.includes(provider as PaymentProviderCode)) {
    const result = calculateFee(amount, provider as PaymentProviderCode, currency);
    return {
      feeAmount: result.totalFee,
      netAmount: result.netAmount,
      breakdown: {
        source: 'provider',
        provider: result.provider,
        providerName: result.providerName,
        percentFee: result.percentFee,
        fixedFee: result.fixedFee,
        totalFee: result.totalFee,
      },
    };
  }

  const tiered = calculateWithdrawalFee(amount);
  const feeAmount = tiered.feeAmount;
  const netAmount = Math.round((amount - feeAmount) * 100) / 100;
  return {
    feeAmount,
    netAmount: Math.max(0, netAmount),
    breakdown: {
      source: 'tiered',
      feePercent: tiered.feePercent,
      minFeeApplied: tiered.minFeeApplied,
    },
  };
}

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

export const GET = withApiTelemetry(withErrorHandler(getWithdrawalsHandler), '/api/withdrawals');

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

  // ── Calculate fee ───────────────────────────────────────────
  const { feeAmount, netAmount, breakdown } = resolveWithdrawalFee(amount, provider, wallet.currency);

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
    feeAmount,
    netAmount,
    feeSource: (breakdown.source as string),
  });

  log.info('Withdrawal created', { withdrawalId: withdrawal.id, walletId, amount, feeAmount, netAmount });

  return created({
    ...withdrawal,
    feeBreakdown: breakdown,
    baseAmount: amount,
    feeAmount,
    netAmount,
  });
});
