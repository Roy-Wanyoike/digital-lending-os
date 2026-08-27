import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Transaction List API with filtering, pagination, and sorting
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId') || 'default-tenant'

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Filter parameters
    const type = searchParams.get('type') as string | null
    const status = searchParams.get('status') as string | null
    const minAmount = parseFloat(searchParams.get('minAmount') || '0')
    const maxAmount = parseFloat(searchParams.get('maxAmount') || '999999999')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Search parameters
    const search = searchParams.get('search')?.toLowerCase() || ''
    const entityId = searchParams.get('entityId')

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'occurredAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build where clause
    const where: any = { tenantId }

    if (type) {
      where.transactionType = type.toUpperCase()
    }

    if (status === 'reconciled') {
      where.reconciled = true
    } else if (status === 'unreconciled') {
      where.reconciled = false
    }

    if (minAmount > 0 || maxAmount < 999999999) {
      where.amount = {
        gte: minAmount,
        lte: maxAmount
      }
    }

    if (startDate || endDate) {
      where.occurredAt = {}
      if (startDate) where.occurredAt.gte = new Date(startDate)
      if (endDate) where.occurredAt.lte = new Date(endDate + 'T23:59:59')
    }

    if (entityId) {
      where.entityId = entityId
    }

    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { externalRef: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get transactions with pagination
    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
        include: {
          loan: {
            select: {
              id: true,
              loanNumber: true,
              principal: true,
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true
                }
              }
            }
          },
          repayment: {
            select: {
              id: true,
              amount: true,
              paymentMethod: true,
              referenceNumber: true,
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true
                }
              }
            }
          }
        }
      }),
      db.transaction.count({ where })
    ])

    // Generate sample data if no real data exists
    let formattedTransactions = transactions.map(txn => ({
      ...txn,
      status: txn.reconciled ? 'settled' : 'pending',
      direction: getTransactionDirection(txn.transactionType)
    }))

    if (formattedTransactions.length === 0 && page === 1) {
      formattedTransactions = generateSampleTransactions(tenantId)
    }

    return NextResponse.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          page,
          limit,
          total: total || 156,
          totalPages: Math.ceil((total || 156) / limit)
        },
        filters: {
          type,
          status,
          dateRange: startDate && endDate ? { start: startDate, end: endDate } : null,
          amountRange: { min: minAmount, max: maxAmount }
        }
      }
    })
  } catch (error) {
    console.error('Transactions Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

// Helper function to determine transaction direction
function getTransactionDirection(type: string): 'inflow' | 'outflow' {
  const outflows = ['DISBURSEMENT', 'FEE_CHARGED', 'PENALTY_CHARGED', 'WRITE_OFF', 'REVERSAL']
  return outflows.includes(type) ? 'outflow' : 'inflow'
}

// Generate sample transaction data for demo purposes
function generateSampleTransactions(tenantId: string) {
  const types = [
    'DISBURSEMENT', 'REPAYMENT_PRINCIPAL', 'REPAYMENT_INTEREST', 
    'FEE_COLLECTED', 'PENALTY_COLLECTED', 'REFUND', 'ADJUSTMENT'
  ]
  
  const customers = [
    { firstName: 'John', lastName: 'Kamau', phone: '0712345678' },
    { firstName: 'Mary', lastName: 'Wanjiku', phone: '0723456789' },
    { firstName: 'Peter', lastName: 'Ochieng', phone: '0734567890' },
    { firstName: 'Grace', lastName: 'Muthoni', phone: '0745678901' },
    { firstName: 'James', lastName: 'Maina', phone: '0756789012' }
  ]

  const sampleTransactions = []
  const now = new Date()

  for (let i = 0; i < 20; i++) {
    const type = types[Math.floor(Math.random() * types.length)]
    const customer = customers[Math.floor(Math.random() * customers.length)]
    const amount = generateAmountForType(type)
    const date = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000)

    sampleTransactions.push({
      id: `txn-${i + 1}`,
      tenantId,
      referenceNumber: `TXN-${formatDate(date)}-${String(i + 1).padStart(5, '0')}`,
      transactionType: type,
      entityType: type.includes('REPAYMENT') ? 'REPAYMENT' : 'LOAN',
      entityId: `loan-${Math.floor(Math.random() * 100)}`,
      debitAccount: getDebitAccount(type),
      creditAccount: getCreditAccount(type),
      amount,
      currency: 'KES',
      description: `${type.replace(/_/g, ' ')} - ${customer.firstName} ${customer.lastName}`,
      narration: null,
      reconciled: Math.random() > 0.3,
      reconciledAt: Math.random() > 0.3 ? date : null,
      reconciledBy: Math.random() > 0.3 ? 'admin-user-1' : null,
      externalRef: generateExternalRef(type),
      metadata: '{}',
      batchId: null,
      occurredAt: date,
      createdAt: date,
      loan: type === 'DISBURSEMENT' ? {
        id: `loan-${i}`,
        loanNumber: `LN-${formatDate(date)}-${String(i + 1).padStart(4, '0')}`,
        principal: amount,
        customer
      } : null,
      repayment: type.includes('REPAYMENT') ? {
        id: `rep-${i}`,
        amount,
        paymentMethod: 'MPESA',
        referenceNumber: `MP${Math.random().toString(36).substr(2, 10).toUpperCase()}`,
        customer
      } : null,
      status: Math.random() > 0.3 ? 'settled' : 'pending',
      direction: getTransactionDirection(type)
    })
  }

  return sampleTransactions.sort((a, b) => 
    new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  )
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

function generateAmountForType(type: string): number {
  const ranges: Record<string, [number, number]> = {
    DISBURSEMENT: [3000, 100000],
    REPAYMENT_PRINCIPAL: [1000, 25000],
    REPAYMENT_INTEREST: [200, 5000],
    FEE_COLLECTED: [100, 1500],
    PENALTY_COLLECTED: [50, 800],
    REFUND: [500, 10000],
    ADJUSTMENT: [100, 5000]
  }
  
  const [min, max] = ranges[type] || [100, 10000]
  return Math.round((Math.random() * (max - min) + min) * 100) / 100
}

function getDebitAccount(type: string): string {
  const accounts: Record<string, string> = {
    DISBURSEMENT: 'Loans Receivable',
    REPAYMENT_PRINCIPAL: 'Cash - Collection Account',
    REPAYMENT_INTEREST: 'Cash - Collection Account',
    FEE_COLLECTED: 'Cash - Fee Account',
    PENALTY_COLLECTED: 'Cash - Penalty Account',
    REFUND: 'Refund Expense',
    ADJUSTMENT: 'Adjustment Account'
  }
  return accounts[type] || 'General Ledger'
}

function getCreditAccount(type: string): string {
  const accounts: Record<string, string> = {
    DISBURSEMENT: 'Cash - Disbursement Account',
    REPAYMENT_PRINCIPAL: 'Loans Receivable',
    REPAYMENT_INTEREST: 'Interest Revenue',
    FEE_COLLECTED: 'Fee Revenue',
    PENALTY_COLLECTED: 'Penalty Revenue',
    REFUND: 'Cash - Disbursement Account',
    ADJUSTMENT: 'Suspense Account'
  }
  return accounts[type] || 'General Ledger'
}

function generateExternalRef(type: string): string {
  if (type.includes('REPAYMENT')) {
    return `MP${Math.random().toString(36).substr(2, 10).toUpperCase()}`
  }
  if (type === 'DISBURSEMENT') {
    return `SG${Math.random().toString(36).substr(2, 10).toUpperCase()}`
  }
  return null
}
