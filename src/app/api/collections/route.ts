import { NextRequest } from 'next/server';import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { collectionListCache } from '@/backend/lib/response-cache';
import { conflict, created, error, notFound, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response';
function generateCaseRef(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'COL-'
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const MOCK_STRATEGIES = [
  'Start with a friendly email reminder, escalate to WhatsApp if no response within 5 days, then formal demand letter at 30 days overdue.',
  'Immediate phone contact recommended given the high outstanding amount. Follow up with formal written notice and consider payment plan negotiation.',
  'Multi-channel approach: send SMS reminder first, follow with email containing payment link, then schedule direct call. Offer early payment discount if paid within 7 days.',
  'AI analysis suggests this debtor typically pays within 48 hours of a direct message. Prioritize WhatsApp contact and include a flexible payment schedule option.',
  'Given the relationship history, recommend a collaborative approach. Send invoice reconciliation summary and offer to discuss payment terms adjustment.',
]

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

    const aiStrategy = MOCK_STRATEGIES[Math.floor(Math.random() * MOCK_STRATEGIES.length)]

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
