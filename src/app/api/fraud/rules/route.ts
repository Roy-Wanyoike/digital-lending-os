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

// ---------------------------------------------------------------------------
// Tenant-scoping workaround for FraudRule
// ---------------------------------------------------------------------------
// FraudRule lacks a dedicated `tenantId` column. A proper migration adding
// `tenantId String` (with an index) and back-filling existing rows is
// tracked in ADR-008. Until that migration ships, we embed the tenantId
// inside the `condition` JSON blob under the reserved key `_tenantId`.
//
// In POST: we inject `_tenantId` into the parsed condition before persisting.
// In GET:  we fetch candidates from the DB and filter in-memory by
//            matching `condition._tenantId === user.tenantId`.
//
// NOTE: in-memory filtering means DB-level pagination is not precise.
// We paginate the *filtered* result set to keep API semantics consistent.
// This is acceptable at current scale; the migration will enable native
// WHERE-clause filtering.
// ---------------------------------------------------------------------------

const TENANT_KEY = '_tenantId'

/** Extract _tenantId from a rule's condition JSON string. Returns undefined if absent/malformed. */
function extractTenantId(conditionStr: string): string | undefined {
  try {
    const obj = JSON.parse(conditionStr)
    return typeof obj === 'object' && obj !== null && typeof obj[TENANT_KEY] === 'string'
      ? obj[TENANT_KEY]
      : undefined
  } catch {
    return undefined
  }
}

/** Inject _tenantId into a parsed condition object and return the serialised string. */
function injectTenantId(conditionObj: Record<string, unknown>, tenantId: string): string {
  return JSON.stringify({ ...conditionObj, [TENANT_KEY]: tenantId })
}

// ---------------------------------------------------------------------------
// Default fraud rules — seeded automatically for new tenants
// ---------------------------------------------------------------------------
const DEFAULT_FRAUD_RULES: Array<{
  name: string
  description: string
  condition: Record<string, unknown>
  action: 'alert' | 'block' | 'require_review' | 'flag'
  severity: 'low' | 'medium' | 'high' | 'critical'
}> = [
  {
    name: 'Large Transaction Alert',
    description: 'Flags transactions exceeding $50,000 for manual review',
    condition: { field: 'amount', operator: 'greater_than', value: 50000, currency: 'USD' },
    action: 'require_review',
    severity: 'high',
  },
  {
    name: 'Velocity Breach',
    description: 'Alerts when more than 10 transactions are initiated within 1 hour from the same account',
    condition: { field: 'transaction_count', operator: 'greater_than', value: 10, window_minutes: 60 },
    action: 'alert',
    severity: 'high',
  },
  {
    name: 'High-Risk Country',
    description: 'Blocks transactions involving parties in sanctioned or high-risk countries',
    condition: { field: 'country', operator: 'in', value: ['KP', 'IR', 'SY', 'CU', 'VE'], list_type: 'sanctions' },
    action: 'block',
    severity: 'critical',
  },
  {
    name: 'New Account Large Payment',
    description: 'Reviews first transactions above $10,000 from accounts less than 30 days old',
    condition: { field: 'amount', operator: 'greater_than', value: 10000, account_age_days: 30 },
    action: 'require_review',
    severity: 'medium',
  },
  {
    name: 'Geo Mismatch Detection',
    description: 'Flags when account login and transaction initiation originate from different countries',
    condition: { field: 'login_country', operator: 'not_equals', value: 'transaction_country', time_window_minutes: 30 },
    action: 'flag',
    severity: 'medium',
  },
]

/**
 * Ensures a tenant has at least one fraud rule with the correct `_tenantId`
 * embedded in the condition.  If no scoped rules exist the full set of defaults
 * is inserted in a single `createMany` call.  The function is idempotent and
 * safe to call concurrently — a unique-constraint violation on `name` is
 * treated as a no-op.
 *
 * The `_tenantId` embedding is a temporary workaround tracked in ADR-008.
 * Once the schema migration adds a dedicated `tenantId` column this helper
 * will be replaced by a first-class tenant field.
 */
async function ensureDefaultRules(tenantId: string): Promise<void> {
  // Fast path: check if any rule already carries this tenant's id.
  const existing = await db.fraudRule.findFirst({
    where: { condition: { contains: tenantId } },
    select: { id: true },
  })
  if (existing) return

  // No scoped rules yet — seed the defaults.
  const data = DEFAULT_FRAUD_RULES.map((rule) => ({
    name: rule.name,
    description: rule.description,
    condition: injectTenantId(rule.condition, tenantId),
    action: rule.action,
    severity: rule.severity,
    isActive: true,
  }))

  try {
    await db.fraudRule.createMany({ data, skipDuplicates: true })
  } catch (err: any) {
    // Unique constraint violations (e.g. duplicate name from a race) are
    // acceptable — the rules exist now, which is all we need.
    if (!err?.code?.startsWith('P2')) {
      console.error('[ensureDefaultRules] Unexpected error seeding rules:', err)
    }
  }
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

    // Lazily seed default fraud rules for this tenant if none exist yet.
    // This is safe to call on every request — it exits immediately when rules
    // are already present (see ensureDefaultRules docstring).
    await ensureDefaultRules(user.tenantId)

    const where: Record<string, unknown> = {}
    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true'
    }

    // Fetch all candidates matching non-tenant filters (pagination applied post-filter).
    const cacheManager = await getCache()
    const cacheKey = `fraud:rules:${user.tenantId}:all`

    const fetchAllRules = () => db.fraudRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    const allRules: any[] = cacheManager
      ? await cacheManager.getOrSet(cacheKey, fetchAllRules, { ttl: 5 * 60_000 })
      : await fetchAllRules()

    // Tenant-scope filter: only return rules whose condition JSON contains
    // _tenantId matching the requesting user's tenant.
    // Rules that predate this workaround (no _tenantId) are excluded for
    // safety — they must be re-saved with the correct tenant assignment.
    const tenantRules = allRules.filter((rule: any) => extractTenantId(rule.condition) === user.tenantId)

    // Paginate the filtered result set
    const total = tenantRules.length
    const paginatedRules = tenantRules.slice((page - 1) * limit, page * limit)

    // Strip the internal _tenantId key from condition before returning to
    // callers — it is an implementation detail, not part of the rule schema.
    const sanitisedRules = paginatedRules.map((rule: any) => {
      let cleanCondition = rule.condition
      try {
        const obj = JSON.parse(rule.condition)
        if (obj && typeof obj === 'object' && TENANT_KEY in obj) {
          const { [TENANT_KEY]: _, ...rest } = obj
          cleanCondition = JSON.stringify(rest)
        }
      } catch { /* return as-is if parsing fails */ }
      return { ...rule, condition: cleanCondition }
    })

    return ok(sanitisedRules, {
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
    let parsedCondition: Record<string, unknown>
    try {
      const raw = JSON.parse(data.condition)
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        return badRequest('Condition must be a JSON object')
      }
      parsedCondition = raw as Record<string, unknown>
    } catch {
      return badRequest('Condition must be a valid JSON string')
    }

    // Embed tenantId into the condition JSON blob (temporary workaround;
    // see ADR-008 — a future migration will add a dedicated `tenantId` column).
    const scopedCondition = injectTenantId(parsedCondition, user.tenantId)

    const rule = await db.fraudRule.create({
      data: {
        name: data.name,
        description: data.description,
        condition: scopedCondition,
        action: data.action,
        severity: data.severity,
        isActive: true,
      },
    })

    // Invalidate cached rule list for this tenant so the new rule is visible
    const cacheManager = await getCache()
    if (cacheManager) {
      try { await cacheManager.delete(`fraud:rules:${user.tenantId}:all`) } catch { /* best-effort */ }
    }

    // Strip _tenantId from the response — callers should not see it
    let cleanCondition = rule.condition
    try {
      const obj = JSON.parse(rule.condition)
      if (obj && typeof obj === 'object' && TENANT_KEY in obj) {
        const { [TENANT_KEY]: _, ...rest } = obj
        cleanCondition = JSON.stringify(rest)
      }
    } catch { /* return as-is */ }

    return created({ ...rule, condition: cleanCondition })
  } catch (error: any) {
    console.error('Error creating fraud rule:', error)
    return error('Failed to create fraud rule')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/fraud/rules');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/fraud/rules');
