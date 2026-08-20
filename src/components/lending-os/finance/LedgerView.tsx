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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Scale,
  Search,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  BookOpen,
  BarChart3
} from 'lucide-react'

// Types
interface LedgerEntry {
  id: string
  date: Date | string
  account: string
  debit: number | null
  credit: number | null
  balance: number
  balanceType: 'debit' | 'credit'
  reference: string
  description: string
  transactionType: string
  reconciled?: boolean
}

interface TrialBalanceAccount {
  code: string
  name: string
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
  debit: number | null
  credit: number | null
  netBalance: number
  balanceType: 'DEBIT' | 'CREDIT'
}

interface AccountSummary {
  category: string
  accounts: Array<{
    name: string
    balance: number
    change: number
  }>
}

export function LedgerView() {
  const [view, setView] = useState<'entries' | 'trial_balance' | 'accounts'>('entries')
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [trialBalance, setTrialBalance] = useState<TrialBalanceAccount[]>([])
  const [accountSummaries, setAccountSummaries] = useState<AccountSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [accountFilter, setAccountFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        tenantId: 'default-tenant',
        view,
        limit: '100'
      })
      
      if (accountFilter !== 'all') params.append('account', accountFilter)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      
      const response = await fetch(`/api/finance/ledger?${params}`)
      const result = await response.json()
      
      if (result.success) {
        switch (view) {
          case 'entries':
            setEntries(result.data.entries || [])
            break
          case 'trial_balance':
            setTrialBalance(result.data.accounts || [])
            break
          case 'accounts':
            setAccountSummaries(result.data.categories || [])
            break
        }
      } else {
        setError(result.error || 'Failed to load ledger data')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [view, accountFilter, startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Format helpers
  const formatCurrency = (amount: number | null): string => {
    if (amount === null) return '-'
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // Account options for filter
  const accountOptions = [
    { value: 'all', label: 'All Accounts' },
    { value: 'Loans Receivable', label: 'Loans Receivable' },
    { value: 'Cash - Collection Account', label: 'Cash - Collection' },
    { value: 'Cash - Disbursement Account', label: 'Cash - Disbursement' },
    { value: 'Interest Revenue', label: 'Interest Revenue' },
    { value: 'Fee Revenue', label: 'Fee Revenue' },
    { value: 'Penalty Revenue', label: 'Penalty Revenue' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Scale className="w-6 h-6 text-slate-600" />
            General Ledger
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            T-Account view, trial balance & account summaries
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* View Tabs */}
      <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
        <TabsList className="bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="entries" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Ledger Entries
          </TabsTrigger>
          <TabsTrigger value="trial_balance" className="gap-2">
            <Scale className="w-4 h-4" />
            Trial Balance
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Account Summary
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4 p-4 bg-muted/50 rounded-lg">
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Filter by Account" />
            </SelectTrigger>
            <SelectContent>
              {accountOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            placeholder="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full sm:w-[160px]"
          />

          <Input
            type="date"
            placeholder="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full sm:w-[160px]"
          />

          <Button onClick={fetchData} disabled={loading} className="w-full sm:w-auto">
            Apply Filters
          </Button>
        </div>

        {/* Entries View */}
        <TabsContent value="entries" className="mt-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Ledger Entries</CardTitle>
              <CardDescription>
                General ledger with running balance • {accountFilter === 'all' ? 'All Accounts' : accountFilter}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <ScrollArea className="max-h-[500px] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      [...Array(10)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(8)].map((_, j) => (
                            <TableCell key={j}>
                              <div className="h-5 bg-muted rounded animate-pulse" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No ledger entries found
                        </TableCell>
                      </TableRow>
                    ) : (
                      entries.map((entry) => (
                        <TableRow key={entry.id} className="hover:bg-muted/30">
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatDate(entry.date)}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs font-mono">{entry.reference}</code>
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate">
                            <span className="text-sm">{entry.account}</span>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {entry.description}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${entry.debit ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {formatCurrency(entry.debit)}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${entry.credit ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                            {formatCurrency(entry.credit)}
                          </TableCell>
                          <TableCell className={`text-right font-mono font-medium ${
                            entry.balanceType === 'debit' ? 'text-red-600' : 'text-emerald-600'
                          }`}>
                            {formatCurrency(entry.balance)}
                          </TableCell>
                          <TableCell>
                            {entry.reconciled ? (
                              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs">
                                ✓
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                ○
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trial Balance View */}
        <TabsContent value="trial_balance" className="mt-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Trial Balance</CardTitle>
              <CardDescription>As of {new Date().toLocaleDateString('en-KE')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* T-Account Style Display */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <ArrowDownLeft className="w-5 h-5 text-red-500" />
                    Debit Balances
                  </h4>
                  <div className="space-y-2 max-h-[400px] overflow-auto">
                    {(loading ? [] : trialBalance.filter(a => a.debit)).map(account => (
                      <div key={account.code} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 rounded-r-lg">
                        <div>
                          <code className="text-xs text-muted-foreground">{account.code}</code>
                          <p className="font-medium">{account.name}</p>
                        </div>
                        <p className="font-mono font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(account.debit)}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  {!loading && (
                    <div className="flex items-center justify-between p-3 bg-red-100 dark:bg-red-900/20 rounded-lg font-bold">
                      <span>Total Debits</span>
                      <span className="font-mono text-red-600">
                        {formatCurrency(trialBalance.reduce((sum, a) => sum + (a.debit || 0), 0))}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                    Credit Balances
                  </h4>
                  <div className="space-y-2 max-h-[400px] overflow-auto">
                    {(loading ? [] : trialBalance.filter(a => a.credit)).map(account => (
                      <div key={account.code} className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/10 border-l-4 border-emerald-500 rounded-r-lg">
                        <div>
                          <code className="text-xs text-muted-foreground">{account.code}</code>
                          <p className="font-medium">{account.name}</p>
                        </div>
                        <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(account.credit)}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  {!loading && (
                    <div className="flex items-center justify-between p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg font-bold">
                      <span>Total Credits</span>
                      <span className="font-mono text-emerald-600">
                        {formatCurrency(trialBalance.reduce((sum, a) => sum + (a.credit || 0), 0))}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Balance Check */}
              {!loading && (
                <div className={`mt-6 p-4 rounded-lg text-center ${
                  Math.abs(trialBalance.reduce((s, a) => s + (a.debit || 0), 0) - 
                       trialBalance.reduce((s, a) => s + (a.credit || 0), 0)) < 1
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200'
                }`}>
                  <p className="font-semibold">
                    {Math.abs(trialBalance.reduce((s, a) => s + (a.debit || 0), 0) - 
                         trialBalance.reduce((s, a) => s + (a.credit || 0), 0)) < 1
                      ? '✓ Trial Balance is Balanced'
                      : '✗ Trial Balance is NOT Balanced'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Difference: {formatCurrency(
                      Math.abs(trialBalance.reduce((s, a) => s + (a.debit || 0), 0) - 
                           trialBalance.reduce((s, a) => s + (a.credit || 0), 0))
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Summary View */}
        <TabsContent value="accounts" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6 animate-pulse">
                    <div className="h-40 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))
            ) : accountSummaries.map(category => (
              <Card key={category.category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{category.category}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {category.accounts.map(account => (
                    <div key={account.name} className="flex items-center justify-between">
                      <span className="text-sm truncate mr-2">{account.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-sm">{formatCurrency(account.balance)}</span>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs px-1.5 py-0 ${
                            account.change >= 0 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {account.change >= 0 ? '+' : ''}{account.change.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default LedgerView
