import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { z } from 'zod'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['admin', 'buyer', 'seller', 'auditor', 'viewer'] as const),
  businessId: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const role = searchParams.get('role') || ''
    const businessId = searchParams.get('businessId') || ''
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
    }

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
      db.account.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.account.count({ where }),
    ])

    // Attach business name if businessId exists
    const usersWithBusiness = await Promise.all(
      users.map(async (acct) => {
        let businessName: string | null = null
        if (acct.businessId) {
          const biz = await db.business.findUnique({
            where: { id: acct.businessId },
            select: { name: true },
          })
          businessName = biz?.name ?? null
        }
        return { ...acct, businessName }
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
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Error listing users:', error)
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    const body = await request.json()
    const parsed = createUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Check email uniqueness within tenant
    const existing = await db.account.findFirst({
      where: { tenantId: user.tenantId, email: data.email },
    })
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(data.password, 12)

    const createdAccount = await db.account.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        businessId: data.businessId,
        tenantId: user.tenantId,
        passwordHash,
      },
    })

    return NextResponse.json({ data: createdAccount }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}