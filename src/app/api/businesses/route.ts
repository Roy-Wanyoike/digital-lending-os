import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createHash, randomUUID } from 'crypto'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

const createBusinessSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  country: z.string().min(1, 'Country is required'),
  legalName: z.string().optional(),
  registrationNo: z.string().optional(),
  taxId: z.string().optional(),
  city: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().optional(),
  employeeCount: z.number().int().positive().optional(),
  annualRevenue: z.number().nonnegative().optional(),
  description: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const search = searchParams.get('search') || ''
    const country = searchParams.get('country') || ''
    const industry = searchParams.get('industry') || ''
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = { tenantId: user.tenantId }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }
    if (country) {
      where.country = country
    }
    if (industry) {
      where.industry = industry
    }
    if (status) {
      where.status = status
    }

    const [businesses, total] = await Promise.all([
      db.business.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          passport: true,
          trustScore: true,
          digitalTwin: true,
        },
      }),
      db.business.count({ where }),
    ])

    return NextResponse.json({
      data: businesses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error listing businesses:', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: 'Failed to list businesses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    const body = await request.json()
    const parsed = createBusinessSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data
    const businessId = randomUUID()

    // Create business along with CommercePassport and TrustScore
    const business = await db.business.create({
      data: {
        id: businessId,
        name: data.name,
        country: data.country,
        tenantId: user.tenantId,
        legalName: data.legalName,
        registrationNo: data.registrationNo,
        taxId: data.taxId,
        city: data.city,
        industry: data.industry,
        website: data.website,
        employeeCount: data.employeeCount,
        annualRevenue: data.annualRevenue,
        description: data.description,
        passport: {
          create: {
            passportHash: createHash('sha256').update(businessId + Date.now()).digest('hex'),
          },
        },
        trustScore: {
          create: {},
        },
      },
      include: {
        passport: true,
        trustScore: true,
      },
    })

    return NextResponse.json({ data: business }, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'A business with this information already exists' }, { status: 409 })
    }
    console.error('Error creating business:', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: 'Failed to create business' }, { status: 500 })
  }
}