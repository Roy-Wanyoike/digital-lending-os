import { NextRequest } from 'next/server';import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth, requireRole, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { conflict, error, notFound, ok, validationError, withErrorHandler } from '@/backend/lib/api-response';
const updateAlertSchema = z.object({
  status: z.enum(['investigating', 'confirmed_fraud', 'false_positive', 'escalated', 'resolved'] as const),
  resolvedBy: z.string().optional(),
  resolution: z.string().optional(),
})

/**
 * Valid status transitions for fraud alerts.
 * Prevents arbitrary state changes that bypass the investigation workflow.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  open:             ['investigating', 'escalated', 'false_positive'],
  investigating:    ['confirmed_fraud', 'false_positive', 'escalated', 'resolved'],
  escalated:        ['investigating', 'confirmed_fraud', 'false_positive', 'resolved'],
  confirmed_fraud:  ['resolved'],
  false_positive:   ['resolved'],
  resolved:         [], // terminal state — no further transitions
}

async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const alert = await db.fraudAlert.findUnique({ where: { id } })

    if (!alert) {
      return notFound('Fraud alert not found')
    }

    // Verify tenant access via businessId
    if (!alert.businessId) {
      // Orphaned alert — deny access to all tenants
      return notFound('Fraud alert not found')
    }
    const biz = await db.business.findUnique({
      where: { id: alert.businessId },
      select: { tenantId: true },
    })
    if (!biz || biz.tenantId !== user.tenantId) {
      return notFound('Fraud alert not found')
    }

    return ok(alert)
  } catch (error: any) {
    console.error('Error fetching fraud alert:', error)
    return error('Failed to fetch fraud alert')
  }
}

async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, ['admin', 'auditor'])
    const { id } = await params
    const body = await request.json()
    const parsed = updateAlertSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error.issues.map(i => i.message).join(', '))
    }

    const existing = await db.fraudAlert.findUnique({ where: { id } })
    if (!existing) {
      return notFound('Fraud alert not found')
    }

    // Verify tenant access via businessId
    if (!existing.businessId) {
      return notFound('Fraud alert not found')
    }
    const biz = await db.business.findUnique({
      where: { id: existing.businessId },
      select: { tenantId: true },
    })
    if (!biz || biz.tenantId !== user.tenantId) {
      return notFound('Fraud alert not found')
    }

    const data = parsed.data

    // Validate status transition
    const allowed = VALID_TRANSITIONS[existing.status] || []
    if (!allowed.includes(data.status)) {
      return conflict(`Invalid transition from '${existing.status}' to '${data.status}'. Allowed: ${allowed.join(', ') || 'none (terminal state)'}`)
    }

    const isResolved = data.status === 'resolved' || data.status === 'confirmed_fraud' || data.status === 'false_positive'

    const alert = await db.fraudAlert.update({
      where: { id },
      data: {
        status: data.status,
        resolvedBy: data.resolvedBy ?? (isResolved ? 'system' : null),
        resolvedAt: isResolved ? new Date() : null,
        ...(data.resolution ? { recommendation: data.resolution } : {}),
      },
    })

    return ok(alert)
  } catch (error: any) {
    console.error('Error updating fraud alert:', error)
    return error('Failed to update fraud alert')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/fraud/alerts/[id]');

export const PUT = withApiTelemetry(withErrorHandler(putHandler), '/api/fraud/alerts/[id]');
