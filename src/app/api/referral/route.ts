import { NextRequest } from 'next/server';import { getRequestBaseUrl } from '@/lib/utils'
import { db } from '@/lib/db'
import { getApiUser, requireAuth, AuthError,  } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { badRequest, conflict, created, error, notFound, ok, unauthorized, withErrorHandler } from '@/backend/lib/api-response';

const BONUS_RATE = 0.05       // 5% of referee's first deposit
const BONUS_CAP = 100.00      // Maximum bonus amount in USD
const BONUS_CURRENCY = 'USD'

// Generate a short, unique referral code
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'YS'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/** Generate a unique bonus reference */
function generateBonusRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let ref = 'BNS'
  for (let i = 0; i < 9; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return ref
}

// GET /api/referral — Get current user's referral info
// Returns: referral code, referral link, stats (total referred, total bonuses earned, recent referrals)
async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return unauthorized('Authentication required')

    // Get the account
    const account = await db.account.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        referralCode: true,
        referredBy: true,
        name: true,
        email: true,
        tenantId: true,
      },
    })

    if (!account) return notFound('Account not found')

    // Ensure the account has a referral code
    let referralCode = account.referralCode
    if (!referralCode) {
      // Generate and assign a referral code
      let code: string
      let unique = false
      while (!unique) {
        code = generateReferralCode()
        const existing = await db.account.findUnique({ where: { referralCode: code } })
        if (!existing) {
          unique = true
          referralCode = code
        }
      }
      await db.account.update({
        where: { id: user.id },
        data: { referralCode },
      })
    }

    // Count stats (scoped to same tenant)
    const totalReferred = await db.account.count({
      where: { referredBy: user.id, tenantId: user.tenantId },
    })

    // Get bonuses earned by this user (as referrer)
    const bonuses = await db.referralBonus.findMany({
      where: { referrerId: user.id },
      orderBy: { creditedAt: 'desc' },
      take: 50,
    })

    const totalBonusEarned = bonuses.reduce((sum: number, b: any) => sum + Number(b.bonusAmount), 0)
    const activeBonusCount = bonuses.filter((b: any) => b.status === 'credited').length

    // Get recent referrals (accounts that used this user's code, same tenant)
    const recentReferrals = await db.account.findMany({
      where: { referredBy: user.id, tenantId: user.tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Check if the current user was referred by someone
    let referrerInfo: { name: string; email: string; referralCode: string } | null = null
    if (account.referredBy) {
      const referrer = await db.account.findUnique({
        where: { id: account.referredBy },
        select: { name: true, email: true, referralCode: true },
      })
      if (referrer) {
        referrerInfo = {
          name: referrer.name,
          email: referrer.email,
          referralCode: referrer.referralCode || 'N/A',
        }
      }
    }

    // Build the referral link URL
    const baseUrl = getRequestBaseUrl(request, process.env.NEXT_PUBLIC_APP_URL || '')
    const referralLink = `${baseUrl}/register?ref=${referralCode}`

    return ok({
      referralCode,
      referralLink,
      bonusRate: BONUS_RATE,
      bonusCap: BONUS_CAP,
      bonusCurrency: BONUS_CURRENCY,
      stats: {
        totalReferred,
        totalBonusEarned: Math.round(totalBonusEarned * 100) / 100,
        activeBonusCount,
      },
      recentReferrals,
      recentBonuses: bonuses,
      referrerInfo,
    })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return unauthorized(error.message)
    }
    console.error('Referral GET error:', error)
    return error('Failed to fetch referral info')
  }
}

// POST /api/referral — Redeem a referral code
// Body: { code: string } or { referralCode: string }
// Sets referredBy on the account and creates a pending ReferralBonus
async function postHandler(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const body = await request.json()
    const code = body.code || body.referralCode

    if (!code) {
      return badRequest('Referral code is required')
    }

    const normalizedCode = code.trim().toUpperCase()

    // 1. Validate the referral code exists and belongs to an active tenant
    const referrer = await db.account.findUnique({
      where: { referralCode: normalizedCode },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        tenantId: true,
      },
    })

    if (!referrer) {
      return notFound('Invalid referral code')
    }

    if (!referrer.isActive) {
      return error('This referral code is no longer active', 410, 'GONE')
    }

    // 2. Check the user hasn't already used a referral
    const currentUser = await db.account.findUnique({
      where: { id: user.id },
      select: { id: true, referredBy: true, tenantId: true },
    })

    if (!currentUser) {
      return notFound('Account not found')
    }

    if (currentUser.referredBy) {
      return conflict('You have already used a referral code')
    }

    // 3. Prevent self-referral
    if (referrer.id === user.id) {
      return badRequest('You cannot use your own referral code')
    }

    // 4. Create the referral link (set referredBy) and a pending bonus in a transaction
    const result = await db.$transaction(async (tx: any) => {
      // Set the referredBy on the current user's account
      const updatedAccount = await tx.account.update({
        where: { id: user.id },
        data: { referredBy: referrer.id },
        select: { id: true, referredBy: true },
      })

      // Try to find the referee's wallet (via their business)
      let walletId = 'pending'
      if (currentUser.tenantId) {
        const wallet = await tx.wallet.findFirst({
          where: {
            business: {
              tenantId: currentUser.tenantId,
            },
          },
          select: { id: true },
        })
        if (wallet) {
          walletId = wallet.id
        }
      }

      // Create a pending ReferralBonus
      // Amount will be calculated (5% of first deposit, capped at $100) when the deposit is completed
      const bonusRef = generateBonusRef()
      // Ensure uniqueness
      let uniqueBonusRef = bonusRef
      let bonusUnique = false
      while (!bonusUnique) {
        const existingBonus = await tx.referralBonus.findUnique({ where: { bonusRef: uniqueBonusRef } })
        if (!existingBonus) {
          bonusUnique = true
        } else {
          uniqueBonusRef = generateBonusRef()
        }
      }

      const bonus = await tx.referralBonus.create({
        data: {
          bonusRef: uniqueBonusRef,
          referrerId: referrer.id,
          refereeId: user.id,
          depositId: 'pending',
          walletId,
          bonusAmount: 0,
          bonusCurrency: BONUS_CURRENCY,
          status: 'pending',
        },
      })

      return { account: updatedAccount, bonus }
    })

    return created({
      redeemed: true,
      referralCode: normalizedCode,
      referrer: {
        id: referrer.id,
        name: referrer.name,
      },
      bonus: {
        id: result.bonus.id,
        bonusRef: result.bonus.bonusRef,
        status: 'pending',
        amount: 0,
        currency: BONUS_CURRENCY,
        condition: `You will receive ${BONUS_RATE * 100}% of your first deposit as a bonus, capped at $${BONUS_CAP.toFixed(2)}.`,
      },
    })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return unauthorized(error.message)
    }
    // Handle Prisma unique constraint violations (race condition on referredBy)
    if (error?.code === 'P2002') {
      return conflict('You have already used a referral code')
    }
    console.error('Referral POST error:', error)
    return error('Failed to redeem referral code')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/referral');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/referral');
