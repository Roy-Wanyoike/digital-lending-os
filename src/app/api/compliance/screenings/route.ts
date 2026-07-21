import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const createScreeningSchema = z.object({
  businessId: z.string().optional(),
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const businessId = searchParams.get('businessId') || ''
    const screeningType = searchParams.get('screeningType') || ''
    const result = searchParams.get('result') || ''
    const riskLevel = searchParams.get('riskLevel') || ''
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = {}

    if (businessId) where.businessId = businessId
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

    return NextResponse.json({
      data: screenings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error listing compliance screenings:', error)
    return NextResponse.json({ error: 'Failed to list compliance screenings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createScreeningSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data
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

    return NextResponse.json({ data: screening }, { status: 201 })
  } catch (error) {
    console.error('Error creating compliance screening:', error)
    return NextResponse.json({ error: 'Failed to create compliance screening' }, { status: 500 })
  }
}