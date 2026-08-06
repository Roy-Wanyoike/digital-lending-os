import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers';
import { db } from '@/lib/db';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

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
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const businesses = await db.business.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    });
    const businessIds = businesses.map((b: any) => b.id);

    if (businessIds.length === 0) {
      return NextResponse.json({ escrows: [] });
    }

    const cacheManager = await getCache();
    const fetchEscrows = () => db.escrowTransaction.findMany({
      where: {
        OR: [
          { buyerId: { in: businessIds } },
          { sellerId: { in: businessIds } },
        ],
      },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const escrows = cacheManager
      ? await cacheManager.getOrSet(`escrows:${user.tenantId}`, fetchEscrows, { ttl: 30_000 })
      : await fetchEscrows();

    return NextResponse.json({ data: escrows });
  } catch (error) {
    console.error('Escrow GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch escrow transactions' }, { status: 500 });
  }
}

function generateTxRef(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return `ESC-${date}-${random}`;
}

async function postHandler(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const body = await req.json();
    const parsed = createEscrowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      );
    }

    const { amount, currency, description, sellerId } = parsed.data;

    // Get buyerId from user's first business
    const buyerBusiness = await db.business.findFirst({
      where: { tenantId: user.tenantId },
      select: { id: true },
    });
    if (!buyerBusiness) {
      return NextResponse.json({ error: 'No business found for this user' }, { status: 400 });
    }

    // Validate seller exists and belongs to the same tenant
    const seller = await db.business.findFirst({
      where: { id: sellerId, tenantId: user.tenantId },
      select: { id: true },
    });
    if (!seller) {
      return NextResponse.json({ error: 'Seller business not found' }, { status: 404 });
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

    return NextResponse.json({ data: escrow }, { status: 201 });
  } catch (error) {
    console.error('Escrow POST error:', error);
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'Failed to create escrow transaction' }, { status: 500 });
  }
}

export const GET = withApiTelemetry(getHandler, '/api/escrow');

export const POST = withApiTelemetry(postHandler, '/api/escrow');
