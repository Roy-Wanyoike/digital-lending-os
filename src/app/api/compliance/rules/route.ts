import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth, requireRole, AuthError } from '@/lib/auth/api-helpers'
import { unauthorized, badRequest, forbidden, error as apiErr, created, ok, withErrorHandler } from '@/backend/lib/api-response'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
const createComplianceRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  ruleType: z.string().min(1, 'Rule type is required'),
  condition: z.string().min(1, 'Condition is required'),
  action: z.string().min(1, 'Action is required'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
})

async function getHandler(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!['admin', 'auditor'].includes(user.role)) return forbidden('Insufficient permissions')
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const ruleType = searchParams.get('ruleType') || ''
    const isActive = searchParams.get('isActive')
    const severity = searchParams.get('severity') || ''

    const where: Record<string, unknown> = {}

    if (ruleType) where.ruleType = ruleType
    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true'
    }
    if (severity) where.severity = severity

    where.tenantId = user.tenantId

    const [rules, total] = await Promise.all([
      db.complianceRule.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.complianceRule.count({ where }),
    ])

    return ok({ data: rules, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  } catch (error: any) {
    console.error('Error listing compliance rules:', error)
    if (error instanceof AuthError) return unauthorized(error.message)
    return apiErr('Failed to list compliance rules')
  }
}

async function postHandler(request: NextRequest) {
  try {
    const user = await requireRole(request, ['admin'])
    const body = await request.json()
    const parsed = createComplianceRuleSchema.safeParse(body)

    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message).join(', ')
      return badRequest(messages)
    }

    const data = parsed.data

    // Validate condition is valid JSON
    let parsedCondition: unknown
    try {
      parsedCondition = JSON.parse(data.condition)
    } catch {
      return badRequest('Condition must be a valid JSON string')
    }

    if (typeof parsedCondition !== 'object' || parsedCondition === null || Array.isArray(parsedCondition)) {
      return badRequest('Condition must be a JSON object')
    }

    const rule = await db.complianceRule.create({
      data: {
        tenantId: user.tenantId,
        name: data.name,
        description: data.description,
        ruleType: data.ruleType,
        condition: data.condition,
        action: data.action,
        severity: data.severity,
        isActive: true,
      },
    })

    return created(rule)
  } catch (error: any) {
    console.error('Error creating compliance rule:', error)
    if (error instanceof AuthError) return unauthorized(error.message)
    return apiErr('Failed to create compliance rule')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/compliance/rules');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/compliance/rules');
