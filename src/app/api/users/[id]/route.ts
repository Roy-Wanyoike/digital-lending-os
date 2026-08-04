import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'buyer', 'seller', 'auditor', 'viewer'] as const).optional(),
  isActive: z.boolean().optional(),
  businessId: z.string().nullable().optional(),
  lastLoginAt: z.string().datetime().optional(),
})

async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { id } = await params
    const targetUser = await db.account.findUnique({
      where: { id },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (targetUser.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let businessName: string | null = null
    if (targetUser.businessId) {
      const biz = await db.business.findUnique({
        where: { id: targetUser.businessId },
        select: { name: true },
      })
      businessName = biz?.name ?? null
    }

    return NextResponse.json({ data: { ...targetUser, businessName } })
  } catch (error) {
    console.error('Error fetching user:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    if (user.role !== 'admin') return NextResponse.json({ error: 'Admin required to update users' }, { status: 403 })
    const { id } = await params
    const body = await request.json()
    const parsed = updateUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const existing = await db.account.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (existing.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const data = parsed.data
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.role !== undefined) updateData.role = data.role
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.businessId !== undefined) updateData.businessId = data.businessId
    if (data.lastLoginAt !== undefined) updateData.lastLoginAt = new Date(data.lastLoginAt)

    const updatedUser = await db.account.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: updatedUser })
  } catch (error) {
    console.error('Error updating user:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

async function deleteHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    if (user.role !== 'admin') return NextResponse.json({ error: 'Admin required to deactivate users' }, { status: 403 })
    const { id } = await params
    const existing = await db.account.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (existing.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const deletedUser = await db.account.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ data: deletedUser })
  } catch (error) {
    console.error('Error deactivating user:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 })
  }
}

export const GET = withApiTelemetry(getHandler, '/api/users/[id]');

export const PUT = withApiTelemetry(putHandler, '/api/users/[id]');

export const DELETE = withApiTelemetry(deleteHandler, '/api/users/[id]');
