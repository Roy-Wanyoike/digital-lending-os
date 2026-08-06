import { NextRequest } from 'next/server';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { db } from '@/lib/db';
import { ok, created, badRequest, unauthorized, notFound, withErrorHandler } from '@/backend/lib/api-response';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

const getHandler = withErrorHandler(async (req: NextRequest) => {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const businesses = await db.business.findMany({
    where: { tenantId: user.tenantId },
    select: { id: true },
  });
  const businessIds = businesses.map((b: any) => b.id);

  if (businessIds.length === 0) {
    return ok([]);
  }

  const paymentLinks = await db.paymentLink.findMany({
    where: { businessId: { in: businessIds } },
    orderBy: { createdAt: 'desc' },
  });

  // Map DB fields to expected frontend fields
  const linksWithExtras = paymentLinks.map((link: any) => ({
    ...link,
    _paymentCount: link.paymentCount,
    totalCollected: link.totalCollected,
  }));

  return ok(linksWithExtras);
});

function generateLinkRef(): string {
  const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return `PL-${random}`;
}

const postHandler = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);

  const body = await req.json();
  const { title, description, amount, currency, businessId, allowedMethods, allowedCountries, maxPayments, expiresIn } = body;

  if (!title || !amount) {
    return badRequest('title and amount are required');
  }

  if (!businessId) {
    return badRequest('businessId is required');
  }

  // Verify business belongs to tenant
  const business = await db.business.findFirst({
    where: { id: businessId, tenantId: user.tenantId },
    select: { id: true },
  });
  if (!business) {
    return notFound('Business not found');
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
      maxPayments: maxPayments ? parseInt(maxPayments, 10) : 1,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
    },
  });

  return created(paymentLink);
});

export const GET = withApiTelemetry(getHandler, '/api/payment-links');

export const POST = withApiTelemetry(postHandler, '/api/payment-links');
