import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { ok, validationError, unauthorized, notFound, noContent, withErrorHandler } from '@/backend/lib/api-response';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

const paymentLinkStatusEnum = z.enum(['active', 'paused', 'expired', 'cancelled'] as const);

const patchPaymentLinkSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  status: paymentLinkStatusEnum.optional(),
  allowedMethods: z.array(z.string()).optional(),
  allowedCountries: z.array(z.string()).optional(),
  maxPayments: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

async function verifyTenantOwnership(linkId: string, tenantId: string) {
  const link = await db.paymentLink.findFirst({
    where: { id: linkId },
    include: { business: { select: { tenantId: true } } },
  });
  if (!link) return { ok: false as const, error: notFound('Payment link not found') };
  if (link.business.tenantId !== tenantId) return { ok: false as const, error: notFound('Payment link not found') };
  return { ok: true as const, link };
}

const getHandler = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getApiUser(req);
  if (!user) {
    return unauthorized();
  }
  const { id } = await params;

  const result = await verifyTenantOwnership(id, user.tenantId);
  if (!result.ok) return result.error;

  const link = await db.paymentLink.findFirst({
    where: { id },
    include: {
      _count: { select: { payments: true } },
    },
  });

  return ok(link);
});

const patchHandler = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireAuth(req);
  const { id } = await params;
  const body = await req.json();
  const parsed = patchPaymentLinkSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const result = await verifyTenantOwnership(id, user.tenantId);
  if (!result.ok) return result.error;

  const updateData: Record<string, unknown> = {};
  const data = parsed.data;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.allowedMethods !== undefined) updateData.allowedMethods = data.allowedMethods;
  if (data.allowedCountries !== undefined) updateData.allowedCountries = data.allowedCountries;
  if (data.maxPayments !== undefined) updateData.maxPayments = data.maxPayments;
  if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

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

  const result = await verifyTenantOwnership(id, user.tenantId);
  if (!result.ok) return result.error;

  await db.paymentLink.delete({ where: { id } });
  return noContent();
});

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/payment-links/[id]');

export const DELETE = withApiTelemetry(withErrorHandler(deleteHandler), '/api/payment-links/[id]');

export const PATCH = withApiTelemetry(withErrorHandler(patchHandler), '/api/payment-links/[id]');
