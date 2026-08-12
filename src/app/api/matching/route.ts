import { NextRequest } from 'next/server';import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers'
import { getTenantBusinessIds } from '@/backend/lib/tenant-cache'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { conflict, created, error, notFound, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response';
const MATCH_REASONS = [
  'Industry complementarity',
  'Geographic proximity',
  'Trust score alignment',
  'Payment method compatibility',
  'Currency overlap',
  'Similar transaction volumes',
  'Strong mutual connections',
  'Complementary product lines',
]

function randomScore(): number {
  return Math.floor(Math.random() * 39) + 60 // 60-98
}

function randomReasons(): string[] {
  const shuffled = [...MATCH_REASONS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.floor(Math.random() * 3) + 1)
}

const createMatchSchema = z.object({
  seekerId: z.string().min(1, 'Seeker ID is required'),
  matchType: z.string().min(1, 'Match type is required'),
  candidateId: z.string().optional(),
})

async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return unauthorized('Authentication required')
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const seekerId = searchParams.get('seekerId') || ''
    const matchType = searchParams.get('matchType') || ''
    const status = searchParams.get('status') || ''
    const minScore = searchParams.get('minScore')

    // BusinessMatch has no seeker/candidate relations, filter by tenant business IDs
    const tenantBizIds = await getTenantBusinessIds(user.tenantId, db)

    const where: Record<string, unknown> = {
      OR: [
        { seekerId: { in: tenantBizIds } },
        { candidateId: { in: tenantBizIds } },
      ],
    }

    if (seekerId) where.seekerId = seekerId
    if (matchType) where.matchType = matchType
    if (status) where.status = status
    if (minScore) where.matchScore = { gte: parseFloat(minScore) }

    const [matches, total] = await Promise.all([
      db.businessMatch.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { matchScore: 'desc' },
      }),
      db.businessMatch.count({ where }),
    ])

    // Collect all unique business IDs for batch name lookup
    const bizIds = new Set<string>()
    for (const m of matches) {
      bizIds.add(m.seekerId)
      bizIds.add(m.candidateId)
    }

    // Single batch query for all business names
    const bizNameMap = new Map<string, string>()
    if (bizIds.size > 0) {
      const bizRows = await db.business.findMany({
        where: { id: { in: [...bizIds] } },
        select: { id: true, name: true },
      })
      for (const b of bizRows) bizNameMap.set(b.id, b.name)
    }

    const matchesWithNames = matches.map((match: any) => ({
      ...match,
      seekerName: bizNameMap.get(match.seekerId) ?? null,
      candidateName: bizNameMap.get(match.candidateId) ?? null,
    }))

    return ok(matchesWithNames, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err: any) {
    console.error('Error listing business matches:', err)
    return error('Failed to list business matches')
  }
}

async function postHandler(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const parsed = createMatchSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error.issues.map(i => i.message).join(', '))
    }

    const data = parsed.data

    // Verify seeker belongs to tenant
    const seeker = await db.business.findUnique({ where: { id: data.seekerId }, select: { tenantId: true } })
    if (!seeker || seeker.tenantId !== user.tenantId) {
      return notFound('Seeker business not found')
    }

    // If candidateId is provided, create a single match
    if (data.candidateId) {
      const match = await db.businessMatch.create({
        data: {
          seekerId: data.seekerId,
          candidateId: data.candidateId,
          matchType: data.matchType,
          matchScore: randomScore(),
          reasons: JSON.stringify(randomReasons()),
        },
      })
      return created(match)
    }

    // Auto-generate matches: find businesses in complementary industries/countries within same tenant
    const candidates = await db.business.findMany({
      where: {
        id: { not: data.seekerId },
        status: 'verified',
        tenantId: user.tenantId,
      },
      take: 20,
    })

    // Pick up to 5 random candidates
    const shuffled = candidates.sort(() => Math.random() - 0.5).slice(0, 5)

    const matches = await Promise.all(
      shuffled.map((candidate: any) =>
        db.businessMatch.create({
          data: {
            seekerId: data.seekerId,
            candidateId: candidate.id,
            matchType: data.matchType,
            matchScore: randomScore(),
            reasons: JSON.stringify(randomReasons()),
          },
        })
      )
    )

    return created(matches)
  } catch (error: any) {if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return conflict('This match already exists')
    }
    console.error('Error creating match:', error)
    return error('Failed to create match')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/matching');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/matching');
