import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    return NextResponse.json({ data: business })
  } catch (error) {
    console.error('Error fetching business:', error)
    return NextResponse.json({ error: 'Failed to fetch business' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.business.findUnique({ where: { id } })
    if (!existing) {
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
      if (body[field] !== undefined) {
        updateData[field] = body[field]
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
    return NextResponse.json({ error: 'Failed to update business' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.business.findUnique({ where: { id } })
    if (!existing) {
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
    return NextResponse.json({ error: 'Failed to deactivate business' }, { status: 500 })
  }
}