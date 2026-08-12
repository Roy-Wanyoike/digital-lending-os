import { NextRequest } from 'next/server';import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { error, notFound, ok, validationError, withErrorHandler } from '@/backend/lib/api-response';
const updateMatchSchema = z.object({
  status: z.enum(['contacted', 'interested', 'declined', 'engaged'] as const),
  seekerResponse: z.string().optional(),
  candidateResponse: z.string().optional(),
})

async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const body = await request.json()
    const parsed = updateMatchSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error.issues.map(i => i.message).join(', '))
    }

    const existing = await db.businessMatch.findUnique({ where: { id } })
    if (!existing) {
      return notFound('Match not found')
    }

    // Verify tenant access: check if seeker or candidate business belongs to tenant
    const [seekerBiz, candidateBiz] = await Promise.all([
      db.business.findUnique({ where: { id: existing.seekerId }, select: { tenantId: true } }),
      db.business.findUnique({ where: { id: existing.candidateId }, select: { tenantId: true } }),
    ])
    const seekerOk = seekerBiz?.tenantId === user.tenantId
    const candidateOk = candidateBiz?.tenantId === user.tenantId
    if (!seekerOk && !candidateOk) {
      return notFound('Match not found')
    }

    const data = parsed.data
    const match = await db.businessMatch.update({
      where: { id },
      data: {
        status: data.status,
        ...(data.seekerResponse !== undefined ? { seekerResponse: data.seekerResponse } : {}),
        ...(data.candidateResponse !== undefined ? { candidateResponse: data.candidateResponse } : {}),
      },
    })

    return ok(match)
  } catch (error: any) {
    console.error('Error updating match:', error)
    return error('Failed to update match')
  }
}

export const PUT = withApiTelemetry(withErrorHandler(putHandler), '/api/matching/[id]');
