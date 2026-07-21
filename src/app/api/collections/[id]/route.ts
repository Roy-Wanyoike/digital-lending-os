import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const updateCaseSchema = z.object({
  status: z.enum(['active', 'paused', 'resolved', 'written_off', 'escalated']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  outstandingAmount: z.number().min(0).optional(),
  resolution: z.string().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const collectionCase = await db.collectionCase.findUnique({
      where: { id },
    })

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
    return NextResponse.json({ error: 'Failed to fetch collection case' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateCaseSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const existing = await db.collectionCase.findUnique({ where: { id } })
    if (!existing) {
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
    return NextResponse.json({ error: 'Failed to update collection case' }, { status: 500 })
  }
}