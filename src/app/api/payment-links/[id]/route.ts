import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { ok, unauthorized, notFound, noContent, withErrorHandler } from '@/backend/lib/api-response';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

const getHandler = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getApiUser(req);
  if (!user) {
    return unauthorized();
  }
  const { id } = await params;

  const link = await db.paymentLink.findFirst({
    where: { id },
    include: {
      _count: { select: { payments: true } },
    },
  });

  if (!link || link.businessId !== user.tenantId) {
    return notFound('Payment link not found');
  }

  return ok(link);
});

const patchHandler = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireAuth(req);
  const { id } = await params;
  const body = await req.json();

  const existing = await db.paymentLink.findFirst({
    where: { id },
  });

  if (!existing || existing.businessId !== user.tenantId) {
    return notFound('Payment link not found');
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

  return ok(updated);
});

const deleteHandler = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireAuth(req);
  const { id } = await params;

  const existing = await db.paymentLink.findFirst({
    where: { id },
  });

  if (!existing || existing.businessId !== user.tenantId) {
    return notFound('Payment link not found');
  }

  await db.paymentLink.delete({ where: { id } });
  return noContent();
});

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/payment-links/[id]');

export const DELETE = withApiTelemetry(withErrorHandler(deleteHandler), '/api/payment-links/[id]');

export const PATCH = withApiTelemetry(withErrorHandler(patchHandler), '/api/payment-links/[id]');
