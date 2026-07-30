import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
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
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { id } = await params
    const body = await request.json()
    const parsed = updateMatchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const existing = await db.businessMatch.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Verify tenant access: check if seeker or candidate business belongs to tenant
    const [seekerBiz, candidateBiz] = await Promise.all([
      db.business.findUnique({ where: { id: existing.seekerId }, select: { tenantId: true } }),
      db.business.findUnique({ where: { id: existing.candidateId }, select: { tenantId: true } }),
    ])
    const seekerOk = seekerBiz?.tenantId === user.tenantId
    const candidateOk = candidateBiz?.tenantId === user.tenantId
    if (!seekerOk && !candidateOk) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
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

    return NextResponse.json({ data: match })
  } catch (error) {
    console.error('Error updating match:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to update match' }, { status: 500 })
  }
}

export const PUT = withApiTelemetry(putHandler, '/api/matching/[id]');
