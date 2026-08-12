import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getApiUser, requireAuth, AuthError, } from '@/lib/auth/api-helpers';
import { db } from '@/lib/db';
import { getTenantBusinessIds } from '@/backend/lib/tenant-cache';
import { logAudit } from '@/lib/audit-logger';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { walletListCache } from '@/backend/lib/response-cache';
import { badRequest, conflict, created, error, forbidden, ok, unauthorized, withErrorHandler } from '@/backend/lib/api-response';

const createWalletSchema = z.object({
  businessId: z.string().min(1, 'businessId is required'),
  currency: z.string().regex(/^[A-Z]{3}$/, 'currency must be a valid 3-letter ISO 4217 code (e.g. USD, EUR, NGN)'),
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
    const filterBusinessId = searchParams.get('businessId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    // Get all business IDs belonging to this tenant (cached)
    const businessIds = await getTenantBusinessIds(user.tenantId, db);

    if (businessIds.length === 0) {
      return ok([]);
    }

    // If a specific businessId is requested, verify it belongs to this tenant
    let targetBusinessIds = businessIds;
    if (filterBusinessId) {
      if (!businessIds.includes(filterBusinessId)) {
        return ok([]);
      }
      targetBusinessIds = [filterBusinessId];
    }

    const cacheKey = filterBusinessId
      ? `wallets:${user.tenantId}:${filterBusinessId}`
      : `wallets:${user.tenantId}`;

    // First-level: synchronous in-memory cache (5s TTL)
    const memCached = walletListCache.get(cacheKey);
    if (memCached) {
      return ok(memCached, undefined, { maxAge: 3, swr: 5 });
    }

    const cacheManager = await getCache();
    const fetchWallets = () => db.wallet.findMany({
      where: { businessId: { in: targetBusinessIds } },
      select: {
        id: true,
        businessId: true,
        currency: true,
        balance: true,
        availableBalance: true,
        pendingBalance: true,
        frozenBalance: true,
        isDefault: true,
        label: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const fetchWalletsCount = () => db.wallet.count({ where: { businessId: { in: targetBusinessIds } } });

    const [wallets, total] = cacheManager
      ? await Promise.all([cacheManager.getOrSet(cacheKey, () => fetchWallets(), { ttl: 60_000 }), fetchWalletsCount()])
      : await Promise.all([fetchWallets(), fetchWalletsCount()]);

    // Populate first-level cache
    walletListCache.set(cacheKey, wallets);

    return ok(wallets, { page, limit, offset, total, pages: Math.ceil(total / limit) }, { maxAge: 3, swr: 5 });
  } catch (err: any) {
    if (err.message === 'Authentication required') return unauthorized(err.message);
    console.error('Wallets GET error:', err);
    return error('Failed to fetch wallets');
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/wallets');

async function postHandler(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const body = await req.json();
    const parsed = createWalletSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map(i => i.message).join(', '));
    }
    const { currency, businessId } = parsed.data;

    // Verify businessId belongs to the user's tenant
    const business = await db.business.findFirst({
      where: { id: businessId, tenantId: user.tenantId },
      select: { id: true, tenantId: true },
    });

    if (!business) return forbidden('Business not found or not in your tenant');

    // Check if wallet already exists for this business + currency
    const existing = await db.wallet.findFirst({
      where: { businessId, currency },
      select: { id: true },
    });

    if (existing) return conflict('Wallet already exists for this currency');

    const wallet = await db.wallet.create({
      data: {
        businessId,
        currency,
        balance: 0,
        availableBalance: 0,
        pendingBalance: 0,
        frozenBalance: 0,
      },
    });

    // Audit log the wallet creation
    logAudit('wallet.create', user.id, `Wallet created for currency ${currency}`, {
      walletId: wallet.id,
      businessId,
      currency,
      tenantId: user.tenantId,
    });

    return created(wallet);
  } catch (error: any) {if (error.message === 'Authentication required') return unauthorized(error.message);
    console.error('Wallets POST error:', error);
    return error('Failed to create wallet');
  }
}

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/wallets');
