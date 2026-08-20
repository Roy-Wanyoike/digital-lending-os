import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/customers - List customers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const tenantId = searchParams.get('tenantId')
    const status = searchParams.get('status')
    const riskLevel = searchParams.get('riskLevel')
    const search = searchParams.get('search')

    const skip = (page - 1) * limit

    // Build where clause - tenant isolation is required
    const where: Record<string, unknown> = {}
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId query parameter is required' },
        { status: 400 }
      )
    }
    
    where.tenantId = tenantId
    
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
}

// POST /api/customers - Create a new customer
export async function POST(request: NextRequest) {
  try {
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

    // Validate required fields
    if (!tenantId || !firstName || !lastName || !phone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: tenantId, firstName, lastName, phone' },
        { status: 400 }
      )
    }

    // Check if tenant exists
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Check for duplicate phone within tenant
    const existingCustomer = await db.customer.findFirst({
      where: { tenantId, phone }
    })

    if (existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'A customer with this phone number already exists in this tenant' },
        { status: 409 }
      )
    }

    const customer = await db.customer.create({
      data: {
        tenantId,
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
}
