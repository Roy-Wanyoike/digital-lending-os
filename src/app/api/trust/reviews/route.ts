import { NextRequest } from 'next/server';import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { badRequest, created, error, notFound, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response';
const createReviewSchema = z.object({
  fromBusinessId: z.string().min(1, 'fromBusinessId is required'),
  toBusinessId: z.string().min(1, 'toBusinessId is required'),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().optional(),
  escrowId: z.string().optional(),
  paymentRating: z.number().min(1).max(5).optional(),
  deliveryRating: z.number().min(1).max(5).optional(),
  qualityRating: z.number().min(1).max(5).optional(),
  communicationRating: z.number().min(1).max(5).optional(),
})

async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return unauthorized('Authentication required')
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const toBusinessId = searchParams.get('toBusinessId') || ''
    const fromBusinessId = searchParams.get('fromBusinessId') || ''
    const minRating = searchParams.get('rating')
    const status = searchParams.get('status') || ''

    // Get tenant business IDs
    const tenantBizIds = (await db.business.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    })).map((b: any) => b.id)

    const where: Record<string, unknown> = {
      OR: [
        { fromBusinessId: { in: tenantBizIds } },
        { toBusinessId: { in: tenantBizIds } },
      ],
    }

    if (toBusinessId) where.toBusinessId = toBusinessId
    if (fromBusinessId) where.fromBusinessId = fromBusinessId
    if (minRating) where.rating = { gte: parseFloat(minRating) }
    if (status) where.status = status

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.review.count({ where }),
    ])

    return ok(reviews, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err: any) {
    console.error('Error listing reviews:', err)
    return error('Failed to list reviews')
  }
}

async function postHandler(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const parsed = createReviewSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error.issues.map(i => i.message).join(', '))
    }

    const { fromBusinessId, toBusinessId, rating, comment, escrowId, paymentRating, deliveryRating, qualityRating, communicationRating } = parsed.data

    if (fromBusinessId === toBusinessId) {
      return badRequest('Cannot review your own business')
    }

    // Check both businesses exist and reviewer belongs to tenant
    const [fromBusiness, toBusiness] = await Promise.all([
      db.business.findUnique({ where: { id: fromBusinessId } }),
      db.business.findUnique({ where: { id: toBusinessId } }),
    ])

    if (!fromBusiness || fromBusiness.tenantId !== user.tenantId) {
      return notFound('Reviewer business not found')
    }
    if (!toBusiness) {
      return notFound('Reviewed business not found')
    }

    // Create the review
    const review = await db.review.create({
      data: {
        fromBusinessId,
        toBusinessId,
        rating,
        comment,
        escrowId,
        paymentRating,
        deliveryRating,
        qualityRating,
        communicationRating,
      },
    })

    // Ensure TrustScore exists for the reviewed business
    let trustScore = await db.trustScore.findUnique({
      where: { businessId: toBusinessId },
    })

    if (!trustScore) {
      trustScore = await db.trustScore.create({
        data: { businessId: toBusinessId },
      })
    }

    // Create a ReputationEvent for the review
    const scoreImpact = (rating - 3) * 2
    await db.reputationEvent.create({
      data: {
        trustScoreId: trustScore.id,
        eventType: 'review_received',
        scoreImpact,
        description: `Received ${rating}-star review from ${fromBusiness.name}`,
        sourceId: review.id,
      },
    })

    // Update trust score totals
    await db.trustScore.update({
      where: { id: trustScore.id },
      data: {
        totalReviews: { increment: 1 },
        lastCalculated: new Date(),
      },
    })

    return created(review)
  } catch (error: any) {console.error('Error creating review:', error)
    return error('Failed to create review')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/trust/reviews');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/trust/reviews');
