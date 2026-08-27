'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FileText,
  Download,
  Printer,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Scale,
  BarChart3,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar
} from 'lucide-react'

// Types
interface FinancialStatementData {
  balanceSheet: BalanceSheetData
  incomeStatement: IncomeStatementData
  cashFlow: CashFlowData
}

interface BalanceSheetData {
  assets: AssetSection[]
  totalAssets: number
  liabilities: LiabilitySection[]
  totalLiabilities: number
  equity: EquitySection[]
  totalEquity: number
}

interface AssetSection {
  category: string
  items: Array<{ name: string; amount: number; previousAmount?: number }>
  total: number
}

interface LiabilitySection {
  category: string
  items: Array<{ name: string; amount: number; previousAmount?: number }>
  total: number
}

interface EquitySection {
  name: string
  amount: number
  previousAmount?: number
}

interface IncomeStatementData {
  revenue: RevenueItem[]
  totalRevenue: number
  expenses: ExpenseItem[]
  totalExpenses: number
  netIncome: number
  previousNetIncome?: number
}

interface RevenueItem {
  category: string
  items: Array<{ name: string; amount: number; previousAmount?: number }>
  total: number
}

interface ExpenseItem {
  category: string
  items: Array<{ name: string; amount: number; previousAmount?: number }>
  total: number
}

interface CashFlowData {
  operating: CashFlowItem[]
  operatingTotal: number
  investing: CashFlowItem[]
  investingTotal: number
  financing: CashFlowItem[]
  financingTotal: number
  netChange: number
  openingBalance: number
  closingBalance: number
}

interface CashFlowItem {
  description: string
  amount: number
}

type PeriodType = 'this_month' | 'last_month' | 'quarter' | 'ytd' | 'custom'

// Mock Data Generators
const generateBalanceSheet = (): BalanceSheetData => ({
  assets: [
    {
      category: 'Current Assets',
      items: [
        { name: 'Cash - Operating Account', amount: 2850000, previousAmount: 2650000 },
        { name: 'Cash - Disbursement Float', amount: 1500000, previousAmount: 1800000 },
        { name: 'Cash - Collection Account', amount: 4250000, previousAmount: 3900000 },
        { name: 'Cash - Reserve Fund', amount: 800000, previousAmount: 800000 },
        { name: 'Cash - Fees Account', amount: 450000, previousAmount: 380000 }
      ],
      total: 9850000
    },
    {
      category: 'Loans Receivable',
      items: [
        { name: 'Current Loans (Performing)', amount: 38500000, previousAmount: 35200000 },
        { name: 'Loans in Arrears (1-30 days)', amount: 4200000, previousAmount: 3800000 },
        { name: 'Loans in Arrears (31-60 days)', amount: 1850000, previousAmount: 1650000 },
        { name: 'Loans in Arrears (60+ days)', amount: 1350000, previousAmount: 1200000 }
      ],
      total: 45900000
    },
    {
      category: 'Other Assets',
      items: [
        { name: 'Interest Receivable', amount: 485000, previousAmount: 420000 },
        { name: 'Fees Receivable', amount: 125000, previousAmount: 110000 },
        { name: 'Prepaid Expenses', amount: 85000, previousAmount: 90000 }
      ],
      total: 695000
    }
  ],
  totalAssets: 56445000,
  liabilities: [
    {
      category: 'Current Liabilities',
      items: [
        { name: 'Accounts Payable', amount: 450000, previousAmount: 520000 },
        { name: 'Accrued Expenses', amount: 285000, previousAmount: 310000 },
        { name: 'Customer Deposits (Float)', amount: 1500000, previousAmount: 1800000 },
        { name: 'Unearned Fee Revenue', amount: 185000, previousAmount: 165000 }
      ],
      total: 2420000
    },
    {
      category: 'Long-term Liabilities',
      items: [
        { name: 'Long-term Debt', amount: 5000000, previousAmount: 5000000 },
        { name: 'Deferred Tax Liability', amount: 320000, previousAmount: 295000 }
      ],
      total: 5320000
    }
  ],
  totalLiabilities: 7740000,
  equity: [
    { name: 'Share Capital', amount: 10000000, previousAmount: 10000000 },
    { name: 'Retained Earnings', amount: 38705000, previousAmount: 35630000 },
    { name: 'Current Period Profit', amount: -55000, previousAmount: 480000 }
  ],
  totalEquity: 48705000
})

const generateIncomeStatement = (): IncomeStatementData => ({
  revenue: [
    {
      category: 'Interest Income',
      items: [
        { name: 'Interest on Performing Loans', amount: 2850000, previousAmount: 2620000 },
        { name: 'Late Payment Interest', amount: 385000, previousAmount: 345000 }
      ],
      total: 3235000
    },
    {
      category: 'Fee Income',
      items: [
        { name: 'Processing/Origination Fees', amount: 685000, previousAmount: 620000 },
        { name: 'Service Charges', amount: 145000, previousAmount: 132000 },
        { name: 'Penalty Fees', amount: 225000, previousAmount: 198000 }
      ],
      total: 1055000
    },
    {
      category: 'Other Income',
      items: [
        { name: 'Write-off Recoveries', amount: 35000, previousAmount: 28000 },
        { name: 'Other Operating Income', amount: 25000, previousAmount: 22000 }
      ],
      total: 60000
    }
  ],
  totalRevenue: 4350000,
  expenses: [
    {
      category: 'Cost of Funds',
      items: [
        { name: 'Interest Expense', amount: 850000, previousAmount: 820000 },
        { name: 'Bank Charges', amount: 125000, previousAmount: 118000 }
      ],
      total: 975000
    },
    {
      category: 'Operating Expenses',
      items: [
        { name: 'Staff Costs & Salaries', amount: 1250000, previousAmount: 1180000 },
        { name: 'M-Pesa/Bank Transaction Fees', amount: 485000, previousAmount: 452000 },
        { name: 'Technology & Software', amount: 185000, previousAmount: 175000 },
        { name: 'Office & Administrative', amount: 145000, previousAmount: 138000 },
        { name: 'Marketing & Customer Acquisition', amount: 285000, previousAmount: 265000 },
        { name: 'Provisions for Bad Debts', amount: 650000, previousAmount: 580000 }
      ],
      total: 3000000
    },
    {
      category: 'Other Expenses',
      items: [
        { name: 'Depreciation', amount: 85000, previousAmount: 85000 },
        { name: 'Professional Fees', amount: 45000, previousAmount: 52000 }
      ],
      total: 130000
    }
  ],
  totalExpenses: 4105000,
  netIncome: 245000,
  previousNetIncome: 265000
})

const generateCashFlow = (): CashFlowData => ({
  operating: [
    { description: 'Collections from Customers', amount: 8250000 },
    { description: 'Interest Received', amount: 2850000 },
    { description: 'Fees Received', amount: 1055000 },
    { description: 'Disbursements to Borrowers', amount: -6800000 },
    { description: 'M-Pesa/Bank Transaction Fees Paid', amount: -485000 },
    { description: 'Staff Salaries Paid', amount: -1250000 },
    { description: 'Operating Expenses Paid', amount: -415000 },
    { description: 'Tax Paid', amount: -75000 }
  ],
  operatingTotal: 3030000,
  investing: [
    { description: 'Purchase of Equipment', amount: -150000 },
    { description: 'Software Development', amount: -85000 }
  ],
  investingTotal: -235000,
  financing: [
    { description: 'Capital Contributions', amount: 0 },
    { description: 'Dividends Paid', amount: -200000 },
    { description: 'Owner Drawings', amount: -100000 }
  ],
  financingTotal: -300000,
  netChange: 2495000,
  openingBalance: 9850000,
  closingBalance: 12345000
})

// Format helpers
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function formatPercentChange(current: number, previous: number): string {
  if (!previous || previous === 0) return 'N/A'
  const change = ((current - previous) / Math.abs(previous)) * 100
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
}

function getChangeIndicator(current: number, previous?: number) {
  if (!previous) return null
  
  const isPositive = current > previous
  const percent = formatPercentChange(current, previous)
  
  return (
    <span className={`flex items-center gap-1 text-xs ${
      Math.abs(current - previous) < 1 ? 'text-muted-foreground' :
      isPositive ? 'text-emerald-600' : 'text-red-600'
    }`}>
      {Math.abs(current - previous) >= 1 && (
        isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
      )}
      {percent}
    </span>
  )
}

const periodOptions: Array<{ value: PeriodType; label: string }> = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'custom', label: 'Custom Range' }
]

export function FinancialStatements() {
  const [data, setData] = useState<FinancialStatementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodType>('this_month')
  const [activeTab, setActiveTab] = useState('balance-sheet')

  useEffect(() => {
    const timer = setTimeout(() => {
      setData({
        balanceSheet: generateBalanceSheet(),
        incomeStatement: generateIncomeStatement(),
        cashFlow: generateCashFlow()
      })
      setLoading(false)
    }, 800)
    
    return () => clearTimeout(timer)
  }, [period])

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => {
      setData({
        balanceSheet: generateBalanceSheet(),
        incomeStatement: generateIncomeStatement(),
        cashFlow: generateCashFlow()
      })
      setLoading(false)
    }, 600)
  }

  const handlePrint = () => window.print()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="w-6 h-6 text-slate-600" />
            Financial Statements
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            Balance Sheet, Income Statement & Cash Flow reports
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Statements Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="balance-sheet" className="gap-2">
            <Scale className="w-4 h-4" />
            <span className="hidden sm:inline">Balance Sheet</span>
          </TabsTrigger>
          <TabsTrigger value="income-statement" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Income Statement</span>
          </TabsTrigger>
          <TabsTrigger value="cash-flow" className="gap-2">
            <ArrowUpRight className="w-4 h-4" />
            <span className="hidden sm:inline">Cash Flow</span>
          </TabsTrigger>
        </TabsList>

        {/* Balance Sheet Tab */}
        <TabsContent value="balance-sheet" className="mt-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Statement of Financial Position</span>
                <Badge variant="secondary">{periodOptions.find(p => p.value === period)?.label}</Badge>
              </CardTitle>
              <CardDescription>As at {new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-8 bg-muted rounded" />
                  ))}
                </div>
              ) : data ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Assets */}
                  <div>
                    <h4 className="font-bold text-lg mb-4 pb-2 border-b-2 border-primary">ASSETS</h4>
                    <div className="space-y-4">
                      {data.balanceSheet.assets.map(section => (
                        <div key={section.category}>
                          <p className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                            {section.category}
                          </p>
                          <Table>
                            <TableBody>
                              {section.items.map(item => (
                                <TableRow key={item.name}>
                                  <TableCell className="pl-0">{item.name}</TableCell>
                                  <TableCell className="text-right font-mono">
                                    {formatCurrency(item.amount)}
                                  </TableCell>
                                  <TableCell className="text-right w-20">
                                    {getChangeIndicator(item.amount, item.previousAmount)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="border-t-2">
                                <TableCell className="pl-0 font-semibold">Total {section.category}</TableCell>
                                <TableCell className="text-right font-mono font-bold">
                                  {formatCurrency(section.total)}
                                </TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      ))}
                      
                      <div className="pt-4 mt-4 border-t-4 border-primary">
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell className="pl-0 font-bold text-lg">TOTAL ASSETS</TableCell>
                              <TableCell className="text-right font-mono font-bold text-lg">
                                {formatCurrency(data.balanceSheet.totalAssets)}
                              </TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  {/* Liabilities & Equity */}
                  <div>
                    <h4 className="font-bold text-lg mb-4 pb-2 border-b-2 border-red-500">LIABILITIES</h4>
                    <div className="space-y-4">
                      {data.balanceSheet.liabilities.map(section => (
                        <div key={section.category}>
                          <p className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                            {section.category}
                          </p>
                          <Table>
                            <TableBody>
                              {section.items.map(item => (
                                <TableRow key={item.name}>
                                  <TableCell className="pl-0">{item.name}</TableCell>
                                  <TableCell className="text-right font-mono">
                                    {formatCurrency(item.amount)}
                                  </TableCell>
                                  <TableCell className="text-right w-20">
                                    {getChangeIndicator(item.amount, item.previousAmount)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="border-t-2">
                                <TableCell className="pl-0 font-semibold">Total {section.category}</TableCell>
                                <TableCell className="text-right font-mono font-bold">
                                  {formatCurrency(section.total)}
                                </TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      ))}
                      
                      <div className="pt-2 mt-2 border-t-2 border-red-500">
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell className="pl-0 font-bold">TOTAL LIABILITIES</TableCell>
                              <TableCell className="text-right font-mono font-bold">
                                {formatCurrency(data.balanceSheet.totalLiabilities)}
                              </TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <h4 className="font-bold text-lg mt-6 mb-4 pb-2 border-b-2 border-emerald-500">EQUITY</h4>
                    <Table>
                      <TableBody>
                        {data.balanceSheet.equity.map(item => (
                          <TableRow key={item.name}>
                            <TableCell className="pl-0">{item.name}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(item.amount)}
                            </TableCell>
                            <TableCell className="text-right w-20">
                              {getChangeIndicator(item.amount, item.previousAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2 border-emerald-500">
                          <TableCell className="pl-0 font-bold">TOTAL EQUITY</TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {formatCurrency(data.balanceSheet.totalEquity)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    <div className="mt-6 pt-4 border-t-4 border-slate-400">
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="pl-0 font-bold text-lg">TOTAL LIABILITIES & EQUITY</TableCell>
                            <TableCell className="text-right font-mono font-bold text-lg">
                              {formatCurrency(data.balanceSheet.totalLiabilities + data.balanceSheet.totalEquity)}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income Statement Tab */}
        <TabsContent value="income-statement" className="mt-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Income Statement (Profit & Loss)</span>
                <Badge variant="secondary">{periodOptions.find(p => p.value === period)?.label}</Badge>
              </CardTitle>
              <CardDescription>For the period ended {new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="h-8 bg-muted rounded" />
                  ))}
                </div>
              ) : data ? (
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* Revenue Section */}
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
                    <h4 className="font-bold text-emerald-800 dark:text-emerald-200 mb-4 flex items-center gap-2">
                      <ArrowUpRight className="w-5 h-5" />
                      REVENUE
                    </h4>
                    
                    {data.incomeStatement.revenue.map(section => (
                      <div key={section.category} className="mb-4 last:mb-0">
                        <p className="font-medium text-sm text-emerald-700 dark:text-emerald-300 mb-2">{section.category}</p>
                        <div className="ml-4 space-y-1">
                          {section.items.map(item => (
                            <div key={item.name} className="flex justify-between text-sm py-1">
                              <span>{item.name}</span>
                              <div className="flex items-center gap-4">
                                    <span className="font-mono w-28 text-right">{formatCurrency(item.amount)}</span>
                                    <span className="w-16 text-right">{getChangeIndicator(item.amount, item.previousAmount)}</span>
                                  </div>
                                </div>
                              ))}
                              <div className="flex justify-between py-1 border-t border-emerald-200 dark:border-emerald-700 font-medium">
                                <span>Total {section.category}</span>
                                <span className="font-mono">{formatCurrency(section.total)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        <div className="flex justify-between pt-4 mt-2 border-t-2 border-emerald-300 dark:border-emerald-600 font-bold text-lg">
                          <span>TOTAL REVENUE</span>
                          <span className="font-mono text-emerald-700 dark:text-emerald-300">
                            {formatCurrency(data.incomeStatement.totalRevenue)}
                          </span>
                        </div>
                      </div>

                  {/* Expenses Section */}
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <h4 className="font-bold text-red-800 dark:text-red-200 mb-4 flex items-center gap-2">
                      <ArrowDownLeft className="w-5 h-5" />
                      EXPENSES
                    </h4>
                    
                    {data.incomeStatement.expenses.map(section => (
                      <div key={section.category} className="mb-4 last:mb-0">
                        <p className="font-medium text-sm text-red-700 dark:text-red-300 mb-2">{section.category}</p>
                        <div className="ml-4 space-y-1">
                          {section.items.map(item => (
                            <div key={item.name} className="flex justify-between text-sm py-1">
                              <span>{item.name}</span>
                              <div className="flex items-center gap-4">
                                <span className="font-mono w-28 text-right">{formatCurrency(item.amount)}</span>
                                <span className="w-16 text-right">{getChangeIndicator(-item.amount, item.previousAmount ? -item.previousAmount : undefined)}</span>
                              </div>
                            </div>
                          ))}
                          <div className="flex justify-between py-1 border-t border-red-200 dark:border-red-700 font-medium">
                            <span>Total {section.category}</span>
                            <span className="font-mono">{formatCurrency(section.total)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-between pt-4 mt-2 border-t-2 border-red-300 dark:border-red-600 font-bold text-lg">
                      <span>TOTAL EXPENSES</span>
                      <span className="font-mono text-red-700 dark:text-red-300">
                        ({formatCurrency(data.incomeStatement.totalExpenses)})
                      </span>
                    </div>
                  </div>

                  {/* Net Income */}
                  <div className={`rounded-lg p-6 text-center ${
                    data.incomeStatement.netIncome >= 0 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' 
                      : 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                  }`}>
                    <p className="text-sm uppercase tracking-wide opacity-90 mb-2">NET INCOME / (LOSS)</p>
                    <p className="text-4xl font-bold font-mono">
                      {formatCurrency(data.incomeStatement.netIncome)}
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      {getChangeIndicator(
                        data.incomeStatement.netIncome, 
                        data.incomeStatement.previousNetIncome
                      )}
                      <span className="text-sm opacity-80">vs. Previous Period</span>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Gross Margin</p>
                      <p className="text-xl font-bold text-emerald-600">
                        {((data.incomeStatement.totalRevenue - data.incomeStatement.expenses[0].total) / data.incomeStatement.totalRevenue * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Operating Margin</p>
                      <p className="text-xl font-bold text-blue-600">
                        {((data.incomeStatement.totalRevenue - data.incomeStatement.totalExpenses + data.incomeStatement.expenses[2].total) / data.incomeStatement.totalRevenue * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Net Margin</p>
                      <p className={`text-xl font-bold ${data.incomeStatement.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {(data.incomeStatement.netIncome / data.incomeStatement.totalRevenue * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cash-flow" className="mt-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Statement of Cash Flows</span>
                <Badge variant="secondary">{periodOptions.find(p => p.value === period)?.label}</Badge>
              </CardTitle>
              <CardDescription>For the period ended {new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  {[...Array(15)].map((_, i) => (
                    <div key={i} className="h-8 bg-muted rounded" />
                  ))}
                </div>
              ) : data ? (
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* Operating Activities */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-base uppercase tracking-wide text-blue-700 dark:text-blue-400 flex items-center gap-2 pb-2 border-b-2 border-blue-200">
                      CASH FLOWS FROM OPERATING ACTIVITIES
                    </h4>
                    <div className="ml-4 space-y-1">
                      {data.cashFlow.operating.map(item => (
                        <div key={item.description} className="flex justify-between text-sm py-1.5">
                          <span>{item.description}</span>
                          <span className={`font-mono w-32 text-right ${item.amount >= 0 ? '' : 'text-red-600'}`}>
                            {item.amount >= 0 ? '' : '('}{formatCurrency(Math.abs(item.amount))}{item.amount < 0 ? ')' : ''}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2 mt-2 border-t-2 border-blue-300 font-bold">
                        <span>Net Cash from Operating Activities</span>
                        <span className="font-mono text-blue-700 dark:text-blue-400">
                          {formatCurrency(data.cashFlow.operatingTotal)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Investing Activities */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-base uppercase tracking-wide text-purple-700 dark:text-purple-400 flex items-center gap-2 pb-2 border-b-2 border-purple-200">
                      CASH FLOWS FROM INVESTING ACTIVITIES
                    </h4>
                    <div className="ml-4 space-y-1">
                      {data.cashFlow.investing.map(item => (
                        <div key={item.description} className="flex justify-between text-sm py-1.5">
                          <span>{item.description}</span>
                          <span className="font-mono w-32 text-right text-red-600">
                            ({formatCurrency(Math.abs(item.amount))})
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2 mt-2 border-t-2 border-purple-300 font-bold">
                        <span>Net Cash from Investing Activities</span>
                        <span className="font-mono text-red-600">
                          ({formatCurrency(Math.abs(data.cashFlow.investingTotal))})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financing Activities */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-base uppercase tracking-wide text-amber-700 dark:text-amber-400 flex items-center gap-2 pb-2 border-b-2 border-amber-200">
                      CASH FLOWS FROM FINANCING ACTIVITIES
                    </h4>
                    <div className="ml-4 space-y-1">
                      {data.cashFlow.financing.map(item => (
                        <div key={item.description} className="flex justify-between text-sm py-1.5">
                          <span>{item.description}</span>
                          <span className={`font-mono w-32 text-right ${item.amount >= 0 ? '' : 'text-red-600'}`}>
                            {item.amount >= 0 ? '' : '('}{formatCurrency(Math.abs(item.amount))}{item.amount < 0 ? ')' : ''}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2 mt-2 border-t-2 border-amber-300 font-bold">
                        <span>Net Cash from Financing Activities</span>
                        <span className={`font-mono ${data.cashFlow.financingTotal >= 0 ? 'text-amber-700' : 'text-red-600'}`}>
                          {data.cashFlow.financingTotal >= 0 ? '' : '('}{formatCurrency(Math.abs(data.cashFlow.financingTotal))}{data.cashFlow.financingTotal < 0 ? ')' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="space-y-2 pt-4 border-t-4">
                    <div className="flex justify-between py-2 font-medium">
                      <span>Net Increase/(Decrease) in Cash</span>
                      <span className={`font-mono font-bold ${data.cashFlow.netChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {data.cashFlow.netChange >= 0 ? '+' : ''}{formatCurrency(data.cashFlow.netChange)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 text-muted-foreground">
                      <span>Cash at Beginning of Period</span>
                      <span className="font-mono">{formatCurrency(data.cashFlow.openingBalance)}</span>
                    </div>
                    <div className="flex justify-between py-3 mt-2 border-t-2 border-primary font-bold text-lg">
                      <span>CASH AT END OF PERIOD</span>
                      <span className="font-mono text-primary">
                        {formatCurrency(data.cashFlow.closingBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default FinancialStatements
