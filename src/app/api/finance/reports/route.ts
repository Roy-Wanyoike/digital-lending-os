import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Financial Reports API - P&L, Balance Sheet, Cash Flow
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId') || 'default-tenant'
    const reportType = searchParams.get('type') || 'income_statement' // income_statement | balance_sheet | cash_flow | journal
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const compareWith = searchParams.get('compareWith') // Previous period for comparison

    // Default to current month if no dates provided
    const now = new Date()
    const defaultStart = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const defaultEnd = endDate || now.toISOString().split('T')[0]

    switch (reportType) {
      case 'income_statement':
        return await getIncomeStatement(tenantId, defaultStart, defaultEnd, compareWith)
      
      case 'balance_sheet':
        return await getBalanceSheet(tenantId, defaultEnd)
      
      case 'cash_flow':
        return await getCashFlowStatement(tenantId, defaultStart, defaultEnd)
      
      case 'journal':
        return await getTransactionJournal(tenantId, defaultStart, defaultEnd)
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown report type: ${reportType}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Reports Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate financial report' },
      { status: 500 }
    )
  }
}

// Income Statement (Profit & Loss)
async function getIncomeStatement(
  tenantId: string,
  startDate: string,
  endDate: string,
  compareWith?: string | null
) {
  const currentPeriod = generatePLData(startDate, endDate)
  
  let previousPeriod = null
  if (compareWith) {
    const prevStartDate = getPreviousPeriodStart(startDate)
    const prevEndDate = getPreviousPeriodEnd(startDate)
    previousPeriod = generatePLData(prevStartDate, prevEndDate)
  }

  return NextResponse.json({
    success: true,
    data: {
      title: 'Income Statement',
      subtitle: 'Profit & Loss Statement',
      period: { start: startDate, end: endDate },
      currency: 'KES',
      currentPeriod,
      previousPeriod,
      comparison: previousPeriod ? calculateComparison(currentPeriod, previousPeriod) : null,
      generatedAt: new Date(),
      preparedBy: 'Digital Lending OS - Financial Module'
    }
  })
}

// Balance Sheet
async function getBalanceSheet(tenantId: string, asOfDate: string) {
  const assets = [
    {
      category: 'Current Assets',
      items: [
        { name: 'Cash & Bank Balances', amount: 2340000, subItems: [
          { name: 'Disbursement Account', amount: 1200000 },
          { name: 'Collection Account', amount: 890000 },
          { name: 'Fee Holding Account', amount: 145000 },
          { name: 'Reserve Fund', amount: 105000 }
        ]},
        { name: 'Loans Receivable (Gross)', amount: 8420000 },
        { name: 'Less: Provision for Bad Debts', amount: -252600, isDeduction: true },
        { name: 'Loans Receivable (Net)', amount: 8167400, isTotal: true, bold: true },
        { name: 'Interest Receivable', amount: 245000 },
        { name: 'Other Receivables', amount: 78500 }
      ],
      total: 10830900
    },
    {
      category: 'Non-Current Assets',
      items: [
        { name: 'Property & Equipment', amount: 4500000, subItems: [
          { name: 'Computer Equipment', amount: 1250000 },
          { name: 'Office Equipment', amount: 680000 },
          { name: 'Furniture & Fixtures', amount: 320000 },
          { name: 'Less: Accumulated Depreciation', amount: -2250000 }
        ]},
        { name: 'Intangible Assets', amount: 850000 }
      ],
      total: 3350000
    }
  ]

  const liabilities = [
    {
      category: 'Current Liabilities',
      items: [
        { name: 'Accounts Payable', amount: 145000 },
        { name: 'Customer Deposits', amount: 45000 },
        { name: 'Accrued Expenses', amount: 89000 },
        { name: 'Short-term Borrowings', amount: 500000 }
      ],
      total: 779000
    },
    {
      category: 'Long-term Liabilities',
      items: [
        { name: 'Long-term Debt', amount: 2000000 },
        { name: 'Deferred Tax Liability', amount: 125000 }
      ],
      total: 2125000
    }
  ]

  const equity = [
    {
      category: "Owner's Equity",
      items: [
        { name: 'Share Capital', amount: 5000000 },
        { name: 'Retained Earnings', amount: 6276900 },
        { name: 'Current Year Profit', amount: 167000 }
      ],
      total: 11443900
    }
  ]

  const totalAssets = assets.reduce((sum, cat) => sum + cat.total, 0)
  const totalLiabilities = liabilities.reduce((sum, cat) => sum + cat.total, 0)
  const totalEquity = equity.reduce((sum, cat) => sum + cat.total, 0)

  return NextResponse.json({
    success: true,
    data: {
      title: 'Balance Sheet',
      subtitle: 'Statement of Financial Position',
      asOfDate,
      currency: 'KES',
      assets,
      liabilities,
      equity,
      totals: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalLiabilityAndEquity: totalLiabilities + totalEquity,
        isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1
      },
      generatedAt: new Date(),
      preparedBy: 'Digital Lending OS - Financial Module'
    }
  })
}

// Cash Flow Statement
async function getCashFlowStatement(tenantId: string, startDate: string, endDate: string) {
  const operatingActivities = [
    { description: 'Cash received from loan repayments (principal)', amount: 1850000 },
    { description: 'Cash received from interest payments', amount: 567000 },
    { description: 'Cash received from fees', amount: 145000 },
    { description: 'Cash received from penalties', amount: 34000 },
    { description: 'Cash paid for loan disbursements', amount: -3800000 },
    { description: 'Cash paid for operating expenses', amount: -456000 },
    { description: 'Cash paid for bad debt write-offs', amount: -89000 },
    { description: 'Net Cash from Operating Activities', amount: -1749000, isSubtotal: true, bold: true }
  ]

  const investingActivities = [
    { description: 'Purchase of computer equipment', amount: -125000 },
    { description: 'Purchase of office equipment', amount: -68000 },
    { description: 'Proceeds from sale of equipment', amount: 15000 },
    { description: 'Net Cash from Investing Activities', amount: -178000, isSubtotal: true, bold: true }
  ]

  const financingActivities = [
    { description: 'Proceeds from long-term borrowing', amount: 1000000 },
    { description: 'Repayment of long-term debt', amount: -200000 },
    { description: 'Dividends paid', amount: -150000 },
    { description: 'Net Cash from Financing Activities', amount: 650000, isSubtotal: true, bold: true }
  ]

  const netChangeInCash = operatingActivities[operatingActivities.length - 1].amount +
    investingActivities[investingActivities.length - 1].amount +
    financingActivities[financingActivities.length - 1].amount

  return NextResponse.json({
    success: true,
    data: {
      title: 'Cash Flow Statement',
      subtitle: 'Statement of Cash Flows',
      period: { start: startDate, end: endDate },
      currency: 'KES',
      sections: {
        operating: { name: 'Operating Activities', items: operatingActivities },
        investing: { name: 'Investing Activities', items: investingActivities },
        financing: { name: 'Financing Activities', items: financingActivities }
      },
      summary: {
        netChangeInCash,
        openingBalance: 3840000,
        closingBalance: 2567000,
        netDecrease: Math.abs(netChangeInCash) > netChangeInCash
      },
      generatedAt: new Date(),
      preparedBy: 'Digital Lending OS - Financial Module'
    }
  })
}

// Transaction Journal
async function getTransactionJournal(tenantId: string, startDate: string, endDate: string) {
  const transactions = await db.transaction.findMany({
    where: {
      tenantId,
      occurredAt: {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59')
      }
    },
    orderBy: { occurredAt: 'asc' },
    take: 100
  })

  let journalEntries = transactions.map(txn => ({
    date: txn.occurredAt,
    reference: txn.referenceNumber,
    account: txn.debitAccount,
    debit: txn.amount,
    credit: null,
    description: txn.description || txn.transactionType.replace(/_/g, ' '),
    type: txn.transactionType,
    reconciled: txn.reconciled
  })).flatMap(entry => [entry, {
    ...entry,
    account: entry.account === txn.debitAccount ? 
      (txn.creditAccount || 'Counter Account') : entry.account,
    debit: null,
    credit: txn.amount
  }])

  // Generate sample if empty
  if (journalEntries.length === 0) {
    journalEntries = generateSampleJournalEntries(startDate, endDate)
  }

  return NextResponse.json({
    success: true,
    data: {
      title: 'Transaction Journal',
      period: { start: startDate, end: endDate },
      entries: journalEntries,
      totals: {
        totalDebits: journalEntries.reduce((sum, e) => sum + (e.debit || 0), 0),
        totalCredits: journalEntries.reduce((sum, e) => sum + (e.credit || 0), 0)
      },
      generatedAt: new Date()
    }
  })
}

// Helper functions for P&L generation
function generatePLData(startDate: string, endDate: string) {
  return {
    revenue: {
      interestIncome: 567000,
      feeIncome: 145000,
      penaltyIncome: 34000,
      otherIncome: 12000,
      totalRevenue: 758000
    },
    expenses: {
      interestExpense: 0,
      operatingExpenses: 456000,
      badDebtExpense: 89000,
      provisionExpense: 34000,
      depreciationExpense: 8500,
      otherExpenses: 11500,
      totalExpenses: 599000
    },
    grossProfit: 758000,
    operatingIncome: 202000,
    netIncomeBeforeTax: 159000,
    taxExpense: 0,
    netIncome: 159000,
    profitMargin: ((159000 / 758000) * 100).toFixed(1)
  }
}

function calculateComparison(current: any, previous: any) {
  return {
    revenueChange: (((current.revenue.totalRevenue - previous.revenue.totalRevenue) / previous.revenue.totalRevenue) * 100).toFixed(1),
    expenseChange: (((current.expenses.totalExpenses - previous.expenses.totalExpenses) / previous.expenses.totalExpenses) * 100).toFixed(1),
    profitChange: (((current.netIncome - previous.netIncome) / previous.netIncome) * 100).toFixed(1),
    marginChange: (parseFloat(current.profitMargin) - parseFloat(previous.profitMargin)).toFixed(1)
  }
}

function getPreviousPeriodStart(currentStart: string): string {
  const start = new Date(currentStart)
  start.setMonth(start.getMonth() - 1)
  return start.toISOString().split('T')[0]
}

function getPreviousPeriodEnd(currentStart: string): string {
  const end = new Date(currentStart)
  end.setDate(0) // Last day of previous month
  return end.toISOString().split('T')[0]
}

// Generate sample journal entries
function generateSampleJournalEntries(startDate: string, endDate: string) {
  const entries = []
  const types = [
    { type: 'DISBURSEMENT', debit: 'Loans Receivable', credit: 'Cash - Disbursement' },
    { type: 'REPAYMENT_PRINCIPAL', debit: 'Cash - Collection', credit: 'Loans Receivable' },
    { type: 'REPAYMENT_INTEREST', debit: 'Cash - Collection', credit: 'Interest Revenue' },
    { type: 'FEE_COLLECTED', debit: 'Cash - Fee Account', credit: 'Fee Revenue' }
  ]
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  
  for (let i = 0; i < Math.min(daysDiff, 30); i++) {
    const txnType = types[i % types.length]
    const amount = txnType.type === 'DISBURSEMENT' 
      ? 10000 + Math.round(Math.random() * 40000)
      : 1000 + Math.round(Math.random() * 9000)
    const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)

    entries.push(
      {
        date,
        reference: `TXN-${date.toISOString().slice(0,10).replace(/-/g,'')}-${String(i+1).padStart(5,'0')}`,
        account: txnType.debit,
        debit: amount,
        credit: null,
        description: `${txnType.type.replace(/_/g, ' ')}`,
        type: txnType.type,
        reconciled: Math.random() > 0.2
      },
      {
        date,
        reference: `TXN-${date.toISOString().slice(0,10).replace(/-/g,'')}-${String(i+1).padStart(5,'0')}`,
        account: txnType.credit,
        debit: null,
        credit: amount,
        description: `${txnType.type.replace(/_/g, ' ')}`,
        type: txnType.type,
        reconciled: Math.random() > 0.2
      }
    )
  }

  return entries
}
