'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  FileText,
  Download,
  Printer,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

// Types
interface IncomeStatement {
  revenue: {
    interestIncome: number
    feeIncome: number
    penaltyIncome: number
    otherIncome: number
    totalRevenue: number
  }
  expenses: {
    interestExpense: number
    operatingExpenses: number
    badDebtExpense: number
    provisionExpense: number
    depreciationExpense: number
    otherExpenses: number
    totalExpenses: number
  }
  grossProfit: number
  operatingIncome: number
  netIncomeBeforeTax: number
  taxExpense: number
  netIncome: number
  profitMargin: string
}

interface BalanceSheetData {
  assets: Array<{
    category: string
    items: Array<{
      name: string
      amount: number
      subItems?: Array<{ name: string; amount: number }>
      isDeduction?: boolean
      isTotal?: boolean
      bold?: boolean
    }>
    total: number
  }>
  liabilities: Array<{
    category: string
    items: Array<{ name: string; amount: number }>
    total: number
  }>
  equity: Array<{
    category: string
    items: Array<{ name: string; amount: number }>
    total: number
  }>
  totals: {
    totalAssets: number
    totalLiabilities: number
    totalEquity: number
    totalLiabilityAndEquity: number
    isBalanced: boolean
  }
}

interface CashFlowData {
  sections: {
    operating: { name: string; items: Array<{ description: string; amount: number; isSubtotal?: boolean; bold?: boolean }> }
    investing: { name: string; items: Array<{ description: string; amount: number; isSubtotal?: boolean; bold?: boolean }> }
    financing: { name: string; items: Array<{ description: string; amount: number; isSubtotal?: boolean; bold?: boolean }> }
  }
  summary: {
    netChangeInCash: number
    openingBalance: number
    closingBalance: number
    netDecrease: boolean
  }
}

export function FinancialReports() {
  const [reportType, setReportType] = useState<'income_statement' | 'balance_sheet' | 'cash_flow'>('income_statement')
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  
  // Report data states
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null)
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null)
  const [cashFlow, setCashFlow] = useState<CashFlowData | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [compareWith, setCompareWith] = useState<string>('previous_period')

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        tenantId: 'default-tenant',
        type: reportType,
        startDate,
        endDate,
        compareWith
      })
      
      const response = await fetch(`/api/finance/reports?${params}`)
      const result = await response.json()
      
      if (result.success) {
        switch (reportType) {
          case 'income_statement':
            setIncomeStatement(result.data.currentPeriod)
            break
          case 'balance_sheet':
            setBalanceSheet(result.data)
            break
          case 'cash_flow':
            setCashFlow(result.data)
            break
        }
      } else {
        setError(result.error || 'Failed to generate report')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [reportType, startDate, endDate, compareWith])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  // Format helpers
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDateRange = (): string => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return `${start.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="w-6 h-6 text-slate-600" />
            Financial Reports
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            Generate and export financial statements
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={fetchReport}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Report Type Selector & Date Range */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* Report Type Tabs */}
            <Tabs value={reportType} onValueChange={(v) => setReportType(v as typeof reportType)}>
              <TabsList className="bg-slate-100 dark:bg-slate-800">
                <TabsTrigger value="income_statement" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  P&L
                </TabsTrigger>
                <TabsTrigger value="balance_sheet" className="gap-2">
                  <PieChart className="w-4 h-4" />
                  Balance Sheet
                </TabsTrigger>
                <TabsTrigger value="cash_flow" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Cash Flow
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="h-8 w-px bg-border hidden md:block" />

            {/* Date Range */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[150px]"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[150px]"
                />
              </div>
              
              <Select value={compareWith} onValueChange={setCompareWith}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Compare with" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Comparison</SelectItem>
                  <SelectItem value="previous_period">Previous Period</SelectItem>
                  <SelectItem value="previous_year">Previous Year</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={fetchReport} disabled={loading}>
                Generate
              </Button>
            </div>
          </div>
          
          {/* Period Display */}
          <p className="text-sm text-muted-foreground mt-3">
            Reporting Period: {formatDateRange()}
          </p>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-destructive text-center">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Income Statement */}
      {reportType === 'income_statement' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center justify-between">
              <span>Income Statement</span>
              <Badge variant="secondary">{formatDateRange()}</Badge>
            </CardTitle>
            <CardDescription>Profit & Loss Statement for the reporting period</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4 animate-pulse">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded" />
                ))}
              </div>
            ) : incomeStatement ? (
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Revenue Section */}
                <div className="space-y-2">
                  <h4 className="font-bold text-lg text-emerald-700 dark:text-emerald-400 uppercase tracking-wide border-b pb-2">
                    Revenue
                  </h4>
                  
                  <ReportRow label="Interest Income" value={incomeStatement.revenue.interestIncome} indent={1} />
                  <ReportRow label="Fee Income" value={incomeStatement.revenue.feeIncome} indent={1} />
                  <ReportRow label="Penalty Income" value={incomeStatement.revenue.penaltyIncome} indent={1} />
                  <ReportRow label="Other Income" value={incomeStatement.revenue.otherIncome} indent={1} />
                  <ReportRow 
                    label="Total Revenue" 
                    value={incomeStatement.revenue.totalRevenue} 
                    bold 
                    className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded"
                  />
                </div>

                {/* Expenses Section */}
                <div className="space-y-2">
                  <h4 className="font-bold text-lg text-red-700 dark:text-red-400 uppercase tracking-wide border-b pb-2">
                    Expenses
                  </h4>
                  
                  <ReportRow label="Operating Expenses" value={incomeStatement.expenses.operatingExpenses} indent={1} />
                  <ReportRow label="Bad Debt Expense" value={incomeStatement.expenses.badDebtExpense} indent={1} />
                  <ReportRow label="Provision Expense" value={incomeStatement.expenses.provisionExpense} indent={1} />
                  <ReportRow label="Depreciation Expense" value={incomeStatement.expenses.depreciationExpense} indent={1} />
                  <ReportRow label="Other Expenses" value={incomeStatement.expenses.otherExpenses} indent={1} />
                  <ReportRow 
                    label="Total Expenses" 
                    value={incomeStatement.expenses.totalExpenses} 
                    bold 
                    className="bg-red-50 dark:bg-red-900/20 p-2 rounded"
                  />
                </div>

                {/* Summary */}
                <div className="space-y-3 pt-4 border-t-2">
                  <ReportRow 
                    label="Net Income" 
                    value={incomeStatement.netIncome} 
                    bold 
                    large
                    className={`p-4 rounded-lg ${incomeStatement.netIncome >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}
                  />
                  
                  <div className="text-center pt-2">
                    <Badge variant="secondary" className="text-sm px-4 py-1">
                      Profit Margin: {incomeStatement.profitMargin}%
                    </Badge>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Balance Sheet */}
      {reportType === 'balance_sheet' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center justify-between">
              <span>Balance Sheet</span>
              <Badge variant="secondary">As of {new Date(endDate).toLocaleDateString('en-KE')}</Badge>
            </CardTitle>
            <CardDescription>Statement of Financial Position</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="grid grid-cols-2 gap-8">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded" />
                  ))}
                </div>
              </div>
            ) : balanceSheet ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {/* Assets */}
                <div className="space-y-4">
                  <h4 className="font-bold text-lg text-blue-700 dark:text-blue-400 uppercase tracking-wide border-b pb-2">
                    Assets
                  </h4>
                  
                  {balanceSheet.assets.map(category => (
                    <div key={category.category} className="space-y-2">
                      <p className="font-semibold text-sm text-muted-foreground">{category.category}</p>
                      {category.items.map(item => (
                        <BSRow 
                          key={item.name}
                          name={item.name}
                          amount={item.amount}
                          subItems={item.subItems}
                          isDeduction={item.isDeduction}
                          isTotal={item.isTotal}
                          bold={item.bold}
                        />
                      ))}
                      <div className="flex justify-between font-bold pt-2 border-t pl-4">
                        <span>Total {category.category}</span>
                        <span>{formatCurrency(category.total)}</span>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-between font-bold text-lg pt-4 border-t-2 mt-4">
                    <span>Total Assets</span>
                    <span>{formatCurrency(balanceSheet.totals.totalAssets)}</span>
                  </div>
                </div>

                {/* Liabilities & Equity */}
                <div className="space-y-6">
                  {/* Liabilities */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg text-orange-700 dark:text-orange-400 uppercase tracking-wide border-b pb-2">
                      Liabilities
                    </h4>
                    
                    {balanceSheet.liabilities.map(category => (
                      <div key={category.category} className="space-y-2">
                        <p className="font-semibold text-sm text-muted-foreground">{category.category}</p>
                        {category.items.map(item => (
                          <BSRow key={item.name} name={item.name} amount={item.amount} />
                        ))}
                        <div className="flex justify-between font-bold pt-2 border-t pl-4">
                          <span>Total {category.category}</span>
                          <span>{formatCurrency(category.total)}</span>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-between font-bold pt-2 border-t-2">
                      <span>Total Liabilities</span>
                      <span>{formatCurrency(balanceSheet.totals.totalLiabilities)}</span>
                    </div>
                  </div>

                  {/* Equity */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg text-purple-700 dark:text-purple-400 uppercase tracking-wide border-b pb-2">
                      Equity
                    </h4>
                    
                    {balanceSheet.equity.map(category => (
                      <div key={category.category} className="space-y-2">
                        <p className="font-semibold text-sm text-muted-foreground">{category.category}</p>
                        {category.items.map(item => (
                          <BSRow key={item.name} name={item.name} amount={item.amount} />
                        ))}
                        <div className="flex justify-between font-bold pt-2 border-t pl-4">
                          <span>Total {category.category}</span>
                          <span>{formatCurrency(category.total)}</span>
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-between font-bold text-lg pt-4 border-t-2">
                      <span>Total Liabilities + Equity</span>
                      <span>{formatCurrency(balanceSheet.totals.totalLiabilityAndEquity)}</span>
                    </div>
                  </div>

                  {/* Balance Check */}
                  <div className={`mt-4 p-4 rounded-lg text-center ${
                    balanceSheet.totals.isBalanced ? 'bg-emerald-100 dark:bg-emerald-900/20' : 'bg-red-100 dark:bg-red-900/20'
                  }`}>
                    <p className="font-semibold">
                      {balanceSheet.totals.isBalanced ? '✓ Balance Sheet Balanced' : '✗ Balance Sheet NOT Balanced'}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Cash Flow Statement */}
      {reportType === 'cash_flow' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center justify-between">
              <span>Cash Flow Statement</span>
              <Badge variant="secondary">{formatDateRange()}</Badge>
            </CardTitle>
            <CardDescription>Statement of Cash Flows</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4 animate-pulse max-w-2xl mx-auto">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="h-10 bg-muted rounded" />
                ))}
              </div>
            ) : cashFlow ? (
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Operating Activities */}
                <CFSection title="Operating Activities" items={cashFlow.sections.operating.items} />

                {/* Investing Activities */}
                <CFSection title="Investing Activities" items={cashFlow.sections.investing.items} />

                {/* Financing Activities */}
                <CFSection title="Financing Activities" items={cashFlow.sections.financing.items} />

                {/* Summary */}
                <div className="space-y-4 pt-6 border-t-2">
                  <ReportRow 
                    label="Net Change in Cash" 
                    value={cashFlow.summary.netChangeInCash} 
                    bold
                    large
                  />
                  <ReportRow label="Opening Balance" value={cashFlow.summary.openingBalance} />
                  <ReportRow 
                    label="Closing Balance" 
                    value={cashFlow.summary.closingBalance} 
                    bold
                    large
                    className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg"
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper Components

function ReportRow({ 
  label, 
  value, 
  bold = false, 
  large = false, 
  indent = 0,
  className = ''
}: { 
  label: string
  value: number
  bold?: boolean
  large?: boolean
  indent?: number
  className?: string
}) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className={`flex justify-between ${className}`}>
      <span 
        className={`${bold ? 'font-bold' : ''} ${large ? 'text-lg' : ''}`}
        style={{ paddingLeft: `${indent * 1.5}rem` }}
      >
        {label}
      </span>
      <span className={`font-mono ${bold ? 'font-bold' : ''} ${large ? 'text-lg' : ''} ${
        value >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
      }`}>
        {value >= 0 ? '' : '-'}{formatCurrency(Math.abs(value))}
      </span>
    </div>
  )
}

function BSRow({ 
  name, 
  amount, 
  subItems, 
  isDeduction = false, 
  isTotal = false, 
  bold = false 
}: { 
  name: string
  amount: number
  subItems?: Array<{ name: string; amount: number }>
  isDeduction?: boolean
  isTotal?: boolean
  bold?: boolean
}) {
  const formatCurrency = (amt: number): string => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amt)
  }

  return (
    <div className={isTotal ? 'pt-2 border-t mt-2' : ''}>
      <div className={`flex justify-between pl-4 ${bold ? 'font-bold' : ''} ${isTotal ? 'font-semibold' : ''}`}>
        <span className={isDeduction ? 'text-red-600' : ''}>
          {isDeduction ? 'Less: ' : ''}{name}
        </span>
        <span className={`font-mono ${isDeduction ? 'text-red-600' : ''}`}>
          {isDeduction && amount > 0 ? '(' : ''}
          {formatCurrency(Math.abs(amount))}
          {isDeduction && amount > 0 ? ')' : ''}
        </span>
      </div>
      
      {subItems && (
        <div className="ml-6 mt-1 space-y-1">
          {subItems.map(sub => (
            <div key={sub.name} className="flex justify-between text-sm text-muted-foreground pl-4">
              <span className={sub.amount < 0 ? 'text-red-600' : ''}>{sub.name}</span>
              <span className="font-mono">{formatCurrency(Math.abs(sub.amount))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CFSection({ title, items }: { title: string; items: Array<{ description: string; amount: number; isSubtotal?: boolean; bold?: boolean }> }) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(amount))
  }

  return (
    <div className="space-y-2">
      <h4 className="font-bold text-base uppercase tracking-wide text-slate-700 dark:text-slate-300 border-b pb-2">
        {title}
      </h4>
      
      {items.map((item, index) => (
        <div 
          key={index}
          className={`flex justify-between ${item.isSubtotal ? 'pt-2 mt-2 border-t font-bold' : ''} ${item.bold ? 'font-bold' : ''}`}
          style={{ paddingLeft: item.isSubtotal ? '0' : '1.5rem' }}
        >
          <span>{item.description}</span>
          <span className={`font-mono ${item.isSubtotal ? '' : item.amount >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {item.amount >= 0 ? '' : '-'}{formatCurrency(item.amount)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default FinancialReports
