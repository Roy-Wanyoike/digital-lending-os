import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, AuthError } from '@/lib/auth/api-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id } = await params;

    const link = await db.paymentLink.findFirst({
      where: { id },
      include: {
        business: { select: { id: true, name: true, tenantId: true } },
        _count: { select: { payments: true } },
      },
    });

    if (!link || link.business.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
    }

    return NextResponse.json({ data: link });
  } catch (error) {
    console.error('PaymentLink GET by ID error:', error);
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Failed to fetch payment link' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json();

    const existing = await db.paymentLink.findFirst({
      where: { id },
      include: { business: { select: { tenantId: true } } },
    });

    if (!existing || existing.business.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount);
    if (body.status !== undefined) updateData.status = body.status;
    if (body.allowedMethods !== undefined) updateData.allowedMethods = body.allowedMethods;
    if (body.allowedCountries !== undefined) updateData.allowedCountries = body.allowedCountries;
    if (body.maxPayments !== undefined) updateData.maxPayments = body.maxPayments;
    if (body.expiresAt !== undefined) updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    const updated = await db.paymentLink.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('PaymentLink PATCH error:', error);
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Failed to update payment link' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id } = await params;

    const existing = await db.paymentLink.findFirst({
      where: { id },
      include: { business: { select: { tenantId: true } } },
    });

    if (!existing || existing.business.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
    }

    await db.paymentLink.delete({ where: { id } });
    return NextResponse.json({ data: { message: 'Payment link deleted' } });
  } catch (error) {
    console.error('PaymentLink DELETE error:', error);
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Failed to delete payment link' }, { status: 500 });
  }
}
