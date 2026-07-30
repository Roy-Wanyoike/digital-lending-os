import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
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
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
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
      return NextResponse.json({ error: 'Verification not found' }, { status: 404 })
    }
    if (verification.business.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Verification not found' }, { status: 404 })
    }

    return NextResponse.json({ data: verification })
  } catch (error) {
    console.error('Error fetching verification:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to fetch verification' }, { status: 500 })
  }
}

async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { id } = await params
    const body = await request.json()
    const parsed = updateVerificationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
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
      return NextResponse.json({ error: 'Verification not found' }, { status: 404 })
    }
    if (verification.business.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Verification not found' }, { status: 404 })
    }

    // If rejected, require a reason
    if (status === 'rejected' && !rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required when rejecting a verification' },
        { status: 400 }
      )
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

        const allApproved = relatedVerifications.every((v) => v.status === 'approved')
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
            .filter((v) => v.status === 'approved')
            .map((v) => v.type)
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

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Error updating verification:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to update verification' }, { status: 500 })
  }
}

export const GET = withApiTelemetry(getHandler, '/api/passport/verifications/[id]');

export const PUT = withApiTelemetry(putHandler, '/api/passport/verifications/[id]');
