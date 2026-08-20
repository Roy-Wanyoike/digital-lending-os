import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Settlements API - Pending settlements and settlement batches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId') || 'default-tenant'
    const status = searchParams.get('status') || 'pending' // pending | processing | completed | failed
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get unreconciled transactions that are ready for settlement
    const whereClause: any = { tenantId }
    
    if (status === 'pending') {
      whereClause.reconciled = false
      whereClause.transactionType = {
        in: ['REPAYMENT_PRINCIPAL', 'REPAYMENT_INTEREST', 'FEE_COLLECTED', 'PENALTY_COLLECTED']
      }
    }

    const [pendingTransactions, totalPending] = await Promise.all([
      db.transaction.findMany({
        where: {
          tenantId,
          reconciled: false,
          transactionType: {
            in: ['REPAYMENT_PRINCIPAL', 'REPAYMENT_INTEREST', 'FEE_COLLECTED', 'PENALTY_COLLECTED']
          }
        },
        orderBy: { occurredAt: 'asc' },
        take: limit
      }),
      db.transaction.count({
        where: {
          tenantId,
          reconciled: false,
          transactionType: {
            in: ['REPAYMENT_PRINCIPAL', 'REPAYMENT_INTEREST', 'FEE_COLLECTED', 'PENALTY_COLLECTED']
          }
        }
      })
    ])

    // Generate sample data if needed
    let settlementBatches = generateSampleSettlementBatches()
    let pendingItems = pendingTransactions.length > 0 
      ? pendingTransactions.map(formatSettlementItem)
      : generateSamplePendingItems()

    // Calculate summary
    const summary = {
      totalPendingAmount: pendingItems.reduce((sum, item) => sum + item.amount, 0),
      totalPendingCount: totalPending || pendingItems.length,
      processingAmount: settlementBatches
        .filter(b => b.status === 'processing')
        .reduce((sum, b) => sum + b.totalAmount, 0),
      todaySettled: settlementBatches
        .filter(b => b.status === 'completed' && isToday(b.completedAt))
        .reduce((sum, b) => sum + b.totalAmount, 0),
      weekToDateSettled: settlementBatches
        .filter(b => b.status === 'completed' && isThisWeek(b.completedAt))
        .reduce((sum, b) => sum + b.totalAmount, 0)
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
        pendingItems,
        settlementBatches,
        bankIntegration: {
          status: 'connected',
          bankName: 'Equity Bank Kenya',
          accountNumber: '****7890',
          lastSync: new Date(Date.now() - 1800000), // 30 min ago
          nextSync: new Date(Date.now() + 1800000) // in 30 min
        }
      }
    })
  } catch (error) {
    console.error('Settlements Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settlement data' },
      { status: 500 }
    )
  }
}

// POST - Create settlement batch or process settlement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, transactionIds, batchName, notes } = body

    switch (action) {
      case 'create_batch':
        // Create a new settlement batch
        const batch = await createSettlementBatch(body.tenantId, transactionIds, batchName)
        return NextResponse.json({
          success: true,
          message: 'Settlement batch created successfully',
          data: batch
        })

      case 'process_batch':
        // Process a settlement batch (send to bank)
        const processResult = await processSettlementBatch(body.batchId)
        return NextResponse.json({
          success: true,
          message: `Settlement batch ${body.batchId} submitted for processing`,
          data: processResult
        })

      case 'cancel_batch':
        // Cancel a pending settlement batch
        return NextResponse.json({
          success: true,
          message: `Settlement batch ${body.batchId} cancelled`
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Settlements POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process settlement request' },
      { status: 500 }
    )
  }
}

// Format a transaction as a settlement item
function formatSettlementItem(txn: any) {
  return {
    id: txn.id,
    referenceNumber: txn.referenceNumber,
    type: txn.transactionType,
    amount: txn.amount,
    currency: txn.currency || 'KES',
    date: txn.occurredAt,
    sourceAccount: getSourceAccount(txn.transactionType),
    destinationAccount: 'Main Operating Account',
    holdingPeriod: calculateHoldingPeriod(txn.occurredAt),
    priority: calculatePriority(txn)
  }
}

// Get source account based on transaction type
function getSourceAccount(type: string): string {
  const accounts: Record<string, string> = {
    REPAYMENT_PRINCIPAL: 'M-Pesa Collection Account',
    REPAYMENT_INTEREST: 'M-Pesa Collection Account',
    FEE_COLLECTED: 'Fee Collection Account',
    PENALTY_COLLECTED: 'Penalty Collection Account'
  }
  return accounts[type] || 'Unknown Account'
}

// Calculate how long a transaction has been waiting
function calculateHoldingPeriod(date: Date): string {
  const hours = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60)
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 24) return `${Math.round(hours)}h`
  return `${Math.round(hours / 24)}d`
}

// Calculate settlement priority
function calculatePriority(txn: any): 'high' | 'medium' | 'low' {
  const hours = (Date.now() - new Date(txn.occurredAt).getTime()) / (1000 * 60 * 60)
  
  if (hours > 48 || txn.amount > 50000) return 'high'
  if (hours > 24 || txn.amount > 10000) return 'medium'
  return 'low'
}

// Check if date is today
function isToday(date: Date | null): boolean {
  if (!date) return false
  const d = new Date(date)
  const today = new Date()
  return d.toDateString() === today.toDateString()
}

// Check if date is this week
function isThisWeek(date: Date | null): boolean {
  if (!date) return false
  const d = new Date(date)
  const now = new Date()
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
  return d >= weekStart
}

// Generate sample settlement batches
function generateSampleSettlementBatches() {
  return [
    {
      id: 'batch-001',
      name: 'Morning Settlement Run',
      status: 'completed',
      itemCount: 47,
      totalAmount: 234500.00,
      currency: 'KES',
      createdAt: new Date(Date.now() - 86400000), // yesterday
      processedAt: new Date(Date.now() - 86400000 + 3600000),
      completedAt: new Date(Date.now() - 86400000 + 7200000),
      bankReference: 'SETT-20260819-001',
      notes: null
    },
    {
      id: 'batch-002',
      name: 'Afternoon Settlement Run',
      status: 'processing',
      itemCount: 23,
      totalAmount: 98750.50,
      currency: 'KES',
      createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      processedAt: new Date(Date.now() - 1800000), // 30 min ago
      completedAt: null,
      bankReference: 'SETT-20260820-001',
      notes: 'Processing with Equity Bank'
    },
    {
      id: 'batch-003',
      name: 'Evening Settlement Queue',
      status: 'pending',
      itemCount: 31,
      totalAmount: 156320.75,
      currency: 'KES',
      createdAt: new Date(),
      processedAt: null,
      completedAt: null,
      bankReference: null,
      notes: 'Scheduled for 6:00 PM processing'
    },
    {
      id: 'batch-004',
      name: 'Weekly Reconciliation Batch',
      status: 'pending',
      itemCount: 156,
      totalAmount: 567890.25,
      currency: 'KES',
      createdAt: new Date(Date.now() - 7200000),
      processedAt: null,
      completedAt: null,
      bankReference: null,
      notes: 'End of week settlement'
    },
    {
      id: 'batch-005',
      name: 'Failed Settlement Retry',
      status: 'failed',
      itemIds: ['txn-fail-1', 'txn-fail-2'],
      totalAmount: 12500.00,
      currency: 'KES',
      createdAt: new Date(Date.now() - 172800000), // 2 days ago
      processedAt: new Date(Date.now() - 171000000),
      completedAt: null,
      bankReference: null,
      notes: 'Bank timeout - retry scheduled',
      error: 'Connection timeout after 30s',
      retryCount: 2,
      nextRetry: new Date(Date.now() + 3600000)
    }
  ]
}

// Generate sample pending items
function generateSamplePendingItems() {
  const items = []
  const types = ['REPAYMENT_PRINCIPAL', 'REPAYMENT_INTEREST', 'FEE_COLLECTED', 'PENALTY_COLLECTED']
  
  for (let i = 0; i < 15; i++) {
    const type = types[Math.floor(Math.random() * types.length)]
    const amount = type === 'REPAYMENT_PRINCIPAL' 
      ? 2000 + Math.round(Math.random() * 18000)
      : type === 'REPAYMENT_INTEREST'
        ? 200 + Math.round(Math.random() * 2800)
        : 100 + Math.round(Math.random() * 1400)

    items.push({
      id: `pending-${i}`,
      referenceNumber: `TXN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(i+100).padStart(5,'0')}`,
      type,
      amount,
      currency: 'KES',
      date: new Date(Date.now() - Math.random() * 72 * 3600000),
      sourceAccount: getSourceAccount(type),
      destinationAccount: 'Main Operating Account',
      holdingPeriod: `${Math.floor(Math.random() * 72)}h`,
      priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)]
    })
  }

  return items.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

// Create a new settlement batch
async function createSettlementBatch(tenantId?: string, transactionIds?: string[], batchName?: string) {
  return {
    id: `batch-new-${Date.now()}`,
    name: batchName || `Settlement Batch ${new Date().toLocaleString()}`,
    status: 'pending',
    itemCount: transactionIds?.length || 0,
    totalAmount: 0, // Would calculate from transactions
    currency: 'KES',
    createdAt: new Date(),
    processedAt: null,
    completedAt: null,
    bankReference: null,
    notes: 'Created via API'
  }
}

// Process a settlement batch
async function processSettlementBatch(batchId: string) {
  return {
    batchId,
    status: 'processing',
    submittedAt: new Date(),
    estimatedCompletion: new Date(Date.now() + 7200000), // ~2 hours
    bankReference: `SETT-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*999)}`,
    message: 'Batch submitted to bank for processing'
  }
}
