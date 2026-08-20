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
      purpose,
      customerData
    } = body

    // Validate required fields
    if (!tenantId || !requestedAmount || !termDays) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: tenantId, requestedAmount, termDays' },
        { status: 400 }
      )
    }

    // Get or find tenant - support demo mode with 'default-tenant'
    let tenant = await db.tenant.findUnique({ where: { id: tenantId } })
    
    // Demo mode: use first available tenant if 'default-tenant' is specified
    if (!tenant && tenantId === 'default-tenant') {
      tenant = await db.tenant.findFirst({ where: { status: 'ACTIVE' } })
    }
    
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      )
    }

    const actualTenantId = tenant.id

    // Get or create customer - support demo mode
    let customer = null
    if (customerId && customerId !== 'new-customer') {
      customer = await db.customer.findFirst({ where: { id: customerId, tenantId: actualTenantId } })
    }
    
    // If no customer found but we have customerData, create a new customer
    if (!customer && customerData) {
      // Check if customer exists with same phone number
      if (customerData.phone) {
        customer = await db.customer.findFirst({ 
          where: { phone: customerData.phone, tenantId: actualTenantId } 
        })
      }
      
      if (!customer) {
        customer = await db.customer.create({
          data: {
            tenantId: actualTenantId,
            firstName: customerData.firstName || 'Unknown',
            lastName: customerData.lastName || 'Unknown',
            email: customerData.email || null,
            phone: customerData.phone || '0000000000',
            nationalId: customerData.nationalId || null,
            dateOfBirth: customerData.dateOfBirth ? new Date(customerData.dateOfBirth) : null,
            employmentStatus: customerData.employmentStatus || undefined,
            employerName: customerData.employerName || null,
            incomeAmount: customerData.monthlyIncome ? parseFloat(customerData.monthlyIncome) : null,
            mpesaPhone: customerData.mpesaPhone || null,
            bankName: customerData.bankName || null,
            source: 'WEB_PORTAL'
          }
        })
      }
    }
    
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found or invalid customer data provided' },
        { status: 404 }
      )
    }

    // Get or find product - support demo mode with product type names
    let product = null
    if (productId) {
      product = await db.loanProduct.findFirst({ 
        where: { id: productId, tenantId: actualTenantId, isActive: true } 
      })
    }
    
    // Demo mode: find product by category if direct lookup fails
    if (!product && productId) {
      const productTypeMap: Record<string, string> = {
        'personal-loan-product': 'PERSONAL_LOAN',
        'business-loan-product': 'BUSINESS_LOAN',
        'salary-advance-product': 'SALARY_ADVANCE',
        'emergency-loan-product': 'EMERGENCY_LOAN'
      }
      const category = productTypeMap[productId]
      if (category) {
        product = await db.loanProduct.findFirst({ 
          where: { tenantId: actualTenantId, category: category as any, isActive: true } 
        })
      }
    }
    
    // Fallback to any active product for this tenant
    if (!product) {
      product = await db.loanProduct.findFirst({ 
        where: { tenantId: actualTenantId, isActive: true } 
      })
    }
    
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found or inactive' },
        { status: 404 }
      )
    }

    // Validate amount against product limits (skip for demo if outside range)
    const amount = parseFloat(requestedAmount)
    const term = parseInt(termDays)
    
    if (amount < product.minAmount || amount > product.maxAmount) {
      // For demo mode, just log a warning but continue
      console.log(`Warning: Requested amount ${amount} outside product limits (${product.minAmount}-${product.maxAmount})`)
    }

    if (term < product.minTermDays || term > product.maxTermDays) {
      // For demo mode, just log a warning but continue
      console.log(`Warning: Requested term ${term} outside product limits (${product.minTermDays}-${product.maxTermDays})`)
    }

    const application = await db.loanApplication.create({
      data: {
        tenantId: actualTenantId,
        customerId: customer.id,
        productId: product.id,
        requestedAmount: amount,
        termDays: term,
        purpose: purpose || null,
        status: 'SUBMITTED',
        currentStep: 'SUBMISSION',
        stepHistory: JSON.stringify([{
          step: 'SUBMISSION',
          enteredAt: new Date().toISOString(),
          by: 'customer_portal'
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
