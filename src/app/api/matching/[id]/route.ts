import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

const updateMatchSchema = z.object({
  status: z.enum(['contacted', 'interested', 'declined', 'engaged']),
  seekerResponse: z.string().optional(),
  candidateResponse: z.string().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request)
    const { id } = await params
    const body = await request.json()
    const parsed = updateMatchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const existing = await db.businessMatch.findUnique({
      where: { id },
      include: {
        seeker: { select: { tenantId: true } },
        candidate: { select: { tenantId: true } },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }
    if (existing.seeker.tenantId !== user.tenantId && existing.candidate.tenantId !== user.tenantId) {
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
