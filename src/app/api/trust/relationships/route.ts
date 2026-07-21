import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const createRelationshipSchema = z.object({
  fromBusinessId: z.string().min(1, 'fromBusinessId is required'),
  toBusinessId: z.string().min(1, 'toBusinessId is required'),
  type: z.enum(['supplier', 'buyer', 'partner', 'logistics', 'financial'], {
    errorMap: () => ({ message: 'Type must be one of: supplier, buyer, partner, logistics, financial' }),
  }),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || ''
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = {}

    if (businessId) {
      where.OR = [
        { fromBusinessId: businessId },
        { toBusinessId: businessId },
      ]
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
    return NextResponse.json({ error: 'Failed to list relationships' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Check both businesses exist
    const [fromBusiness, toBusiness] = await Promise.all([
      db.business.findUnique({ where: { id: fromBusinessId } }),
      db.business.findUnique({ where: { id: toBusinessId } }),
    ])

    if (!fromBusiness) {
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