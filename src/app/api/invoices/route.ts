import { NextRequest } from 'next/server';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { db } from '@/lib/db';
import { getTenantBusinessIds } from '@/backend/lib/tenant-cache';
import { ok, created, badRequest, unauthorized, forbidden, withErrorHandler } from '@/backend/lib/api-response';
import { invoiceCreateSchema } from '@/backend/lib/validation/schemas';
import { getLogger } from '@/backend/lib/telemetry/logger';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { invoiceListCache } from '@/backend/lib/response-cache';

const log = getLogger().withContext({ route: '/api/invoices' });

async function getHandler(req: NextRequest) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const businessIds = await getTenantBusinessIds(user.tenantId, db);

  if (businessIds.length === 0) {
    return ok({ invoices: [] });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

  // Fast in-memory cache (5s TTL)
  const invCacheKey = `invoices:${user.tenantId}:${limit}:${offset}`;
  const memCached = invoiceListCache.get(invCacheKey);
  if (memCached) {
    return ok(memCached);
  }

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where: { senderId: { in: businessIds } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        invoiceRef: true,
        amount: true,
        currency: true,
        status: true,
        notes: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
        senderId: true,
        receiverId: true,
        paidAmount: true,
      },
    }),
    db.invoice.count({ where: { senderId: { in: businessIds } } }),
  ]);

  const result = { invoices, pagination: { limit, offset, total, pages: Math.ceil(total / limit) } };

  // Cache for 5s
  invoiceListCache.set(`invoices:${user.tenantId}:${limit}:${offset}`, result);

  return ok(result);
}

async function postHandler(req: NextRequest) {
  const user = await requireAuth(req);

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
      receiverId: data.receiverId || data.businessId,
      amount: data.amount,
      currency: data.currency,
      notes: data.description,
      dueDate: data.dueDate,
      status: 'draft',
    },
  });

  log.info('Invoice created', { invoiceId: invoice.id, businessId: data.businessId, amount: data.amount });

  // ── Publish Kafka event ────────────────────────────────
  try {
    const { publishEvent } = await import('@/backend/lib/event-publisher')
    await publishEvent({
      topic: 'payment.events.payment_initiated',
      key: invoice.id,
      event: { eventType: 'invoice.created', invoiceId: invoice.id, amount: invoice.amount, currency: invoice.currency, businessId: data.businessId, tenantId: user.tenantId, timestamp: new Date().toISOString() },
    })
  } catch (e) { console.error('Event publish failed:', e) }

  // ─── Audit trail ────────────────────────────────
  try {
    const { auditLog } = await import('@/backend/lib/audit-helper')
    await auditLog({ action: 'invoice.create', resource: 'invoice', resourceId: invoice.id, userId: user.id, tenantId: user.tenantId, details: { amount: invoice.amount, currency: invoice.currency, invoiceRef, businessId: data.businessId } })
  } catch (e) { console.error('Audit log failed:', e) }

  return created(invoice);
}

export const GET = withErrorHandler(withApiTelemetry(getHandler, '/api/invoices'));
export const POST = withErrorHandler(withApiTelemetry(postHandler, '/api/invoices'));
