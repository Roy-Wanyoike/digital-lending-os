import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, requireAuth, requireRole, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
function generateAlertRef(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'FRD-'
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const MAX_ALERT_REF_RETRIES = 10

const createAlertSchema = z.object({
  businessId: z.string().min(1, 'businessId is required'),
  relatedType: z.string().min(1, 'Related type is required'),
  relatedId: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  fraudType: z.string().min(1, 'Fraud type is required'),
  score: z.number().min(0).max(100, 'Score must be between 0 and 100'),
  description: z.string().min(1, 'Description is required'),
  recommendation: z.string().optional(),
})

async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const severity = searchParams.get('severity') || ''
    const fraudType = searchParams.get('fraudType') || ''
    const status = searchParams.get('status') || ''
    const businessId = searchParams.get('businessId') || ''

    // FraudAlert has no business relation, filter by tenant business IDs
    const tenantBizIds = (await db.business.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    })).map(b => b.id)

    const where: Record<string, unknown> = {
      businessId: { in: tenantBizIds },
    }

    if (severity) where.severity = severity
    if (fraudType) where.fraudType = fraudType
    if (status) where.status = status
    if (businessId) where.businessId = businessId

    const [alerts, total] = await Promise.all([
      db.fraudAlert.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.fraudAlert.count({ where }),
    ])

    return NextResponse.json({
      data: alerts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error listing fraud alerts:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to list fraud alerts' }, { status: 500 })
  }
}

async function postHandler(request: NextRequest) {
  try {
    const user = await requireRole(request, ['admin', 'auditor'])
    const body = await request.json()
    const parsed = createAlertSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Validate businessId belongs to tenant
    const biz = await db.business.findUnique({ where: { id: data.businessId }, select: { tenantId: true } })
    if (!biz || biz.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    let alertRef = generateAlertRef()
    let exists = await db.fraudAlert.findUnique({ where: { alertRef } })
    let retries = 0
    while (exists && retries < MAX_ALERT_REF_RETRIES) {
      alertRef = generateAlertRef()
      exists = await db.fraudAlert.findUnique({ where: { alertRef } })
      retries++
    }
    if (exists) {
      return NextResponse.json({ error: 'Failed to generate unique alert reference' }, { status: 500 })
    }

    const alert = await db.fraudAlert.create({
      data: {
        alertRef,
        businessId: data.businessId,
        relatedType: data.relatedType,
        relatedId: data.relatedId,
        severity: data.severity,
        fraudType: data.fraudType,
        score: data.score,
        description: data.description,
        recommendation: data.recommendation,
      },
    })

    return NextResponse.json({ data: alert }, { status: 201 })
  } catch (error) {
    console.error('Error creating fraud alert:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to create fraud alert' }, { status: 500 })
  }
}

export const GET = withApiTelemetry(getHandler, '/api/fraud/alerts');

export const POST = withApiTelemetry(postHandler, '/api/fraud/alerts');
