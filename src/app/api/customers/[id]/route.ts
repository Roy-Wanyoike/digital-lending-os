import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/customers/[id] - Get a specific customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId query parameter is required' },
        { status: 400 }
      )
    }

    const customer = await db.customer.findFirst({
      where: { id, tenantId },
      include: {
        loans: {
          where: { status: { in: ['ACTIVE', 'IN_ARREARS', 'PENDING_DISBURSEMENT'] } },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        loanApplications: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        _count: {
          select: {
            loans: true,
            loanApplications: true,
            repayments: true,
            kycDocuments: true
          }
        }
      }
    })

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: customer })
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer' },
      { status: 500 }
    )
  }
}

// PUT /api/customers/[id] - Update a customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const tenantId = body.tenantId

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId is required' },
        { status: 400 }
      )
    }

    // Check if customer exists and belongs to tenant
    const existingCustomer = await db.customer.findFirst({
      where: { id, tenantId }
    })

    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    
    const allowedFields = [
      'firstName', 'lastName', 'email', 'phone', 'alternativePhone',
      'dateOfBirth', 'gender', 'nationalId', 'kraPin',
      'employmentStatus', 'employerName', 'incomeAmount', 'incomeFrequency',
      'businessName', 'county', 'city', 'physicalAddress', 'postalAddress',
      'bankName', 'bankAccount', 'mpesaPhone', 'status', 'riskLevel',
      'creditScore', 'crbStatus', 'notes', 'tags'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'dateOfBirth') {
          updateData[field] = new Date(body[field])
        } else if (field === 'incomeAmount') {
          updateData[field] = parseFloat(body[field])
        } else {
          updateData[field] = body[field]
        }
      }
    }

    const customer = await db.customer.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ success: true, data: customer })
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}
