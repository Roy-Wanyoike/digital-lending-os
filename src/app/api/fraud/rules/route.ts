import { NextRequest } from 'next/server';import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth, requireRole, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { badRequest, created, error, forbidden, ok, validationError, withErrorHandler } from '@/backend/lib/api-response';
// Lazy-load cache manager — graceful fallback if Redis/OTel not installed
let _cacheManager: any = undefined
let _cacheAttempted = false
async function getCache() {
  if (_cacheAttempted) return _cacheManager
  _cacheAttempted = true
  try {
    const mod = await import('@/backend/lib/cache/cache-manager')
    _cacheManager = mod.default
  } catch {
    _cacheManager = undefined
  }
  return _cacheManager
}

const createFraudRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  condition: z.string().min(1, 'Condition is required (JSON string)'),
  action: z.enum(['alert', 'block', 'require_review', 'flag']),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
})

async function getHandler(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!['admin', 'auditor'].includes(user.role)) return forbidden('Insufficient permissions')
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const isActive = searchParams.get('isActive')

    const where: Record<string, unknown> = {}
    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true'
    }

    // NOTE: FraudRule has no tenantId column. Rules are system-wide.
    // This is a known limitation — see ADR-008 for migration plan.
    // Cache is tenant-keyed to avoid cross-tenant cache poisoning.

    const cacheManager = await getCache()
    const fetchRules = () => db.fraudRule.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    })
    const fetchCount = () => db.fraudRule.count({ where })

    const [rules, total] = cacheManager
      ? await Promise.all([
          cacheManager.getOrSet(`fraud:rules:${user.tenantId}:page:${page}:limit:${limit}`, fetchRules, { ttl: 5 * 60_000 }),
          fetchCount(),
        ])
      : await Promise.all([fetchRules(), fetchCount()])

    return ok(rules, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err: any) {
    console.error('Error listing fraud rules:', err)
    return error('Failed to list fraud rules')
  }
}

async function postHandler(request: NextRequest) {
  try {
    const user = await requireRole(request, ['admin'])
    const body = await request.json()
    const parsed = createFraudRuleSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error.issues.map(i => i.message).join(', '))
    }

    const data = parsed.data

    // Validate condition is valid JSON
    let parsedCondition: unknown
    try {
      parsedCondition = JSON.parse(data.condition)
    } catch {
      return badRequest('Condition must be a valid JSON string')
    }

    // Basic structural validation on the parsed condition
    if (typeof parsedCondition !== 'object' || parsedCondition === null || Array.isArray(parsedCondition)) {
      return badRequest('Condition must be a JSON object')
    }

    // NOTE: FraudRule has no tenantId column. This is a known limitation — see ADR-008.
    const rule = await db.fraudRule.create({
      data: {
        name: data.name,
        description: data.description,
        condition: data.condition,
        action: data.action,
        severity: data.severity,
        isActive: true,
      },
    })

    return created(rule)
  } catch (error: any) {
    console.error('Error creating fraud rule:', error)
    return error('Failed to create fraud rule')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/fraud/rules');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/fraud/rules');
