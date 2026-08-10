import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, requireRole, AuthError } from '@/lib/auth/api-helpers'
import { unauthorized, notFound, badRequest, error as apiErr, created, ok } from '@/backend/lib/api-response'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
const createScreeningSchema = z.object({
  businessId: z.string().min(1, 'businessId is required'),
  transactionType: z.string().optional(),
  transactionId: z.string().optional(),
  screeningType: z.enum(['sanctions', 'pep', 'adverse_media', 'country_risk']),
})

function generateMockResult(): { result: string; riskLevel: string; details: string; matchedLists: string | null } {
  const rand = Math.random()
  if (rand < 0.05) {
    return {
      result: 'alert',
      riskLevel: 'critical',
      details: 'Direct match found on OFAC SDN list. Immediate review required.',
      matchedLists: JSON.stringify(['OFAC SDN', 'EU Consolidated List']),
    }
  }
  if (rand < 0.20) {
    return {
      result: 'potential_match',
      riskLevel: 'high',
      details: 'Partial name match found. Manual review recommended.',
      matchedLists: JSON.stringify(['PEP Database', 'World-Check']),
    }
  }
  return {
    result: 'clear',
    riskLevel: 'low',
    details: 'No matches found across all screening databases.',
    matchedLists: null,
  }
}

async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return unauthorized()
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const businessId = searchParams.get('businessId') || ''
    const screeningType = searchParams.get('screeningType') || ''
    const result = searchParams.get('result') || ''
    const riskLevel = searchParams.get('riskLevel') || ''
    const status = searchParams.get('status') || ''

    // ComplianceScreening has no tenantId; filter by tenant business IDs
    const tenantBizIds = (await db.business.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    })).map((b: any) => b.id)

    const where: Record<string, unknown> = {
      businessId: { in: tenantBizIds },
    }

    if (businessId) {
      // Ensure the requested businessId belongs to the tenant
      if (!tenantBizIds.includes(businessId)) {
        return notFound('Business not found')
      }
      where.businessId = businessId
    }
    if (screeningType) where.screeningType = screeningType
    if (result) where.result = result
    if (riskLevel) where.riskLevel = riskLevel
    if (status) where.status = status

    const [screenings, total] = await Promise.all([
      db.complianceScreening.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.complianceScreening.count({ where }),
    ])

    return ok({ data: screenings, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  } catch (error) {
    console.error('Error listing compliance screenings:', error)
    if (error instanceof AuthError) return unauthorized(error.message)
    return apiErr('Failed to list compliance screenings')
  }
}

async function postHandler(request: NextRequest) {
  try {
    const user = await requireRole(request, ['admin', 'auditor'])
    const body = await request.json()
    const parsed = createScreeningSchema.safeParse(body)

    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message).join(', ')
      return badRequest(messages)
    }

    const data = parsed.data

    // Validate businessId belongs to tenant
    const biz = await db.business.findUnique({ where: { id: data.businessId }, select: { tenantId: true } })
    if (!biz || biz.tenantId !== user.tenantId) {
      return notFound('Business not found')
    }

    const mockResult = generateMockResult()

    const screening = await db.complianceScreening.create({
      data: {
        businessId: data.businessId,
        transactionType: data.transactionType,
        transactionId: data.transactionId,
        screeningType: data.screeningType,
        result: mockResult.result,
        riskLevel: mockResult.riskLevel,
        details: mockResult.details,
        matchedLists: mockResult.matchedLists,
        status: 'completed',
      },
    })

    return created(screening)
  } catch (error) {
    console.error('Error creating compliance screening:', error)
    if (error instanceof AuthError) return unauthorized(error.message)
    return apiErr('Failed to create compliance screening')
  }
}

export const GET = withApiTelemetry(getHandler, '/api/compliance/screenings');

export const POST = withApiTelemetry(postHandler, '/api/compliance/screenings');
