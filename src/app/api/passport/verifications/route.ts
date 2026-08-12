import { NextRequest } from 'next/server';import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { created, error, notFound, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response';
const createVerificationSchema = z.object({
  businessId: z.string().min(1, 'businessId is required'),
  type: z.enum(['identity', 'business_registration', 'tax', 'bank_account', 'address'] as const, {
    message: 'Type must be one of: identity, business_registration, tax, bank_account, address',
  }),
  method: z.enum(['document', 'api', 'manual', 'third_party'] as const, {
    message: 'Method must be one of: document, api, manual, third_party',
  }),
  metadata: z.string().optional(),
})

async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return unauthorized('Authentication required')
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    const where: Record<string, unknown> = { business: { tenantId: user.tenantId } }
    if (businessId) {
      where.businessId = businessId
    }

    const [verifications, total] = await Promise.all([
      db.verification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          business: {
            select: { id: true, name: true, country: true, status: true },
          },
        },
      }),
      db.verification.count({ where }),
    ])

    return ok(verifications, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err: any) {
    console.error('Error listing verifications:', err)
    return error('Failed to list verifications')
  }
}

async function postHandler(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const parsed = createVerificationSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error.issues.map(i => i.message).join(', '))
    }

    const { businessId, type, method, metadata } = parsed.data

    // Check business exists and belongs to tenant
    const business = await db.business.findUnique({
      where: { id: businessId },
      include: { passport: true },
    })

    if (!business || business.tenantId !== user.tenantId) {
      return notFound('Business not found')
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

    return created(verification)
  } catch (error: any) {
    console.error('Error creating verification:', error)
    return error('Failed to create verification')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/passport/verifications');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/passport/verifications');
