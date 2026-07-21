import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const createVerificationSchema = z.object({
  businessId: z.string().min(1, 'businessId is required'),
  type: z.enum(['identity', 'business_registration', 'tax', 'bank_account', 'address'], {
    errorMap: () => ({ message: 'Type must be one of: identity, business_registration, tax, bank_account, address' }),
  }),
  method: z.enum(['document', 'api', 'manual', 'third_party'], {
    errorMap: () => ({ message: 'Method must be one of: document, api, manual, third_party' }),
  }),
  metadata: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || ''

    const where: Record<string, unknown> = {}
    if (businessId) {
      where.businessId = businessId
    }

    const verifications = await db.verification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          select: { id: true, name: true, country: true, status: true },
        },
      },
    })

    return NextResponse.json({ data: verifications })
  } catch (error) {
    console.error('Error listing verifications:', error)
    return NextResponse.json({ error: 'Failed to list verifications' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createVerificationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const { businessId, type, method, metadata } = parsed.data

    // Check business exists
    const business = await db.business.findUnique({
      where: { id: businessId },
      include: { passport: true },
    })

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Update passport status if applicable
    if (type === 'identity' || type === 'business_registration') {
      if (business.passport) {
        await db.commercePassport.update({
          where: { id: business.passport.id },
          data: { kycStatus: 'in_progress' },
        })
      }
    }
    if (type === 'bank_account') {
      if (business.passport) {
        await db.commercePassport.update({
          where: { id: business.passport.id },
          data: { amlStatus: 'in_progress' },
        })
      }
    }

    const verification = await db.verification.create({
      data: {
        businessId,
        type,
        method,
        metadata,
      },
      include: {
        business: {
          select: { id: true, name: true, country: true, status: true },
        },
      },
    })

    return NextResponse.json({ data: verification }, { status: 201 })
  } catch (error) {
    console.error('Error creating verification:', error)
    return NextResponse.json({ error: 'Failed to create verification' }, { status: 500 })
  }
}