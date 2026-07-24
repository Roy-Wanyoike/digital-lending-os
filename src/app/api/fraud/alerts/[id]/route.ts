import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

const updateAlertSchema = z.object({
  status: z.enum(['investigating', 'confirmed_fraud', 'false_positive', 'escalated', 'resolved'] as const),
  resolvedBy: z.string().optional(),
  resolution: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request)
    const { id } = await params
    const alert = await db.fraudAlert.findUnique({ where: { id } })

    if (!alert) {
      return NextResponse.json({ error: 'Fraud alert not found' }, { status: 404 })
    }

    // Verify tenant access via businessId
    if (alert.businessId) {
      const biz = await db.business.findUnique({
        where: { id: alert.businessId },
        select: { tenantId: true },
      })
      if (!biz || biz.tenantId !== user.tenantId) {
        return NextResponse.json({ error: 'Fraud alert not found' }, { status: 404 })
      }
    }

    return NextResponse.json({ data: alert })
  } catch (error) {
    console.error('Error fetching fraud alert:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to fetch fraud alert' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request)
    const { id } = await params
    const body = await request.json()
    const parsed = updateAlertSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const existing = await db.fraudAlert.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Fraud alert not found' }, { status: 404 })
    }

    // Verify tenant access via businessId
    if (existing.businessId) {
      const biz = await db.business.findUnique({
        where: { id: existing.businessId },
        select: { tenantId: true },
      })
      if (!biz || biz.tenantId !== user.tenantId) {
        return NextResponse.json({ error: 'Fraud alert not found' }, { status: 404 })
      }
    }

    const data = parsed.data
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

    return NextResponse.json({ data: alert })
  } catch (error) {
    console.error('Error updating fraud alert:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to update fraud alert' }, { status: 500 })
  }
}
