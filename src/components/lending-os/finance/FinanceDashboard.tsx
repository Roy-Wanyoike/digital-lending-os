'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts'
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Scale,
  BookOpen,
  FileText,
  Building2,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  PiggyBank,
  Landmark,
  Receipt,
  BarChart3
} from 'lucide-react'

// Types
interface KPIData {
  totalPortfolioValue: number
  cashBalance: number
  collectionsToday: number
  collectionsTarget: number
  disbursementsTodayCount: number
  disbursementsTodayAmount: number
}

interface CashPositionData {
  date: string
  wallet: number
  float: number
  reserve: number
}

interface IncomeExpenseData {
  date: string
  revenue: number
  expenses: number
}

interface QuickLink {
  label: string
  icon: React.ReactNode
  href: string
  description: string
}

// Mock Data Generators
const generateCashPositionData = (): CashPositionData[] => {
  const data: CashPositionData[] = []
  const baseDate = new Date()
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(baseDate)
    date.setDate(date.getDate() - i)
    
    data.push({
      date: date.toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }),
      wallet: Math.round(2500000 + Math.random() * 500000 - 250000),
      float: Math.round(1500000 + Math.random() * 300000 - 150000),
      reserve: Math.round(800000 + Math.random() * 100000 - 50000)
    })
  }
  
  return data
}

const generateIncomeExpenseData = (): IncomeExpenseData[] => {
  const data: IncomeExpenseData[] = []
  const baseDate = new Date()
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(baseDate)
    date.setDate(date.getDate() - i)
    
    data.push({
      date: date.toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }),
      revenue: Math.round(180000 + Math.random() * 80000),
      expenses: Math.round(120000 + Math.random() * 40000)
    })
  }
  
  return data
}

const mockKPI: KPIData = {
  totalPortfolioValue: 45850000,
  cashBalance: 4850000,
  collectionsToday: 2875000,
  collectionsTarget: 3500000,
  disbursementsTodayCount: 47,
  disbursementsTodayAmount: 3250000
}

const quickLinks: QuickLink[] = [
  {
    label: 'Reconcile Accounts',
    icon: <Scale className="w-4 h-4" />,
    href: '#reconciliation',
    description: 'Match bank statements'
  },
  {
    label: 'View Ledger',
    icon: <BookOpen className="w-4 h-4" />,
    href: '#ledger',
    description: 'Double-entry records'
  },
  {
    label: 'Generate Statement',
    icon: <FileText className="w-4 h-4" />,
    href: '#statements',
    description: 'Financial reports'
  },
  {
    label: 'Provider Balances',
    icon: <Building2 className="w-4 h-4" />,
    href: '#wallets',
    description: 'M-Pesa & Bank accounts'
  }
]

// Format helpers
function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount)
  if (absAmount >= 1000000) {
    return `KSh ${(amount / 1000000).toFixed(1)}M`
  }
  if (absAmount >= 1000) {
    return `KSh ${(amount / 1000).toFixed(1)}K`
  }
  return `KSh ${amount.toFixed(0)}`
}

function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export function FinanceDashboard() {
  const [kpiData, setKpiData] = useState<KPIData | null>(null)
  const [cashPositionData, setCashPositionData] = useState<CashPositionData[]>([])
  const [incomeExpenseData, setIncomeExpenseData] = useState<IncomeExpenseData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call with mock data
    const timer = setTimeout(() => {
      setKpiData(mockKPI)
      setCashPositionData(generateCashPositionData())
      setIncomeExpenseData(generateIncomeExpenseData())
      setLoading(false)
    }, 800)
    
    return () => clearTimeout(timer)
  }, [])

  const handleRefresh = useCallback(() => {
    setLoading(true)
    setTimeout(() => {
      setKpiData(mockKPI)
      setCashPositionData(generateCashPositionData())
      setIncomeExpenseData(generateIncomeExpenseData())
      setLoading(false)
    }, 600)
  }, [])

  if (loading && !kpiData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-32 bg-muted rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-80 bg-muted rounded-lg" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const collectionPercentage = kpiData ? (kpiData.collectionsToday / kpiData.collectionsTarget) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-emerald-600" />
            Financial Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Complete financial overview for your lending operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Portfolio Value */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Portfolio Value</p>
                <p className="text-2xl font-bold tracking-tight">
                  {kpiData ? formatCurrency(kpiData.totalPortfolioValue) : '-'}
                </p>
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>+12.5% from last month</span>
                </div>
              </div>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <Landmark className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
              Outstanding principal across all active loans
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
        </Card>

        {/* Cash Balance */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Cash Balance</p>
                <p className="text-2xl font-bold tracking-tight">
                  {kpiData ? formatCurrency(kpiData.cashBalance) : '-'}
                </p>
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>Wallet + Float + Reserve</span>
                </div>
              </div>
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
              Combined balance of all cash accounts
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
        </Card>

        {/* Collections Today */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Collections Today</p>
                <p className="text-2xl font-bold tracking-tight">
                  {kpiData ? formatCurrency(kpiData.collectionsToday) : '-'}
                </p>
                <div className="space-y-1">
                  <Progress value={collectionPercentage} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    Target: {kpiData ? formatCurrency(kpiData.collectionsTarget) : '-'} 
                    ({collectionPercentage.toFixed(0)}%)
                  </p>
                </div>
              </div>
              <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <ArrowDownLeft className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
              M-Pesa & Bank collections received today
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-violet-500" />
        </Card>

        {/* Disbursements Today */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Disbursements Today</p>
                <p className="text-2xl font-bold tracking-tight">
                  {kpiData ? formatCurrency(kpiData.disbursementsTodayAmount) : '-'}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    {kpiData?.disbursementsTodayCount || 0} loans
                  </Badge>
                  <span>processed</span>
                </div>
              </div>
              <div className="p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <ArrowUpRight className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
              Loans disbursed via M-Pesa & Bank
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Position Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-slate-600" />
              Cash Position (30 Days)
            </CardTitle>
            <CardDescription>Account balances over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cashPositionData}>
                <defs>
                  <linearGradient id="colorWallet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFloat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorReserve" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }}
                  interval={4}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v / 1000000}M`}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrencyFull(value), '']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="wallet"
                  name="Operating Wallet"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorWallet)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="float"
                  name="Disbursement Float"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorFloat)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="reserve"
                  name="Reserve Fund"
                  stroke="#8b5cf6"
                  fillOpacity={1}
                  fill="url(#colorReserve)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Income vs Expense Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-5 h-5 text-slate-600" />
              Revenue vs Expenses (30 Days)
            </CardTitle>
            <CardDescription>Daily income and operating costs</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={incomeExpenseData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }}
                  interval={4}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v / 1000}K`}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    formatCurrencyFull(value), 
                    name === 'revenue' ? 'Revenue' : 'Expenses'
                  ]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            Quick Actions
          </CardTitle>
          <CardDescription>Navigate to key financial functions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="group flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="p-2.5 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {link.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{link.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{link.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">156</p>
            <p className="text-xs text-muted-foreground mt-1">Active Loans</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">94.2%</p>
            <p className="text-xs text-muted-foreground mt-1">Collection Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">2.3%</p>
            <p className="text-xs text-muted-foreground mt-1">PAR &gt;30 Days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">KSh 12.5M</p>
            <p className="text-xs text-muted-foreground mt-1">Monthly Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">KSh 8.2M</p>
            <p className="text-xs text-muted-foreground mt-1">Monthly Expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <p className="text-2xl font-bold text-emerald-600">OK</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Recon Status</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default FinanceDashboard
