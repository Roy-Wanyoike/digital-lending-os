import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/tenants - List all tenants
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status')
    const plan = searchParams.get('plan')
    const search = searchParams.get('search')

    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}
    
    if (status) {
      where.status = status
    }
    
    if (plan) {
      where.plan = plan
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { slug: { contains: search, mode: 'insensitive' as const } },
        { companyName: { contains: search, mode: 'insensitive' as const } }
      ]
    }

    const [tenants, total] = await Promise.all([
      db.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              customers: true,
              loans: true,
              loanApplications: true
            }
          }
        }
      }),
      db.tenant.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: tenants,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching tenants:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenants' },
      { status: 500 }
    )
  }
}

// POST /api/tenants - Create a new tenant
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      name,
      slug,
      companyName,
      licenseNumber,
      phone,
      email,
      physicalAddress,
      website,
      plan = 'STARTER',
      status = 'PENDING_ONBOARDING',
      branding = '{}',
      config = '{}'
    } = body

    // Validate required fields
    if (!name || !slug || !companyName || !phone || !email) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, slug, companyName, phone, email' },
        { status: 400 }
      )
    }

    // Check if slug is unique
    const existingTenant = await db.tenant.findUnique({ where: { slug } })
    if (existingTenant) {
      return NextResponse.json(
        { success: false, error: 'A tenant with this slug already exists' },
        { status: 409 }
      )
    }

    const tenant = await db.tenant.create({
      data: {
        name,
        slug,
        companyName,
        licenseNumber: licenseNumber || null,
        phone,
        email,
        physicalAddress: physicalAddress || null,
        website: website || null,
        plan,
        status,
        branding: typeof branding === 'string' ? branding : JSON.stringify(branding),
        config: typeof config === 'string' ? config : JSON.stringify(config),
        monthlyFee: plan === 'ENTERPRISE' ? 50000 : plan === 'PROFESSIONAL' ? 15000 : plan === 'CUSTOM' ? 0 : 5000,
        transactionRate: plan === 'ENTERPRISE' ? 0.5 : plan === 'PROFESSIONAL' ? 1.0 : 1.5
      }
    })

    return NextResponse.json(
      { success: true, data: tenant },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating tenant:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create tenant' },
      { status: 500 }
    )
  }
}
