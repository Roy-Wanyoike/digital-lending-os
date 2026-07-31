import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/auth/api-helpers';
import { db } from '@/lib/db';
import { ok, created, badRequest, unauthorized, forbidden, withErrorHandler } from '@/backend/lib/api-response';
import { invoiceCreateSchema } from '@/backend/lib/validation/schemas';
import { getLogger } from '@/backend/lib/telemetry/logger';

const log = getLogger().withContext({ route: '/api/invoices' });

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const businesses = await db.business.findMany({
    where: { tenantId: user.tenantId },
    select: { id: true },
  });
  const businessIds = businesses.map((b) => b.id);

  if (businessIds.length === 0) {
    return ok({ invoices: [] });
  }

  const invoices = await db.invoice.findMany({
    where: { senderId: { in: businessIds } },
    orderBy: { createdAt: 'desc' },
  });

  return ok({ invoices });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const body = await req.json();
  const parsed = invoiceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Validation failed', parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })));
  }

  const data = parsed.data;

  // Verify businessId belongs to the user's tenant
  const business = await db.business.findFirst({
    where: { id: data.businessId, tenantId: user.tenantId },
  });
  if (!business) return forbidden('Business not found or not in your tenant');

  const count = await db.invoice.count();
  const invoiceRef = `INV-${String(count + 1).padStart(6, '0')}`;

  const invoice = await db.invoice.create({
    data: {
      invoiceRef,
      senderId: data.businessId,
      receiverId: data.businessId,
      amount: data.amount,
      currency: data.currency,
      notes: data.description,
      dueDate: data.dueDate,
      status: 'draft',
    },
  });

  log.info('Invoice created', { invoiceId: invoice.id, businessId: data.businessId, amount: data.amount });

  // ─── Audit trail ────────────────────────────────
  try {
    const { auditLog } = await import('@/backend/lib/audit-helper')
    await auditLog({ action: 'invoice.create', resource: 'invoice', resourceId: invoice.id, userId: user.id, tenantId: user.tenantId, details: { amount: invoice.amount, currency: invoice.currency, invoiceRef, businessId: data.businessId } })
  } catch (e) { console.error('Audit log failed:', e) }

  return created(invoice);
});
