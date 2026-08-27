import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, createAuditLog, getClientIP } from '@/lib/auth-utils'
import type { AuthContext, RouteContext } from '@/lib/auth-utils'

// GET /api/customers - List customers
// Requires authentication (any DCP staff role)
export const GET = withAuth(async (request: NextRequest, _context: RouteContext, authContext: AuthContext) => {
  try {
    const { user } = authContext
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const tenantId = searchParams.get('tenantId')
    const status = searchParams.get('status')
    const riskLevel = searchParams.get('riskLevel')
    const search = searchParams.get('search')

    // Use authenticated user's tenantId if not provided
    const effectiveTenantId = tenantId || user.tenantId

    // Customers can only access their own data
    if (user.role === 'CUSTOMER') {
      return NextResponse.json(
        { success: false, error: 'Customers cannot access this endpoint', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Ensure tenant isolation - non-SUPER_ADMIN must use their own tenant
    if (user.role !== 'SUPER_ADMIN' && effectiveTenantId !== user.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Cannot access other tenant data', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const skip = (page - 1) * limit

    // Build where clause - tenant isolation is required
    const where: Record<string, unknown> = {}
    
    if (!effectiveTenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId query parameter is required' },
        { status: 400 }
      )
    }
    
    where.tenantId = effectiveTenantId
    
    if (status) {
      where.status = status
    }
    
    if (riskLevel) {
      where.riskLevel = riskLevel
    }
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { nationalId: { contains: search, mode: 'insensitive' as const } }
      ]
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              loans: true,
              loanApplications: true,
              repayments: true
            }
          }
        }
      }),
      db.customer.count({ where })
    ])

    // Audit log for customer list access
    createAuditLog(
      'customer:list',
      user.id,
      { filters: { status, riskLevel, search }, page, limit, tenantId: user.tenantId },
      getClientIP(request)
    )

    return NextResponse.json({
      success: true,
      data: customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
})

// POST /api/customers - Create a new customer
// Requires STAFF or higher role
export const POST = withAuth(async (request: NextRequest, _context: RouteContext, authContext: AuthContext) => {
  try {
    const { user } = authContext
    
    // Check role - AGENT and above can create customers
    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STAFF', 'AGENT'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to create customers', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    const {
      tenantId,
      firstName,
      lastName,
      email,
      phone,
      alternativePhone,
      dateOfBirth,
      gender,
      nationalId,
      kraPin,
      employmentStatus,
      employerName,
      incomeAmount,
      incomeFrequency,
      businessName,
      county,
      city,
      bankName,
      bankAccount,
      mpesaPhone
    } = body

    // Use authenticated user's tenantId if not provided
    const effectiveTenantId = tenantId || user.tenantId

    // Validate required fields
    if (!effectiveTenantId || !firstName || !lastName || !phone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: tenantId, firstName, lastName, phone' },
        { status: 400 }
      )
    }

    // Ensure tenant access
    if (user.role !== 'SUPER_ADMIN' && effectiveTenantId !== user.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Cannot create customer for other tenant', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Check if tenant exists
    const tenant = await db.tenant.findUnique({ where: { id: effectiveTenantId } })
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Check for duplicate phone within tenant
    const existingCustomer = await db.customer.findFirst({
      where: { tenantId: effectiveTenantId, phone }
    })

    if (existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'A customer with this phone number already exists in this tenant' },
        { status: 409 }
      )
    }

    const customer = await db.customer.create({
      data: {
        tenantId: effectiveTenantId,
        firstName,
        lastName,
        email: email || null,
        phone,
        alternativePhone: alternativePhone || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        nationalId: nationalId || null,
        kraPin: kraPin || null,
        employmentStatus: employmentStatus || null,
        employerName: employerName || null,
        incomeAmount: incomeAmount ? parseFloat(incomeAmount) : null,
        incomeFrequency: incomeFrequency || null,
        businessName: businessName || null,
        county: county || null,
        city: city || null,
        bankName: bankName || null,
        bankAccount: bankAccount || null,
        mpesaPhone: mpesaPhone || phone
      }
    })

    // Audit log for customer creation
    createAuditLog(
      'customer:create',
      user.id,
      { customerPhone: phone, customerName: `${firstName} ${lastName}`, entityId: customer.id, tenantId: user.tenantId },
      getClientIP(request)
    )

    return NextResponse.json(
      { success: true, data: customer },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create customer' },
      { status: 500 }
    )
  }
})
