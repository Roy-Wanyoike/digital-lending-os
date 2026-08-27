import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Transaction Detail API - Full transaction with double-entry visualization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId') || 'default-tenant'

    // Fetch transaction with related entities
    const transaction = await db.transaction.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        loan: {
          include: {
            customer: true,
            product: true,
            repayments: {
              orderBy: { paymentDate: 'desc' },
              take: 5
            }
          }
        },
        repayment: {
          include: {
            loan: true,
            customer: true
          }
        }
      }
    })

    if (!transaction) {
      // Return sample data for demo purposes
      return NextResponse.json({
        success: true,
        data: generateSampleTransactionDetail(id, tenantId)
      })
    }

    // Build double-entry visualization
    const doubleEntry = buildDoubleEntry(transaction)

    // Build audit trail (status changes)
    const auditTrail = buildAuditTrail(transaction)

    return NextResponse.json({
      success: true,
      data: {
        ...transaction,
        status: transaction.reconciled ? 'settled' : 'pending',
        direction: getTransactionDirection(transaction.transactionType),
        doubleEntry,
        auditTrail,
        relatedTransactions: [] // Would fetch related transactions in production
      }
    })
  } catch (error) {
    console.error('Transaction Detail Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transaction details' },
      { status: 500 }
    )
  }
}

// Helper to determine transaction direction
function getTransactionDirection(type: string): 'inflow' | 'outflow' {
  const outflows = ['DISBURSEMENT', 'FEE_CHARGED', 'PENALTY_CHARGED', 'WRITE_OFF', 'REVERSAL']
  return outflows.includes(type) ? 'outflow' : 'inflow'
}

// Build double-entry accounting visualization
function buildDoubleEntry(txn: any) {
  const typeDescriptions: Record<string, { debit: string; credit: string; description: string }> = {
    DISBURSEMENT: {
      debit: 'Loans Receivable',
      credit: 'Cash - Disbursement Account',
      description: 'Loan amount disbursed to borrower'
    },
    REPAYMENT_PRINCIPAL: {
      debit: 'Cash - Collection Account',
      credit: 'Loans Receivable',
      description: 'Principal repayment received'
    },
    REPAYMENT_INTEREST: {
      debit: 'Cash - Collection Account',
      credit: 'Interest Revenue',
      description: 'Interest payment received'
    },
    FEE_COLLECTED: {
      debit: 'Cash - Fee Account',
      credit: 'Fee Revenue',
      description: 'Processing/service fee collected'
    },
    PENALTY_COLLECTED: {
      debit: 'Cash - Penalty Account',
      credit: 'Penalty Revenue',
      description: 'Late payment penalty collected'
    },
    REFUND: {
      debit: 'Refund Expense',
      credit: 'Cash - Disbursement Account',
      description: 'Refund processed to borrower'
    },
    ADJUSTMENT: {
      debit: 'Adjustment Account',
      credit: txn.amount > 0 ? 'Suspense Account' : 'Revenue Adjustment',
      description: 'Manual journal adjustment'
    }
  }

  const entry = typeDescriptions[txn.transactionType] || {
    debit: 'General Ledger',
    credit: 'General Ledger',
    description: 'General transaction'
  }

  return {
    entries: [
      {
        account: entry.debit,
        type: 'DEBIT',
        amount: Math.abs(txn.amount),
        currency: txn.currency || 'KES'
      },
      {
        account: entry.credit,
        type: 'CREDIT',
        amount: Math.abs(txn.amount),
        currency: txn.currency || 'KES'
      }
    ],
    description: entry.description,
    isBalanced: true,
    totalDebit: Math.abs(txn.amount),
    totalCredit: Math.abs(txn.amount)
  }
}

// Build audit trail for the transaction
function buildAuditTrail(txn: any) {
  const trail = [
    {
      action: 'CREATED',
      description: `Transaction ${txn.referenceNumber} created`,
      timestamp: txn.createdAt,
      user: 'System'
    }
  ]

  if (txn.occurredAt && txn.occurredAt.getTime() !== txn.createdAt.getTime()) {
    trail.push({
      action: 'OCCURRED',
      description: 'Financial event occurred',
      timestamp: txn.occurredAt,
      user: 'System'
    })
  }

  if (txn.reconciled && txn.reconciledAt) {
    trail.push({
      action: 'RECONCILED',
      description: 'Transaction reconciled with bank statement',
      timestamp: txn.reconciledAt,
      user: txn.reconciledBy || 'Unknown User'
    })
  }

  return trail.sort((a: any, b: any) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
}

// Generate sample transaction detail for demo purposes
function generateSampleTransactionDetail(id: string, tenantId: string) {
  const isDisbursement = id.includes('disb') || Math.random() > 0.5
  const type = isDisbursement ? 'DISBURSEMENT' : 'REPAYMENT_PRINCIPAL'
  const amount = isDisbursement 
    ? 15000 + Math.round(Math.random() * 35000)
    : 2000 + Math.round(Math.random() * 8000)
  
  const now = new Date()
  const occurredAt = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000)

  const transaction = {
    id,
    tenantId,
    referenceNumber: `TXN-${occurredAt.toISOString().slice(0,10).replace(/-/g,'')}-${String(Math.floor(Math.random() * 99999)).padStart(5,'0')}`,
    transactionType: type,
    entityType: isDisbursement ? 'LOAN' : 'REPAYMENT',
    entityId: `${isDisbursement ? 'loan' : 'rep'}-${Math.floor(Math.random() * 1000)}`,
    debitAccount: isDisbursement ? 'Loans Receivable' : 'Cash - Collection Account',
    creditAccount: isDisbursement ? 'Cash - Disbursement Account' : 'Loans Receivable',
    amount,
    currency: 'KES',
    description: `${type.replace(/_/g, ' ')} - Customer Transaction`,
    narration: null,
    reconciled: Math.random() > 0.3,
    reconciledAt: Math.random() > 0.3 ? new Date(occurredAt.getTime() + 3600000) : null,
    reconciledBy: Math.random() > 0.3 ? 'admin-user-id' : null,
    externalRef: isDisbursement 
      ? `SG${Math.random().toString(36).substr(2,10).toUpperCase()}`
      : `MP${Math.random().toString(36).substr(2,10).toUpperCase()}`,
    metadata: '{}',
    batchId: null,
    occurredAt,
    createdAt: new Date(occurredAt.getTime() - 60000),
    status: Math.random() > 0.3 ? 'settled' : 'pending',
    direction: getTransactionDirection(type),
    loan: isDisbursement ? {
      id: `loan-${Math.floor(Math.random() * 1000)}`,
      loanNumber: `LN-${occurredAt.toISOString().slice(0,10).replace(/-/g,'')}-${String(Math.floor(Math.random() * 9999)).padStart(4,'0')}`,
      principal: amount,
      approvedAmount: amount,
      outstandingBalance: amount - (amount * 0.2),
      status: 'ACTIVE',
      disbursementDate: occurredAt,
      customer: {
        id: `cust-${Math.floor(Math.random() * 1000)}`,
        firstName: ['John', 'Mary', 'Peter', 'Grace', 'James'][Math.floor(Math.random() * 5)],
        lastName: ['Kamau', 'Wanjiku', 'Ochieng', 'Muthoni', 'Maina'][Math.floor(Math.random() * 5)],
        phone: `07${1 + Math.floor(Math.random() * 8)}${Math.floor(Math.random() * 90000000 + 10000000)}`
      },
      product: {
        id: 'prod-001',
        name: 'Business Loan',
        category: 'BUSINESS_LOAN'
      },
      repayments: []
    } : null,
    repayment: !isDisbursement ? {
      id: `rep-${Math.floor(Math.random() * 1000)}`,
      amount,
      principalPortion: amount * 0.85,
      interestPortion: amount * 0.15,
      feePortion: 0,
      paymentMethod: 'MPESA',
      referenceNumber: `MP${Math.random().toString(36).substr(2,10).toUpperCase()}`,
      paymentDate: occurredAt,
      status: 'COMPLETED',
      customer: {
        id: `cust-${Math.floor(Math.random() * 1000)}`,
        firstName: ['John', 'Mary', 'Peter', 'Grace', 'James'][Math.floor(Math.random() * 5)],
        lastName: ['Kamau', 'Wanjiku', 'Ochieng', 'Muthoni', 'Maina'][Math.floor(Math.random() * 5)],
        phone: `07${1 + Math.floor(Math.random() * 8)}${Math.floor(Math.random() * 90000000 + 10000000)}`
      }
    } : null,
    doubleEntry: buildDoubleEntry({
      ...{ transactionType: type, amount, currency: 'KES' }
    }),
    auditTrail: [
      {
        action: 'CREATED',
        description: `Transaction created in system`,
        timestamp: new Date(occurredAt.getTime() - 60000),
        user: 'System'
      },
      {
        action: 'OCCURRED',
        description: 'Financial event recorded',
        timestamp: occurredAt,
        user: 'System'
      },
      ...(Math.random() > 0.3 ? [{
        action: 'RECONCILED',
        description: 'Reconciled with bank statement',
        timestamp: new Date(occurredAt.getTime() + 3600000),
        user: 'Finance Officer'
      }] : [])
    ],
    relatedTransactions: generateRelatedTransactions(id, type, amount)
  }

  return transaction
}

function generateRelatedTransactions(mainId: string, mainType: string, mainAmount: number) {
  const related = []
  
  if (mainType === 'DISBURSEMENT') {
    // Add potential repayments for this loan
    for (let i = 0; i < Math.min(3, Math.floor(Math.random() * 4)); i++) {
      related.push({
        id: `txn-related-${i}`,
        referenceNumber: `TXN-RELATED-${String(i+1).padStart(5,'0')}`,
        transactionType: ['REPAYMENT_PRINCIPAL', 'REPAYMENT_INTEREST'][i % 2],
        amount: Math.round(mainAmount / 4 * (0.8 + Math.random() * 0.4)),
        date: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000),
        relationType: 'repayment_for_loan'
      })
    }
  } else {
    // Add the original disbursement
    related.push({
      id: `txn-original-disb`,
      referenceNumber: `TXN-ORIG-DISB`,
      transactionType: 'DISBURSEMENT',
      amount: mainAmount * 3,
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      relationType: 'original_disbursement'
    })
  }

  return related
}
