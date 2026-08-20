import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================
// GET /api/auth/tenants/:slug - TENANT LOOKUP
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Tenant slug is required' },
        { status: 400 }
      )
    }

    // Find tenant by slug
    const tenant = await db.tenant.findUnique({
      where: { slug: slug.toLowerCase() },
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
    })

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Parse branding JSON
    let branding = {}
    try {
      branding = JSON.parse(tenant.branding || '{}')
    } catch {
      branding = {}
    }

    // Return tenant info (excluding sensitive config)
    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        companyName: tenant.companyName,
        status: tenant.status,
        plan: tenant.plan,
        phone: tenant.phone,
        email: tenant.email,
        website: tenant.website,
        physicalAddress: tenant.physicalAddress,
        licenseNumber: tenant.licenseNumber,
        branding,
        statistics: {
          users: tenant._count.users,
          customers: tenant._count.customers,
          activeLoans: tenant._count.loans,
          applications: tenant._count.loanApplications
        },
        createdAt: tenant.createdAt
      }
    })
  } catch (error) {
    console.error('Tenant lookup error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenant information' },
      { status: 500 }
    )
  }
}
