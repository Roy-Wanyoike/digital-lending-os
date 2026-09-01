import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth, AuthError } from '@/lib/auth/api-helpers'
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper'
import { badRequest, error, forbidden, notFound, ok, validationError, withErrorHandler } from '@/backend/lib/api-response'

const updateComplianceSchema = z.object({
  status: z.enum(['pending', 'pending_review', 'flagged', 'approved', 'rejected', 'expired'] as const, {
    message: 'Status must be one of: pending, pending_review, flagged, approved, rejected, expired',
  }),
  reason: z.string().optional(),
})

/**
 * Parse and safely append an entry to the document's JSON metadata history array.
 */
function appendHistoryEntry(
  existingMetadata: string | null | undefined,
  entry: Record<string, unknown>,
): string {
  let meta: Record<string, unknown>
  try {
    meta = existingMetadata ? (JSON.parse(existingMetadata) as Record<string, unknown>) : {}
  } catch {
    meta = {}
  }

  const history = Array.isArray(meta.history) ? (meta.history as Record<string, unknown>[]) : []
  history.push({
    ...entry,
    timestamp: new Date().toISOString(),
  })
  meta.history = history

  return JSON.stringify(meta)
}

async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const body = await request.json()
    const parsed = updateComplianceSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error.issues.map((i) => i.message).join(', '))
    }

    const { status, reason } = parsed.data

    // Fetch document with passport + business for tenant check and screening lookup
    const document = await db.complianceDocument.findUnique({
      where: { id },
      include: {
        passport: {
          include: { business: { select: { tenantId: true, id: true } } },
        },
      },
    })

    if (!document) {
      return notFound('Compliance document not found')
    }
    if (document.passport?.business?.tenantId !== user.tenantId) {
      return notFound('Compliance document not found')
    }

    const businessId = document.passport?.business?.id

    // ── Validation: 'approved' requires clear screening or admin role ──
    if (status === 'approved') {
      const isAdmin = user.role === 'admin'

      if (!isAdmin) {
        // Non-admin approvers must have at least one 'clear' screening for this business
        if (!businessId) {
          return badRequest('Cannot approve: business not linked to passport')
        }

        const clearScreening = await db.complianceScreening.findFirst({
          where: {
            businessId,
            result: 'clear',
            status: 'completed',
          },
          select: { id: true },
        })

        if (!clearScreening) {
          return forbidden(
            'Approval denied: no clear screening result on record for this business. Only admins can override.',
          )
        }
      }
    }

    // ── Validation: 'rejected' requires a reason ──
    if (status === 'rejected' && (!reason || reason.trim().length === 0)) {
      return validationError('A reason is required when rejecting a compliance document')
    }

    // ── Build history entry ──
    const historyEntry: Record<string, unknown> = {
      from: document.status,
      to: status,
      actionedBy: user.id,
      actionedByEmail: user.email,
      actionedByRole: user.role,
    }

    if (status === 'rejected' && reason) {
      historyEntry.reason = reason
    }

    if (status === 'approved') {
      historyEntry.approvedVia = user.role === 'admin' ? 'admin_override' : 'clear_screening'
    }

    const updatedMetadata = appendHistoryEntry(document.metadata, historyEntry)

    // ── Persist update ──
    const updated = await db.complianceDocument.update({
      where: { id },
      data: {
        status,
        metadata: updatedMetadata,
      },
    })

    return ok(updated)
  } catch (err: any) {
    console.error('Error updating compliance document:', err)
    if (err instanceof AuthError) return forbidden(err.message)
    return error('Failed to update compliance document')
  }
}

export const PUT = withApiTelemetry(withErrorHandler(putHandler), '/api/passport/compliance/[id]');
