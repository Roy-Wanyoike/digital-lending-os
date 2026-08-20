'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { TransactionDetail } from './TransactionDetail'
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  XCircle
} from 'lucide-react'

// Types
interface Transaction {
  id: string
  referenceNumber: string
  transactionType: string
  entityType: string
  entityId: string
  amount: number
  currency: string
  description?: string
  occurredAt: Date | string
  status: string
  direction: 'inflow' | 'outflow'
  reconciled?: boolean
  loan?: any
  repayment?: any
}

interface TransactionListProps {
  compact?: boolean
  limit?: number
}

// Transaction type configuration
const TRANSACTION_TYPES: Record<string, { label: string; color: string; bgColor: string; icon?: string }> = {
  DISBURSEMENT: { 
    label: 'Disburse', 
    color: 'text-blue-700 dark:text-blue-400', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/30' 
  },
  REPAYMENT_PRINCIPAL: { 
    label: 'Principal', 
    color: 'text-emerald-700 dark:text-emerald-400', 
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' 
  },
  REPAYMENT_INTEREST: { 
    label: 'Interest', 
    color: 'text-teal-700 dark:text-teal-400', 
    bgColor: 'bg-teal-100 dark:bg-teal-900/30' 
  },
  FEE_COLLECTED: { 
    label: 'Fee', 
    color: 'text-amber-700 dark:text-amber-400', 
    bgColor: 'bg-amber-100 dark:bg-amber-900/30' 
  },
  FEE_CHARGED: { 
    label: 'Fee Charged', 
    color: 'text-orange-700 dark:text-orange-400', 
    bgColor: 'bg-orange-100 dark:bg-orange-900/30' 
  },
  PENALTY_COLLECTED: { 
    label: 'Penalty', 
    color: 'text-red-700 dark:text-red-400', 
    bgColor: 'bg-red-100 dark:bg-red-900/30' 
  },
  REFUND: { 
    label: 'Refund', 
    color: 'text-purple-700 dark:text-purple-400', 
    bgColor: 'bg-purple-100 dark:bg-purple-900/30' 
  },
  WRITE_OFF: { 
    label: 'Write Off', 
    color: 'text-slate-700 dark:text-slate-400', 
    bgColor: 'bg-slate-100 dark:bg-slate-900/30' 
  },
  ADJUSTMENT: { 
    label: 'Adjustment', 
    color: 'text-indigo-700 dark:text-indigo-400', 
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' 
  }
}

export function TransactionList({ compact = false, limit }: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        tenantId: 'default-tenant',
        page: page.toString(),
        limit: (limit || 20).toString()
      })
      
      if (searchTerm) params.append('search', searchTerm)
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      
      const response = await fetch(`/api/finance/transactions?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setTransactions(result.data.transactions || [])
        setTotalPages(result.data.pagination?.totalPages || 1)
      } else {
        setError(result.error || 'Failed to load transactions')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [page, searchTerm, typeFilter, statusFilter, limit])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Format date
  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get status badge
  const getStatusBadge = (status: string, reconciled?: boolean) => {
    if (reconciled || status === 'settled') {
      return (
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Settled
        </Badge>
      )
    }
    
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800 gap-1">
            <XCircle className="w-3 h-3" />
            Failed
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        )
    }
  }

  // Get type badge
  const getTypeBadge = (type: string) => {
    const config = TRANSACTION_TYPES[type] || { 
      label: type.replace(/_/g, ' '), 
      color: 'text-gray-700', 
      bgColor: 'bg-gray-100' 
    }
    
    return (
      <Badge variant="secondary" className={`${config.bgColor} ${config.color} font-medium`}>
        {config.label}
      </Badge>
    )
  }

  // Toggle row expansion
  const toggleRowExpansion = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id)
  }

  if (compact) {
    // Compact view for dashboard widget
    return (
      <div className="space-y-1">
        {loading ? (
          [...Array(limit || 5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted animate-pulse">
              <div className="h-4 w-24 rounded" />
              <div className="h-4 w-16 rounded" />
            </div>
          ))
        ) : (
          transactions.slice(0, limit || 5).map((txn) => (
            <div 
              key={txn.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {txn.direction === 'inflow' ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <ArrowDownLeft className="w-4 h-4 text-blue-500 shrink-0" />
                )}
                <span className="font-mono text-xs truncate">{txn.referenceNumber}</span>
                <span className="truncate hidden sm:inline">{getTypeBadge(txn.transactionType)}</span>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <span className={`font-mono text-sm font-medium ${
                  txn.direction === 'inflow' ? 'text-emerald-600' : 'text-blue-600'
                }`}>
                  {txn.direction === 'inflow' ? '+' : '-'}{formatCurrency(txn.amount)}
                </span>
                {getStatusBadge(txn.status, txn.reconciled)}
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  // Full view
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg">Transactions</CardTitle>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => fetchTransactions()}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by reference, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="DISBURSEMENT">Disbursement</SelectItem>
              <SelectItem value="REPAYMENT_PRINCIPAL">Repayment - Principal</SelectItem>
              <SelectItem value="REPAYMENT_INTEREST">Repayment - Interest</SelectItem>
              <SelectItem value="FEE_COLLECTED">Fee Collected</SelectItem>
              <SelectItem value="PENALTY_COLLECTED">Penalty</SelectItem>
              <SelectItem value="REFUND">Refund</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="settled">Settled</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reconciled">Reconciled</SelectItem>
              <SelectItem value="unreconciled">Unreconciled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="flex items-center gap-2 p-4 mb-4 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <ScrollArea className="max-h-[500px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]" />
                <TableHead>Reference</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-6 bg-muted rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((txn) => (
                  <React.Fragment key={txn.id}>
                    <TableRow 
                      key={txn.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleRowExpansion(txn.id)}
                    >
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleRowExpansion(txn.id)
                          }}
                        >
                          {expandedRow === txn.id ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm font-mono">{txn.referenceNumber}</code>
                        {txn.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {txn.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{getTypeBadge(txn.transactionType)}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono font-medium inline-flex items-center gap-1 ${
                          txn.direction === 'inflow' ? 'text-emerald-600' : 'text-blue-600'
                        }`}>
                          {txn.direction === 'inflow' ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownLeft className="w-3 h-3" />
                          )}
                          {formatCurrency(txn.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {formatDate(txn.occurredAt)}
                      </TableCell>
                      <TableCell>{getStatusBadge(txn.status, txn.reconciled)}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedTransaction(txn)
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                            <DialogHeader>
                              <DialogTitle>Transaction Details</DialogTitle>
                            </DialogHeader>
                            {selectedTransaction && (
                              <TransactionDetail transactionId={selectedTransaction.id} />
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Row - Double Entry Details */}
                    {expandedRow === txn.id && (
                      <TableRow key={`${txn.id}-expanded`} className="bg-muted/30">
                        <TableCell colSpan={7} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Double Entry Visualization */}
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                                Double-Entry Accounting
                              </h4>
                              <DoubleEntryVisualization type={txn.transactionType} amount={txn.amount} />
                            </div>
                            
                            {/* Related Entity Info */}
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                                Related Information
                              </h4>
                              {txn.loan ? (
                                <div className="p-3 bg-background rounded-lg border space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Loan Number:</span>
                                    <span className="font-mono">{txn.loan.loanNumber}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Customer:</span>
                                    <span>{txn.loan.customer?.firstName} {txn.loan.customer?.lastName}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Phone:</span>
                                    <span className="font-mono">{txn.loan.customer?.phone}</span>
                                  </div>
                                </div>
                              ) : txn.repayment ? (
                                <div className="p-3 bg-background rounded-lg border space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Payment Method:</span>
                                    <span>{txn.repayment.paymentMethod}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Ref Number:</span>
                                    <span className="font-mono">{txn.repayment.referenceNumber}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Customer:</span>
                                    <span>{txn.repayment.customer?.firstName} {txn.repayment.customer?.lastName}</span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground p-3 bg-background rounded-lg border">
                                  No related entity information available.
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Pagination */}
        {!compact && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Double Entry Visualization Component
function DoubleEntryVisualization({ type, amount }: { type: string; amount: number }) {
  const getEntries = (): { debit: { account: string; amount: number }; credit: { account: string; amount: number } } => {
    switch (type) {
      case 'DISBURSEMENT':
        return {
          debit: { account: 'Loans Receivable', amount },
          credit: { account: 'Cash - Disbursement Account', amount }
        }
      case 'REPAYMENT_PRINCIPAL':
        return {
          debit: { account: 'Cash - Collection Account', amount },
          credit: { account: 'Loans Receivable', amount }
        }
      case 'REPAYMENT_INTEREST':
        return {
          debit: { account: 'Cash - Collection Account', amount },
          credit: { account: 'Interest Revenue', amount }
        }
      case 'FEE_COLLECTED':
        return {
          debit: { account: 'Cash - Fee Account', amount },
          credit: { account: 'Fee Revenue', amount }
        }
      case 'PENALTY_COLLECTED':
        return {
          debit: { account: 'Cash - Penalty Account', amount },
          credit: { account: 'Penalty Revenue', amount }
        }
      case 'REFUND':
        return {
          debit: { account: 'Refund Expense', amount },
          credit: { account: 'Cash - Disbursement Account', amount }
        }
      default:
        return {
          debit: { account: 'General Ledger', amount },
          credit: { account: 'General Ledger', amount }
        }
    }
  }

  const entries = getEntries()

  return (
    <div className="p-3 bg-background rounded-lg border space-y-3">
      {/* Debit Side */}
      <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded border-l-4 border-red-500">
        <div>
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">DEBIT</p>
          <p className="font-medium">{entries.debit.account}</p>
        </div>
        <p className="font-mono font-bold text-red-600 dark:text-red-400">
          {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(entries.debit.amount)}
        </p>
      </div>

      {/* Credit Side */}
      <div className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded border-l-4 border-emerald-500">
        <div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">CREDIT</p>
          <p className="font-medium">{entries.credit.account}</p>
        </div>
        <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
          {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(entries.credit.amount)}
        </p>
      </div>

      {/* Balance Indicator */}
      <div className="flex items-center justify-center gap-2 pt-2 border-t">
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        <span className="text-sm text-muted-foreground">
          Balanced: Debits ({formatAmount(entries.debit.amount)}) = Credits ({formatAmount(entries.credit.amount)})
        </span>
      </div>
    </div>
  )
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0
  }).format(amount)
}

export default TransactionList
