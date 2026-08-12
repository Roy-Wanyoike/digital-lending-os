import { NextRequest } from 'next/server';import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { error, notFound, ok, validationError, withErrorHandler } from '@/backend/lib/api-response';
const updateComplianceSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'expired'] as const, {
    message: 'Status must be one of: pending, approved, rejected, expired',
  }),
})

async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const body = await request.json()
    const parsed = updateComplianceSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error.issues.map(i => i.message).join(', '))
    }

    const { status } = parsed.data

    const document = await db.complianceDocument.findUnique({
      where: { id },
      include: { passport: { include: { business: { select: { tenantId: true } } } } },
    })

    if (!document) {
      return notFound('Compliance document not found')
    }
    if (document.passport?.business?.tenantId !== user.tenantId) {
      return notFound('Compliance document not found')
    }

    const updated = await db.complianceDocument.update({
      where: { id },
      data: { status },
    })

    return ok(updated)
  } catch (error: any) {
    console.error('Error updating compliance document:', error)
    return error('Failed to update compliance document')
  }
}

export const PUT = withApiTelemetry(withErrorHandler(putHandler), '/api/passport/compliance/[id]');
