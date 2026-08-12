import { NextRequest } from 'next/server';import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { badRequest, conflict, created, error, notFound, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response';
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
    if (!user) return unauthorized('Authentication required')
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const businessId = searchParams.get('businessId') || ''
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''

    // Get tenant's business IDs for filtering
    const tenantBizIds = (await db.business.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    })).map((b: any) => b.id)

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

    const [relationships, total] = await Promise.all([
      db.businessRelationship.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          fromBusiness: {
            select: { id: true, name: true, country: true, industry: true },
          },
          toBusiness: {
            select: { id: true, name: true, country: true, industry: true },
          },
        },
      }),
      db.businessRelationship.count({ where }),
    ])

    return ok(relationships, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err: any) {
    console.error('Error listing relationships:', err)
    return error('Failed to list relationships')
  }
}

async function postHandler(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const parsed = createRelationshipSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error.issues.map(i => i.message).join(', '))
    }

    const { fromBusinessId, toBusinessId, type } = parsed.data

    if (fromBusinessId === toBusinessId) {
      return badRequest('Cannot create a relationship with the same business')
    }

    // Check both businesses exist and belong to tenant
    const [fromBusiness, toBusiness] = await Promise.all([
      db.business.findUnique({ where: { id: fromBusinessId } }),
      db.business.findUnique({ where: { id: toBusinessId } }),
    ])

    if (!fromBusiness || fromBusiness.tenantId !== user.tenantId) {
      return notFound('From business not found')
    }
    if (!toBusiness) {
      return notFound('To business not found')
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

    return created(relationship)
  } catch (error: any) {if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return conflict('This relationship already exists')
    }
    console.error('Error creating relationship:', error)
    return error('Failed to create relationship')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/trust/relationships');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/trust/relationships');
