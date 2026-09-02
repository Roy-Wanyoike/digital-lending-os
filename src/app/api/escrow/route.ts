import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers';
import { db } from '@/lib/db';
import { getTenantBusinessIds } from '@/backend/lib/tenant-cache';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { badRequest, created, error, notFound, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response';
import { generateTxRef } from '@/backend/lib/utils';

const createEscrowSchema = z.object({
  amount: z.coerce.number().positive('Amount must be a positive number'),
  currency: z.string().length(3).default('USD'),
  description: z.string().max(2000).optional(),
  sellerId: z.string().min(1, 'sellerId is required'),
});
// Lazy-load cache manager — graceful fallback if Redis/OTel not installed
let _cacheManager: any = undefined;
let _cacheAttempted = false;
async function getCache() {
  if (_cacheAttempted) return _cacheManager;
  _cacheAttempted = true;
  try {
    const mod = await import('@/backend/lib/cache/cache-manager');
    _cacheManager = mod.default;
  } catch {
    _cacheManager = undefined;
  }
  return _cacheManager;
}

async function getHandler(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return unauthorized('Authentication required');

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const businessIds = await getTenantBusinessIds(user.tenantId, db);

    if (businessIds.length === 0) {
      return ok([]);
    }

    const where = {
      OR: [
        { buyerId: { in: businessIds } },
        { sellerId: { in: businessIds } },
      ],
    };

    const cacheManager = await getCache();
    const fetchEscrows = () => db.escrowTransaction.findMany({
      where,
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const fetchCount = () => db.escrowTransaction.count({ where });

    const [escrows, total] = cacheManager
      ? await Promise.all([
          cacheManager.getOrSet(`escrows:${user.tenantId}:page:${page}:limit:${limit}`, fetchEscrows, { ttl: 30_000 }),
          fetchCount(),
        ])
      : await Promise.all([fetchEscrows(), fetchCount()]);

    return ok(escrows, { page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    console.error('Escrow GET error:', error);
    return error('Failed to fetch escrow transactions');
  }
}

async function postHandler(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const body = await req.json();
    const parsed = createEscrowSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues.map(i => i.message).join(', '));
    }

    const { amount, currency, description, sellerId } = parsed.data;

    // Get buyerId from user's first business
    const buyerBusiness = await db.business.findFirst({
      where: { tenantId: user.tenantId },
      select: { id: true },
    });
    if (!buyerBusiness) {
      return badRequest('No business found for this user');
    }

    // Validate seller exists and belongs to the same tenant
    const seller = await db.business.findFirst({
      where: { id: sellerId, tenantId: user.tenantId },
      select: { id: true },
    });
    if (!seller) {
      return notFound('Seller business not found');
    }

    const txRef = generateTxRef();

    const escrow = await db.escrowTransaction.create({
      data: {
        txRef,
        buyerId: buyerBusiness.id,
        sellerId,
        amount,
        currency,
        description: description || null,
        status: 'created',
      },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
      },
    });

    return created(escrow);
  } catch (error: any) {
    console.error('Escrow POST error:', error);return error('Failed to create escrow transaction');
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/escrow');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/escrow');
