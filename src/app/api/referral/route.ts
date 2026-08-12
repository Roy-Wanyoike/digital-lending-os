import { NextRequest } from 'next/server';import { getRequestBaseUrl } from '@/lib/utils'
import { db } from '@/lib/db'
import { getApiUser, requireAuth, AuthError,  } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { badRequest, error, notFound, ok, unauthorized, withErrorHandler } from '@/backend/lib/api-response';
const BONUS_AMOUNT = 100.00
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

    const totalBonusEarned = bonuses.reduce((sum: any, b: any) => sum + b.bonusAmount, 0)
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
    let referrerInfo: { name: string; email: string } | null = null
    if (account.referredBy) {
      const referrer = await db.account.findUnique({
        where: { id: account.referredBy },
        select: { name: true, email: true },
      })
      if (referrer) {
        referrerInfo = { name: referrer.name, email: referrer.email }
      }
    }

    // Build the referral link URL
    const baseUrl = getRequestBaseUrl(request, process.env.NEXT_PUBLIC_APP_URL || '')
    const referralLink = `${baseUrl}/register?ref=${referralCode}`

    return ok({
      referralCode,
      referralLink,
      bonusAmount: BONUS_AMOUNT,
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
      }
    console.error('Referral GET error:', error)
    return error('Failed to fetch referral info')
  }
}

// POST /api/referral — Resolve a referral code (used during registration)
// Body: { referralCode: string }
// Returns: referrer info if code is valid
async function postHandler(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const body = await request.json()
    const { referralCode } = body

    if (!referralCode) {
      return badRequest('Referral code is required')
    }

    const referrer = await db.account.findUnique({
      where: { referralCode: referralCode.toUpperCase() },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    })

    if (!referrer) {
      return notFound('Invalid referral code')
    }

    if (!referrer.isActive) {
    return error('This referral code is no longer active', 410, 'GONE')
    }

    return ok({
      valid: true,
      referrer: {
        id: referrer.id,
        name: referrer.name,
      },
      bonus: {
        amount: BONUS_AMOUNT,
        currency: BONUS_CURRENCY,
        condition: 'You will receive $100 credited to your wallet when you make your first deposit.',
      },
    })
  } catch (error: any) {
    if (error instanceof AuthError) {
      }
    console.error('Referral POST error:', error)
    return error('Failed to validate referral code')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/referral');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/referral');
