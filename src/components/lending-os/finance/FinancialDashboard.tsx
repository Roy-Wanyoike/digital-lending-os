'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { WalletCard } from './WalletCard'
import { TransactionList } from './TransactionList'
import { LedgerView } from './LedgerView'
import { ReconciliationPanel } from './ReconciliationPanel'
import { FinancialReports } from './FinancialReports'
import { SettlementQueue } from './SettlementQueue'
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  BarChart3,
  BookOpen,
  Scale,
  Truck,
  FileText
} from 'lucide-react'

// Types for financial data
interface FinancialData {
  wallet: {
    balance: number
    availableBalance: number
    currency: string
    lastUpdated: Date
  }
  accounts: {
    disbursement: { balance: number; totalCount: number }
    collection: { balance: number; totalCount: number }
    fees: { balance: number; totalCount: number }
    reserve: { balance: number }
  }
  today: {
    disbursements: number
    collections: number
    fees: number
    refunds: number
    netFlow: number
  }
  monthToDate: {
    disbursements: number
    collections: number
    feesCollected: number
    operatingCosts: number
    profit: number
  }
  pendingSettlements: number
  lastReconciliation: Date | null
}

// Format currency helper
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

export function FinancialDashboard() {
  const [data, setData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchFinancialData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/finance?tenantId=default-tenant')
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to load financial data')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFinancialData()
  }, [fetchFinancialData])

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-64 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !data) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchFinancialData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Wallet className="w-8 h-8 text-emerald-600" />
            Financial Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Wallet, Ledger & Transaction Management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchFinancialData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Transactions</span>
          </TabsTrigger>
          <TabsTrigger value="ledger" className="gap-2">
            <Scale className="w-4 h-4" />
            <span className="hidden sm:inline">Ledger</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Wallet Balance Card */}
            <WalletCard data={data?.wallet} loading={loading} />

            {/* Disbursements Today */}
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Disbursements</p>
                    <p className="text-2xl font-bold mt-1">
                      {formatCurrency(data?.today.disbursements || 0)}
                    </p>
                    <p className="text-blue-200 text-xs mt-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +8% from yesterday
                    </p>
                  </div>
                  <div className="p-2.5 bg-white/10 rounded-lg">
                    <ArrowDownRight className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/20">
                  <p className="text-xs text-blue-200">Today • {data?.accounts.disbursement.totalCount || 0} txns</p>
                </div>
              </CardContent>
            </Card>

            {/* Collections Today */}
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium">Collections</p>
                    <p className="text-2xl font-bold mt-1">
                      {formatCurrency(data?.today.collections || 0)}
                    </p>
                    <p className="text-emerald-200 text-xs mt-2 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      -3% from yesterday
                    </p>
                  </div>
                  <div className="p-2.5 bg-white/10 rounded-lg">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/20">
                  <p className="text-xs text-emerald-200">Today • {data?.accounts.collection.totalCount || 0} txns</p>
                </div>
              </CardContent>
            </Card>

            {/* Profit MTD */}
            <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-amber-100 text-sm font-medium">Profit (MTD)</p>
                    <p className="text-2xl font-bold mt-1">
                      {formatCurrency(data?.monthToDate.profit || 0)}
                    </p>
                    <p className="text-amber-200 text-xs mt-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +15% vs last month
                    </p>
                  </div>
                  <div className="p-2.5 bg-white/10 rounded-lg">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/20">
                  <p className="text-xs text-amber-200">Month to Date</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cash Flow Today Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-slate-600" />
                Cash Flow Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Net Flow Indicator */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                  <span className="font-medium">Net Flow</span>
                  <span className={`text-xl font-bold flex items-center gap-2 ${(data?.today.netFlow || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {(data?.today.netFlow || 0) >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    {formatCurrency(data?.today.netFlow || 0)}
                  </span>
                </div>

                {/* Cash Flow Bars */}
                <div className="space-y-3">
                  <CashFlowBar
                    label="Disbursements"
                    amount={data?.today.disbursements || 0}
                    maxAmount={Math.max(data?.today.disbursements || 0, data?.today.collections || 0) * 1.2}
                    color="bg-blue-500"
                    direction="out"
                  />
                  <CashFlowBar
                    label="Collections"
                    amount={data?.today.collections || 0}
                    maxAmount={Math.max(data?.today.disbursements || 0, data?.today.collections || 0) * 1.2}
                    color="bg-emerald-500"
                    direction="in"
                  />
                  <CashFlowBar
                    label="Fees"
                    amount={data?.today.fees || 0}
                    maxAmount={Math.max(data?.today.disbursements || 0, data?.today.collections || 0) * 1.2}
                    color="bg-amber-500"
                    direction="in"
                  />
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t">
                  <div className="text-center p-2">
                    <p className="text-sm text-muted-foreground">Refunds</p>
                    <p className="font-semibold">{formatCurrency(data?.today.refunds || 0)}</p>
                  </div>
                  <div className="text-center p-2">
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="font-semibold text-amber-600">{data?.pendingSettlements || 0}</p>
                  </div>
                  <div className="text-center p-2">
                    <p className="text-sm text-muted-foreground">Last Recon.</p>
                    <p className="font-semibold text-xs">
                      {data?.lastReconciliation ? new Date(data.lastReconciliation).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <div className="text-center p-2">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Healthy
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accounts Summary & Recent Transactions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Accounts Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-600" />
                  Account Summary
                </CardTitle>
                <CardDescription>Balance overview by account type</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Today</TableHead>
                      <TableHead className="text-right hidden md:table-cell">MTD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          Disbursement
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrencyFull(data?.accounts.disbursement.balance || 0)}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell font-mono text-blue-600">
                        -{formatCurrency(data?.today.disbursements || 0)}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell font-mono">
                        {formatCurrencyFull(data?.monthToDate.disbursements || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          Collection
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrencyFull(data?.accounts.collection.balance || 0)}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell font-mono text-emerald-600">
                        +{formatCurrency(data?.today.collections || 0)}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell font-mono">
                        {formatCurrencyFull(data?.monthToDate.collections || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          Fees Received
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrencyFull(data?.accounts.fees.balance || 0)}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell font-mono text-emerald-600">
                        +{formatCurrency(data?.today.fees || 0)}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell font-mono">
                        {formatCurrencyFull(data?.monthToDate.feesCollected || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          Reserve Fund
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrencyFull(data?.accounts.reserve.balance || 0)}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell text-muted-foreground">
                        -
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell text-muted-foreground">
                        -
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-600" />
                    Recent Transactions
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setActiveTab('transactions')}
                  >
                    View All →
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <TransactionList compact={true} limit={5} />
              </CardContent>
            </Card>
          </div>

          {/* Reconciliation & Settlements Quick View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReconciliationPanel compact={true} />
            <SettlementQueue compact={true} />
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <TransactionList />
        </TabsContent>

        {/* Ledger Tab */}
        <TabsContent value="ledger">
          <LedgerView />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <FinancialReports />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Cash Flow Bar Component
interface CashFlowBarProps {
  label: string
  amount: number
  maxAmount: number
  color: string
  direction: 'in' | 'out'
}

function CashFlowBar({ label, amount, maxAmount, color, direction }: CashFlowBarProps) {
  const percentage = Math.min((Math.abs(amount) / maxAmount) * 100, 100)

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="flex items-center gap-2">
          {direction === 'out' ? (
            <ArrowDownRight className="w-4 h-4 text-blue-500" />
          ) : (
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          )}
          {label}
        </span>
        <span className={`font-mono font-medium ${direction === 'out' ? 'text-blue-600' : 'text-emerald-600'}`}>
          {direction === 'out' ? '-' : '+'}{formatCurrency(amount)}
          <span className="text-muted-foreground ml-1">({direction})</span>
        </span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default FinancialDashboard
