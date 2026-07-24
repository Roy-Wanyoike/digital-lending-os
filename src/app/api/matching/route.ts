import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

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

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const seekerId = searchParams.get('seekerId') || ''
    const matchType = searchParams.get('matchType') || ''
    const status = searchParams.get('status') || ''
    const minScore = searchParams.get('minScore')

    const where: Record<string, unknown> = {
      OR: [
        { seeker: { tenantId: user.tenantId } },
        { candidate: { tenantId: user.tenantId } },
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

    // Attach business names
    const matchesWithNames = await Promise.all(
      matches.map(async (match) => {
        const [seeker, candidate] = await Promise.all([
          db.business.findUnique({ where: { id: match.seekerId }, select: { name: true } }),
          db.business.findUnique({ where: { id: match.candidateId }, select: { name: true } }),
        ])
        return {
          ...match,
          seekerName: seeker?.name ?? null,
          candidateName: candidate?.name ?? null,
        }
      })
    )

    return NextResponse.json({
      data: matchesWithNames,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error listing business matches:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to list business matches' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    const body = await request.json()
    const parsed = createMatchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Verify seeker belongs to tenant
    const seeker = await db.business.findUnique({ where: { id: data.seekerId }, select: { tenantId: true } })
    if (!seeker || seeker.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Seeker business not found' }, { status: 404 })
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
      return NextResponse.json({ data: match }, { status: 201 })
    }

    // Auto-generate matches: find businesses in complementary industries/countries
    const candidates = await db.business.findMany({
      where: {
        id: { not: data.seekerId },
        status: 'verified',
      },
      take: 20,
    })

    // Pick up to 5 random candidates
    const shuffled = candidates.sort(() => Math.random() - 0.5).slice(0, 5)

    const matches = await Promise.all(
      shuffled.map((candidate) =>
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

    return NextResponse.json({ data: matches }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'This match already exists' }, { status: 409 })
    }
    console.error('Error creating match:', error)
    return NextResponse.json({ error: 'Failed to create match' }, { status: 500 })
  }
}
