import { NextRequest, NextResponse } from 'next/server';
import { getApiUser, errorResponse, successResponse } from '@/lib/auth/api-helpers';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);

    // Get all business IDs belonging to this tenant
    const businesses = await db.business.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    });
    const businessIds = businesses.map((b) => b.id);

    if (businessIds.length === 0) {
      return successResponse({ data: [] });
    }

    const wallets = await db.wallet.findMany({
      where: { businessId: { in: businessIds } },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({ data: wallets });
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('Wallets GET error:', error);
    return errorResponse('Failed to fetch wallets', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);

    const body = await req.json();
    const { currency, businessId } = body;

    if (!currency) return errorResponse('currency is required', 400);
    if (!businessId) return errorResponse('businessId is required', 400);

    // Verify businessId belongs to the user's tenant
    const business = await db.business.findFirst({
      where: { id: businessId, tenantId: user.tenantId },
    });

    if (!business) return errorResponse('Business not found or not in your tenant', 403);

    // Check if wallet already exists for this business + currency
    const existing = await db.wallet.findFirst({
      where: { businessId, currency },
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

    return successResponse(wallet, 201);
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('Wallets POST error:', error);
    return errorResponse('Failed to create wallet', 500);
  }
}
