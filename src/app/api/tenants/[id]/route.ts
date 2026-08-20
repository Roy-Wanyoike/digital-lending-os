import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/tenants/[id] - Get a specific tenant
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            lastLoginAt: true
          }
        },
        _count: {
          select: {
            users: true,
            customers: true,
            loans: true,
            loanApplications: true,
            loanProducts: true
          }
        }
      }
    })

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: tenant })
  } catch (error) {
    console.error('Error fetching tenant:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenant' },
      { status: 500 }
    )
  }
}

// PUT /api/tenants/[id] - Update a tenant
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Check if tenant exists
    const existingTenant = await db.tenant.findUnique({ where: { id } })
    if (!existingTenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // If slug is being changed, check uniqueness
    if (body.slug && body.slug !== existingTenant.slug) {
      const slugExists = await db.tenant.findUnique({ where: { slug: body.slug } })
      if (slugExists) {
        return NextResponse.json(
          { success: false, error: 'A tenant with this slug already exists' },
          { status: 409 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    
    // Only include fields that are provided in the request
    const allowedFields = [
      'name', 'slug', 'companyName', 'licenseNumber', 'phone', 'email',
      'physicalAddress', 'website', 'status', 'plan', 'branding', 'config',
      'monthlyFee', 'transactionRate'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'branding' || field === 'config') {
          updateData[field] = typeof body[field] === 'string' ? body[field] : JSON.stringify(body[field])
        } else {
          updateData[field] = body[field]
        }
      }
    }

    const tenant = await db.tenant.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ success: true, data: tenant })
  } catch (error) {
    console.error('Error updating tenant:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update tenant' },
      { status: 500 }
    )
  }
}

// DELETE /api/tenants/[id] - Delete a tenant (soft delete via status change)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if tenant exists
    const existingTenant = await db.tenant.findUnique({ where: { id } })
    if (!existingTenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Soft delete - mark as terminated
    await db.tenant.update({
      where: { id },
      data: { status: 'TERMINATED' }
    })

    return NextResponse.json({
      success: true,
      message: 'Tenant has been terminated'
    })
  } catch (error) {
    console.error('Error deleting tenant:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete tenant' },
      { status: 500 }
    )
  }
}
