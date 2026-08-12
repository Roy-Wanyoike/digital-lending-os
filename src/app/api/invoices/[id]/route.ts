import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers'
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { ok, created, notFound, unauthorized, error, withErrorHandler } from '@/backend/lib/api-response';

async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request)
  if (!user) return unauthorized()
  const { id } = await params
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      sender: {
        select: { id: true, name: true, country: true, industry: true, tenantId: true },
      },
      receiver: {
        select: { id: true, name: true, country: true, industry: true, tenantId: true },
      },
    },
  })

  if (!invoice) {
    return notFound('Invoice not found')
  }
  if (invoice.sender?.tenantId !== user.tenantId && invoice.receiver?.tenantId !== user.tenantId) {
    return notFound('Invoice not found')
  }

  return ok(invoice)
}

async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(request)
  const { id } = await params
  const body = await request.json()

  const existing = await db.invoice.findUnique({
    where: { id },
    include: {
      sender: { select: { tenantId: true } },
      receiver: { select: { tenantId: true } },
    },
  })
  if (!existing) {
    return notFound('Invoice not found')
  }
  if (existing.sender?.tenantId !== user.tenantId && existing.receiver?.tenantId !== user.tenantId) {
    return notFound('Invoice not found')
  }

  const allowedFields = [
    'status',
    'notes',
    'paidAmount',
    'dueDate',
    'items',
  ] as const

  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === 'dueDate' && typeof body[field] === 'string') {
        updateData[field] = new Date(body[field])
      } else if (field === 'items' && typeof body[field] !== 'string') {
        updateData[field] = JSON.stringify(body[field])
      } else {
        updateData[field] = body[field]
      }
    }
  }

  // Auto-set paidAt when status changes to paid
  if (updateData.status === 'paid' && existing.status !== 'paid') {
    updateData.paidAt = new Date()
    updateData.paidAmount = existing.amount
  }

  const invoice = await db.invoice.update({
    where: { id },
    data: updateData,
    include: {
      sender: {
        select: { id: true, name: true },
      },
      receiver: {
        select: { id: true, name: true },
      },
    },
  })

  return ok(invoice)
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/invoices/[id]');

export const PUT = withApiTelemetry(withErrorHandler(putHandler), '/api/invoices/[id]');
