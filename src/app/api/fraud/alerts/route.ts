import { NextRequest } from 'next/server';import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, requireAuth, requireRole, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { created, error, notFound, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response';
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
    if (!user) return unauthorized('Authentication required')
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
    })).map((b: any) => b.id)

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

    return ok(alerts, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err: any) {
    console.error('Error listing fraud alerts:', err)
    return error('Failed to list fraud alerts')
  }
}

async function postHandler(request: NextRequest) {
  try {
    const user = await requireRole(request, ['admin', 'auditor'])
    const body = await request.json()
    const parsed = createAlertSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error.issues.map(i => i.message).join(', '))
    }

    const data = parsed.data

    // Validate businessId belongs to tenant
    const biz = await db.business.findUnique({ where: { id: data.businessId }, select: { tenantId: true } })
    if (!biz || biz.tenantId !== user.tenantId) {
      return notFound('Business not found')
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
      return error('Failed to generate unique alert reference')
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

    return created(alert)
  } catch (error: any) {
    console.error('Error creating fraud alert:', error)
    return error('Failed to create fraud alert')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/fraud/alerts');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/fraud/alerts');
