import { NextRequest, NextResponse } from 'next/server';
import { getApiUser, requireAuth, AuthError, errorResponse, successResponse } from '@/lib/auth/api-helpers';
import { db } from '@/lib/db';
import { getTenantBusinessIds } from '@/backend/lib/tenant-cache';
import { logAudit } from '@/lib/audit-logger';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { walletListCache } from '@/backend/lib/response-cache';

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
    if (!user) return errorResponse('Authentication required', 401);

    const { searchParams } = new URL(req.url);
    const filterBusinessId = searchParams.get('businessId');

    // Get all business IDs belonging to this tenant (cached)
    const businessIds = await getTenantBusinessIds(user.tenantId, db);

    if (businessIds.length === 0) {
      return successResponse([]);
    }

    // If a specific businessId is requested, verify it belongs to this tenant
    let targetBusinessIds = businessIds;
    if (filterBusinessId) {
      if (!businessIds.includes(filterBusinessId)) {
        return successResponse([]);
      }
      targetBusinessIds = [filterBusinessId];
    }

    const cacheKey = filterBusinessId
      ? `wallets:${user.tenantId}:${filterBusinessId}`
      : `wallets:${user.tenantId}`;

    // First-level: synchronous in-memory cache (5s TTL)
    const memCached = walletListCache.get(cacheKey);
    if (memCached) {
      const response = successResponse(memCached);
      response.headers.set('Cache-Control', 'private, max-age=3, stale-while-revalidate=5');
      return response;
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

    const wallets = cacheManager
      ? await cacheManager.getOrSet(cacheKey, fetchWallets, { ttl: 60_000 })
      : await fetchWallets();

    // Populate first-level cache
    walletListCache.set(cacheKey, wallets);

    const response = successResponse(wallets);
    response.headers.set('Cache-Control', 'private, max-age=3, stale-while-revalidate=5');
    return response;
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('Wallets GET error:', error);
    return errorResponse('Failed to fetch wallets', 500);
  }
}

export const GET = withApiTelemetry(getHandler, '/api/wallets');

async function postHandler(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const body = await req.json();
    const { currency, businessId } = body;

    if (!currency) return errorResponse('currency is required', 400);
    if (!businessId) return errorResponse('businessId is required', 400);

    // Validate currency format: 3-letter uppercase code
    if (!/^[A-Z]{3}$/.test(currency)) {
      return errorResponse('currency must be a valid 3-letter ISO 4217 code (e.g. USD, EUR, NGN)', 400);
    }

    // Verify businessId belongs to the user's tenant
    const business = await db.business.findFirst({
      where: { id: businessId, tenantId: user.tenantId },
      select: { id: true, tenantId: true },
    });

    if (!business) return errorResponse('Business not found or not in your tenant', 403);

    // Check if wallet already exists for this business + currency
    const existing = await db.wallet.findFirst({
      where: { businessId, currency },
      select: { id: true },
    });

    if (existing) return errorResponse('Wallet already exists for this currency', 409);

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

    return successResponse(wallet, 201);
  } catch (error: any) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('Wallets POST error:', error);
    return errorResponse('Failed to create wallet', 500);
  }
}

export const POST = withApiTelemetry(postHandler, '/api/wallets');
