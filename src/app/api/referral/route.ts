import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getApiUser, AuthError, successResponse, errorResponse } from '@/lib/auth/api-helpers'
import { randomUUID } from 'crypto'

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
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return errorResponse('Authentication required', 401)

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

    if (!account) return errorResponse('Account not found', 404)

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

    // Count stats
    const totalReferred = await db.account.count({
      where: { referredBy: user.id },
    })

    // Get bonuses earned by this user (as referrer)
    const bonuses = await db.referralBonus.findMany({
      where: { referrerId: user.id },
      orderBy: { creditedAt: 'desc' },
      take: 50,
    })

    const totalBonusEarned = bonuses.reduce((sum, b) => sum + b.bonusAmount, 0)
    const activeBonusCount = bonuses.filter(b => b.status === 'credited').length

    // Get recent referrals (accounts that used this user's code)
    const recentReferrals = await db.account.findMany({
      where: { referredBy: user.id },
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const referralLink = `${baseUrl}/register?ref=${referralCode}`

    return successResponse({
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
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Referral GET error:', error)
    return errorResponse('Failed to fetch referral info', 500)
  }
}

// POST /api/referral — Resolve a referral code (used during registration)
// Body: { referralCode: string }
// Returns: referrer info if code is valid
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { referralCode } = body

    if (!referralCode) {
      return errorResponse('Referral code is required', 400)
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
      return errorResponse('Invalid referral code', 404)
    }

    if (!referrer.isActive) {
      return errorResponse('This referral code is no longer active', 410)
    }

    return successResponse({
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
  } catch (error) {
    console.error('Referral POST error:', error)
    return errorResponse('Failed to validate referral code', 500)
  }
}
