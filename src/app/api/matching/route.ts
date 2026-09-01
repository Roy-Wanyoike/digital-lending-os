import { NextRequest } from 'next/server';import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers'
import { getTenantBusinessIds } from '@/backend/lib/tenant-cache'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { conflict, created, error, notFound, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response';
import { publishEvent } from '@/backend/lib/event-publisher';
import { TOPICS } from '@/backend/lib/kafka/topics';

// ─── Compatibility Types ──────────────────────────────────────────────

interface BusinessProfile {
  id: string
  country: string
  city: string | null
  industry: string | null
  annualRevenue: number | null
  employeeCount: number | null
  trustScore: { overallScore: number } | null
}

interface CompatibilityResult {
  score: number
  reasons: string[]
  breakdown: {
    industryAlignment: number
    geographicProximity: number
    trustScoreDifferential: number
    transactionHistory: number
    sizeCompatibility: number
  }
}

// ─── Industry Relatedness Map ─────────────────────────────────────────
// Industries that are considered "related" (complementary supply chains)

const RELATED_INDUSTRY_GROUPS: Record<string, string[]> = {
  manufacturing: ['logistics', 'wholesale', 'raw_materials', 'packaging'],
  retail: ['wholesale', 'logistics', 'ecommerce', 'manufacturing'],
  agriculture: ['food_processing', 'logistics', 'manufacturing', 'wholesale'],
  technology: ['consulting', 'telecommunications', 'electronics', 'software'],
  construction: ['manufacturing', 'logistics', 'raw_materials', 'engineering'],
  healthcare: ['pharmaceuticals', 'logistics', 'manufacturing', 'biotechnology'],
  automotive: ['manufacturing', 'logistics', 'electronics', 'raw_materials'],
  food_processing: ['agriculture', 'packaging', 'logistics', 'retail'],
  textiles: ['manufacturing', 'retail', 'logistics', 'agriculture'],
  electronics: ['technology', 'manufacturing', 'logistics', 'automotive'],
  logistics: ['manufacturing', 'retail', 'agriculture', 'ecommerce', 'wholesale'],
  wholesale: ['retail', 'manufacturing', 'logistics', 'import_export'],
  ecommerce: ['retail', 'logistics', 'technology', 'payment_processing'],
  financial_services: ['insurance', 'fintech', 'consulting', 'real_estate'],
  energy: ['manufacturing', 'construction', 'logistics', 'engineering'],
  mining: ['manufacturing', 'energy', 'logistics', 'construction'],
  pharmaceuticals: ['healthcare', 'logistics', 'biotechnology', 'manufacturing'],
  consulting: ['technology', 'financial_services', 'healthcare', 'education'],
  education: ['technology', 'consulting', 'publishing'],
  real_estate: ['construction', 'financial_services', 'logistics'],
  telecommunications: ['technology', 'electronics', 'consulting'],
  tourism: ['hospitality', 'transportation', 'retail'],
  hospitality: ['tourism', 'food_processing', 'retail'],
}

/**
 * Check if two industries are related (complementary).
 * Related industries share supply chain or customer overlap.
 */
function areIndustriesRelated(a: string, b: string): boolean {
  const aNorm = a.toLowerCase().replace(/[^a-z0-9]/g, '_')
  const bNorm = b.toLowerCase().replace(/[^a-z0-9]/g, '_')

  if (aNorm === bNorm) return false // same industry, not "related"

  const group = RELATED_INDUSTRY_GROUPS[aNorm]
  if (!group) return false
  return group.includes(bNorm)
}

/**
 * Determine geographic relationship between two businesses.
 */
function getGeographicRelation(
  countryA: string,
  cityA: string | null,
  countryB: string,
  cityB: string | null,
): 'same_country' | 'same_region' | 'different' {
  if (countryA === countryB) {
    if (cityA && cityB && cityA.toLowerCase() === cityB.toLowerCase()) {
      return 'same_country' // same city is a subset of same country
    }
    return 'same_country'
  }
  return 'different'
}

/**
 * Classify a trust score into a bucket.
 */
function trustBucket(score: number): 'high' | 'medium' | 'low' {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

/**
 * Classify annual revenue into a size band.
 */
function revenueBand(revenue: number | null): string {
  if (revenue === null) return 'unknown'
  if (revenue < 100_000) return 'micro'
  if (revenue < 1_000_000) return 'small'
  if (revenue < 10_000_000) return 'medium'
  if (revenue < 100_000_000) return 'large'
  return 'enterprise'
}

/**
 * Compute deterministic compatibility score (0-100) between two businesses.
 *
 * Scoring breakdown:
 *  - Industry alignment:        0-25 pts
 *  - Geographic proximity:      0-20 pts
 *  - Trust score differential:  0-20 pts
 *  - Transaction history:       0-20 pts
 *  - Size compatibility:        0-15 pts
 */
function computeCompatibility(
  businessA: BusinessProfile,
  businessB: BusinessProfile,
  existingRelationship: boolean,
  mutualConnectionCount: number,
): CompatibilityResult {
  const reasons: string[] = []
  let industryAlignment = 0
  let geographicProximity = 0
  let trustScoreDifferential = 0
  let transactionHistory = 0
  let sizeCompatibility = 0

  // ── 1. Industry Alignment (0-25 pts) ──────────────────────────────
  const indA = businessA.industry?.trim()
  const indB = businessB.industry?.trim()

  if (indA && indB) {
    if (indA.toLowerCase() === indB.toLowerCase()) {
      // Same industry — high complementarity in B2B matching
      industryAlignment = 25
      reasons.push(`Same industry (${indA}) — strong vertical alignment`)
    } else if (areIndustriesRelated(indA, indB) || areIndustriesRelated(indB, indA)) {
      industryAlignment = 15
      reasons.push(`Related industries (${indA} ↔ ${indB}) — complementary supply chains`)
    } else {
      industryAlignment = 5
      reasons.push(`Different industries (${indA} vs ${indB}) — cross-sector diversification`)
    }
  } else {
    // Missing industry data — neutral score
    industryAlignment = 10
    reasons.push('Industry data incomplete — moderate alignment assumed')
  }

  // ── 2. Geographic Proximity (0-20 pts) ─────────────────────────────
  const geoRelation = getGeographicRelation(
    businessA.country,
    businessA.city,
    businessB.country,
    businessB.city,
  )

  if (geoRelation === 'same_country') {
    geographicProximity = 20
    const loc = businessA.city && businessB.city
      ? `${businessA.city} and ${businessB.city}`
      : businessA.country
    reasons.push(`Same country (${loc}) — shared regulatory and logistics framework`)
  } else {
    geographicProximity = 2
    reasons.push(`Different countries (${businessA.country} vs ${businessB.country}) — cross-border trade`)
  }

  // ── 3. Trust Score Differential (0-20 pts) ─────────────────────────
  const trustA = businessA.trustScore?.overallScore ?? 50
  const trustB = businessB.trustScore?.overallScore ?? 50
  const bucketA = trustBucket(trustA)
  const bucketB = trustBucket(trustB)

  if (bucketA === 'high' && bucketB === 'high') {
    trustScoreDifferential = 20
    reasons.push(`Both businesses have high trust scores (${trustA.toFixed(0)} / ${trustB.toFixed(0)})`)
  } else if (bucketA === 'high' || bucketB === 'high') {
    trustScoreDifferential = 10
    reasons.push(`One business has a high trust score — moderate risk profile`)
  } else {
    trustScoreDifferential = 0
    reasons.push(`Both businesses have lower trust scores (${trustA.toFixed(0)} / ${trustB.toFixed(0)}) — higher risk`)
  }

  // ── 4. Transaction History (0-20 pts) ──────────────────────────────
  if (existingRelationship) {
    transactionHistory = 20
    reasons.push('Existing business relationship — proven track record')
  } else if (mutualConnectionCount > 0) {
    transactionHistory = 10
    reasons.push(`${mutualConnectionCount} mutual connection${mutualConnectionCount > 1 ? 's' : ''} — network-referenced trust`)
  } else {
    transactionHistory = 0
    reasons.push('No prior transaction history — new partnership opportunity')
  }

  // ── 5. Size Compatibility (0-15 pts) ───────────────────────────────
  const bandA = revenueBand(businessA.annualRevenue)
  const bandB = revenueBand(businessB.annualRevenue)

  if (bandA !== 'unknown' && bandB !== 'unknown') {
    if (bandA === bandB) {
      sizeCompatibility = 15
      reasons.push(`Similar revenue scale (${bandA}) — balanced partnership dynamic`)
    } else {
      sizeCompatibility = 5
      reasons.push(`Different revenue scales (${bandA} vs ${bandB}) — asymmetric but viable`)
    }
  } else {
    sizeCompatibility = 8
    reasons.push('Revenue data incomplete — moderate size compatibility assumed')
  }

  const totalScore = Math.min(100, Math.max(0,
    industryAlignment + geographicProximity + trustScoreDifferential + transactionHistory + sizeCompatibility
  ))

  return {
    score: totalScore,
    reasons,
    breakdown: {
      industryAlignment,
      geographicProximity,
      trustScoreDifferential,
      transactionHistory,
      sizeCompatibility,
    },
  }
}

// ─── Schema ──────────────────────────────────────────────────────────

const createMatchSchema = z.object({
  seekerId: z.string().min(1, 'Seeker ID is required'),
  matchType: z.string().min(1, 'Match type is required'),
  candidateId: z.string().optional(),
})

// ─── Bulk Data Fetching for Compatibility ────────────────────────────

/**
 * Fetch business profiles with trust scores in a single query.
 */
async function fetchBusinessProfiles(ids: string[]): Promise<Map<string, BusinessProfile>> {
  if (ids.length === 0) return new Map()

  const businesses = await db.business.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      country: true,
      city: true,
      industry: true,
      annualRevenue: true,
      employeeCount: true,
      trustScore: { select: { overallScore: true } },
    },
  })

  const map = new Map<string, BusinessProfile>()
  for (const b of businesses) {
    map.set(b.id, b as unknown as BusinessProfile)
  }
  return map
}

/**
 * Check for existing relationships between pairs of business IDs.
 * Returns a Map<`${fromId}-${toId}`, boolean>.
 */
async function checkExistingRelationships(
  pairs: Array<{ seekerId: string; candidateId: string }>,
): Promise<Map<string, boolean>> {
  if (pairs.length === 0) return new Map()

  const orConditions = pairs.flatMap(p => [
    { fromBusinessId: p.seekerId, toBusinessId: p.candidateId },
    { fromBusinessId: p.candidateId, toBusinessId: p.seekerId },
  ])

  const relationships = await db.businessRelationship.findMany({
    where: { OR: orConditions },
    select: { fromBusinessId: true, toBusinessId: true },
  })

  const result = new Map<string, boolean>()
  for (const p of pairs) {
    const key = `${p.seekerId}-${p.candidateId}`
    const exists = relationships.some(
      (r: { fromBusinessId: string; toBusinessId: string }) =>
        (r.fromBusinessId === p.seekerId && r.toBusinessId === p.candidateId) ||
        (r.fromBusinessId === p.candidateId && r.toBusinessId === p.seekerId),
    )
    result.set(key, exists)
  }
  return result
}

/**
 * Count mutual connections (shared BusinessRelationship partners) for each pair.
 */
async function countMutualConnections(
  pairs: Array<{ seekerId: string; candidateId: string }>,
): Promise<Map<string, number>> {
  if (pairs.length === 0) return new Map()

  const allIds = new Set<string>()
  for (const p of pairs) {
    allIds.add(p.seekerId)
    allIds.add(p.candidateId)
  }
  const idList = [...allIds]

  // Get all relationships involving any of these businesses
  const rels = await db.businessRelationship.findMany({
    where: {
      OR: [
        { fromBusinessId: { in: idList } },
        { toBusinessId: { in: idList } },
      ],
    },
    select: { fromBusinessId: true, toBusinessId: true },
  })

  // Build adjacency set per business
  const connections = new Map<string, Set<string>>()
  for (const id of idList) {
    connections.set(id, new Set())
  }
  for (const r of rels) {
    connections.get(r.fromBusinessId)?.add(r.toBusinessId)
    connections.get(r.toBusinessId)?.add(r.fromBusinessId)
  }

  const result = new Map<string, number>()
  for (const p of pairs) {
    const setA = connections.get(p.seekerId) ?? new Set()
    const setB = connections.get(p.candidateId) ?? new Set()
    let mutual = 0
    for (const conn of setA) {
      if (setB.has(conn) && conn !== p.seekerId && conn !== p.candidateId) {
        mutual++
      }
    }
    result.set(`${p.seekerId}-${p.candidateId}`, mutual)
  }
  return result
}

// ─── GET Handler ──────────────────────────────────────────────────────

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

// ─── POST Handler ─────────────────────────────────────────────────────

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
      const candidate = await db.business.findUnique({ where: { id: data.candidateId } })
      if (!candidate) {
        return notFound('Candidate business not found')
      }

      // Fetch profiles for both businesses
      const profiles = await fetchBusinessProfiles([data.seekerId, data.candidateId])
      const profileA = profiles.get(data.seekerId)
      const profileB = profiles.get(data.candidateId)
      if (!profileA || !profileB) {
        return error('Failed to load business profiles', 500)
      }

      // Check existing relationship and mutual connections
      const pair = { seekerId: data.seekerId, candidateId: data.candidateId }
      const [relMap, mutualMap] = await Promise.all([
        checkExistingRelationships([pair]),
        countMutualConnections([pair]),
      ])
      const hasRelationship = relMap.get(`${data.seekerId}-${data.candidateId}`) ?? false
      const mutualCount = mutualMap.get(`${data.seekerId}-${data.candidateId}`) ?? 0

      // Compute deterministic compatibility
      const compat = computeCompatibility(profileA, profileB, hasRelationship, mutualCount)

      const match = await db.businessMatch.create({
        data: {
          seekerId: data.seekerId,
          candidateId: data.candidateId,
          matchType: data.matchType,
          matchScore: compat.score,
          reasons: JSON.stringify(compat.reasons),
          metadata: JSON.stringify({
            scoreBreakdown: compat.breakdown,
            computedAt: new Date().toISOString(),
          }),
        },
      })

      // Publish event for audit trail
      await publishEvent({
        topic: TOPICS.AUDIT_EVENTS,
        key: `match-created:${match.id}`,
        event: {
          eventId: match.id,
          eventType: 'audit.log',
          timestamp: new Date().toISOString(),
          version: '1.0',
          source: 'matching',
          data: {
            action: 'match.created',
            resource: 'BusinessMatch',
            resourceId: match.id,
            actorId: user.id,
            actorType: 'user',
            metadata: {
              seekerId: data.seekerId,
              candidateId: data.candidateId,
              matchType: data.matchType,
              score: compat.score,
              scoreBreakdown: compat.breakdown,
            },
          },
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
      take: 50,
    })

    if (candidates.length === 0) {
      return ok([], { message: 'No eligible candidate businesses found' })
    }

    // Fetch all profiles in a single batch
    const allIds = [data.seekerId, ...candidates.map((c: { id: string }) => c.id)]
    const profiles = await fetchBusinessProfiles(allIds)
    const seekerProfile = profiles.get(data.seekerId)
    if (!seekerProfile) {
      return error('Failed to load seeker business profile', 500)
    }

    // Build all candidate pairs
    const pairs = candidates.map((c: { id: string }) => ({
      seekerId: data.seekerId,
      candidateId: c.id,
    }))

    // Batch-check relationships and mutual connections
    const [relMap, mutualMap] = await Promise.all([
      checkExistingRelationships(pairs),
      countMutualConnections(pairs),
    ])

    // Compute compatibility for all candidates and sort by score descending
    const scoredCandidates = candidates
      .map((candidate: { id: string }) => {
        const profileB = profiles.get(candidate.id)
        if (!profileB) return null

        const pairKey = `${data.seekerId}-${candidate.id}`
        const hasRelationship = relMap.get(pairKey) ?? false
        const mutualCount = mutualMap.get(pairKey) ?? 0

        const compat = computeCompatibility(seekerProfile, profileB, hasRelationship, mutualCount)
        return { candidate, compat }
      })
      .filter((item: { candidate: { id: string }; compat: CompatibilityResult } | null): item is { candidate: { id: string }; compat: CompatibilityResult } => item !== null)
      .sort((a: { compat: CompatibilityResult }, b: { compat: CompatibilityResult }) => b.compat.score - a.compat.score)
      .slice(0, 5) // Take top 5 matches

    // Create match records in the database (cached results)
    const matches = await Promise.all(
      scoredCandidates.map(({ candidate, compat }: { candidate: { id: string }; compat: CompatibilityResult }) =>
        db.businessMatch.create({
          data: {
            seekerId: data.seekerId,
            candidateId: candidate.id,
            matchType: data.matchType,
            matchScore: compat.score,
            reasons: JSON.stringify(compat.reasons),
            metadata: JSON.stringify({
              scoreBreakdown: compat.breakdown,
              computedAt: new Date().toISOString(),
            }),
          },
        }),
      ),
    )

    // Publish batch event
    await publishEvent({
      topic: TOPICS.AUDIT_EVENTS,
      key: `matches-batch:${data.seekerId}`,
      event: {
        eventId: `batch-${Date.now()}`,
        eventType: 'audit.log',
        timestamp: new Date().toISOString(),
        version: '1.0',
        source: 'matching',
        data: {
          action: 'match.batch_created',
          resource: 'BusinessMatch',
          resourceId: matches.map(m => m.id).join(','),
          actorId: user.id,
          actorType: 'user',
          metadata: {
            seekerId: data.seekerId,
            matchType: data.matchType,
            matchCount: matches.length,
            scoreRange: {
              min: Math.min(...scoredCandidates.map((s: { compat: CompatibilityResult }) => s.compat.score)),
              max: Math.max(...scoredCandidates.map((s: { compat: CompatibilityResult }) => s.compat.score)),
            },
          },
        },
      },
    })

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
