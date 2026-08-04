import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers'

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
async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
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
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    if (business.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    return NextResponse.json({ data: business })
  } catch (error) {
    console.error('Error fetching business:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to fetch business' }, { status: 500 })
  }
}

async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const body = await request.json()
    const parsed = updateBusinessSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const existing = await db.business.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    if (existing.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
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

    return NextResponse.json({ data: business })
  } catch (error) {
    console.error('Error updating business:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to update business' }, { status: 500 })
  }
}

async function deleteHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params

    const existing = await db.business.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    if (existing.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if (existing.status === 'deactivated') {
      return NextResponse.json({ error: 'Business is already deactivated' }, { status: 400 })
    }

    const business = await db.business.update({
      where: { id },
      data: { status: 'deactivated' },
      include: {
        passport: true,
        trustScore: true,
      },
    })

    return NextResponse.json({ data: business, message: 'Business deactivated successfully' })
  } catch (error) {
    console.error('Error deactivating business:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to deactivate business' }, { status: 500 })
  }
}

export const GET = withApiTelemetry(getHandler, '/api/businesses/[id]');

export const PUT = withApiTelemetry(putHandler, '/api/businesses/[id]');

export const DELETE = withApiTelemetry(deleteHandler, '/api/businesses/[id]');
