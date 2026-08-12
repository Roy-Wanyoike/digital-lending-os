import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { getTenantBusinessIds } from '@/backend/lib/tenant-cache';
import { ok, created, badRequest, unauthorized, withErrorHandler } from '@/backend/lib/api-response';
import { depositCreateSchema, paginationSchema } from '@/backend/lib/validation/schemas';
import { getLogger } from '@/backend/lib/telemetry/logger';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

const log = getLogger().withContext({ route: '/api/deposits' });

// GET /api/deposits — List deposits for the tenant's wallets
const getDepositsHandler = withErrorHandler(async (request: NextRequest) => {
  const user = await getApiUser(request);
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const pagination = paginationSchema.parse(Object.fromEntries(searchParams));
  const status = searchParams.get('status');
  const walletId = searchParams.get('walletId');

  // Find wallet IDs belonging to businesses in this tenant (parallelized)
  const tenantBusinessIds = await getTenantBusinessIds(user.tenantId, db);

  const tenantWalletIds = tenantBusinessIds.length > 0
    ? (await db.wallet.findMany({
        where: { businessId: { in: tenantBusinessIds } },
        select: { id: true },
      })).map((w: any) => w.id)
    : [];

  const where: any = { walletId: { in: tenantWalletIds } };
  if (walletId) where.walletId = walletId;
  if (status) where.status = status;

  const [deposits, total] = await Promise.all([
    db.deposit.findMany({
      where,
      include: { wallet: { select: { id: true, currency: true, businessId: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    db.deposit.count({ where }),
  ]);

  return ok(deposits, { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) });
});

export const GET = withApiTelemetry(withErrorHandler(getDepositsHandler), '/api/deposits');

// POST /api/deposits — Create a new deposit
export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireAuth(request);

  const body = await request.json();
  const parsed = depositCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Validation failed', parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })));
  }

  const data = parsed.data;

  // Verify wallet belongs to tenant (single query via relation navigation)
  const wallet = await db.wallet.findFirst({
    where: { id: data.walletId, business: { tenantId: user.tenantId } },
  });
  if (!wallet) return badRequest('Wallet not found');

  const deposit = await db.deposit.create({
    data: {
      depositRef: `DEP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      walletId: data.walletId,
      amount: data.amount,
      currency: wallet.currency,
      paymentMethod: data.paymentMethod,
      provider: data.provider || null,
      bankName: data.bankName || null,
      notes: data.notes || null,
      status: 'pending',
    },
  });

  log.info('Deposit created', { depositId: deposit.id, walletId: data.walletId, amount: data.amount });
  return created(deposit);
});
