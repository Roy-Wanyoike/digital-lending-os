'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Search,
  RefreshCw,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  ChevronDown,
  ChevronRight,
  Calendar,
  Hash,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Flag,
  User,
  Phone,
  FileText,
  Building2
} from 'lucide-react'

// Types
interface Transaction {
  id: string
  referenceNumber: string
  transactionType: TransactionType
  direction: 'credit' | 'debit'
  category: string
  amount: number
  currency: string
  description: string
  account: string
  status: 'completed' | 'pending' | 'failed'
  reconciliationStatus: 'reconciled' | 'unreconciled' | 'flagged'
  occurredAt: Date | string
  createdAt: Date | string
  createdBy: string
  
  // Related info (for expansion)
  debitEntry?: {
    account: string
    amount: number
  }
  creditEntry?: {
    account: string
    amount: number
  }
  
  // Related loan/customer info
  loanInfo?: {
    loanNumber: string
    customerName: string
    customerPhone: string
    product: string
  }
  
  // Provider reference
  providerRef?: {
    type: 'mpesa' | 'bank'
    reference: string
    receiptNumber?: string
  }
}

type TransactionType = 
  | 'disbursement' 
  | 'collection_principal' 
  | 'collection_interest' 
  | 'fee' 
  | 'penalty' 
  | 'refund' 
  | 'writeoff' 
  | 'adjustment' 
  | 'transfer'

interface TransactionFilters {
  account: string
  type: string
  category: string
  status: string
  startDate: string
  endDate: string
  minAmount: string
  maxAmount: string
  search: string
}

type GroupBy = 'date' | 'account' | 'category'

// Mock Data Generator
const generateMockTransactions = (): Transaction[] => {
  const types: Array<{ type: TransactionType; direction: 'credit' | 'debit'; category: string; descriptions: string[]; accounts: string[] }> = [
    { type: 'disbursement', direction: 'debit', category: 'Loan Disbursement', descriptions: ['M-Pesa B2C disbursement', 'Bank transfer to customer', 'Mobile money transfer'], accounts: ['Disbursement Float', 'Loans Receivable'] },
    { type: 'collection_principal', direction: 'credit', category: 'Principal Collection', descriptions: ['M-Pesa STK Push payment', 'Paybill collection', 'Auto-deduction repayment'], accounts: ['Collection Account', 'Loans Receivable'] },
    { type: 'collection_interest', direction: 'credit', category: 'Interest Collection', descriptions: ['Interest payment received', 'Monthly interest collection'], accounts: ['Collection Account', 'Interest Revenue'] },
    { type: 'fee', direction: 'credit', category: 'Fee Income', descriptions: ['Processing fee collected', 'Origination fee charged'], accounts: ['Fee Account', 'Fee Revenue'] },
    { type: 'penalty', direction: 'credit', category: 'Penalty Income', descriptions: ['Late payment penalty', 'Default penalty charged'], accounts: ['Collection Account', 'Penalty Revenue'] },
    { type: 'refund', direction: 'debit', category: 'Refund', descriptions: ['Customer refund processed', 'Overpayment refund'], accounts: ['Operating Account', 'Refund Expense'] },
    { type: 'transfer', direction: 'debit', category: 'Internal Transfer', accounts: ['Operating Account', 'Disbursement Float'], descriptions: ['Float replenishment', 'Inter-account transfer'] }
  ]

  const customers = [
    { name: 'John Kamau Mwangi', phone: '+254712345678', loanNum: 'LN-2024-001234' },
    { name: 'Sarah Wanjiku Njoroge', phone: '+254723456789', loanNum: 'LN-2024-001235' },
    { name: 'Peter Ochieng Odhiambo', phone: '+254734567890', loanNum: 'LN-2024-001236' },
    { name: 'Grace Achieng Otieno', phone: '+254745678901', loanNum: 'LN-2024-001237' },
    { name: 'David Kimani Githu', phone: '+254756789012', loanNum: 'LN-2024-001238' },
    { name: 'Faith Nyashomba Muthoni', phone: '+254767890123', loanNum: 'LN-2024-001239' }
  ]

  const products = ['Quick Loan', 'Salary Advance', 'Business Loan', 'Emergency Loan']
  const users = ['John Mwangi', 'Sarah Wanjiku', 'Peter Ochieng', 'System Auto']
  const statuses: Array<'completed' | 'pending' | 'failed'> = ['completed', 'completed', 'completed', 'completed', 'pending', 'failed']
  const reconStatuses: Array<'reconciled' | 'unreconciled' | 'flagged'> = ['reconciled', 'reconciled', 'unreconciled', 'flagged']

  const transactions: Transaction[] = []
  
  for (let i = 0; i < 120; i++) {
    const date = new Date()
    date.setDate(date.getDate() - Math.floor(i / 5))
    date.setHours(Math.floor(Math.random() * 10) + 8)
    date.setMinutes(Math.floor(Math.random() * 60))
    
    const typeIndex = Math.floor(Math.random() * types.length)
    const typeConfig = types[typeIndex]
    const descIndex = Math.floor(Math.random() * typeConfig.descriptions.length)
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const reconStatus = status === 'completed' ? reconStatuses[Math.floor(Math.random() * (reconStatuses.length - 1))] : 'unreconciled'
    
    const amount = Math.round((Math.random() * 100000 + 500) / 50) * 50
    const customer = customers[Math.floor(Math.random() * customers.length)]
    
    transactions.push({
      id: `TXN-${String(100000 + i).padStart(6, '0')}`,
      referenceNumber: `REF-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      transactionType: typeConfig.type,
      direction: typeConfig.direction,
      category: typeConfig.category,
      amount,
      currency: 'KES',
      description: typeConfig.descriptions[descIndex],
      account: typeConfig.accounts[0],
      status,
      reconciliationStatus: reconStatus,
      occurredAt: date.toISOString(),
      createdAt: date.toISOString(),
      createdBy: users[Math.floor(Math.random() * users.length)],
      
      debitEntry: {
        account: typeConfig.accounts[0],
        amount: typeConfig.direction === 'debit' ? amount : 0
      },
      creditEntry: {
        account: typeConfig.accounts[1],
        amount: typeConfig.direction === 'credit' ? amount : 0
      },
      
      loanInfo: {
        loanNumber: customer.loanNum,
        customerName: customer.name,
        customerPhone: customer.phone,
        product: products[Math.floor(Math.random() * products.length)]
      },
      
      providerRef: {
        type: Math.random() > 0.3 ? 'mpesa' : 'bank',
        reference: `TX${Date.now().toString().slice(-8)}${i}`,
        receiptNumber: Math.random() > 0.5 ? `QMJ${Math.random().toString(36).substr(2, 8).toUpperCase()}` : undefined
      }
    })
  }

  return transactions.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
}

// Format helpers
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const PAGE_SIZE = 15

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [filters, setFilters] = useState<TransactionFilters>({
    account: 'all',
    type: 'all',
    category: 'all',
    status: 'all',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    search: ''
  })
  
  // Grouping
  const [groupBy, setGroupBy] = useState<GroupBy>('date')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  
  // Expanded row
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setTransactions(generateMockTransactions())
      setLoading(false)
    }, 600)
    
    return () => clearTimeout(timer)
  }, [])

  // Filtered data
  const filteredTransactions = useMemo(() => {
    return transactions.filter(txn => {
      if (filters.account !== 'all' && txn.account !== filters.account) return false
      if (filters.type !== 'all' && txn.transactionType !== filters.type) return false
      if (filters.category !== 'all' && txn.category !== filters.category) return false
      if (filters.status !== 'all' && txn.status !== filters.status) return false
      
      if (filters.startDate && new Date(txn.occurredAt) < new Date(filters.startDate)) return false
      if (filters.endDate && new Date(txn.occurredAt) > new Date(filters.endDate + 'T23:59:59')) return false
      
      if (filters.minAmount && txn.amount < parseFloat(filters.minAmount)) return false
      if (filters.maxAmount && txn.amount > parseFloat(filters.maxAmount)) return false
      
      if (filters.search) {
        const s = filters.search.toLowerCase()
        return (
          txn.referenceNumber.toLowerCase().includes(s) ||
          txn.description.toLowerCase().includes(s) ||
          txn.providerRef?.reference.toLowerCase().includes(s) ||
          txn.loanInfo?.customerName.toLowerCase().includes(s) ||
          txn.loanInfo?.loanNumber.toLowerCase().includes(s)
        )
      }
      
      return true
    })
  }, [transactions, filters])

  // Grouped data
  const groupedData = useMemo(() => {
    const groups: Record<string, Transaction[]> = {}
    
    filteredTransactions.forEach(txn => {
      let key: string
      switch (groupBy) {
        case 'date':
          key = formatDate(txn.occurredAt)
          break
        case 'account':
          key = txn.account
          break
        case 'category':
          key = txn.category
          break
        default:
          key = formatDate(txn.occurredAt)
      }
      
      if (!groups[key]) groups[key] = []
      groups[key].push(txn)
    })
    
    return Object.entries(groups).map(([key, items]) => ({ key, items }))
  }, [filteredTransactions, groupBy])

  // Pagination for flat view
  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE)
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => {
      setTransactions(generateMockTransactions())
      setLoading(false)
    }, 500)
  }

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 gap-1"><CheckCircle2 className="w-3 h-3" />Completed</Badge>
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 gap-1"><Clock className="w-3 h-3" />Pending</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 gap-1"><XCircle className="w-3 h-3" />Failed</Badge>
    }
  }

  const getReconciliationBadge = (status: Transaction['reconciliationStatus']) => {
    switch (status) {
      case 'reconciled':
        return <Badge variant="outline" className="border-emerald-300 text-emerald-700">Reconciled</Badge>
      case 'flagged':
        return <Badge variant="outline" className="border-red-300 text-red-700 gap-1"><Flag className="w-3 h-3" />Flagged</Badge>
      default:
        return <Badge variant="outline">Unreconciled</Badge>
    }
  }

  const getTypeBadge = (type: TransactionType) => {
    const config: Record<TransactionType, { label: string; color: string }> = {
      disbursement: { label: 'Disbursement', color: 'bg-blue-100 text-blue-800' },
      collection_principal: { label: 'Principal', color: 'bg-emerald-100 text-emerald-800' },
      collection_interest: { label: 'Interest', color: 'bg-teal-100 text-teal-800' },
      fee: { label: 'Fee', color: 'bg-amber-100 text-amber-800' },
      penalty: { label: 'Penalty', color: 'bg-red-100 text-red-800' },
      refund: { label: 'Refund', color: 'bg-purple-100 text-purple-800' },
      writeoff: { label: 'Write-off', color: 'bg-slate-100 text-slate-800' },
      adjustment: { label: 'Adjustment', color: 'bg-indigo-100 text-indigo-800' },
      transfer: { label: 'Transfer', color: 'bg-cyan-100 text-cyan-800' }
    }
    
    const c = config[type]
    return <Badge variant="secondary" className={c.color}>{c.label}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="w-6 h-6 text-slate-600" />
            Transaction History
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            Complete transaction log with full audit trail • {filteredTransactions.length} transactions found
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          {/* Primary Filters Row */}
          <div className="flex flex-col lg:flex-row gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by reference, description, customer..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-9"
              />
            </div>
            
            <Select value={filters.account} onValueChange={(v) => setFilters(prev => ({ ...prev, account: v }))}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="Collection Account">Collection Account</SelectItem>
                <SelectItem value="Disbursement Float">Disbursement Float</SelectItem>
                <SelectItem value="Operating Account">Operating Account</SelectItem>
                <SelectItem value="Fee Account">Fee Account</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.type} onValueChange={(v) => setFilters(prev => ({ ...prev, type: v }))}>
              <SelectTrigger className="w-full lg:w-[170px]">
                <Layers className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="disbursement">Disbursement</SelectItem>
                <SelectItem value="collection_principal">Principal</SelectItem>
                <SelectItem value="collection_interest">Interest</SelectItem>
                <SelectItem value="fee">Fee</SelectItem>
                <SelectItem value="penalty">Penalty</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v }))}>
              <SelectTrigger className="w-full lg:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Secondary Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm whitespace-nowrap">From:</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full sm:w-[150px]"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">To:</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full sm:w-[150px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm whitespace-nowrap">Min:</Label>
              <Input
                type="number"
                placeholder="Min Amt"
                value={filters.minAmount}
                onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                className="w-full sm:w-[120px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Max:</Label>
              <Input
                type="number"
                placeholder="Max Amt"
                value={filters.maxAmount}
                onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                className="w-full sm:w-[120px]"
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Label className="text-sm whitespace-nowrap">Group by:</Label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                <SelectTrigger className="w-full sm:w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="account">Account</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table/List */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recon</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(PAGE_SIZE)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(10)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-5 bg-muted rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <Search className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                      <p className="text-lg font-medium text-muted-foreground">No transactions found</p>
                      <p className="text-sm text-muted-foreground mt-1">Try adjusting your filter criteria</p>
                    </TableCell>
                  </TableRow>
                ) : groupBy === 'date' ? (
                  // Grouped by date
                  paginatedTransactions.map((txn) => (
                    <TransactionRow 
                      key={txn.id} 
                      transaction={txn} 
                      expanded={expandedRow === txn.id}
                      onToggle={() => setExpandedRow(expandedRow === txn.id ? null : txn.id)}
                      getStatusBadge={getStatusBadge}
                      getReconciliationBadge={getReconciliationBadge}
                      getTypeBadge={getTypeBadge}
                    />
                  ))
                ) : (
                  // Grouped view
                  groupedData.map(group => (
                    <>
                      <TableRow key={`group-${group.key}`} className="bg-muted/30 hover:bg-muted/50">
                        <TableCell colSpan={10} className="font-semibold py-3 px-4">
                          <span className="flex items-center gap-2">
                            {groupBy === 'account' && <Building2 className="w-4 h-4" />}
                            {groupBy === 'category' && <Layers className="w-4 h-4" />}
                            {groupBy === 'date' && <Calendar className="w-4 h-4" />}
                            {group.key}
                            <Badge variant="secondary" className="ml-2">{group.items.length} items</Badge>
                            <span className="ml-auto font-normal text-muted-foreground">
                              Total: {formatCurrency(group.items.reduce((sum, t) => sum + t.amount, 0))}
                            </span>
                          </span>
                        </TableCell>
                      </TableRow>
                      {group.items.map(txn => (
                        <TransactionRow 
                          key={txn.id} 
                          transaction={txn} 
                          expanded={expandedRow === txn.id}
                          onToggle={() => setExpandedRow(expandedRow === txn.id ? null : txn.id)}
                          getStatusBadge={getStatusBadge}
                          getReconciliationBadge={getReconciliationBadge}
                          getTypeBadge={getTypeBadge}
                        />
                      ))}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredTransactions.length)} of {filteredTransactions.length}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Transaction Row Component
interface TransactionRowProps {
  transaction: Transaction
  expanded: boolean
  onToggle: () => void
  getStatusBadge: (status: Transaction['status']) => React.ReactNode
  getReconciliationBadge: (status: Transaction['reconciliationStatus']) => React.ReactNode
  getTypeBadge: (type: TransactionType) => React.ReactNode
}

function TransactionRow({ 
  transaction, 
  expanded, 
  onToggle,
  getStatusBadge,
  getReconciliationBadge,
  getTypeBadge
}: TransactionRowProps) {
  return (
    <>
      <TableRow 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <TableCell>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </TableCell>
        <TableCell className="whitespace-nowrap text-sm">
          {formatDateTime(transaction.occurredAt)}
        </TableCell>
        <TableCell>
          <code className="text-xs font-mono">{transaction.referenceNumber}</code>
        </TableCell>
        <TableCell>{getTypeBadge(transaction.transactionType)}</TableCell>
        <TableCell className="max-w-[200px] truncate text-sm">
          {transaction.description}
        </TableCell>
        <TableCell className="text-xs max-w-[120px] truncate">
          {transaction.account}
        </TableCell>
        <TableCell className={`text-right font-mono font-medium ${
          transaction.direction === 'credit' ? 'text-emerald-600' : 'text-red-600'
        }`}>
          {transaction.direction === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
        </TableCell>
        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
        <TableCell>{getReconciliationBadge(transaction.reconciliationStatus)}</TableCell>
        <TableCell>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                <Eye className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Transaction Details</DialogTitle>
              </DialogHeader>
              <TransactionDetailModal transaction={transaction} />
            </DialogContent>
          </Dialog>
        </TableCell>
      </TableRow>
      
      {/* Expanded Row */}
      {expanded && (
        <TableRow className="bg-muted/20">
          <TableCell colSpan={10} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Double Entry */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b pb-1">
                  Double-Entry Accounting
                </h4>
                <div className="space-y-2">
                  <div className="p-2 bg-red-50 dark:bg-red-900/10 rounded border-l-2 border-red-500">
                    <p className="text-xs text-red-600 font-medium">DEBIT</p>
                    <p className="font-medium text-sm">{transaction.debitEntry?.account || '-'}</p>
                    <p className="font-mono text-red-600">{formatCurrency(transaction.debitEntry?.amount || 0)}</p>
                  </div>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded border-l-2 border-emerald-500">
                    <p className="text-xs text-emerald-600 font-medium">CREDIT</p>
                    <p className="font-medium text-sm">{transaction.creditEntry?.account || '-'}</p>
                    <p className="font-mono text-emerald-600">{formatCurrency(transaction.creditEntry?.amount || 0)}</p>
                  </div>
                </div>
              </div>
              
              {/* Loan/Customer Info */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b pb-1">
                  Related Information
                </h4>
                {transaction.loanInfo ? (
                  <div className="space-y-2 text-sm p-2 bg-background rounded border">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Loan #:</span>
                      <span className="font-mono">{transaction.loanInfo.loanNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer:</span>
                      <span>{transaction.loanInfo.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-mono">{transaction.loanInfo.customerPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Product:</span>
                      <span>{transaction.loanInfo.product}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground p-2 bg-background rounded border">No related loan information</p>
                )}
              </div>
              
              {/* Provider Reference */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b pb-1">
                  Provider Reference
                </h4>
                {transaction.providerRef ? (
                  <div className="space-y-2 text-sm p-2 bg-background rounded border">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Provider:</span>
                      <Badge variant="secondary" className={
                        transaction.providerRef.type === 'mpesa' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }>
                        {transaction.providerRef.type === 'mpesa' ? 'M-Pesa' : 'Bank'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reference:</span>
                      <span className="font-mono text-xs">{transaction.providerRef.reference}</span>
                    </div>
                    {transaction.providerRef.receiptNumber && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Receipt #:</span>
                        <span className="font-mono text-xs">{transaction.providerRef.receiptNumber}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground p-2 bg-background rounded border">No provider reference</p>
                )}
                
                <div className="pt-2 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Created By:</span>
                    <span>{transaction.createdBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created At:</span>
                    <span>{formatDateTime(transaction.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// Detail Modal Content
function TransactionDetailModal({ transaction }: { transaction: Transaction }) {
  return (
    <div className="space-y-6 mt-4">
      {/* Status Row */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        {getStatusBadge(transaction.status)}
        {getReconciliationStatusBadge(transaction.reconciliationStatus)}
        <span className="ml-auto text-sm text-muted-foreground">
          {formatDateTime(transaction.occurredAt)}
        </span>
      </div>
      
      {/* Main Info Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Transaction Information</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b">
              <dt className="text-muted-foreground">Reference Number</dt>
              <dd className="font-mono">{transaction.referenceNumber}</dd>
            </div>
            <div className="flex justify-between py-1 border-b">
              <dt className="text-muted-foreground">Transaction ID</dt>
              <dd className="font-mono">{transaction.id}</dd>
            </div>
            <div className="flex justify-between py-1 border-b">
              <dt className="text-muted-foreground">Type</dt>
              <dd>{getTypeLabel(transaction.transactionType)}</dd>
            </div>
            <div className="flex justify-between py-1 border-b">
              <dt className="text-muted-foreground">Direction</dt>
              <dd className={transaction.direction === 'credit' ? 'text-emerald-600' : 'text-red-600'}>
                {transaction.direction === 'credit' ? 'Credit (Inflow)' : 'Debit (Outflow)'}
              </dd>
            </div>
            <div className="flex justify-between py-1 border-b">
              <dt className="text-muted-foreground">Category</dt>
              <dd>{transaction.category}</dd>
            </div>
            <div className="flex justify-between py-1 border-b">
              <dt className="text-muted-foreground">Account</dt>
              <dd>{transaction.account}</dd>
            </div>
          </dl>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Financial Details</h4>
          <div className="p-4 bg-background rounded-lg border space-y-3">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className={`text-3xl font-bold font-mono ${
                transaction.direction === 'credit' ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {transaction.direction === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-3 border-t">
              <div className="text-center p-2 bg-red-50 dark:bg-red-900/10 rounded">
                <p className="text-xs text-red-600">Debit</p>
                <p className="font-mono font-semibold text-red-600">
                  {formatCurrency(transaction.debitEntry?.amount || 0)}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {transaction.debitEntry?.account}
                </p>
              </div>
              <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded">
                <p className="text-xs text-emerald-600">Credit</p>
                <p className="font-mono font-semibold text-emerald-600">
                  {formatCurrency(transaction.creditEntry?.amount || 0)}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {transaction.creditEntry?.account}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Additional Info */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm">Additional Information</h4>
        <div className="p-4 bg-background rounded-lg border space-y-2 text-sm">
          <p><strong>Description:</strong> {transaction.description}</p>
          {transaction.loanInfo && (
            <p><strong>Related Loan:</strong> {transaction.loanInfo.loanNumber} - {transaction.loanInfo.customerName}</p>
          )}
          {transaction.providerRef && (
            <p><strong>Provider Ref:</strong> {transaction.providerRef.reference} {transaction.providerRef.receiptNumber && `(Receipt: ${transaction.providerRef.receiptNumber})`}</p>
          )}
          <p><strong>Created By:</strong> {transaction.createdBy} at {formatDateTime(transaction.createdAt)}</p>
        </div>
      </div>
    </div>
  )
}

function getStatusBadge(status: Transaction['status']) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-emerald-100 text-emerald-800 gap-1"><CheckCircle2 className="w-3 h-3" />Completed</Badge>
    case 'pending':
      return <Badge className="bg-amber-100 text-amber-800 gap-1"><Clock className="w-3 h-3" />Pending</Badge>
    case 'failed':
      return <Badge className="bg-red-100 text-red-800 gap-1"><XCircle className="w-3 h-3" />Failed</Badge>
  }
}

function getReconciliationStatusBadge(status: Transaction['reconciliationStatus']) {
  switch (status) {
    case 'reconciled':
      return <Badge variant="outline" className="border-emerald-300 text-emerald-700">Reconciled</Badge>
    case 'flagged':
      return <Badge variant="outline" className="border-red-300 text-red-700 gap-1"><Flag className="w-3 h-3" />Flagged</Badge>
    default:
      return <Badge variant="outline">Unreconciled</Badge>
  }
}

function getTypeLabel(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    disbursement: 'Disbursement',
    collection_principal: 'Principal Collection',
    collection_interest: 'Interest Collection',
    fee: 'Fee',
    penalty: 'Penalty',
    refund: 'Refund',
    writeoff: 'Write-off',
    adjustment: 'Adjustment',
    transfer: 'Transfer'
  }
  return labels[type] || type
}

export default TransactionHistory
