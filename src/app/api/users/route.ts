import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['admin', 'buyer', 'seller', 'auditor', 'viewer']),
  businessId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const role = searchParams.get('role') || ''
    const businessId = searchParams.get('businessId') || ''
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = {}

    if (role) {
      where.role = role
    }
    if (businessId) {
      where.businessId = businessId
    }
    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true'
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.user.count({ where }),
    ])

    // Attach business name if businessId exists
    const usersWithBusiness = await Promise.all(
      users.map(async (user) => {
        let businessName: string | null = null
        if (user.businessId) {
          const biz = await db.business.findUnique({
            where: { id: user.businessId },
            select: { name: true },
          })
          businessName = biz?.name ?? null
        }
        return { ...user, businessName }
      })
    )

    return NextResponse.json({
      data: usersWithBusiness,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error listing users:', error)
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Check email uniqueness
    const existing = await db.user.findUnique({
      where: { email: data.email },
    })
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }

    const user = await db.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        businessId: data.businessId,
      },
    })

    return NextResponse.json({ data: user }, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}