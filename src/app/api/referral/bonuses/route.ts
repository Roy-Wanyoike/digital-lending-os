import { NextRequest } from 'next/server';import { db } from '@/lib/db'
import { getApiUser, AuthError,  } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { error, ok, unauthorized, withErrorHandler } from '@/backend/lib/api-response';

// GET /api/referral/bonuses — List referral bonuses for the current user
async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return unauthorized('Authentication required')

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const role = searchParams.get('role') || ''  // 'referrer' or 'referee'
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const offset = (page - 1) * limit

    // Build where clause: show bonuses where user is referrer OR referee
    const where: Record<string, unknown> = {
      OR: [
        { referrerId: user.id },
        { refereeId: user.id },
      ],
    }

    // Filter by status if provided
    if (status) {
      // When status filter is applied, nest it inside the OR conditions
      const statusFilter = { status }
      where.OR = [
        { referrerId: user.id, ...statusFilter },
        { refereeId: user.id, ...statusFilter },
      ]
    }

    // Filter by role if provided
    if (role === 'referrer') {
      delete (where as any).OR
      where.referrerId = user.id
      if (status) where.status = status
    } else if (role === 'referee') {
      delete (where as any).OR
      where.refereeId = user.id
      if (status) where.status = status
    }

    const [bonuses, total] = await Promise.all([
      db.referralBonus.findMany({
        where,
        orderBy: { creditedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.referralBonus.count({ where }),
    ])

    // Collect all unique account IDs for batch lookup
    const accountIds = new Set<string>()
    bonuses.forEach((b: any) => {
      accountIds.add(b.referrerId)
      accountIds.add(b.refereeId)
    })

    // Batch-fetch accounts with their referral codes
    const accounts = await db.account.findMany({
      where: { id: { in: Array.from(accountIds) } },
      select: { id: true, name: true, email: true, referralCode: true },
    })
    const accountMap = new Map<string, { id: string; name: string | null; email: string | null; referralCode: string | null }>(
      accounts.map((a: any) => [a.id, a]),
    )

    // Enrich each bonus with names, referral code, and user's perspective
    const enriched = bonuses.map((b: any) => {
      const referrer = accountMap.get(b.referrerId)
      const referee = accountMap.get(b.refereeId)
      const isReferrer = b.referrerId === user.id

      return {
        id: b.id,
        bonusRef: b.bonusRef,
        bonusAmount: Number(b.bonusAmount),
        bonusCurrency: b.bonusCurrency,
        status: b.status,
        creditedAt: b.creditedAt,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        // The referral code that was used (the referrer's code)
        referralCode: referrer?.referralCode || 'N/A',
        // Relationship info
        referrer: {
          id: b.referrerId,
          name: referrer?.name || 'Unknown',
          email: referrer?.email || 'Unknown',
        },
        referee: {
          id: b.refereeId,
          name: referee?.name || 'Unknown',
          email: referee?.email || 'Unknown',
        },
        // User's perspective
        perspective: isReferrer ? 'referrer' : 'referee',
        depositId: b.depositId,
        walletId: b.walletId,
      }
    })

    return ok({
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return unauthorized(error.message)
    }
    console.error('Referral bonuses GET error:', error)
    return error('Failed to fetch referral bonuses')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/referral/bonuses');
