import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
const createRelationshipSchema = z.object({
  fromBusinessId: z.string().min(1, 'fromBusinessId is required'),
  toBusinessId: z.string().min(1, 'toBusinessId is required'),
  type: z.enum(['supplier', 'buyer', 'partner', 'logistics', 'financial'] as const, {
    message: 'Type must be one of: supplier, buyer, partner, logistics, financial',
  }),
})

async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || ''
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''

    // Get tenant's business IDs for filtering
    const tenantBizIds = (await db.business.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    })).map(b => b.id)

    const where: Record<string, unknown> = {
      OR: [
        { fromBusinessId: { in: tenantBizIds } },
        { toBusinessId: { in: tenantBizIds } },
      ],
    }

    if (businessId) {
      where.OR = [
        { fromBusinessId: businessId },
        { toBusinessId: businessId },
      ]
      where.AND = {
        OR: [
          { fromBusinessId: { in: tenantBizIds } },
          { toBusinessId: { in: tenantBizIds } },
        ],
      }
    }
    if (type) {
      where.type = type
    }
    if (status) {
      where.status = status
    }

    const relationships = await db.businessRelationship.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        fromBusiness: {
          select: { id: true, name: true, country: true, industry: true },
        },
        toBusiness: {
          select: { id: true, name: true, country: true, industry: true },
        },
      },
    })

    return NextResponse.json({ data: relationships })
  } catch (error) {
    console.error('Error listing relationships:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to list relationships' }, { status: 500 })
  }
}

async function postHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const body = await request.json()
    const parsed = createRelationshipSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const { fromBusinessId, toBusinessId, type } = parsed.data

    if (fromBusinessId === toBusinessId) {
      return NextResponse.json(
        { error: 'Cannot create a relationship with the same business' },
        { status: 400 }
      )
    }

    // Check both businesses exist and belong to tenant
    const [fromBusiness, toBusiness] = await Promise.all([
      db.business.findUnique({ where: { id: fromBusinessId } }),
      db.business.findUnique({ where: { id: toBusinessId } }),
    ])

    if (!fromBusiness || fromBusiness.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'From business not found' }, { status: 404 })
    }
    if (!toBusiness) {
      return NextResponse.json({ error: 'To business not found' }, { status: 404 })
    }

    const relationship = await db.businessRelationship.create({
      data: {
        fromBusinessId,
        toBusinessId,
        type,
      },
      include: {
        fromBusiness: {
          select: { id: true, name: true, country: true },
        },
        toBusiness: {
          select: { id: true, name: true, country: true },
        },
      },
    })

    return NextResponse.json({ data: relationship }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'This relationship already exists' },
        { status: 409 }
      )
    }
    console.error('Error creating relationship:', error)
    return NextResponse.json({ error: 'Failed to create relationship' }, { status: 500 })
  }
}

export const GET = withApiTelemetry(getHandler, '/api/trust/relationships');

export const POST = withApiTelemetry(postHandler, '/api/trust/relationships');
