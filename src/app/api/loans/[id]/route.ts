import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/loans/[id] - Get a specific loan
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

    const loan = await db.loan.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        product: true,
        application: true,
        repayments: {
          orderBy: { paymentDate: 'desc' },
          take: 20
        },
        transactions: {
          orderBy: { occurredAt: 'desc' },
          take: 10
        }
      }
    })

    if (!loan) {
      return NextResponse.json(
        { success: false, error: 'Loan not found' },
        { status: 404 }
      )
    }

    // Parse repayment schedule JSON
    let repaymentSchedule = []
    try {
      repaymentSchedule = JSON.parse(loan.repaymentSchedule || '[]')
    } catch (e) {
      repaymentSchedule = []
    }

    return NextResponse.json({
      success: true,
      data: {
        ...loan,
        parsedRepaymentSchedule: repaymentSchedule
      }
    })
  } catch (error) {
    console.error('Error fetching loan:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch loan' },
      { status: 500 }
    )
  }
}

// PUT /api/loans/[id] - Update a loan
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

    // Check if loan exists and belongs to tenant
    const existingLoan = await db.loan.findFirst({
      where: { id, tenantId }
    })

    if (!existingLoan) {
      return NextResponse.json(
        { success: false, error: 'Loan not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    
    const allowedFields = [
      'status', 'arrearsStatus', 'disbursementDate', 'maturityDate',
      'repaidPrincipal', 'repaidInterest', 'repaidFees', 'totalRepaid',
      'outstandingBalance', 'nextPaymentDue', 'daysInArrears',
      'disbursementMethod', 'disbursementReference', 'disbursementAccount',
      'assignedCollector', 'collectionNotes', 'lastCollectionAt',
      'closedAt', 'closureReason', 'writtenOffAmount',
      'repaymentSchedule'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'repaymentSchedule') {
          updateData[field] = typeof body[field] === 'string' ? body[field] : JSON.stringify(body[field])
        } else if (['disbursementDate', 'maturityDate', 'nextPaymentDue', 'closedAt', 'lastCollectionAt'].includes(field)) {
          updateData[field] = new Date(body[field])
        } else if (['repaidPrincipal', 'repaidInterest', 'repaidFees', 'totalRepaid', 'outstandingBalance', 'daysInArrears', 'writtenOffAmount'].includes(field)) {
          updateData[field] = parseFloat(body[field]) || 0
        } else {
          updateData[field] = body[field]
        }
      }
    }

    const loan = await db.loan.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ success: true, data: loan })
  } catch (error) {
    console.error('Error updating loan:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update loan' },
      { status: 500 }
    )
  }
}
