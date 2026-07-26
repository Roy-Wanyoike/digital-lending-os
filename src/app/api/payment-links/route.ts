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
      return NextResponse.json({ data: [] });
    }

    const paymentLinks = await db.paymentLink.findMany({
      where: { businessId: { in: businessIds } },
      include: {
        business: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map DB fields to expected frontend fields
    const linksWithExtras = paymentLinks.map(link => ({
      ...link,
      _paymentCount: link.paymentCount,
      totalCollected: link.totalCollected,
    }));

    return NextResponse.json({ data: linksWithExtras });
  } catch (error) {
    console.error('PaymentLinks GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch payment links' }, { status: 500 });
  }
}

function generateLinkRef(): string {
  const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return `PL-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await req.json();
    const { title, description, amount, currency, businessId, allowedMethods, allowedCountries, maxPayments, expiresIn } = body;

    if (!title || !amount) {
      return NextResponse.json({ error: 'title and amount are required' }, { status: 400 });
    }

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Verify business belongs to tenant
    const business = await db.business.findFirst({
      where: { id: businessId, tenantId: user.tenantId },
      select: { id: true },
    });
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const linkRef = generateLinkRef();

    const paymentLink = await db.paymentLink.create({
      data: {
        linkRef,
        businessId,
        title,
        description: description || null,
        amount: parseFloat(amount),
        currency: currency || 'USD',
        status: 'active',
        allowedMethods: allowedMethods || null,
        allowedCountries: allowedCountries || null,
        maxPayments: maxPayments ? parseInt(maxPayments, 10) : null,
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
      },
      include: {
        business: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(paymentLink, { status: 201 });
  } catch (error) {
    console.error('PaymentLinks POST error:', error);
    return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 });
  }
}
