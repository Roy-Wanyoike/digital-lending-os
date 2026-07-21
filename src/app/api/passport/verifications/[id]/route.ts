import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const updateVerificationSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'approved', 'rejected', 'expired'], {
    errorMap: () => ({ message: 'Status must be one of: pending, in_progress, approved, rejected, expired' }),
  }),
  verifiedBy: z.string().optional(),
  rejectionReason: z.string().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const verification = await db.verification.findUnique({
      where: { id },
      include: {
        business: {
          select: { id: true, name: true, country: true, status: true, industry: true },
        },
      },
    })

    if (!verification) {
      return NextResponse.json({ error: 'Verification not found' }, { status: 404 })
    }

    return NextResponse.json({ data: verification })
  } catch (error) {
    console.error('Error fetching verification:', error)
    return NextResponse.json({ error: 'Failed to fetch verification' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

      // Identity or business_registration verification approved → update KYC
      if (
        (verification.type === 'identity' || verification.type === 'business_registration') &&
        status === 'approved'
      ) {
        // Check if all identity/business_registration verifications for this business are approved
        const relatedVerifications = await db.verification.findMany({
          where: {
            businessId: verification.businessId,
            type: { in: ['identity', 'business_registration'] },
          },
        })

        const allApproved = relatedVerifications.every((v) => v.status === 'approved')
        if (allApproved) {
          passportUpdate.kycStatus = 'verified'
          passportUpdate.kycVerifiedAt = new Date()
        }
      }

      if (
        (verification.type === 'identity' || verification.type === 'business_registration') &&
        status === 'rejected'
      ) {
        passportUpdate.kycStatus = 'rejected'
      }

      // Bank account verification approved → update AML
      if (verification.type === 'bank_account' && status === 'approved') {
        passportUpdate.amlStatus = 'cleared'
        passportUpdate.amlCheckedAt = new Date()
      }

      if (verification.type === 'bank_account' && status === 'rejected') {
        passportUpdate.amlStatus = 'rejected'
      }

      // Update credential level based on verification status
      if (Object.keys(passportUpdate).length > 0) {
        // Determine credential level based on all verifications
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
    return NextResponse.json({ error: 'Failed to update verification' }, { status: 500 })
  }
}