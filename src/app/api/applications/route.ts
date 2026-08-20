import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/applications - List loan applications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const tenantId = searchParams.get('tenantId')
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')

    const skip = (page - 1) * limit

    // Build where clause
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
    
    if (customerId) {
      where.customerId = customerId
    }

    const [applications, total] = await Promise.all([
      db.loanApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              category: true
            }
          }
        }
      }),
      db.loanApplication.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: applications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching loan applications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch loan applications' },
      { status: 500 }
    )
  }
}

// POST /api/applications - Create a new loan application
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      tenantId,
      customerId,
      productId,
      requestedAmount,
      termDays,
      purpose
    } = body

    // Validate required fields
    if (!tenantId || !customerId || !productId || !requestedAmount || !termDays) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: tenantId, customerId, productId, requestedAmount, termDays' },
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

    // Check if customer exists and belongs to tenant
    const customer = await db.customer.findFirst({ where: { id: customerId, tenantId } })
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found or does not belong to this tenant' },
        { status: 404 }
      )
    }

    // Check if product exists and belongs to tenant
    const product = await db.loanProduct.findFirst({ 
      where: { id: productId, tenantId, isActive: true } 
    })
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found or inactive' },
        { status: 404 }
      )
    }

    // Validate amount against product limits
    if (requestedAmount < product.minAmount || requestedAmount > product.maxAmount) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Requested amount must be between KSh ${product.minAmount.toLocaleString()} and KSh ${product.maxAmount.toLocaleString()}` 
        },
        { status: 400 }
      )
    }

    // Validate term against product limits
    if (termDays < product.minTermDays || termDays > product.maxTermDays) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Term must be between ${product.minTermDays} and ${product.maxTermDays} days` 
        },
        { status: 400 }
      )
    }

    const application = await db.loanApplication.create({
      data: {
        tenantId,
        customerId,
        productId,
        requestedAmount: parseFloat(requestedAmount),
        termDays: parseInt(termDays),
        purpose: purpose || null,
        status: 'DRAFT',
        currentStep: 'SUBMISSION',
        stepHistory: JSON.stringify([{
          step: 'SUBMISSION',
          enteredAt: new Date().toISOString(),
          by: 'system'
        }])
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        product: true
      }
    })

    return NextResponse.json(
      { success: true, data: application },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating loan application:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create loan application' },
      { status: 500 }
    )
  }
}
