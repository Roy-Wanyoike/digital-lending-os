import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withRoles, createAuditLog, getClientIP, getParam } from '@/lib/auth-utils'
import type { AuthContext, RouteContext } from '@/lib/auth-utils'

// GET /api/tenants/[id] - Get a specific tenant
// Requires authentication. SUPER_ADMIN can access any tenant,
// TENANT_ADMIN can only access their own tenant.
export const GET = withAuth(async (
  request: NextRequest,
  { params }: RouteContext,
  authContext: AuthContext
) => {
  try {
    const { user } = authContext
    const paramsObj = await params
    const id = getParam(paramsObj, 'id')
    
    // SUPER_ADMIN can view any tenant
    // TENANT_ADMIN can only view their own tenant
    if (user.role !== 'SUPER_ADMIN' && user.tenantId !== id) {
      return NextResponse.json(
        { success: false, error: 'Access denied: You can only view your own tenant', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
    
    const tenantData = await db.tenant.findUnique({
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

    if (!tenantData) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Audit log for sensitive data access
    createAuditLog(
      'tenant:read',
      user.id,
      { entityId: id, tenantId: user.tenantId },
      getClientIP(request)
    )

    return NextResponse.json({ success: true, data: tenantData })
  } catch (error) {
    console.error('Error fetching tenant:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenant' },
      { status: 500 }
    )
  }
})

// PUT /api/tenants/[id] - Update a tenant
// Only SUPER_ADMIN or own TENANT_ADMIN can update
export const PUT = withRoles(['SUPER_ADMIN', 'TENANT_ADMIN'])(async (
  request: NextRequest,
  { params }: RouteContext,
  authContext: AuthContext
) => {
  try {
    const { user } = authContext
    const paramsObj = await params
    const id = getParam(paramsObj, 'id')
    const body = await request.json()

    // TENANT_ADMIN can only update their own tenant
    if (user.role === 'TENANT_ADMIN' && user.tenantId !== id) {
      return NextResponse.json(
        { success: false, error: 'Access denied: You can only update your own tenant', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

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

    const updatedTenant = await db.tenant.update({
      where: { id },
      data: updateData
    })

    // Audit log for tenant updates
    createAuditLog(
      'tenant:update',
      user.id,
      { entityId: id, updatedFields: Object.keys(updateData), tenantId: user.tenantId },
      getClientIP(request)
    )

    return NextResponse.json({ success: true, data: updatedTenant })
  } catch (error) {
    console.error('Error updating tenant:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update tenant' },
      { status: 500 }
    )
  }
})

// DELETE /api/tenants/[id] - Delete a tenant (soft delete via status change)
// Only SUPER_ADMIN can terminate tenants
export const DELETE = withRoles(['SUPER_ADMIN'])(async (
  request: NextRequest,
  { params }: RouteContext,
  authContext: AuthContext
) => {
  try {
    const { user } = authContext
    const paramsObj = await params
    const id = getParam(paramsObj, 'id')

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

    // Audit log for critical action
    createAuditLog(
      'tenant:delete',
      user.id,
      { entityId: id, previousStatus: existingTenant.status, tenantId: user.tenantId },
      getClientIP(request)
    )

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
})
