import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getApiUser, AuthError, successResponse, errorResponse } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
// GET /api/referral/bonuses — List referral bonuses for the current user
async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return errorResponse('Authentication required', 401)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
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
    if (status) {
      ;(where as any).status = status
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

    // Enrich with referrer/referee names
    const accountIds = new Set<string>()
    bonuses.forEach((b: any) => {
      accountIds.add(b.referrerId)
      accountIds.add(b.refereeId)
    })

    const accounts = await db.account.findMany({
      where: { id: { in: Array.from(accountIds) } },
      select: { id: true, name: true, email: true },
    })
    const accountMap = new Map<string, { id: string; name: string | null; email: string | null }>(accounts.map((a: any) => [a.id, a]))

    const enriched = bonuses.map((b: any) => ({
      ...b,
      referrerName: accountMap.get(b.referrerId)?.name || 'Unknown',
      refereeName: accountMap.get(b.refereeId)?.name || 'Unknown',
    }))

    return successResponse({
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Referral bonuses GET error:', error)
    return errorResponse('Failed to fetch referral bonuses', 500)
  }
}

export const GET = withApiTelemetry(getHandler, '/api/referral/bonuses');
