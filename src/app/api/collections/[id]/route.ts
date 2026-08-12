import { NextRequest } from 'next/server';import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { error, notFound, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response';
const updateCaseSchema = z.object({
  status: z.enum(['active', 'paused', 'resolved', 'written_off', 'escalated'] as const).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent'] as const).optional(),
  outstandingAmount: z.number().min(0).optional(),
  resolution: z.string().optional(),
})

async function verifyTenantAccess(caseId: string, tenantId: string): Promise<{ ok: boolean }> {
  const collectionCase = await db.collectionCase.findUnique({
    where: { id: caseId },
  })
  if (!collectionCase) return { ok: false }
  const biz = await db.business.findUnique({
    where: { id: collectionCase.businessId },
    select: { tenantId: true },
  })
  if (!biz || biz.tenantId !== tenantId) return { ok: false }
  return { ok: true }
}

async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request)
    if (!user) return unauthorized('Authentication required')
    const { id } = await params

    if (!(await verifyTenantAccess(id, user.tenantId)).ok) {
      return notFound('Collection case not found')
    }

    const collectionCase = await db.collectionCase.findUnique({ where: { id } })
    if (!collectionCase) {
      return notFound('Collection case not found')
    }

    const reminders = await db.collectionReminder.findMany({
      where: { caseId: id },
      orderBy: { createdAt: 'desc' },
    })

    return ok({ ...collectionCase, reminders })
  } catch (err: any) {
    console.error('Error fetching collection case:', err)
    return error('Failed to fetch collection case')
  }
}

async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const body = await request.json()
    const parsed = updateCaseSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error.issues.map(i => i.message).join(', '))
    }

    if (!(await verifyTenantAccess(id, user.tenantId)).ok) {
      return notFound('Collection case not found')
    }

    const data = parsed.data
    const updateData: Record<string, unknown> = {}

    if (data.status !== undefined) {
      updateData.status = data.status
      if (data.status === 'resolved') {
        updateData.resolvedAt = new Date()
      }
    }
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.outstandingAmount !== undefined) updateData.outstandingAmount = data.outstandingAmount
    if (data.resolution !== undefined) updateData.resolution = data.resolution

    const collectionCase = await db.collectionCase.update({
      where: { id },
      data: updateData,
    })

    return ok(collectionCase)
  } catch (error: any) {
    console.error('Error updating collection case:', error)
    return error('Failed to update collection case')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/collections/[id]');

export const PUT = withApiTelemetry(withErrorHandler(putHandler), '/api/collections/[id]');
