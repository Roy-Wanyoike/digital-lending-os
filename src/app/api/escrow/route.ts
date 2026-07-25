import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/auth/api-helpers';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const businesses = await db.business.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    });
    const businessIds = businesses.map((b) => b.id);

    if (businessIds.length === 0) {
      return NextResponse.json({ escrows: [] });
    }

    const escrows = await db.escrowTransaction.findMany({
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

    return NextResponse.json({ escrows });
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

export async function POST(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await req.json();
    const { amount, currency, description, sellerId } = body;

    if (!amount || !sellerId) {
      return NextResponse.json({ error: 'amount and sellerId are required' }, { status: 400 });
    }

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
        amount: parseFloat(amount),
        currency: currency || 'USD',
        description: description || null,
        status: 'created',
      },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(escrow, { status: 201 });
  } catch (error) {
    console.error('Escrow POST error:', error);
    return NextResponse.json({ error: 'Failed to create escrow transaction' }, { status: 500 });
  }
}
