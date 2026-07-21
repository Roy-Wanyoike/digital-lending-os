import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const toBusinessId = searchParams.get('toBusinessId') || ''
    const fromBusinessId = searchParams.get('fromBusinessId') || ''
    const minRating = searchParams.get('rating')
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = {}

    if (toBusinessId) {
      where.toBusinessId = toBusinessId
    }
    if (fromBusinessId) {
      where.fromBusinessId = fromBusinessId
    }
    if (minRating) {
      where.rating = { gte: parseFloat(minRating) }
    }
    if (status) {
      where.status = status
    }

    const reviews = await db.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        fromBusiness: {
          select: { id: true, name: true, country: true },
        },
        toBusiness: {
          select: { id: true, name: true, country: true },
        },
      },
    })

    return NextResponse.json({ data: reviews })
  } catch (error) {
    console.error('Error listing reviews:', error)
    return NextResponse.json({ error: 'Failed to list reviews' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createReviewSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const { fromBusinessId, toBusinessId, rating, comment, escrowId, paymentRating, deliveryRating, qualityRating, communicationRating } = parsed.data

    if (fromBusinessId === toBusinessId) {
      return NextResponse.json(
        { error: 'Cannot review your own business' },
        { status: 400 }
      )
    }

    // Check both businesses exist
    const [fromBusiness, toBusiness] = await Promise.all([
      db.business.findUnique({ where: { id: fromBusinessId } }),
      db.business.findUnique({ where: { id: toBusinessId } }),
    ])

    if (!fromBusiness) {
      return NextResponse.json({ error: 'Reviewer business not found' }, { status: 404 })
    }
    if (!toBusiness) {
      return NextResponse.json({ error: 'Reviewed business not found' }, { status: 404 })
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
      include: {
        fromBusiness: {
          select: { id: true, name: true, country: true },
        },
        toBusiness: {
          select: { id: true, name: true, country: true },
        },
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
    const scoreImpact = (rating - 3) * 2 // Positive for ratings > 3, negative for < 3
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

    return NextResponse.json({ data: review }, { status: 201 })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
  }
}