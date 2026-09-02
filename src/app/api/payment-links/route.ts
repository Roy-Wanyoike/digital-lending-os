import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { db } from '@/lib/db';
import { getTenantBusinessIds } from '@/backend/lib/tenant-cache';
import { ok, created, validationError, unauthorized, notFound, withErrorHandler } from '@/backend/lib/api-response';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

const createPaymentLinkSchema = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  amount: z.number().positive('amount must be a positive number'),
  currency: z.string().length(3, 'currency must be a 3-letter code').default('USD'),
  businessId: z.string().min(1, 'businessId is required'),
  allowedMethods: z.array(z.string()).optional(),
  allowedCountries: z.array(z.string()).optional(),
  maxPayments: z.number().int().positive().optional().default(1),
  expiresIn: z.number().positive().optional(),
});

const getHandler = withErrorHandler(async (req: NextRequest) => {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

  const businessIds = await getTenantBusinessIds(user.tenantId, db);

  if (businessIds.length === 0) {
    return ok({ data: [], pagination: { page, limit, total: 0, pages: 0 } });
  }

  const [paymentLinks, total] = await Promise.all([
    db.paymentLink.findMany({
      where: { businessId: { in: businessIds } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.paymentLink.count({ where: { businessId: { in: businessIds } } }),
  ]);

  const linksWithExtras = paymentLinks.map((link: any) => ({
    ...link,
    _paymentCount: link.paymentCount,
    totalCollected: link.totalCollected,
  }));

  return ok(linksWithExtras, { page, limit, total, pages: Math.ceil(total / limit) });
});

function generateLinkRef(): string {
  const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return `PL-${random}`;
}

const postHandler = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);

  const body = await req.json();
  const parsed = createPaymentLinkSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { title, description, amount, currency, businessId, allowedMethods, allowedCountries, maxPayments, expiresIn } = parsed.data;

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
      amount,
      currency,
      status: 'active',
      allowedMethods: allowedMethods || null,
      allowedCountries: allowedCountries || null,
      maxPayments,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
    },
  });

  return created(paymentLink);
});

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/payment-links');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/payment-links');
