import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'buyer', 'seller', 'auditor', 'viewer']).optional(),
  isActive: z.boolean().optional(),
  businessId: z.string().nullable().optional(),
  lastLoginAt: z.string().datetime().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await db.user.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let businessName: string | null = null
    if (user.businessId) {
      const biz = await db.business.findUnique({
        where: { id: user.businessId },
        select: { name: true },
      })
      businessName = biz?.name ?? null
    }

    return NextResponse.json({ data: { ...user, businessName } })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const data = parsed.data
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.role !== undefined) updateData.role = data.role
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.businessId !== undefined) updateData.businessId = data.businessId
    if (data.lastLoginAt !== undefined) updateData.lastLoginAt = new Date(data.lastLoginAt)

    const user = await db.user.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: user })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = await db.user.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ data: user })
  } catch (error) {
    console.error('Error deactivating user:', error)
    return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 })
  }
}