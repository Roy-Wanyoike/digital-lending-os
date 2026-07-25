import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, AuthError } from '@/lib/auth/api-helpers';

// GET /api/deposits — List deposits for the tenant's wallets
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const walletId = searchParams.get('walletId');

    // Find wallet IDs belonging to businesses in this tenant
    const tenantBusinessIds = (await db.business.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    })).map(b => b.id);

    const tenantWalletIds = (await db.wallet.findMany({
      where: { businessId: { in: tenantBusinessIds } },
      select: { id: true },
    })).map(w => w.id);

    // Build where clause — wallet-scoped
    const where: any = {
      walletId: { in: tenantWalletIds },
    };
    if (walletId) where.walletId = walletId;
    if (status) where.status = status;

    const [deposits, total] = await Promise.all([
      db.deposit.findMany({
        where,
        include: {
          wallet: { select: { id: true, currency: true, businessId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.deposit.count({ where }),
    ]);

    return NextResponse.json({
      deposits,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Deposits GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch deposits' }, { status: 500 });
  }
}

// POST /api/deposits — Create a new deposit
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { walletId, amount, paymentMethod, provider, bankName, notes } = body;

    if (!walletId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: 'walletId, amount, and paymentMethod are required' },
        { status: 400 }
      );
    }

    // Verify wallet belongs to a business in the user's tenant
    const wallet = await db.wallet.findFirst({
      where: { id: walletId },
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Check the wallet's business belongs to the user's tenant
    const business = await db.business.findFirst({
      where: { id: wallet.businessId, tenantId: user.tenantId },
      select: { id: true },
    });

    if (!business) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const deposit = await db.deposit.create({
      data: {
        depositRef: `DEP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        walletId,
        amount: parseFloat(amount),
        currency: wallet.currency,
        paymentMethod,
        provider: provider || null,
        bankName: bankName || null,
        notes: notes || null,
        status: 'pending',
      },
    });

    return NextResponse.json(deposit, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Deposits POST error:', error);
    return NextResponse.json({ error: 'Failed to create deposit' }, { status: 500 });
  }
}