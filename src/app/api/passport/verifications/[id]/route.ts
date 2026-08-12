import { NextRequest } from 'next/server';import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { badRequest, error, notFound, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response';
const updateVerificationSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'approved', 'rejected', 'expired'] as const, {
    message: 'Status must be one of: pending, in_progress, approved, rejected, expired',
  }),
  verifiedBy: z.string().optional(),
  rejectionReason: z.string().optional(),
})

async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request)
    if (!user) return unauthorized('Authentication required')
    const { id } = await params
    const verification = await db.verification.findUnique({
      where: { id },
      include: {
        business: {
          select: { id: true, name: true, country: true, status: true, industry: true, tenantId: true },
        },
      },
    })

    if (!verification) {
      return notFound('Verification not found')
    }
    if (verification.business.tenantId !== user.tenantId) {
      return notFound('Verification not found')
    }

    return ok(verification)
  } catch (error: any) {
    console.error('Error fetching verification:', error)
    return error('Failed to fetch verification')
  }
}

async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const body = await request.json()
    const parsed = updateVerificationSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error.issues.map(i => i.message).join(', '))
    }

    const { status, verifiedBy, rejectionReason } = parsed.data

    const verification = await db.verification.findUnique({
      where: { id },
      include: {
        business: {
          include: { passport: true },
        },
      },
    })

    if (!verification) {
      return notFound('Verification not found')
    }
    if (verification.business.tenantId !== user.tenantId) {
      return notFound('Verification not found')
    }

    // If rejected, require a reason
    if (status === 'rejected' && !rejectionReason) {
      return badRequest('Rejection reason is required when rejecting a verification')
    }

    const updateData: Record<string, unknown> = {
      status,
      verifiedBy,
      rejectionReason,
    }

    if (status === 'approved') {
      updateData.verifiedAt = new Date()
    }

    // Update the verification
    const updated = await db.verification.update({
      where: { id },
      data: updateData,
      include: {
        business: {
          select: { id: true, name: true, country: true, status: true },
        },
      },
    })

    // Update CommercePassport if this is a key verification
    const passport = verification.business.passport
    if (passport) {
      const passportUpdate: Record<string, unknown> = {}

      if (
        (verification.type === 'identity' || verification.type === 'business_registration') &&
        status === 'approved'
      ) {
        const relatedVerifications = await db.verification.findMany({
          where: {
            businessId: verification.businessId,
            type: { in: ['identity', 'business_registration'] },
          },
        })

        const allApproved = relatedVerifications.every((v: any) => v.status === 'approved')
        if (allApproved) {
          passportUpdate.kycStatus = 'verified'
          passportUpdate.lastAuditAt = new Date()
        }
      }

      if (
        (verification.type === 'identity' || verification.type === 'business_registration') &&
        status === 'rejected'
      ) {
        passportUpdate.kycStatus = 'rejected'
      }

      if (verification.type === 'bank_account' && status === 'approved') {
        passportUpdate.amlStatus = 'cleared'
        passportUpdate.lastAuditAt = new Date()
      }

      if (verification.type === 'bank_account' && status === 'rejected') {
        passportUpdate.amlStatus = 'rejected'
      }

      if (Object.keys(passportUpdate).length > 0) {
        const allVerifications = await db.verification.findMany({
          where: { businessId: verification.businessId },
        })

        const approvedTypes = new Set(
          allVerifications
            .filter((v: any) => v.status === 'approved')
            .map((v: any) => v.type)
        )

        let credentialLevel = 'basic'
        if (approvedTypes.has('identity') && approvedTypes.has('business_registration')) {
          credentialLevel = 'standard'
        }
        if (
          approvedTypes.has('identity') &&
          approvedTypes.has('business_registration') &&
          approvedTypes.has('tax')
        ) {
          credentialLevel = 'enhanced'
        }
        if (
          approvedTypes.has('identity') &&
          approvedTypes.has('business_registration') &&
          approvedTypes.has('tax') &&
          approvedTypes.has('bank_account') &&
          approvedTypes.has('address')
        ) {
          credentialLevel = 'premium'
        }

        passportUpdate.credentialLevel = credentialLevel

        await db.commercePassport.update({
          where: { id: passport.id },
          data: passportUpdate,
        })
      }
    }

    return ok(updated)
  } catch (error: any) {
    console.error('Error updating verification:', error)
    return error('Failed to update verification')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/passport/verifications/[id]');

export const PUT = withApiTelemetry(withErrorHandler(putHandler), '/api/passport/verifications/[id]');
