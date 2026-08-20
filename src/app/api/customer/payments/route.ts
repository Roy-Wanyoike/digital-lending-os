import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/customer/payments - Initiate a new payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { loanId, amount, paymentMethod, mpesaNumber } = body

    // Validate required fields
    if (!loanId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required payment details' },
        { status: 400 }
      )
    }

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid payment amount' },
        { status: 400 }
      )
    }

    // Validate M-Pesa number for M-Pesa payments
    if (paymentMethod === 'MPESA' && (!mpesaNumber || mpesaNumber.length < 9)) {
      return NextResponse.json(
        { error: 'Valid M-Pesa phone number is required' },
        { status: 400 }
      )
    }

    // Generate transaction reference
    const prefix = paymentMethod === 'MPESA' ? 'MP' : 
                   paymentMethod === 'BANK_TRANSFER' ? 'BK' : 
                   paymentMethod === 'CARD' ? 'CD' : 'TX'
    const referenceNumber = `${prefix}${Date.now().toString().slice(-8)}`

    // In real application:
    // 1. Verify loan belongs to customer
    // 2. Check outstanding balance
    // 3. Initiate STK push for M-Pesa
    // 4. Create pending repayment record
    
    const paymentData = {
      id: `pay_${Date.now()}`,
      referenceNumber,
      loanId,
      amount,
      paymentMethod,
      mpesaNumber: paymentMethod === 'MPESA' ? mpesaNumber : null,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min expiry for STK push
      instructions: null as object | null
    }

    // Add payment method specific instructions
    if (paymentMethod === 'MPESA') {
      paymentData.instructions = {
        businessNumber: '123456',
        accountReference: referenceNumber,
        message: `Enter your M-Pesa PIN to complete payment of KSh ${amount.toLocaleString()}`
      }
    } else if (paymentMethod === 'BANK_TRANSFER') {
      paymentData.instructions = {
        bankName: 'Equity Bank Kenya',
        accountName: 'Digital Lending OS Ltd',
        accountNumber: '0123456789012',
        reference: loanId
      }
    }

    console.log('Payment initiated:', paymentData)

    return NextResponse.json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        paymentId: paymentData.id,
        referenceNumber: paymentData.referenceNumber,
        status: paymentData.status,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        instructions: paymentData.instructions,
        expiresIn: '15 minutes',
        nextSteps: [
          paymentMethod === 'MPESA' ? 'Check your phone for STK push notification' : null,
          'Complete the payment using the provided instructions',
          'You will receive confirmation once payment is verified'
        ].filter(Boolean)
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error initiating payment:', error)
    return NextResponse.json(
      { error: 'Failed to initiate payment. Please try again.' },
      { status: 500 }
    )
  }
}

// GET /api/customer/payments - Get customer's payment history
export async function GET(request: NextRequest) {
  try {
    const customerId = request.nextUrl.searchParams.get('customerId')
    const loanId = request.nextUrl.searchParams.get('loanId')
    const status = request.nextUrl.searchParams.get('status')
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20')
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0')

    if (!customerId && !loanId) {
      return NextResponse.json(
        { error: 'Customer ID or Loan ID is required' },
        { status: 400 }
      )
    }

    // Mock payment history data
    const payments = [
      {
        id: 'pay_001',
        referenceNumber: 'MP20260820001',
        loanId: 'LN-2026-0042',
        loanNumber: 'LN-2026-0042',
        amount: 4200,
        principalPortion: 3500,
        interestPortion: 455,
        feePortion: 245,
        paymentMethod: 'MPESA',
        status: 'COMPLETED',
        paymentDate: '2026-08-20T10:30:00Z',
        processedAt: '2026-08-20T10:31:15Z',
        description: 'Monthly installment - August 2026'
      },
      {
        id: 'pay_002',
        referenceNumber: 'MP20260810001',
        loanId: 'LN-2026-0042',
        loanNumber: 'LN-2026-0042',
        amount: 4200,
        principalPortion: 3500,
        interestPortion: 455,
        feePortion: 245,
        paymentMethod: 'MPESA',
        status: 'COMPLETED',
        paymentDate: '2026-08-10T09:15:00Z',
        processedAt: '2026-08-10T09:16:22Z',
        description: 'Monthly installment - July 2026'
      },
      {
        id: 'pay_003',
        referenceNumber: 'BK20260725001',
        loanId: 'LN-2026-0042',
        loanNumber: 'LN-2026-0042',
        amount: 4200,
        principalPortion: 3500,
        interestPortion: 455,
        feePortion: 245,
        paymentMethod: 'BANK_TRANSFER',
        status: 'COMPLETED',
        paymentDate: '2026-07-25T14:20:00Z',
        processedAt: '2026-07-25T16:45:00Z',
        description: 'Monthly installment - June 2026'
      },
      {
        id: 'pay_004',
        referenceNumber: 'MP20260705001',
        loanId: 'LN-2026-0042',
        loanNumber: 'LN-2026-0042',
        amount: 4200,
        principalPortion: 3500,
        interestPortion: 455,
        feePortion: 245,
        paymentMethod: 'MPESA',
        status: 'FAILED',
        paymentDate: '2026-07-05T08:00:00Z',
        failureReason: 'Insufficient funds in M-Pesa account',
        description: 'Monthly installment - Failed'
      },
      {
        id: 'pay_005',
        referenceNumber: 'PS20260710001',
        loanId: 'LN-2026-0015',
        loanNumber: 'LN-2026-0015',
        amount: 16950,
        principalPortion: 15000,
        interestPortion: 1500,
        feePortion: 450,
        paymentMethod: 'PESALINK',
        status: 'COMPLETED',
        paymentDate: '2026-03-15T11:00:00Z',
        processedAt: '2026-03-15T11:02:30Z',
        description: 'Final payment - Loan fully settled'
      }
    ]

    // Apply filters
    let filteredPayments = payments
    if (loanId) {
      filteredPayments = filteredPayments.filter(p => p.loanId === loanId)
    }
    if (status) {
      filteredPayments = filteredPayments.filter(p => p.status === status.toUpperCase())
    }

    // Calculate totals
    const totalPaid = filteredPayments
      .filter(p => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0)
    
    const successfulCount = filteredPayments.filter(p => p.status === 'COMPLETED').length

    return NextResponse.json({
      success: true,
      data: {
        payments: filteredPayments.slice(offset, offset + limit),
        pagination: {
          total: filteredPayments.length,
          limit,
          offset,
          hasMore: offset + limit < filteredPayments.length
        },
        summary: {
          totalPaid,
          totalTransactions: filteredPayments.length,
          successfulPayments: successfulCount,
          averagePayment: successfulCount > 0 ? totalPaid / successfulCount : 0
        }
      }
    })

  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment history' },
      { status: 500 }
    )
  }
}
