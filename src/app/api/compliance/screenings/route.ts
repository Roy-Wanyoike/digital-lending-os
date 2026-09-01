import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, requireRole, AuthError } from '@/lib/auth/api-helpers'
import { unauthorized, notFound, badRequest, error as apiErr, created, ok, withErrorHandler } from '@/backend/lib/api-response'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
const createScreeningSchema = z.object({
  businessId: z.string().min(1, 'businessId is required'),
  transactionType: z.string().optional(),
  transactionId: z.string().optional(),
  screeningType: z.enum(['sanctions', 'pep', 'adverse_media', 'country_risk']),
})

// Mapping from screeningType to the ruleTypes that should be evaluated.
const SCREENING_RULE_TYPE_MAP: Record<string, string[]> = {
  sanctions: ['sanctions_check'],
  pep: ['kyc_requirement'],
  adverse_media: ['industry_restriction'],
  country_risk: ['country_restriction', 'aml_threshold'],
}

// Maps rule action to screening result.
function actionToResult(action: string): string {
  switch (action) {
    case 'block': return 'alert'
    case 'flag_for_review': return 'potential_match'
    case 'require_additional_doc': return 'match'
    default: return 'potential_match'
  }
}

interface RuleCondition {
  // Optional: restrict this rule to specific screening types.
  // If omitted the rule applies to all screening types.
  screeningTypes?: string[]
  // Match if the business country code is in this list.
  countries?: string[]
  // Regex patterns tested against business name and legalName.
  namePatterns?: string[]
  // Match if the business industry is in this list (case-insensitive).
  industries?: string[]
  // Match if business annualRevenue >= this value.
  amountThreshold?: number
  // Sanction / watch-list names to report when the rule triggers.
  listNames?: string[]
}

/**
 * Evaluate a single parsed rule condition against the business entity.
 * Returns `true` when the condition triggers (entity matches the risk criteria).
 */
function evaluateCondition(
  cond: RuleCondition,
  business: { name: string; legalName: string | null; country: string; industry: string | null; annualRevenue: number | null },
  screeningType: string,
): boolean {
  // If the rule specifies which screening types it applies to, skip if this isn't one.
  if (cond.screeningTypes && !cond.screeningTypes.includes(screeningType)) {
    return false
  }

  // Country check
  if (cond.countries && cond.countries.length > 0) {
    if (cond.countries.some((c) => c.toLowerCase() === business.country.toLowerCase())) {
      return true
    }
  }

  // Name pattern check (against both name and legalName)
  if (cond.namePatterns && cond.namePatterns.length > 0) {
    const namesToCheck = [business.name]
    if (business.legalName) namesToCheck.push(business.legalName)
    if (namesToCheck.some((n) => cond.namePatterns!.some((pat) => new RegExp(pat, 'i').test(n)))) {
      return true
    }
  }

  // Industry check
  if (cond.industries && cond.industries.length > 0 && business.industry) {
    if (cond.industries.some((ind) => ind.toLowerCase() === business.industry!.toLowerCase())) {
      return true
    }
  }

  // Amount threshold check
  if (cond.amountThreshold !== undefined && cond.amountThreshold !== null && business.annualRevenue !== null) {
    if (business.annualRevenue >= cond.amountThreshold) {
      return true
    }
  }

  return false
}

/**
 * Deterministic, rule-based screening.
 *
 * 1. Fetches the business entity for context (country, industry, revenue, etc.).
 * 2. Loads all active compliance rules for the tenant.
 * 3. Filters rules whose ruleType is relevant to the requested screeningType.
 * 4. Evaluates each rule's JSON condition against the business data.
 * 5. Returns the highest-severity matching result, or a `clear` result when no rules fire.
 */
async function performScreening(
  data: { businessId: string; screeningType: string; transactionType?: string; transactionId?: string },
  tenantId: string,
): Promise<{ result: string; riskLevel: string; details: string; matchedLists: string | null }> {
  // Fetch business for evaluation context.
  const business = await db.business.findUnique({
    where: { id: data.businessId },
    select: { name: true, legalName: true, country: true, industry: true, annualRevenue: true },
  })
  const bizCtx = business ?? { name: '', legalName: null, country: '', industry: null, annualRevenue: null }

  // Determine which ruleTypes are relevant for this screeningType.
  const applicableRuleTypes = SCREENING_RULE_TYPE_MAP[data.screeningType] ?? []

  // Fetch active rules for the tenant, optionally filtered by relevant ruleTypes.
  const rules = await db.complianceRule.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(applicableRuleTypes.length > 0 ? { ruleType: { in: applicableRuleTypes } } : {}),
    },
  })

  // If no rules exist, return clear immediately.
  if (rules.length === 0) {
    return {
      result: 'clear',
      riskLevel: 'low',
      details: 'No compliance rules configured for this screening type. Cleared by default.',
      matchedLists: null,
    }
  }

  const SEVERITY_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 }

  let bestMatch: { rule: typeof rules[0]; condition: RuleCondition } | null = null
  const allMatchedListNames: string[] = []
  const triggeredRuleNames: string[] = []

  for (const rule of rules) {
    let parsed: RuleCondition
    try {
      parsed = JSON.parse(rule.condition) as RuleCondition
    } catch {
      // Skip rules with malformed condition JSON.
      continue
    }

    if (evaluateCondition(parsed, bizCtx, data.screeningType)) {
      // Collect matched list names if the rule specifies any.
      if (parsed.listNames) {
        allMatchedListNames.push(...parsed.listNames)
      }
      triggeredRuleNames.push(rule.name)

      // Keep the highest-severity match as the primary result.
      if (!bestMatch || (SEVERITY_ORDER[rule.severity] ?? 0) > (SEVERITY_ORDER[bestMatch.rule.severity] ?? 0)) {
        bestMatch = { rule, condition: parsed }
      }
    }
  }

  // No rules triggered → clear.
  if (!bestMatch) {
    return {
      result: 'clear',
      riskLevel: 'low',
      details: 'Entity passed all active compliance rule evaluations.',
      matchedLists: null,
    }
  }

  // Build deterministic result from the highest-severity matching rule.
  const dedupedLists = [...new Set(allMatchedListNames)]
  const details = `Rule "${bestMatch.rule.name}" triggered (${bestMatch.rule.ruleType}). ${bestMatch.rule.description ?? 'Review required.'} Triggered rules: ${triggeredRuleNames.join(', ')}.`

  return {
    result: actionToResult(bestMatch.rule.action),
    riskLevel: bestMatch.rule.severity,
    details,
    matchedLists: dedupedLists.length > 0 ? JSON.stringify(dedupedLists) : null,
  }
}

async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return unauthorized()
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const businessId = searchParams.get('businessId') || ''
    const screeningType = searchParams.get('screeningType') || ''
    const result = searchParams.get('result') || ''
    const riskLevel = searchParams.get('riskLevel') || ''
    const status = searchParams.get('status') || ''

    // ComplianceScreening has no tenantId; filter by tenant business IDs
    const tenantBizIds = (await db.business.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    })).map((b: any) => b.id)

    const where: Record<string, unknown> = {
      businessId: { in: tenantBizIds },
    }

    if (businessId) {
      // Ensure the requested businessId belongs to the tenant
      if (!tenantBizIds.includes(businessId)) {
        return notFound('Business not found')
      }
      where.businessId = businessId
    }
    if (screeningType) where.screeningType = screeningType
    if (result) where.result = result
    if (riskLevel) where.riskLevel = riskLevel
    if (status) where.status = status

    const [screenings, total] = await Promise.all([
      db.complianceScreening.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.complianceScreening.count({ where }),
    ])

    return ok({ data: screenings, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  } catch (error: any) {
    console.error('Error listing compliance screenings:', error)
    if (error instanceof AuthError) return unauthorized(error.message)
    return apiErr('Failed to list compliance screenings')
  }
}

async function postHandler(request: NextRequest) {
  try {
    const user = await requireRole(request, ['admin', 'auditor'])
    const body = await request.json()
    const parsed = createScreeningSchema.safeParse(body)

    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message).join(', ')
      return badRequest(messages)
    }

    const data = parsed.data

    // Validate businessId belongs to tenant
    const biz = await db.business.findUnique({ where: { id: data.businessId }, select: { tenantId: true } })
    if (!biz || biz.tenantId !== user.tenantId) {
      return notFound('Business not found')
    }

    const screeningResult = await performScreening(data, user.tenantId)

    const screening = await db.complianceScreening.create({
      data: {
        businessId: data.businessId,
        transactionType: data.transactionType,
        transactionId: data.transactionId,
        screeningType: data.screeningType,
        result: screeningResult.result,
        riskLevel: screeningResult.riskLevel,
        details: screeningResult.details,
        matchedLists: screeningResult.matchedLists,
        status: 'completed',
      },
    })

    return created(screening)
  } catch (error: any) {
    console.error('Error creating compliance screening:', error)
    if (error instanceof AuthError) return unauthorized(error.message)
    return apiErr('Failed to create compliance screening')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/compliance/screenings');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/compliance/screenings');
