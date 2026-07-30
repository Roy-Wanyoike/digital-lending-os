import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth, requireRole, AuthError } from '@/lib/auth/api-helpers'

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

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!['admin', 'auditor'].includes(user.role)) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    const { searchParams } = new URL(request.url)
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
      orderBy: { createdAt: 'desc' },
    })

    const rules = cacheManager
      ? await cacheManager.getOrSet(`fraud:rules:${user.tenantId}`, fetchRules, { ttl: 5 * 60_000 })
      : await fetchRules()

    return NextResponse.json({ data: rules })
  } catch (error) {
    console.error('Error listing fraud rules:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to list fraud rules' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['admin'])
    const body = await request.json()
    const parsed = createFraudRuleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Validate condition is valid JSON
    let parsedCondition: unknown
    try {
      parsedCondition = JSON.parse(data.condition)
    } catch {
      return NextResponse.json({ error: 'Condition must be a valid JSON string' }, { status: 400 })
    }

    // Basic structural validation on the parsed condition
    if (typeof parsedCondition !== 'object' || parsedCondition === null || Array.isArray(parsedCondition)) {
      return NextResponse.json({ error: 'Condition must be a JSON object' }, { status: 400 })
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

    return NextResponse.json({ data: rule }, { status: 201 })
  } catch (error) {
    console.error('Error creating fraud rule:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to create fraud rule' }, { status: 500 })
  }
}
