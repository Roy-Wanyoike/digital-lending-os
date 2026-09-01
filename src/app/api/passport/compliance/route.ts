import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers'
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper'
import { created, error, notFound, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response'

const createComplianceDocSchema = z.object({
  passportId: z.string().min(1, 'passportId is required'),
  docType: z.string().min(1, 'docType is required'),
  docName: z.string().min(1, 'docName is required'),
  docUrl: z.string().optional(),
  expiresAt: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
})

// ── Rule Evaluation Logic (mirrors screenings/route.ts) ────────────────

interface RuleCondition {
  screeningTypes?: string[]
  countries?: string[]
  namePatterns?: string[]
  industries?: string[]
  amountThreshold?: number
  listNames?: string[]
}

function evaluateCondition(
  cond: RuleCondition,
  business: { name: string; legalName: string | null; country: string; industry: string | null; annualRevenue: number | null },
): boolean {
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
 * Evaluate all active compliance rules for a tenant against a business.
 * Returns the triggered rules (if any) and a final assessment.
 */
async function evaluateBusinessAgainstRules(
  businessId: string,
  tenantId: string,
): Promise<{
  isFlagged: boolean
  triggeredRules: Array<{ name: string; ruleType: string; severity: string; action: string }>
  screeningResult: string
  screeningDetails: string
  matchedLists: string[]
}> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { name: true, legalName: true, country: true, industry: true, annualRevenue: true },
  })

  if (!business) {
    return { isFlagged: false, triggeredRules: [], screeningResult: 'clear', screeningDetails: 'Business not found — cleared by default.', matchedLists: [] }
  }

  // Fetch ALL active rules for the tenant (not filtered by screening type,
  // since passport compliance is a holistic check).
  const rules = await db.complianceRule.findMany({
    where: { tenantId, isActive: true },
  })

  if (rules.length === 0) {
    return { isFlagged: false, triggeredRules: [], screeningResult: 'clear', screeningDetails: 'No active compliance rules configured. Cleared by default.', matchedLists: [] }
  }

  const SEVERITY_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 }

  const triggeredRules: Array<{ name: string; ruleType: string; severity: string; action: string }> = []
  const allMatchedListNames: string[] = []

  for (const rule of rules) {
    let parsed: RuleCondition
    try {
      parsed = JSON.parse(rule.condition) as RuleCondition
    } catch {
      continue
    }

    if (evaluateCondition(parsed, business)) {
      triggeredRules.push({ name: rule.name, ruleType: rule.ruleType, severity: rule.severity, action: rule.action })
      if (parsed.listNames) {
        allMatchedListNames.push(...parsed.listNames)
      }
    }
  }

  // No rules triggered → clear
  if (triggeredRules.length === 0) {
    return { isFlagged: false, triggeredRules: [], screeningResult: 'clear', screeningDetails: 'Entity passed all active compliance rule evaluations.', matchedLists: [] }
  }

  // Sort by severity descending to report the worst first
  triggeredRules.sort((a, b) => (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0))

  // Determine screening result from the worst triggered rule's action
  const worstRule = triggeredRules[0]
  let screeningResult: string
  switch (worstRule.action) {
    case 'block':
      screeningResult = 'alert'
      break
    case 'flag_for_review':
      screeningResult = 'potential_match'
      break
    case 'require_additional_doc':
      screeningResult = 'match'
      break
    default:
      screeningResult = 'potential_match'
  }

  const ruleNames = triggeredRules.map((r) => r.name).join(', ')
  const screeningDetails = `Rules triggered: ${ruleNames}. Highest severity: ${worstRule.severity} (${worstRule.ruleType}).`
  const matchedLists = [...new Set(allMatchedListNames)]

  return { isFlagged: true, triggeredRules, screeningResult, screeningDetails, matchedLists }
}

// ── GET Handler (unchanged) ─────────────────────────────────────────────

async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return unauthorized('Authentication required')
    const { searchParams } = new URL(request.url)
    const passportId = searchParams.get('passportId') || ''
    const docType = searchParams.get('docType') || ''
    const status = searchParams.get('status') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    const where: Record<string, unknown> = {
      passport: { business: { tenantId: user.tenantId } },
    }

    if (passportId) {
      where.passportId = passportId
    }
    if (docType) {
      where.docType = docType
    }
    if (status) {
      where.status = status
    }

    const [documents, total] = await Promise.all([
      db.complianceDocument.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { uploadedAt: 'desc' },
      }),
      db.complianceDocument.count({ where }),
    ])

    return ok(documents, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err: any) {
    console.error('Error listing compliance documents:', err)
    return error('Failed to list compliance documents')
  }
}

// ── POST Handler (with auto-screening) ──────────────────────────────────

async function postHandler(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const parsed = createComplianceDocSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error.issues.map((i) => i.message).join(', '))
    }

    const { passportId, docType, docName, docUrl, expiresAt } = parsed.data

    // Check passport exists and belongs to tenant; also grab businessId
    const passport = await db.commercePassport.findUnique({
      where: { id: passportId },
      include: { business: { select: { tenantId: true, id: true } } },
    })

    if (!passport || passport.business.tenantId !== user.tenantId) {
      return notFound('Commerce passport not found')
    }

    // ── Auto-screening: evaluate business against active rules ──
    const evaluation = await evaluateBusinessAgainstRules(
      passport.business.id,
      user.tenantId,
    )

    // Determine initial status based on rule evaluation
    const initialStatus = evaluation.isFlagged ? 'flagged' : 'pending_review'

    // Create a ComplianceScreening record documenting the automatic evaluation
    const screening = await db.complianceScreening.create({
      data: {
        businessId: passport.business.id,
        screeningType: 'sanctions', // holistic check tagged as sanctions baseline
        result: evaluation.screeningResult,
        riskLevel: evaluation.triggeredRules.length > 0
          ? evaluation.triggeredRules[0].severity
          : 'low',
        details: evaluation.screeningDetails,
        matchedLists: evaluation.matchedLists.length > 0
          ? JSON.stringify(evaluation.matchedLists)
          : null,
        status: 'completed',
      },
    })

    // Build metadata with screening reference and triggered rules
    const metadata: Record<string, unknown> = {
      screeningId: screening.id,
      screeningResult: screening.result,
      riskLevel: screening.riskLevel,
      triggeredRules: evaluation.triggeredRules,
      autoEvaluated: true,
      evaluatedAt: new Date().toISOString(),
      evaluatedBy: user.id,
    }

    const document = await db.complianceDocument.create({
      data: {
        passportId,
        docType,
        docName,
        docUrl,
        expiresAt,
        status: initialStatus,
        metadata: JSON.stringify(metadata),
      },
    })

    return created(document)
  } catch (error: any) {
    console.error('Error creating compliance document:', error)
    if (error instanceof AuthError) return unauthorized(error.message)
    return error('Failed to create compliance document')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/passport/compliance');
export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/passport/compliance');
