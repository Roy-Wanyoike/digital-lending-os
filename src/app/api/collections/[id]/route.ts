import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { id } = await params

    if (!(await verifyTenantAccess(id, user.tenantId)).ok) {
      return NextResponse.json({ error: 'Collection case not found' }, { status: 404 })
    }

    const collectionCase = await db.collectionCase.findUnique({ where: { id } })
    if (!collectionCase) {
      return NextResponse.json({ error: 'Collection case not found' }, { status: 404 })
    }

    const reminders = await db.collectionReminder.findMany({
      where: { caseId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: { ...collectionCase, reminders } })
  } catch (error) {
    console.error('Error fetching collection case:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to fetch collection case' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { id } = await params
    const body = await request.json()
    const parsed = updateCaseSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    if (!(await verifyTenantAccess(id, user.tenantId)).ok) {
      return NextResponse.json({ error: 'Collection case not found' }, { status: 404 })
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

    return NextResponse.json({ data: collectionCase })
  } catch (error) {
    console.error('Error updating collection case:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to update collection case' }, { status: 500 })
  }
}
