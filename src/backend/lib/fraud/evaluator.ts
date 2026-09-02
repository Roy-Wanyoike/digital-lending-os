/**
 * Fraud Rule Evaluator — YoungSend Auto-Block Enforcement
 *
 * Evaluates a transaction against active fraud rules for a tenant.
 * Supports condition operators: greater_than, less_than, equals, not_equals, in, not_in.
 * Actions:
 *   - 'block': returns a block decision (transaction rejected)
 *   - 'alert': creates a FraudAlert in the DB
 *   - 'require_review': flags the transaction for review
 *
 * Rules are cached in Redis via cache-manager with a 5-min TTL.
 */

import { db } from '@/lib/db'

// ─── Types ─────────────────────────────────────────────────────────────────

/** The transaction context provided by callers for fraud evaluation. */
export interface FraudTransactionContext {
  tenantId: string
  businessId: string
  amount: number
  currency: string
  country?: string
  transactionType: string
}

/** Parsed fraud rule condition (after stripping _tenantId). */
export interface FraudCondition {
  field: string
  operator: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'in' | 'not_in'
  value: unknown
  /** Optional metadata — not used in evaluation but preserved for alert descriptions */
  [key: string]: unknown
}

/** A raw fraud rule row from the database. */
export interface FraudRuleRow {
  id: string
  name: string
  condition: string
  action: string
  severity: string
  isActive: boolean
}

/** Result of evaluating all fraud rules for a transaction. */
export interface FraudEvaluationResult {
  allowed: boolean
  alerts: string[]
  blockedBy?: string
  requireReview?: boolean
}

// ─── Constants ─────────────────────────────────────────────────────────────

const TENANT_KEY = '_tenantId'
const RULES_CACHE_TTL = 5 * 60_000 // 5 minutes

// ─── Lazy Cache Manager ────────────────────────────────────────────────────

let _cacheManager: any = undefined
let _cacheAttempted = false

async function getCacheManager(): Promise<any> {
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

// ─── Condition Parsing ────────────────────────────────────────────────────

/**
 * Parse a JSON condition string into a typed FraudCondition.
 * Strips the internal `_tenantId` key before evaluation.
 */
function parseCondition(conditionStr: string): FraudCondition | null {
  try {
    const obj = JSON.parse(conditionStr)
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return null
    const { [TENANT_KEY]: _, ...rest } = obj as Record<string, unknown>
    if (typeof rest.field !== 'string' || typeof rest.operator !== 'string') return null
    return rest as FraudCondition
  } catch {
    return null
  }
}

// ─── Rule Fetching (with caching) ─────────────────────────────────────────

/**
 * Fetch active fraud rules for a tenant. Rules are cached for 5 minutes.
 *
 * Tenant-scoping uses the same _tenantId-in-condition workaround as the
 * fraud rules API (see ADR-008). Rules without _tenantId matching the
 * given tenantId are excluded.
 */
export async function fetchActiveRules(tenantId: string): Promise<FraudRuleRow[]> {
  const cacheManager = await getCacheManager()
  const cacheKey = `fraud:eval:rules:${tenantId}`

  const fetchRules = async () => {
    const rows = await db.fraudRule.findMany({
      where: { isActive: true },
    })
    // Filter to only rules belonging to this tenant (via embedded _tenantId)
    return rows.filter((row: FraudRuleRow) => {
      try {
        const obj = JSON.parse(row.condition)
        return obj && typeof obj === 'object' && obj[TENANT_KEY] === tenantId
      } catch {
        return false
      }
    })
  }

  if (cacheManager) {
    return cacheManager.getOrSet(cacheKey, fetchRules, { ttl: RULES_CACHE_TTL })
  }

  return fetchRules()
}

// ─── Field Value Resolution ───────────────────────────────────────────────

/**
 * Resolve the actual value of a condition's `field` from the transaction context.
 */
function resolveFieldValue(field: string, ctx: FraudTransactionContext): unknown {
  switch (field) {
    case 'amount':
      return ctx.amount
    case 'currency':
      return ctx.currency
    case 'country':
      return ctx.country
    case 'transactionType':
      return ctx.transactionType
    case 'businessId':
      return ctx.businessId
    default:
      // For any unknown field, return undefined so comparison fails gracefully
      return undefined
  }
}

// ─── Condition Operators ──────────────────────────────────────────────────

/**
 * Evaluate a single condition against a transaction context.
 * Returns true if the condition matches (i.e., the rule should fire).
 */
export function evaluateCondition(
  condition: FraudCondition,
  ctx: FraudTransactionContext,
): boolean {
  const actualValue = resolveFieldValue(condition.field, ctx)
  const expectedValue = condition.value

  // If we can't resolve the field, the rule doesn't match
  if (actualValue === undefined) return false

  switch (condition.operator) {
    case 'greater_than':
      return typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue > expectedValue

    case 'less_than':
      return typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue < expectedValue

    case 'equals':
      return actualValue === expectedValue

    case 'not_equals':
      return actualValue !== expectedValue

    case 'in':
      return Array.isArray(expectedValue) && expectedValue.includes(actualValue)

    case 'not_in':
      return Array.isArray(expectedValue) && !expectedValue.includes(actualValue)

    default:
      return false
  }
}

// ─── Alert Creation ───────────────────────────────────────────────────────

/** Generate a unique alert reference (FRD-XXXXX). */
function generateAlertRef(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'FRD-'
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Create a FraudAlert record in the database.
 */
async function createFraudAlert(params: {
  businessId: string
  ruleName: string
  severity: string
  action: string
  ctx: FraudTransactionContext
  condition: FraudCondition
}): Promise<void> {
  const MAX_RETRIES = 5
  let alertRef = generateAlertRef()
  let exists = await db.fraudAlert.findUnique({ where: { alertRef } })
  let retries = 0
  while (exists && retries < MAX_RETRIES) {
    alertRef = generateAlertRef()
    exists = await db.fraudAlert.findUnique({ where: { alertRef } })
    retries++
  }

  await db.fraudAlert.create({
    data: {
      alertRef,
      businessId: params.businessId,
      relatedType: params.ctx.transactionType,
      severity: params.severity as any,
      fraudType: `rule:${params.ruleName}`,
      score: 80, // high confidence since a rule explicitly matched
      description: `Fraud rule "${params.ruleName}" triggered. Condition: ${params.condition.field} ${params.condition.operator} ${JSON.stringify(params.condition.value)}`,
      recommendation: params.action === 'require_review'
        ? 'Review transaction manually before processing'
        : undefined,
      metadata: JSON.stringify({
        ruleId: '',
        ruleName: params.ruleName,
        ruleAction: params.action,
        condition: params.condition,
        transactionAmount: params.ctx.amount,
        transactionCurrency: params.ctx.currency,
        transactionType: params.ctx.transactionType,
        triggeredAt: new Date().toISOString(),
      }),
    },
  })
}

// ─── Main Evaluator ───────────────────────────────────────────────────────

/**
 * Evaluate a transaction against all active fraud rules for a tenant.
 *
 * Processing order:
 *  1. Fetch active rules (cached 5-min)
 *  2. Evaluate each rule's condition against the transaction context
 *  3. For 'block' rules that match → immediately return blocked
 *  4. For 'alert' rules that match → create FraudAlert, continue evaluating
 *  5. For 'require_review' rules that match → flag for review, continue evaluating
 *  6. Return final decision
 */
export async function evaluateTransaction(
  ctx: FraudTransactionContext,
): Promise<FraudEvaluationResult> {
  const rules = await fetchActiveRules(ctx.tenantId)

  const alerts: string[] = []
  let blockedBy: string | undefined
  let requireReview = false

  for (const rule of rules) {
    const condition = parseCondition(rule.condition)
    if (!condition) continue

    const matched = evaluateCondition(condition, ctx)
    if (!matched) continue

    // Update trigger count (fire-and-forget)
    db.fraudRule.update({
      where: { id: rule.id },
      data: { triggerCount: { increment: 1 }, lastTriggeredAt: new Date() },
    }).catch(() => { /* non-fatal */ })

    switch (rule.action) {
      case 'block':
        // Immediately block — don't continue evaluating
        return {
          allowed: false,
          alerts: [`Blocked by rule: ${rule.name}`],
          blockedBy: rule.name,
        }

      case 'alert': {
        const alertMsg = `Alert: ${rule.name} (${rule.severity} severity)`
        alerts.push(alertMsg)
        // Create FraudAlert in DB (fire-and-forget to not block the response)
        createFraudAlert({
          businessId: ctx.businessId,
          ruleName: rule.name,
          severity: rule.severity,
          action: rule.action,
          ctx,
          condition,
        }).catch(() => { /* non-fatal */ })
        break
      }

      case 'require_review': {
        const reviewMsg = `Review required: ${rule.name} (${rule.severity} severity)`
        alerts.push(reviewMsg)
        requireReview = true
        // Also create an alert for tracking
        createFraudAlert({
          businessId: ctx.businessId,
          ruleName: rule.name,
          severity: rule.severity,
          action: rule.action,
          ctx,
          condition,
        }).catch(() => { /* non-fatal */ })
        break
      }

      default:
        // Unknown action — skip
        break
    }
  }

  return { allowed: true, alerts, requireReview }
}
