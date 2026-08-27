'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  Wallet,
  Receipt,
  PiggyBank,
  Target,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle2,
  Building2,
  Users,
  CreditCard,
  Shield
} from 'lucide-react'

// Types
interface FinancialPerformanceReportProps {
  dateRange?: string
  exportFormat?: string
}

// Mock Data - Kenya DCP Context (KES currency)
const formatKES = (value: number): string => {
  if (Math.abs(value) >= 1000000000) return `KSh ${(value / 1000000000).toFixed(2)}B`
  if (Math.abs(value) >= 1000000) return `KSh ${(value / 1000000).toFixed(1)}M`
  if (Math.abs(value) >= 1000) return `KSh ${(value / 1000).toFixed(0)}K`
  return `KSh ${value.toFixed(0)}`
}

// Revenue Data
const revenueData = {
  currentPeriod: {
    interestIncome: 48500000,
    feeIncome: {
      origination: 8200000,
      latePayment: 3400000,
      processing: 1800000,
      other: 920000
    },
    penaltyIncome: 2100000,
    otherIncome: 850000,
    totalRevenue: 64970000
  },
  previousPeriod: {
    totalRevenue: 58200000
  }
}

const revenueTrend = [
  { month: 'Jul', interest: 38200000, fees: 11200000, penalties: 1800000, total: 51200000 },
  { month: 'Aug', interest: 39500000, fees: 11800000, penalties: 1950000, total: 53250000 },
  { month: 'Sep', interest: 41200000, fees: 12500000, penalties: 2050000, total: 55750000 },
  { month: 'Oct', interest: 42800000, fees: 13200000, penalties: 2150000, total: 58150000 },
  { month: 'Nov', interest: 44500000, fees: 13800000, penalties: 2200000, total: 60500000 },
  { month: 'Dec', interest: 41800000, fees: 11500000, penalties: 1900000, total: 55200000 },
  { month: 'Jan', interest: 46200000, fees: 14000000, penalties: 2050000, total: 62250000 },
  { month: 'Feb', interest: 48500000, fees: 14320000, penalties: 2100000, total: 64920000 }
]

// Expense Breakdown
const expenseData = {
  costOfFunds: 8500000,
  operations: {
    staffCosts: 12500000,
    technology: 4200000,
    officeRent: 1800000,
    utilities: 450000,
    marketing: 2800000,
    otherOps: 1200000
  },
  providerCosts: {
    mpesaFees: 3200000,
    crbChecks: 480000,
    smsGateway: 380000,
    otherProviders: 290000
  },
  provisioningExpense: 8900000,
  totalExpenses: 44980000
}

const expenseBreakdown = [
  { category: 'Staff Costs', amount: 12500000, percentage: 27.8, color: '#3b82f6' },
  { category: 'Loan Loss Provisions', amount: 8900000, percentage: 19.8, color: '#ef4444' },
  { category: 'Cost of Funds', amount: 8500000, percentage: 18.9, color: '#f59e0b' },
  { category: 'Marketing', amount: 2800000, percentage: 6.2, color: '#a855f7' },
  { category: 'Technology', amount: 4200000, percentage: 9.3, color: '#06b6d4' },
  { category: 'M-Pesa Fees', amount: 3200000, percentage: 7.1, color: '#22c55e' },
  { category: 'Office & Utilities', amount: 2250000, percentage: 5.0, color: '#6b7280' },
  { category: 'Other Expenses', amount: 2650000, percentage: 5.9, color: '#94a3b8' }
]

// Profitability Metrics
const profitabilityMetrics = {
  grossProfit: revenueData.currentPeriod.totalRevenue - expenseData.costOfFunds - 
                 expenseData.providerCosts.mpesaFees - expenseData.providerCosts.crbChecks -
                 expenseData.providerCosts.smsGateway - expenseData.providerCosts.otherProviders,
  netProfit: revenueData.currentPeriod.totalRevenue - expenseData.totalExpenses,
  grossMargin: 78.5,
  netMargin: 30.8,
  costPerLoan: 2850,
  roa: 4.2, // Return on Assets (%)
  roe: 18.5 // Return on Equity (%)
}

const profitMarginTrend = [
  { month: 'Jul', grossMargin: 76.2, netMargin: 26.5, roa: 3.5, roe: 15.2 },
  { month: 'Aug', grossMargin: 77.1, netMargin: 27.8, roa: 3.7, roe: 16.0 },
  { month: 'Sep', grossMargin: 77.8, netMargin: 28.5, roa: 3.8, roe: 16.5 },
  { month: 'Oct', grossMargin: 78.2, netMargin: 29.2, roa: 3.9, roe: 17.0 },
  { month: 'Nov', grossMargin: 78.5, netMargin: 29.8, roa: 4.0, roe: 17.5 },
  { month: 'Dec', grossMargin: 77.5, netMargin: 28.0, roa: 3.8, roe: 16.8 },
  { month: 'Jan', grossMargin: 79.0, netMargin: 30.2, roa: 4.1, roe: 18.0 },
  { month: 'Feb', grossMargin: 79.5, netMargin: 30.8, roa: 4.2, roe: 18.5 }
]

// Net Interest Margin Calculation
const nimData = {
  averageYield: 24.5, // Average interest rate earned on loans (%)
  costOfFundsRate: 12.8, // Average cost of funds (%)
  nim: 11.7, // Net Interest Margin (%)
  trend: [
    { month: 'Jul', yield: 23.8, cof: 13.2, nim: 10.6 },
    { month: 'Aug', yield: 24.0, cof: 13.0, nim: 11.0 },
    { month: 'Sep', yield: 24.2, cof: 12.9, nim: 11.3 },
    { month: 'Oct', yield: 24.3, cof: 12.9, nim: 11.4 },
    { month: 'Nov', yield: 24.4, cof: 12.8, nim: 11.6 },
    { month: 'Dec', yield: 24.3, cof: 13.0, nim: 11.3 },
    { month: 'Jan', yield: 24.4, cof: 12.8, nim: 11.6 },
    { month: 'Feb', yield: 24.5, cof: 12.8, nim: 11.7 }
  ]
}

// Cash Flow Summary
const cashFlowData = {
  operating: {
    netIncome: 19990000,
    provisionsAddBack: 8900000,
    workingCapitalChange: -2500000,
    totalOperating: 26390000
  },
  investing: {
    technologyInvestment: -3500000,
    equipmentPurchase: -850000,
    totalInvesting: -4350000
  },
  financing: {
    debtRepayment: -10000000,
    equityInjection: 5000000,
    dividendPaid: -3000000,
    totalFinancing: -8000000
  },
  netCashFlow: 14040000
}

const cashFlowTrend = [
  { month: 'Jul', operating: 21500000, investing: -5200000, financing: -6500000, net: 9800000 },
  { month: 'Aug', operating: 22800000, investing: -4800000, financing: -7200000, net: 10800000 },
  { month: 'Sep', operating: 23500000, investing: -4200000, financing: -7500000, net: 11800000 },
  { month: 'Oct', operating: 24200000, investing: -4000000, financing: -7800000, net: 12400000 },
  { month: 'Nov', operating: 25200000, investing: -3800000, financing: -8000000, net: 13400000 },
  { month: 'Dec', operating: 22800000, investing: -5500000, financing: -6000000, net: 11300000 },
  { month: 'Jan', operating: 25500000, investing: -3600000, financing: -8200000, net: 13700000 },
  { month: 'Feb', operating: 26390000, investing: -4350000, financing: -8000000, net: 14040000 }
]

export function FinancialPerformanceReport({ dateRange = 'last30days', exportFormat = 'pdf' }: FinancialPerformanceReportProps) {
  const [activeTab, setActiveTab] = useState('revenue')

  const revenueGrowth = ((revenueData.currentPeriod.totalRevenue - revenueData.previousPeriod.totalRevenue) / revenueData.previousPeriod.totalRevenue * 100).toFixed(1)

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            Financial Performance Report
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Comprehensive financial analysis for management decision-making
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={parseFloat(revenueGrowth) > 0 ? 'outline' : 'destructive'}
                className={parseFloat(revenueGrowth) > 0 ? 'border-emerald-500 text-emerald-600' : ''}>
            {parseFloat(revenueGrowth) > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            Revenue: {revenueGrowth}%
          </Badge>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export {exportFormat.toUpperCase()}
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Total Revenue</p>
            <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100 mt-1">
              {formatKES(revenueData.currentPeriod.totalRevenue)}
            </p>
            <p className={`text-xs mt-1 flex items-center gap-1 ${parseFloat(revenueGrowth) > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {parseFloat(revenueGrowth) > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {revenueGrowth}% vs prior
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">Total Expenses</p>
            <p className="text-lg font-bold text-red-900 dark:text-red-100 mt-1">
              {formatKES(expenseData.totalExpenses)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {(expenseData.totalExpenses / revenueData.currentPeriod.totalRevenue * 100).toFixed(1)}% of revenue
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Net Profit</p>
            <p className="text-lg font-bold text-blue-900 dark:text-blue-100 mt-1">
              {formatKES(profitabilityMetrics.netProfit)}
            </p>
            <p className="text-xs text-green-600/70 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Margin: {profitabilityMetrics.netMargin}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">NIM</p>
            <p className="text-lg font-bold text-purple-900 dark:text-purple-100 mt-1">
              {nimData.nim}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Net Interest Margin</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/20 dark:to-sky-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">ROA</p>
            <p className="text-lg font-bold text-cyan-900 dark:text-cyan-100 mt-1">
              {profitabilityMetrics.roa}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Return on Assets</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">ROE</p>
            <p className="text-lg font-bold text-amber-900 dark:text-amber-100 mt-1">
              {profitabilityMetrics.roe}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Return on Equity</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 bg-slate-100 dark:bg-slate-800 p-1">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
          <TabsTrigger value="margins">NIM Analysis</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="mt-6 space-y-6">
          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Monthly revenue breakdown by income source</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="totalRevGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => formatKES(v)} />
                  <Tooltip formatter={(value: number) => formatKES(value)} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="interest" name="Interest Income" stroke="#22c55e" fill="#22c55e10" strokeWidth={2} stackId="revenue" />
                  <Area type="monotone" dataKey="fees" name="Fee Income" stroke="#3b82f6" fill="#3b82f610" strokeWidth={2} stackId="revenue" />
                  <Area type="monotone" dataKey="penalties" name="Penalties" stroke="#f59e0b" fill="#f59e0b10" strokeWidth={2} stackId="revenue" />
                  <Line type="monotone" dataKey="total" name="Total Revenue" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                    <Receipt className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="font-medium text-sm">Interest Income</span>
                </div>
                <p className="text-2xl font-bold">{formatKES(revenueData.currentPeriod.interestIncome)}</p>
                <p className="text-xs text-slate-500 mt-1">{(revenueData.currentPeriod.interestIncome / revenueData.currentPeriod.totalRevenue * 100).toFixed(1)}% of total</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="font-medium text-sm">Fee Income</span>
                </div>
                <p className="text-2xl font-bold">{formatKES(
                  revenueData.currentPeriod.feeIncome.origination +
                  revenueData.currentPeriod.feeIncome.latePayment +
                  revenueData.currentPeriod.feeIncome.processing +
                  revenueData.currentPeriod.feeIncome.other
                )}</p>
                <p className="text-xs text-slate-500 mt-1">Origination + Late + Processing</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="font-medium text-sm">Penalty Income</span>
                </div>
                <p className="text-2xl font-bold">{formatKES(revenueData.currentPeriod.penaltyIncome)}</p>
                <p className="text-xs text-slate-500 mt-1">{(revenueData.currentPeriod.penaltyIncome / revenueData.currentPeriod.totalRevenue * 100).toFixed(1)}% of total</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                    <Wallet className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="font-medium text-sm">Other Income</span>
                </div>
                <p className="text-2xl font-bold">{formatKES(revenueData.currentPeriod.otherIncome)}</p>
                <p className="text-xs text-slate-500 mt-1">Interest, commissions, etc.</p>
              </CardContent>
            </Card>
          </div>

          {/* Fee Breakdown Detail */}
          <Card>
            <CardHeader>
              <CardTitle>Fee Income Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fee Type</TableHead>
                      <TableHead className="text-right">Amount (KES)</TableHead>
                      <TableHead className="text-right">% of Total Revenue</TableHead>
                      <TableHead className="text-right">vs Prior Period</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        Origination Fees
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatKES(revenueData.currentPeriod.feeIncome.origination)}</TableCell>
                      <TableCell className="text-right">{(revenueData.currentPeriod.feeIncome.origination / revenueData.currentPeriod.totalRevenue * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right"><Badge variant="outline" className="border-emerald-500 text-emerald-600">+12%</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        Late Payment Fees
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatKES(revenueData.currentPeriod.feeIncome.latePayment)}</TableCell>
                      <TableCell className="text-right">{(revenueData.currentPeriod.feeIncome.latePayment / revenueData.currentPeriod.totalRevenue * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right"><Badge variant="outline" className="border-emerald-500 text-emerald-600">+8%</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-blue-500" />
                        Processing Fees
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatKES(revenueData.currentPeriod.feeIncome.processing)}</TableCell>
                      <TableCell className="text-right">{(revenueData.currentPeriod.feeIncome.processing / revenueData.currentPeriod.totalRevenue * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right"><Badge variant="secondary">+5%</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Other Fees</TableCell>
                      <TableCell className="text-right font-mono">{formatKES(revenueData.currentPeriod.feeIncome.other)}</TableCell>
                      <TableCell className="text-right">{(revenueData.currentPeriod.feeIncome.other / revenueData.currentPeriod.totalRevenue * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right"><Badge variant="secondary">+3%</Badge></TableCell>
                    </TableRow>
                    <TableRow className="bg-slate-50 dark:bg-slate-800 font-semibold">
                      <TableCell>Total Fee Income</TableCell>
                      <TableCell className="text-right font-mono">{formatKES(
                        revenueData.currentPeriod.feeIncome.origination +
                        revenueData.currentPeriod.feeIncome.latePayment +
                        revenueData.currentPeriod.feeIncome.processing +
                        revenueData.currentPeriod.feeIncome.other
                      )}</TableCell>
                      <TableCell className="text-right">
                        {((
                          revenueData.currentPeriod.feeIncome.origination +
                          revenueData.currentPeriod.feeIncome.latePayment +
                          revenueData.currentPeriod.feeIncome.processing +
                          revenueData.currentPeriod.feeIncome.other
                        ) / revenueData.currentPeriod.totalRevenue * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right"><Badge variant="outline" className="border-emerald-500 text-emerald-600">+9%</Badge></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expense Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Distribution</CardTitle>
                <CardDescription>Breakdown by major category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="amount"
                      label={({ category, percentage }) => `${category}: ${percentage}%`}
                    >
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatKES(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Expense Details */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Categories</CardTitle>
                <CardDescription>Detailed breakdown with amounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[350px] overflow-y-auto">
                  {expenseBreakdown.map((expense, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div 
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: expense.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{expense.category}</span>
                          <span className="font-mono text-sm">{formatKES(expense.amount)}</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${expense.percentage}%`, backgroundColor: expense.color }}
                          />
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0 w-14 justify-center text-xs">
                        {expense.percentage}%
                      </Badge>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total Expenses</span>
                    <span className="font-bold text-lg font-mono text-red-600">
                      {formatKES(expenseData.totalExpenses)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Provider Cost Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Provider & Third-Party Costs
              </CardTitle>
              <CardDescription>Costs paid to external service providers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">M-Pesa Fees</span>
                  </div>
                  <p className="text-xl font-bold">{formatKES(expenseData.providerCosts.mpesaFees)}</p>
                  <p className="text-xs text-slate-500 mt-1">Per transaction: KSh 12 avg</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">CRB Checks</span>
                  </div>
                  <p className="text-xl font-bold">{formatKES(expenseData.providerCosts.crbChecks)}</p>
                  <p className="text-xs text-slate-500 mt-1">Per check: KSh 420 avg</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium">SMS Gateway</span>
                  </div>
                  <p className="text-xl font-bold">{formatKES(expenseData.providerCosts.smsGateway)}</p>
                  <p className="text-xs text-slate-500 mt-1">Per SMS: KSh 0.85 avg</p>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium">Other Providers</span>
                  </div>
                  <p className="text-xl font-bold">{formatKES(expenseData.providerCosts.otherProviders)}</p>
                  <p className="text-xs text-slate-500 mt-1">API services, hosting etc.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profitability Tab */}
        <TabsContent value="profitability" className="mt-6 space-y-6">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
              <CardContent className="p-4 text-center">
                <PiggyBank className="w-8 h-8 mx-auto text-green-600 mb-2" />
                <p className="text-sm text-green-600 font-medium">Gross Profit</p>
                <p className="text-2xl font-bold text-green-900">{formatKES(profitabilityMetrics.grossProfit)}</p>
                <p className="text-xs text-green-600/70 mt-1">Margin: {profitabilityMetrics.grossMargin}%</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <CardContent className="p-4 text-center">
                <Target className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <p className="text-sm text-blue-600 font-medium">Net Profit</p>
                <p className="text-2xl font-bold text-blue-900">{formatKES(profitabilityMetrics.netProfit)}</p>
                <p className="text-xs text-blue-600/70 mt-1">Margin: {profitabilityMetrics.netMargin}%</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
              <CardContent className="p-4 text-center">
                <Calculator className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                <p className="text-sm text-purple-600 font-medium">Cost Per Loan</p>
                <p className="text-2xl font-bold text-purple-900">{formatKES(profitabilityMetrics.costPerLoan)}</p>
                <p className="text-xs text-purple-600/70 mt-1">All-in cost</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
              <CardContent className="p-4 text-center">
                <DollarSign className="w-8 h-8 mx-auto text-amber-600 mb-2" />
                <p className="text-sm text-amber-600 font-medium">Efficiency Ratio</p>
                <p className="text-2xl font-bold text-amber-900">42.5%</p>
                <p className="text-xs text-amber-600/70 mt-1">OpEx / Revenue</p>
              </CardContent>
            </Card>
          </div>

          {/* Profit Margin Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Profitability Trends</CardTitle>
              <CardDescription>Gross margin, net margin, ROA and ROE over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={profitMarginTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis yAxisId="left" domain={[20, 85]} tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `${v}%`} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 25]} tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="grossMargin" name="Gross Margin %" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} />
                  <Line yAxisId="left" type="monotone" dataKey="netMargin" name="Net Margin %" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="roa" name="ROA %" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="roe" name="ROE %" stroke="#a855f7" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NIM Analysis Tab */}
        <TabsContent value="margins" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-slate-500 mb-2">Average Yield (Interest Earned)</p>
                <p className="text-4xl font-bold text-emerald-600">{nimData.averageYield}%</p>
                <p className="text-xs text-slate-500 mt-2">On loan portfolio</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-slate-500 mb-2">Cost of Funds</p>
                <p className="text-4xl font-bold text-red-600">{nimData.costOfFundsRate}%</p>
                <p className="text-xs text-slate-500 mt-2">Weighted average</p>
              </CardContent>
            </Card>
            <Card className="ring-2 ring-emerald-500/50">
              <CardContent className="p-6 text-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
                <p className="text-sm text-emerald-600 font-medium mb-2">Net Interest Margin (NIM)</p>
                <p className="text-5xl font-bold text-emerald-700">{nimData.nim}%</p>
                <p className="text-xs text-emerald-600/70 mt-2">Industry avg: ~9%</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>NIM Components Trend</CardTitle>
              <CardDescription>How yield and cost of funds affect NIM over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={nimData.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis domain={[8, 28]} tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="yield" name="Avg Yield %" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="cof" name="Cost of Funds %" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="nim" name="NIM %" stroke="#3b82f6" strokeWidth={4} strokeDasharray="8 4" dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cashflow" className="mt-6 space-y-6">
          {/* Cash Position Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
              <CardContent className="p-4">
                <p className="text-xs text-green-600 font-medium">Operating Cash Flow</p>
                <p className="text-xl font-bold text-green-900 mt-1">{formatKES(cashFlowData.operating.totalOperating)}</p>
                <p className="text-xs text-green-600/70 mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" /> Positive flow
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20">
              <CardContent className="p-4">
                <p className="text-xs text-red-600 font-medium">Investing Cash Flow</p>
                <p className="text-xl font-bold text-red-900 mt-1">{formatKES(cashFlowData.investing.totalInvesting)}</p>
                <p className="text-xs text-red-600/70 mt-1">Capex investments</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <CardContent className="p-4">
                <p className="text-xs text-blue-600 font-medium">Financing Cash Flow</p>
                <p className="text-xl font-bold text-blue-900 mt-1">{formatKES(cashFlowData.financing.totalFinancing)}</p>
                <p className="text-xs text-blue-600/70 mt-1">Debt & equity</p>
              </CardContent>
            </Card>
            <Card className={`bg-gradient-to-br ${
              cashFlowData.netCashFlow > 0 ? 'from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20' : 'from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20'
            }`}>
              <CardContent className="p-4">
                <p className={`text-xs font-medium ${cashFlowData.netCashFlow > 0 ? 'text-green-600' : 'text-red-600'}`}>Net Cash Flow</p>
                <p className={`text-xl font-bold mt-1 ${cashFlowData.netCashFlow > 0 ? 'text-green-900' : 'text-red-900'}`}>
                  {formatKES(cashFlowData.netCashFlow)}
                </p>
                <p className={`text-xs mt-1 ${cashFlowData.netCashFlow > 0 ? 'text-green-600/70' : 'text-red-600/70'}`}>
                  {cashFlowData.netCashFlow > 0 ? 'Net positive' : 'Net negative'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cash Flow Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Trends</CardTitle>
              <CardDescription>Monthly cash movements by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={cashFlowTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => formatKES(v)} />
                  <Tooltip formatter={(value: number) => formatKES(value)} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="operating" name="Operating" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="investing" name="Investing" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="financing" name="Financing" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="net" name="Net Cash Flow" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cash Flow Statement Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Statement of Cash Flows Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead colSpan={2}>Category</TableHead>
                      <TableHead className="text-right">Amount (KES)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-green-50 dark:bg-green-950/10">
                      <TableCell colSpan={2} className="font-semibold text-green-800 dark:text-green-300">Operating Activities</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    <TableRow><TableCell className="pl-6">Net Income</TableCell><TableCell></TableCell><TableCell className="text-right font-mono">{formatKES(cashFlowData.operating.netIncome)}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-6">+ Provisions (non-cash)</TableCell><TableCell></TableCell><TableCell className="text-right font-mono text-green-600">+{formatKES(cashFlowData.operating.provisionsAddBack)}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-6">Working Capital Changes</TableCell><TableCell></TableCell><TableCell className="text-right font-mono text-red-600">{formatKES(cashFlowData.operating.workingCapitalChange)}</TableCell></TableRow>
                    <TableRow className="font-semibold bg-green-100 dark:bg-green-950/20">
                      <TableCell colSpan={2} className="pl-6">Net Operating Cash Flow</TableCell>
                      <TableCell className="text-right font-mono">{formatKES(cashFlowData.operating.totalOperating)}</TableCell>
                    </TableRow>
                    
                    <TableRow className="bg-red-50 dark:bg-red-950/10">
                      <TableCell colSpan={2} className="font-semibold text-red-800 dark:text-red-300 mt-4">Investing Activities</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    <TableRow><TableCell className="pl-6">Technology Investment</TableCell><TableCell></TableCell><TableCell className="text-right font-mono text-red-600">{formatKES(cashFlowData.investing.technologyInvestment)}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-6">Equipment Purchase</TableCell><TableCell></TableCell><TableCell className="text-right font-mono text-red-600">{formatKES(cashFlowData.investing.equipmentPurchase)}</TableCell></TableRow>
                    <TableRow className="font-semibold bg-red-100 dark:bg-red-950/20">
                      <TableCell colSpan={2} className="pl-6">Net Investing Cash Flow</TableCell>
                      <TableCell className="text-right font-mono">{formatKES(cashFlowData.investing.totalInvesting)}</TableCell>
                    </TableRow>
                    
                    <TableRow className="bg-blue-50 dark:bg-blue-950/10">
                      <TableCell colSpan={2} className="font-semibold text-blue-800 dark:text-blue-300">Financing Activities</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    <TableRow><TableCell className="pl-6">Debt Repayment</TableCell><TableCell></TableCell><TableCell className="text-right font-mono text-red-600">{formatKES(cashFlowData.financing.debtRepayment)}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-6">Equity Injection</TableCell><TableCell></TableCell><TableCell className="text-right font-mono text-green-600">+{formatKES(cashFlowData.financing.equityInjection)}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-6">Dividends Paid</TableCell><TableCell></TableCell><TableCell className="text-right font-mono text-red-600">{formatKES(cashFlowData.financing.dividendPaid)}</TableCell></TableRow>
                    <TableRow className="font-semibold bg-blue-100 dark:bg-blue-950/20">
                      <TableCell colSpan={2} className="pl-6">Net Financing Cash Flow</TableCell>
                      <TableCell className="text-right font-mono">{formatKES(cashFlowData.financing.totalFinancing)}</TableCell>
                    </TableRow>
                    
                    <TableRow className="bg-slate-100 dark:bg-slate-800 text-lg font-bold">
                      <TableCell colSpan={2}>NET CHANGE IN CASH</TableCell>
                      <TableCell className={`text-right ${cashFlowData.netCashFlow > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatKES(cashFlowData.netCashFlow)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper component for icons used inline
function Smartphone({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
}

function MessageSquare({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
}

export default FinancialPerformanceReport
