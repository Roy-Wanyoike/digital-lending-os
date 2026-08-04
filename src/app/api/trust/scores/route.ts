import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
const recalculateSchema = z.object({
  businessId: z.string().min(1, 'businessId is required'),
})

async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || ''
    const sortBy = searchParams.get('sortBy') || 'overallScore'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const where: Record<string, unknown> = { business: { tenantId: user.tenantId } }
    if (businessId) {
      where.businessId = businessId
    }

    const orderBy: Record<string, string> = {}
    if (['overallScore', 'paymentScore', 'deliveryScore', 'qualityScore', 'communicationScore', 'complianceScore'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc'
    } else {
      orderBy.overallScore = 'desc'
    }

    const scores = await db.trustScore.findMany({
      where,
      orderBy,
      include: {
        business: {
          select: { id: true, name: true, country: true, industry: true, status: true },
        },
      },
    })

    return NextResponse.json({ data: scores })
  } catch (error) {
    console.error('Error listing trust scores:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to list trust scores' }, { status: 500 })
  }
}

async function postHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const body = await request.json()
    const parsed = recalculateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const { businessId } = parsed.data

    // Verify business exists and belongs to tenant
    const business = await db.business.findUnique({ where: { id: businessId } })
    if (!business || business.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Find or create the trust score
    let trustScore = await db.trustScore.findUnique({
      where: { businessId },
    })

    if (!trustScore) {
      trustScore = await db.trustScore.create({
        data: { businessId },
      })
    }

    // Fetch all reviews for this business
    const reviews = await db.review.findMany({
      where: { toBusinessId: businessId, status: 'published' },
    })

    // Fetch all reputation events
    const events = await db.reputationEvent.findMany({
      where: { trustScoreId: trustScore.id },
    })

    // Calculate scores based on reviews and events
    let paymentScore = 50.0
    let deliveryScore = 50.0
    let qualityScore = 50.0
    let communicationScore = 50.0

    if (reviews.length > 0) {
      const ratingsWithPayment = reviews.filter((r: any) => r.paymentRating !== null)
      const ratingsWithDelivery = reviews.filter((r: any) => r.deliveryRating !== null)
      const ratingsWithQuality = reviews.filter((r: any) => r.qualityRating !== null)
      const ratingsWithComm = reviews.filter((r: any) => r.communicationRating !== null)

      if (ratingsWithPayment.length > 0) {
        const sum = ratingsWithPayment.reduce((acc: any, r: any) => acc + (r.paymentRating || 0), 0)
        paymentScore = (sum / ratingsWithPayment.length) * 20
      }

      if (ratingsWithDelivery.length > 0) {
        const sum = ratingsWithDelivery.reduce((acc: any, r: any) => acc + (r.deliveryRating || 0), 0)
        deliveryScore = (sum / ratingsWithDelivery.length) * 20
      }

      if (ratingsWithQuality.length > 0) {
        const sum = ratingsWithQuality.reduce((acc: any, r: any) => acc + (r.qualityRating || 0), 0)
        qualityScore = (sum / ratingsWithQuality.length) * 20
      }

      if (ratingsWithComm.length > 0) {
        const sum = ratingsWithComm.reduce((acc: any, r: any) => acc + (r.communicationRating || 0), 0)
        communicationScore = (sum / ratingsWithComm.length) * 20
      }

      if (ratingsWithPayment.length === 0 && ratingsWithDelivery.length === 0) {
        const avgRating = reviews.reduce((acc: any, r: any) => acc + r.rating, 0) / reviews.length
        paymentScore = avgRating * 20
        deliveryScore = avgRating * 20
        qualityScore = avgRating * 20
        communicationScore = avgRating * 20
      }
    }

    let eventImpact = 0
    for (const event of events) {
      eventImpact += event.scoreImpact
    }

    const clamp = (v: number) => Math.max(0, Math.min(100, v))
    paymentScore = clamp(paymentScore + eventImpact)
    deliveryScore = clamp(deliveryScore + eventImpact)
    qualityScore = clamp(qualityScore + eventImpact)
    communicationScore = clamp(communicationScore + eventImpact)

    const verifications = await db.verification.findMany({
      where: { businessId },
    })
    const approvedVerifications = verifications.filter((v: any) => v.status === 'approved').length
    const complianceScore = clamp(
      verifications.length > 0 ? (approvedVerifications / verifications.length) * 100 : 50
    )

    const overallScore = clamp(
      paymentScore * 0.25 +
      deliveryScore * 0.2 +
      qualityScore * 0.25 +
      communicationScore * 0.15 +
      complianceScore * 0.15
    )

    const updated = await db.trustScore.update({
      where: { id: trustScore.id },
      data: {
        overallScore,
        paymentScore,
        deliveryScore,
        qualityScore,
        communicationScore,
        complianceScore,
        totalReviews: reviews.length,
        totalTransactions: events.filter((e: any) => e.eventType === 'transaction_completed').length,
        scoreVersion: { increment: 1 },
        lastCalculated: new Date(),
      },
      include: {
        business: {
          select: { id: true, name: true, country: true, industry: true },
        },
      },
    })

    await db.reputationEvent.create({
      data: {
        trustScoreId: trustScore.id,
        eventType: 'verification_upgraded',
        scoreImpact: overallScore - trustScore.overallScore,
        description: `Trust score recalculated (v${updated.scoreVersion})`,
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Error recalculating trust score:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to recalculate trust score' }, { status: 500 })
  }
}

export const GET = withApiTelemetry(getHandler, '/api/trust/scores');

export const POST = withApiTelemetry(postHandler, '/api/trust/scores');
