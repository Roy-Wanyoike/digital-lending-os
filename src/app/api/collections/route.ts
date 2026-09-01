import { NextRequest } from 'next/server';import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { collectionListCache } from '@/backend/lib/response-cache';
import { conflict, created, error, notFound, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response';

// ─── Types ───────────────────────────────────────────────────────────────

type StrategyTier = 'friendly_reminder' | 'formal_notice' | 'demand_letter' | 'escalation' | 'final_notice'
type StrategyChannel = 'email' | 'sms' | 'whatsapp' | 'letter' | 'all'
type StrategyPriority = 'low' | 'medium' | 'high' | 'critical'

interface CollectionStrategy {
  name: string
  channel: StrategyChannel
  priority: StrategyPriority
  messageTemplate: string
  estimatedSuccessRate: number
}

// ─── Strategy tier definitions ────────────────────────────────────────────

const TIERS: StrategyTier[] = ['friendly_reminder', 'formal_notice', 'demand_letter', 'escalation', 'final_notice']

const STRATEGY_CONFIGS: Record<StrategyTier, {
  name: string
  channel: StrategyChannel
  priority: StrategyPriority
  baseSuccessRate: number
  messageTemplate: string
}> = {
  friendly_reminder: {
    name: 'Friendly Reminder',
    channel: 'email',
    priority: 'low',
    baseSuccessRate: 0.92,
    messageTemplate:
      'Hi {{debtorName}}, this is a gentle reminder that invoice {{invoiceRef}} for {{amount}} {{currency}} is now overdue by {{daysOverdue}} days. We understand things can slip — please settle at your earliest convenience. Thank you for your continued partnership.',
  },
  formal_notice: {
    name: 'Formal Notice',
    channel: 'email',
    priority: 'medium',
    baseSuccessRate: 0.78,
    messageTemplate:
      'Dear {{debtorName}}, our records indicate that invoice {{invoiceRef}} for {{amount}} {{currency}} is now {{daysOverdue}} days past its due date. Please arrange payment within 5 business days to avoid further escalation. If you have already made this payment, kindly share the payment reference so we can update our records.',
  },
  demand_letter: {
    name: 'Demand Letter',
    channel: 'all',
    priority: 'high',
    baseSuccessRate: 0.58,
    messageTemplate:
      '{{debtorName}} — FINAL DEMAND. Invoice {{invoiceRef}} in the amount of {{amount}} {{currency}} is now {{daysOverdue}} days overdue. This is our third and final written notice before we escalate this matter. Please remit the full outstanding balance within 7 days or contact us immediately to discuss a payment arrangement. Failure to respond may result in further collection action.',
  },
  escalation: {
    name: 'Escalation Protocol',
    channel: 'all',
    priority: 'high',
    baseSuccessRate: 0.40,
    messageTemplate:
      'NOTICE OF ESCALATION — {{debtorName}}. The outstanding balance of {{amount}} {{currency}} on invoice {{invoiceRef}} ({{daysOverdue}} days overdue) has been referred for escalated collection. This may include engagement with a third-party collection agency or legal proceedings. To resolve this before further action, please contact our collections department within 48 hours.',
  },
  final_notice: {
    name: 'Final Notice',
    channel: 'letter',
    priority: 'critical',
    baseSuccessRate: 0.22,
    messageTemplate:
      'FINAL LEGAL NOTICE — {{debtorName}}. Despite repeated reminders, invoice {{invoiceRef}} for {{amount}} {{currency}} remains unpaid at {{daysOverdue}} days overdue. We are now preparing to initiate formal recovery proceedings. This is your last opportunity to settle this matter amicably. Please remit payment in full within 5 business days or expect legal action without further notice.',
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function generateCaseRef(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'COL-'
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Compute the base strategy tier from the invoice due date.
 * Falls back to the provided agingBucket when no invoice is available.
 */
function getBaseTier(invoice: { dueDate?: Date | null } | null, agingBucket: string): number {
  if (invoice?.dueDate) {
    const daysOverdue = Math.max(
      0,
      Math.floor((Date.now() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
    )
    if (daysOverdue <= 7) return 0
    if (daysOverdue <= 30) return 1
    if (daysOverdue <= 60) return 2
    if (daysOverdue <= 90) return 3
    return 4
  }
  // Map agingBucket conservatively
  switch (agingBucket) {
    case 'current': return 0
    case '1-30': return 1
    case '31-60': return 2
    case '61-90': return 3
    case '90+': return 4
    default: return 0
  }
}

/**
 * Evaluate whether the debtor has a good payment history (≥70% of recent
 * invoices paid on time). Fetches up to 10 most-recently-paid invoices.
 */
async function hasGoodPaymentHistory(debtorId: string): Promise<boolean> {
  const recentPaid = await db.invoice.findMany({
    where: {
      receiverId: debtorId,
      status: 'paid',
      paidAt: { not: null },
      dueDate: { not: null },
    },
    select: { paidAt: true, dueDate: true },
    take: 10,
    orderBy: { paidAt: 'desc' },
  })
  if (recentPaid.length === 0) return false
  const onTimeCount = recentPaid.filter((inv: { paidAt: Date | null; dueDate: Date | null }) => inv.paidAt! <= inv.dueDate!).length
  return onTimeCount / recentPaid.length >= 0.7
}

/**
 * Compute estimated success rate based on tier, amount, and payment history.
 */
function computeSuccessRate(
  baseRate: number,
  outstandingAmount: number,
  goodHistory: boolean,
): number {
  let rate = baseRate
  // Good payment history bonus
  if (goodHistory) rate += 0.08
  // High-value penalty: $10k threshold, -2% per additional $5k, capped at -15%
  if (outstandingAmount > 10_000) {
    const penalty = Math.min(0.15, (Math.floor((outstandingAmount - 10_000) / 5_000) + 1) * 0.02)
    rate -= penalty
  }
  return Math.round(Math.max(0.05, Math.min(0.98, rate)) * 100) / 100
}

/**
 * Deterministically select a collection strategy based on invoice age,
 * debtor payment history, and invoice amount.
 */
async function selectStrategy(opts: {
  invoiceId?: string | null
  debtorId: string
  outstandingAmount: number
  agingBucket: string
}): Promise<string> {
  let invoice: { dueDate?: Date | null } | null = null
  if (opts.invoiceId) {
    invoice = await db.invoice.findUnique({
      where: { id: opts.invoiceId },
      select: { dueDate: true },
    })
  }

  let tier = getBaseTier(invoice, opts.agingBucket)

  // Adjustments run concurrently
  const [goodHistory] = await Promise.all([hasGoodPaymentHistory(opts.debtorId)])

  if (goodHistory) tier = Math.max(0, tier - 1)  // start one tier lower
  if (opts.outstandingAmount > 10_000) tier = Math.min(4, tier + 1)  // escalate one tier

  const tierKey = TIERS[tier]
  const config = STRATEGY_CONFIGS[tierKey]

  const strategy: CollectionStrategy = {
    name: config.name,
    channel: config.channel,
    priority: config.priority,
    messageTemplate: config.messageTemplate,
    estimatedSuccessRate: computeSuccessRate(config.baseSuccessRate, opts.outstandingAmount, goodHistory),
  }

  return JSON.stringify(strategy)
}

const createCollectionSchema = z.object({
  invoiceId: z.string().optional(),
  businessId: z.string().min(1, 'Creditor business ID is required'),
  debtorId: z.string().min(1, 'Debtor ID is required'),
  originalAmount: z.number().positive('Original amount must be greater than 0'),
  outstandingAmount: z.number().min(0, 'Outstanding amount must be 0 or greater'),
  currency: z.string().min(1, 'Currency is required'),
  agingBucket: z.enum(['current', '1-30', '31-60', '61-90', '90+']).default('current'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
})

async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return unauthorized('Authentication required')
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const businessId = searchParams.get('businessId') || ''
    const debtorId = searchParams.get('debtorId') || ''
    const agingBucket = searchParams.get('agingBucket') || ''
    const priority = searchParams.get('priority') || ''
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = {
      business: { tenantId: user.tenantId },
    }

    if (businessId) where.businessId = businessId
    if (debtorId) where.debtorId = debtorId
    if (agingBucket) where.agingBucket = agingBucket
    if (priority) where.priority = priority
    if (status) where.status = status

    // Fast in-memory cache (3s TTL)
    const collKey = `coll:${user.tenantId}:${page}:${limit}:${businessId || ''}:${debtorId || ''}:${agingBucket || ''}:${priority || ''}:${status || ''}`
    const memCached = collectionListCache.get(collKey)
    if (memCached) {
      return ok(memCached.data, memCached.pagination, { noCache: true })
    }

    const [cases, total] = await Promise.all([
      db.collectionCase.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          caseRef: true,
          businessId: true,
          debtorId: true,
          originalAmount: true,
          outstandingAmount: true,
          currency: true,
          agingBucket: true,
          priority: true,
          status: true,
          aiStrategy: true,
          createdAt: true,
          updatedAt: true,
          debtor: { select: { name: true } },
        },
      }),
      db.collectionCase.count({ where }),
    ])

    const casesWithDebtorName = cases.map((c: any) => ({
      ...c,
      debtorName: c.debtor?.name ?? null,
      debtor: undefined,
    }))

    const result = {
      data: casesWithDebtorName,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }

    // Cache for 3s
    collectionListCache.set(collKey, result)

    return ok(casesWithDebtorName, result.pagination)
  } catch (err: any) {
    console.error('Error listing collection cases:', err)
    return error('Failed to list collection cases')
  }
}

async function postHandler(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const parsed = createCollectionSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error.issues.map(i => i.message).join(', '))
    }

    const data = parsed.data

    // Verify business belongs to tenant
    const biz = await db.business.findUnique({ where: { id: data.businessId }, select: { tenantId: true } })
    if (!biz || biz.tenantId !== user.tenantId) {
      return notFound('Business not found')
    }

    let caseRef = generateCaseRef()
    let exists = await db.collectionCase.findUnique({ where: { caseRef } })
    while (exists) {
      caseRef = generateCaseRef()
      exists = await db.collectionCase.findUnique({ where: { caseRef } })
    }

    const aiStrategy = await selectStrategy({
      invoiceId: data.invoiceId,
      debtorId: data.debtorId,
      outstandingAmount: data.outstandingAmount,
      agingBucket: data.agingBucket,
    })

    const collectionCase = await db.collectionCase.create({
      data: {
        caseRef,
        invoiceId: data.invoiceId,
        businessId: data.businessId,
        debtorId: data.debtorId,
        originalAmount: data.originalAmount,
        outstandingAmount: data.outstandingAmount,
        currency: data.currency,
        agingBucket: data.agingBucket,
        priority: data.priority,
        aiStrategy,
      },
    })

    return created(collectionCase)
  } catch (error: any) {if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return conflict('Case reference collision, please retry')
    }
    console.error('Error creating collection case:', error)
    return error('Failed to create collection case')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/collections');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/collections');
