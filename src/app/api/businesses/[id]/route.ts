import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers'
import { ok, unauthorized, forbidden, notFound, badRequest, withErrorHandler } from '@/backend/lib/api-response'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

const updateBusinessSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  legalName: z.string().max(300).optional(),
  registrationNo: z.string().max(100).optional(),
  taxId: z.string().max(100).optional(),
  country: z.string().max(10).optional(),
  city: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  employeeCount: z.number().int().min(0).optional(),
  annualRevenue: z.number().min(0).optional(),
  description: z.string().max(2000).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['active', 'pending', 'verified', 'deactivated', 'suspended']).optional(),
});

const getHandler = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getApiUser(request)
  if (!user) return unauthorized()

  const { id } = await params
  const business = await db.business.findUnique({
    where: { id },
    include: {
      passport: true,
      trustScore: {
        include: {
          reputationEvents: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      },
      digitalTwin: true,
      sentRelationships: true,
      receivedRelationships: true,
    },
  })

  if (!business) {
    return notFound('Business not found')
  }
  if (business.tenantId !== user.tenantId) {
    return notFound('Business not found')
  }

  return ok(business)
})

const putHandler = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireAuth(request)
  if (user.role !== 'admin') return forbidden('Only admins can update business details')

  const { id } = await params
  const body = await request.json()
  const parsed = updateBusinessSchema.safeParse(body)
  if (!parsed.success) {
    return badRequest('Validation failed', parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    })))
  }

  const existing = await db.business.findUnique({ where: { id } })
  if (!existing) {
    return notFound('Business not found')
  }
  if (existing.tenantId !== user.tenantId) {
    return notFound('Business not found')
  }

  const allowedFields = [
    'name',
    'legalName',
    'registrationNo',
    'taxId',
    'country',
    'city',
    'industry',
    'website',
    'employeeCount',
    'annualRevenue',
    'description',
    'logoUrl',
    'status',
  ] as const

  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (parsed.data[field] !== undefined) {
      updateData[field] = parsed.data[field]
    }
  }

  // If status is being set to verified, set verifiedAt
  if (updateData.status === 'verified' && !existing.verifiedAt) {
    updateData.verifiedAt = new Date()
  }

  const business = await db.business.update({
    where: { id },
    data: updateData,
    include: {
      passport: true,
      trustScore: true,
      digitalTwin: true,
    },
  })

  return ok(business)
})

const deleteHandler = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireAuth(request)
  const { id } = await params

  const existing = await db.business.findUnique({ where: { id } })
  if (!existing) {
    return notFound('Business not found')
  }
  if (existing.tenantId !== user.tenantId) {
    return notFound('Business not found')
  }

  if (existing.status === 'deactivated') {
    return badRequest('Business is already deactivated')
  }

  const business = await db.business.update({
    where: { id },
    data: { status: 'deactivated' },
    include: {
      passport: true,
      trustScore: true,
    },
  })

  return ok(business)
})

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/businesses/[id]');

export const PUT = withApiTelemetry(withErrorHandler(putHandler), '/api/businesses/[id]');

export const DELETE = withApiTelemetry(withErrorHandler(deleteHandler), '/api/businesses/[id]');
