import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers'
import { ok, unauthorized, badRequest, notFound, forbidden, withErrorHandler } from '@/backend/lib/api-response'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'buyer', 'seller', 'auditor', 'viewer'] as const).optional(),
  isActive: z.boolean().optional(),
  businessId: z.string().nullable().optional(),
})

const getHandler = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getApiUser(request)
  if (!user) return unauthorized()

  const { id } = await params
  const targetUser = await db.account.findUnique({
    where: { id },
  })

  if (!targetUser) {
    return notFound('User not found')
  }
  if (targetUser.tenantId !== user.tenantId) {
    return notFound('User not found')
  }

  let businessName: string | null = null
  if (targetUser.businessId) {
    const biz = await db.business.findUnique({
      where: { id: targetUser.businessId },
      select: { name: true },
    })
    businessName = biz?.name ?? null
  }

  return ok({ ...targetUser, businessName })
})

const putHandler = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireAuth(request)
  if (user.role !== 'admin') return forbidden('Admin required to update users')

  const { id } = await params
  const body = await request.json()
  const parsed = updateUserSchema.safeParse(body)

  if (!parsed.success) {
    return badRequest('Validation failed', parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    })))
  }

  const existing = await db.account.findUnique({ where: { id } })
  if (!existing) {
    return notFound('User not found')
  }
  if (existing.tenantId !== user.tenantId) {
    return notFound('User not found')
  }

  const data = parsed.data
  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.role !== undefined) updateData.role = data.role
  if (data.isActive !== undefined) updateData.isActive = data.isActive
  if (data.businessId !== undefined) updateData.businessId = data.businessId

  const updatedUser = await db.account.update({
    where: { id },
    data: updateData,
  })

  return ok(updatedUser)
})

const deleteHandler = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireAuth(request)
  if (user.role !== 'admin') return forbidden('Admin required to deactivate users')

  const { id } = await params
  const existing = await db.account.findUnique({ where: { id } })
  if (!existing) {
    return notFound('User not found')
  }
  if (existing.tenantId !== user.tenantId) {
    return notFound('User not found')
  }

  const deletedUser = await db.account.update({
    where: { id },
    data: { isActive: false },
  })

  return ok(deletedUser)
})

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/users/[id]');

export const PUT = withApiTelemetry(withErrorHandler(putHandler), '/api/users/[id]');

export const DELETE = withApiTelemetry(withErrorHandler(deleteHandler), '/api/users/[id]');
