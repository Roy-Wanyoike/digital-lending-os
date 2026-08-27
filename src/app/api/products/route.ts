import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/products - List loan products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')

    // Build where clause
    const where: Record<string, unknown> = {}
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId query parameter is required' },
        { status: 400 }
      )
    }
    
    where.tenantId = tenantId
    
    if (category) {
      where.category = category
    }
    
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    const products = await db.loanProduct.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            loans: true,
            applications: true
          }
        }
      }
    })

    return NextResponse.json({ success: true, data: products })
  } catch (error) {
    console.error('Error fetching loan products:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch loan products' },
      { status: 500 }
    )
  }
}

// POST /api/products - Create a new loan product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      tenantId,
      name,
      description,
      productCode,
      category,
      minAmount,
      maxAmount,
      defaultAmount,
      interestType = 'FLAT_RATE',
      interestRate,
      processingFee = 0,
      processingFeeType = 'FIXED',
      insuranceFee = 0,
      insuranceFeeType = 'PERCENTAGE',
      minTermDays,
      maxTermDays,
      defaultTermDays,
      repaymentFrequency = 'MONTHLY',
      gracePeriodDays = 0,
      eligibilityRules = '{}'
    } = body

    // Validate required fields
    if (!tenantId || !name || !productCode || !category || 
        !minAmount || !maxAmount || !interestRate || 
        !minTermDays || !maxTermDays) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields for product creation' },
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

    // Check if product code is unique within tenant
    const existingProduct = await db.loanProduct.findFirst({
      where: { tenantId, productCode }
    })

    if (existingProduct) {
      return NextResponse.json(
        { success: false, error: 'A product with this code already exists in this tenant' },
        { status: 409 }
      )
    }

    const product = await db.loanProduct.create({
      data: {
        tenantId,
        name,
        description: description || null,
        productCode,
        category,
        minAmount: parseFloat(minAmount),
        maxAmount: parseFloat(maxAmount),
        defaultAmount: defaultAmount ? parseFloat(defaultAmount) : null,
        interestType,
        interestRate: parseFloat(interestRate),
        processingFee: parseFloat(processingFee),
        processingFeeType,
        insuranceFee: parseFloat(insuranceFee),
        insuranceFeeType,
        minTermDays: parseInt(minTermDays),
        maxTermDays: parseInt(maxTermDays),
        defaultTermDays: defaultTermDays ? parseInt(defaultTermDays) : null,
        repaymentFrequency,
        gracePeriodDays: parseInt(gracePeriodDays),
        eligibilityRules: typeof eligibilityRules === 'string' ? eligibilityRules : JSON.stringify(eligibilityRules)
      }
    })

    return NextResponse.json(
      { success: true, data: product },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating loan product:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create loan product' },
      { status: 500 }
    )
  }
}
