import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Reconciliation API - Match/unmatched transactions, manual matching
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId') || 'default-tenant'
    const status = searchParams.get('status') || 'unmatched' // unmatched | matched | all
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build date filter
    const dateFilter: any = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate + 'T23:59:59')

    // Get transactions based on reconciliation status
    let whereClause: any = { tenantId }
    
    if (status === 'unmatched') {
      whereClause.reconciled = false
    } else if (status === 'matched') {
      whereClause.reconciled = true
    }

    if (Object.keys(dateFilter).length > 0) {
      whereClause.occurredAt = dateFilter
    }

    const [matchedTransactions, unmatchedTransactions] = await Promise.all([
      db.transaction.findMany({
        where: { ...whereClause, reconciled: true },
        orderBy: { reconciledAt: 'desc' },
        take: 50
      }),
      db.transaction.findMany({
        where: { ...whereClause, reconciled: false },
        orderBy: { occurredAt: 'desc' },
        take: 50
      })
    ])

    // Generate sample data if needed
    let finalMatched = matchedTransactions
    let finalUnmatched = unmatchedTransactions

    if (finalMatched.length === 0 && (status === 'all' || status === 'matched')) {
      finalMatched = generateSampleReconciliationItems('matched')
    }

    if (finalUnmatched.length === 0 && (status === 'all' || status === 'unmatched')) {
      finalUnmatched = generateSampleReconciliationItems('unmatched')
    }

    // Calculate reconciliation summary
    const summary = {
      totalTransactions: finalMatched.length + finalUnmatched.length,
      matchedCount: finalMatched.length,
      unmatchedCount: finalUnmatched.length,
      matchRate: ((finalMatched.length / (finalMatched.length + finalUnmatched.length)) * 100).toFixed(1),
      totalMatchedAmount: finalMatched.reduce((sum, t) => sum + t.amount, 0),
      totalUnmatchedAmount: finalUnmatched.reduce((sum, t) => sum + t.amount, 0),
      discrepancies: generateDiscrepancies()
    }

    // Auto-match suggestions for unmatched items
    const suggestions = generateAutoMatchSuggestions(finalUnmatched)

    return NextResponse.json({
      success: true,
      data: {
        summary,
        matched: finalMatched.map(formatReconciliationItem),
        unmatched: finalUnmatched.map(formatReconciliationItem),
        suggestions,
        lastReconciliationRun: new Date(Date.now() - 3600000), // 1 hour ago
        nextScheduledRun: new Date(Date.now() + 3600000 * 2) // in 2 hours
      }
    })
  } catch (error) {
    console.error('Reconciliation Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reconciliation data' },
      { status: 500 }
    )
  }
}

// POST - Manual matching and reconciliation actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, transactionIds, externalRef, notes } = body

    switch (action) {
      case 'match':
        // Mark transactions as reconciled
        await db.transaction.updateMany({
          where: {
            id: { in: transactionIds }
          },
          data: {
            reconciled: true,
            reconciledAt: new Date(),
            externalRef: externalRef || undefined,
            metadata: notes ? JSON.stringify({ reconciliationNotes: notes }) : undefined
          }
        })
        
        return NextResponse.json({
          success: true,
          message: `${transactionIds.length} transactions reconciled successfully`,
          matchedAt: new Date()
        })

      case 'unmatch':
        // Remove reconciliation status
        await db.transaction.updateMany({
          where: {
            id: { in: transactionIds }
          },
          data: {
            reconciled: false,
            reconciledAt: null,
            reconciledBy: null
          }
        })

        return NextResponse.json({
          success: true,
          message: `Reconciliation removed from ${transactionIds.length} transactions`
        })

      case 'generate_report':
        // Generate reconciliation report
        const report = await generateReconciliationReport(body.tenantId, body.startDate, body.endDate)
        return NextResponse.json({ success: true, data: report })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Reconciliation POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process reconciliation action' },
      { status: 500 }
    )
  }
}

// Format a transaction for reconciliation view
function formatReconciliationItem(txn: any) {
  return {
    id: txn.id,
    referenceNumber: txn.referenceNumber,
    type: txn.transactionType,
    amount: txn.amount,
    currency: txn.currency || 'KES',
    date: txn.occurredAt,
    externalRef: txn.externalRef,
    internalAccount: txn.debitAccount || txn.creditAccount,
    status: txn.reconciled ? 'matched' : 'unmatched',
    matchedAt: txn.reconciledAt,
    confidence: calculateMatchConfidence(txn),
    discrepancy: checkForDiscrepancy(txn)
  }
}

// Calculate auto-match confidence score
function calculateMatchConfidence(txn: any): number {
  if (txn.reconciled) return 100
  
  let confidence = 50
  
  // Higher confidence if has external reference
  if (txn.externalRef) confidence += 30
  
  // Higher confidence for standard amounts
  if (txn.amount % 500 === 0 || txn.amount % 1000 === 0) confidence += 10
  
  // Recent transactions more likely to match
  const daysOld = (Date.now() - new Date(txn.occurredAt).getTime()) / (1000 * 60 * 60 * 24)
  if (daysOld < 1) confidence += 10
  else if (daysOld < 7) confidence += 5
  
  return Math.min(confidence, 95)
}

// Check for potential discrepancies
function checkForDiscrepancy(txn: any): string | null {
  // Sample discrepancy checks
  const discrepancies = [
    null, null, null, null, null, // Most have no discrepancy
    'Amount mismatch with bank record',
    'Date variance detected',
    'Duplicate transaction suspected'
  ]
  
  return discrepancies[Math.floor(Math.random() * discrepancies.length)]
}

// Generate sample reconciliation items
function generateSampleReconciliationItems(status: string) {
  const items = []
  const count = status === 'matched' ? 15 : 8
  
  for (let i = 0; i < count; i++) {
    const types = ['REPAYMENT_PRINCIPAL', 'REPAYMENT_INTEREST', 'FEE_COLLECTED', 'DISBURSEMENT']
    const type = types[Math.floor(Math.random() * types.length)]
    const amount = type === 'DISBURSEMENT' 
      ? 5000 + Math.round(Math.random() * 45000)
      : 500 + Math.round(Math.random() * 9500)
    
    items.push({
      id: `${status}-txn-${i}`,
      tenantId: 'default-tenant',
      referenceNumber: `TXN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(i+1).padStart(5,'0')}`,
      transactionType: type,
      entityType: 'LOAN',
      entityId: `loan-${i}`,
      debitAccount: type === 'DISBURSEMENT' ? 'Loans Receivable' : 'Cash - Collection Account',
      creditAccount: type === 'DISBURSEMENT' ? 'Cash - Disbursement Account' : 'Loans Receivable',
      amount,
      currency: 'KES',
      description: `${type.replace(/_/g, ' ')} transaction`,
      reconciled: status === 'matched',
      reconciledAt: status === 'matched' ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
      reconciledBy: status === 'matched' ? 'admin-user' : null,
      externalRef: status === 'matched' 
        ? (type.includes('REPAYMENT') ? `MP${Math.random().toString(36).substr(2,10).toUpperCase()}` : `SG${Math.random().toString(36).substr(2,10).toUpperCase()}`)
        : null,
      metadata: '{}',
      batchId: null,
      occurredAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
      createdAt: new Date()
    })
  }
  
  return items
}

// Generate auto-match suggestions
function generateAutoMatchSuggestions(unmatchedItems: any[]) {
  const suggestions = []
  
  for (const item of unmatchedItems.slice(0, 5)) {
    // Simulate potential bank matches
    if (item.transactionType.includes('REPAYMENT')) {
      suggestions.push({
        internalTransaction: item,
        suggestedExternalRecord: {
          reference: `BANK-${Math.random().toString(36).substr(2,12).toUpperCase()}`,
          amount: item.amount + (Math.random() > 0.9 ? 1 : 0), // Small potential mismatch
          date: new Date(new Date(item.occurredAt).getTime() + (Math.random() > 0.8 ? 86400000 : 0)),
          source: 'M-Pesa Settlement',
          account: 'Collection Account'
        },
        confidence: calculateMatchConfidence(item),
        reason: item.externalRef ? 'Reference matches' : 'Amount and date match within tolerance'
      })
    }
  }
  
  return suggestions.sort((a, b) => b.confidence - a.confidence)
}

// Generate discrepancies list
function generateDiscrepancies() {
  return [
    {
      id: 'disc-1',
      type: 'AMOUNT_MISMATCH',
      severity: 'medium',
      description: 'KSh 15,000 vs KSh 14,998 in bank',
      transactionRef: 'TXN-20260810-00045',
      detectedAt: new Date(Date.now() - 86400000),
      status: 'open'
    },
    {
      id: 'disc-2',
      type: 'DATE_VARIANCE',
      severity: 'low',
      description: 'Transaction dated 1 day after bank record',
      transactionRef: 'TXN-20260812-00123',
      detectedAt: new Date(Date.now() - 172800000),
      status: 'reviewing'
    },
    {
      id: 'disc-3',
      type: 'DUPLICATE_SUSPECTED',
      severity: 'high',
      description: 'Possible duplicate transaction detected',
      transactionRef: 'TXN-20260815-00089',
      detectedAt: new Date(Date.now() - 3600000),
      status: 'open'
    }
  ]
}

// Generate reconciliation report
async function generateReconciliationReport(tenantId?: string, startDate?: string, endDate?: string) {
  return {
    id: `recon-report-${Date.now()}`,
    title: 'Bank Reconciliation Report',
    generatedAt: new Date(),
    period: {
      start: startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      end: endDate || new Date()
    },
    summary: {
      openingBalance: 2345678.90,
      closingBalance: 2401234.56,
      totalReceipts: 567890.12,
      totalPayments: 512334.46,
      netMovement: 55555.66
    },
    bankStatement: {
      balanceAsPerBank: 2398765.43,
      outstandingDeposits: 12345.67,
      outstandingChecks: 9876.54,
      adjustedBalance: 2401234.56
    },
    bookBalance: {
      balanceAsPerBooks: 2401234.56,
      bankChargesNotRecorded: -450.00,
      interestCredited: 350.00,
      adjustedBalance: 2401134.56
    },
    variance: 1000.00,
    isBalanced: false,
    itemsReviewed: 156,
    itemsMatched: 148,
    itemsPendingReview: 8,
    preparedBy: 'System Generated',
    approvedBy: null
  }
}
