'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Scale,
  Search,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  FileText,
  FileSpreadsheet,
  Eye,
  ChevronDown,
  ChevronRight,
  CheckCircle2
} from 'lucide-react'

// Types
interface LedgerEntry {
  id: string
  entryId: string
  date: Date | string
  description: string
  debitAccount: string
  creditAccount: string
  debitAmount: number | null
  creditAmount: number | null
  balance: number
  reference: string
  user: string
  category: EntryCategory
  reconciled: boolean
}

type EntryCategory = 
  | 'all' 
  | 'disbursement' 
  | 'collection' 
  | 'fee' 
  | 'interest' 
  | 'penalty' 
  | 'writeoff' 
  | 'adjustment'

interface LedgerFilters {
  category: EntryCategory
  startDate: string
  endDate: string
  search: string
}

// Mock Data Generator
const generateMockEntries = (): LedgerEntry[] => {
  const categories: Array<{ type: Exclude<EntryCategory, 'all'>; descriptions: [string, string, string][], debitAcct: string; creditAcct: string }> = [
    {
      type: 'disbursement',
      descriptions: [
        ['Loan disbursement to customer', 'M-Pesa B2C transfer', 'Bank transfer for loan'],
        ['Loans Receivable', 'Cash - Disbursement Float', 'Cash - Operating Wallet']
      ],
      debitAcct: 'Loans Receivable',
      creditAcct: 'Cash - Disbursement Float'
    },
    {
      type: 'collection',
      descriptions: [
        ['Principal repayment received', 'M-Pesa collection - STK Push', 'Bank deposit received'],
        ['Cash - Collection Account', 'Loans Receivable', 'Cash - M-Pesa Float']
      ],
      debitAcct: 'Cash - Collection Account',
      creditAcct: 'Loans Receivable'
    },
    {
      type: 'fee',
      descriptions: [
        ['Processing fee collected', 'Origination fee charged', 'Service fee received'],
        ['Cash - Fee Account', 'Fee Revenue', 'Unearned Fee Revenue']
      ],
      debitAcct: 'Cash - Fee Account',
      creditAcct: 'Fee Revenue'
    },
    {
      type: 'interest',
      descriptions: [
        ['Interest income accrued', 'Interest on loan payment', 'Monthly interest earned'],
        ['Cash - Collection Account', 'Interest Receivable', 'Interest Revenue']
      ],
      debitAcct: 'Cash - Collection Account',
      creditAcct: 'Interest Revenue'
    },
    {
      type: 'penalty',
      descriptions: [
        ['Late payment penalty', 'Default penalty charged', 'Overdue fee collected'],
        ['Cash - Collection Account', 'Penalty Receivable', 'Penalty Revenue']
      ],
      debitAcct: 'Cash - Collection Account',
      creditAcct: 'Penalty Revenue'
    },
    {
      type: 'writeoff',
      descriptions: [
        ['Bad debt write-off', 'Loan written off - uncollectible', 'Provision for bad debt'],
        ['Bad Debt Expense', 'Allowance for Doubtful Accounts', 'Loans Receivable']
      ],
      debitAcct: 'Bad Debt Expense',
      creditAcct: 'Allowance for Doubtful Accounts'
    },
    {
      type: 'adjustment',
      descriptions: [
        ['Journal entry correction', 'Balance adjustment entry', 'Reclassification adjustment'],
        ['Retained Earnings', 'Miscellaneous Expense', 'Accrued Expenses']
      ],
      debitAcct: 'Retained Earnings',
      creditAcct: 'Miscellaneous Expense'
    }
  ]

  const users = ['John Mwangi', 'Sarah Wanjiku', 'Peter Ochieng', 'Grace Achieng', 'David Kamau']
  const entries: LedgerEntry[] = []
  let runningBalance = 15850000 // Starting balance

  const baseDate = new Date()
  
  for (let i = 0; i < 85; i++) {
    const date = new Date(baseDate)
    date.setDate(date.getDate() - Math.floor(i / 3))
    
    const catIndex = Math.floor(Math.random() * categories.length)
    const cat = categories[catIndex]
    const descIndex = Math.floor(Math.random() * 3)
    
    const isDebit = Math.random() > 0.5
    const amount = Math.round((Math.random() * 50000 + 500) / 100) * 100
    
    if (isDebit) {
      runningBalance += amount
    } else {
      runningBalance -= amount
    }

    entries.push({
      id: `LE-${String(100000 + i).padStart(6, '0')}`,
      entryId: `JE-${new Date(date).getFullYear()}${String(new Date(date).getMonth() + 1).padStart(2, '0')}${String(i + 1).padStart(3, '0')}`,
      date: date.toISOString(),
      description: cat.descriptions[descIndex][0],
      debitAccount: isDebit ? cat.debitAcct : '-',
      creditAccount: !isDebit ? cat.creditAcct : '-',
      debitAmount: isDebit ? amount : null,
      creditAmount: !isDebit ? amount : null,
      balance: runningBalance,
      reference: `REF-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      user: users[Math.floor(Math.random() * users.length)],
      category: cat.type,
      reconciled: Math.random() > 0.15
    })
  }

  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

// Category options
const categoryOptions: Array<{ value: EntryCategory; label: string }> = [
  { value: 'all', label: 'All Entries' },
  { value: 'disbursement', label: 'Disbursement' },
  { value: 'collection', label: 'Collection' },
  { value: 'fee', label: 'Fee' },
  { value: 'interest', label: 'Interest' },
  { value: 'penalty', label: 'Penalty' },
  { value: 'writeoff', label: 'Write-off' },
  { value: 'adjustment', label: 'Adjustment' }
]

// Format helpers
function formatCurrency(amount: number | null): string {
  if (amount === null) return '-'
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
  return new Date(date).toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const PAGE_SIZE = 20

export function AccountLedgerView() {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [filters, setFilters] = useState<LedgerFilters>({
    category: 'all',
    startDate: '',
    endDate: '',
    search: ''
  })
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  
  // Expanded row
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setEntries(generateMockEntries())
      setLoading(false)
    }, 600)
    
    return () => clearTimeout(timer)
  }, [])

  // Filtered and paginated data
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Category filter
      if (filters.category !== 'all' && entry.category !== filters.category) {
        return false
      }
      
      // Date range filter
      if (filters.startDate && new Date(entry.date) < new Date(filters.startDate)) {
        return false
      }
      if (filters.endDate && new Date(entry.date) > new Date(filters.endDate + 'T23:59:59')) {
        return false
      }
      
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        return (
          entry.description.toLowerCase().includes(searchLower) ||
          entry.reference.toLowerCase().includes(searchLower) ||
          entry.entryId.toLowerCase().includes(searchLower) ||
          entry.debitAccount.toLowerCase().includes(searchLower) ||
          entry.creditAccount.toLowerCase().includes(searchLower)
        )
      }
      
      return true
    })
  }, [entries, filters])

  const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE)
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => {
      setEntries(generateMockEntries())
      setLoading(false)
    }, 500)
  }

  const handleExportCSV = () => {
    const headers = ['Entry ID', 'Date', 'Description', 'Debit Account', 'Credit Account', 'Debit', 'Credit', 'Balance', 'Reference', 'User', 'Reconciled']
    const rows = filteredEntries.map(e => [
      e.entryId,
      formatDate(e.date),
      e.description,
      e.debitAccount,
      e.creditAccount,
      e.debitAmount?.toString() || '',
      e.creditAmount?.toString() || '',
      e.balance.toString(),
      e.reference,
      e.user,
      e.reconciled ? 'Yes' : 'No'
    ])
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ledger-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getCategoryBadge = (category: EntryCategory) => {
    const config: Record<Exclude<EntryCategory, 'all'>, { label: string; color: string }> = {
      disbursement: { label: 'Disbursement', color: 'bg-blue-100 text-blue-800' },
      collection: { label: 'Collection', color: 'bg-emerald-100 text-emerald-800' },
      fee: { label: 'Fee', color: 'bg-amber-100 text-amber-800' },
      interest: { label: 'Interest', color: 'bg-teal-100 text-teal-800' },
      penalty: { label: 'Penalty', color: 'bg-red-100 text-red-800' },
      writeoff: { label: 'Write-off', color: 'bg-slate-100 text-slate-800' },
      adjustment: { label: 'Adjustment', color: 'bg-purple-100 text-purple-800' }
    }
    
    if (category === 'all') return null
    const c = config[category]
    return <Badge variant="secondary" className={c.color}>{c.label}</Badge>
  }

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
            Double-entry accounting ledger with full audit trail
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by description, reference, or account..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-9"
              />
            </div>
            
            <Select 
              value={filters.category} 
              onValueChange={(v) => setFilters(prev => ({ ...prev, category: v as EntryCategory }))}
            >
              <SelectTrigger className="w-full lg:w-[180px]">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="Start Date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full lg:w-[160px]"
            />

            <Input
              type="date"
              placeholder="End Date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full lg:w-[160px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Ledger Entries</CardTitle>
              <CardDescription>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredEntries.length)} of {filteredEntries.length} entries
                {filters.category !== 'all' && (
                  <span className="ml-2">• Filtered by: <strong>{categoryOptions.find(o => o.value === filters.category)?.label}</strong></span>
                )}
              </CardDescription>
            </div>
            {getCategoryBadge(filters.category)}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[550px] overflow-auto rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead>Date</TableHead>
                  <TableHead>Entry ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Debit Account</TableHead>
                  <TableHead>Credit Account</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(PAGE_SIZE)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(12)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-5 bg-muted rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : paginatedEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12">
                      <Scale className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                      <p className="text-lg font-medium text-muted-foreground">No entries found</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Try adjusting your filters or search criteria
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEntries.map((entry) => (
                    <>
                      <TableRow 
                        key={entry.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}
                      >
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedRow(expandedRow === entry.id ? null : entry.id)
                            }}
                          >
                            {expandedRow === entry.id ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(entry.date)}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs font-mono">{entry.entryId}</code>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          <span className="text-sm">{entry.description}</span>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs">
                          {entry.debitAccount !== '-' ? entry.debitAccount : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs">
                          {entry.creditAccount !== '-' ? entry.creditAccount : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm ${entry.debitAmount ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
                          {formatCurrency(entry.debitAmount)}
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm ${entry.creditAmount ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}`}>
                          {formatCurrency(entry.creditAmount)}
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm font-medium ${
                          entry.balance >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-red-600'
                        }`}>
                          {formatCurrency(entry.balance)}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs font-mono">{entry.reference}</code>
                        </TableCell>
                        <TableCell className="text-xs max-w-[100px] truncate">
                          {entry.user}
                        </TableCell>
                        <TableCell>
                          {entry.reconciled ? (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Recon
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Row Details */}
                      {expandedRow === entry.id && (
                        <TableRow key={`${entry.id}-expanded`} className="bg-muted/30">
                          <TableCell colSpan={12} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {/* Full Entry Details */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b pb-2">
                                  Entry Details
                                </h4>
                                <dl className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Entry ID:</dt>
                                    <dd className="font-mono">{entry.entryId}</dd>
                                  </div>
                                  <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Created:</dt>
                                    <dd>{formatDateTime(entry.date)}</dd>
                                  </div>
                                  <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Reference:</dt>
                                    <dd className="font-mono">{entry.reference}</dd>
                                  </div>
                                  <div className="flex justify-between">
                                    <dt className="text-muted-foreground">User:</dt>
                                    <dd>{entry.user}</dd>
                                  </div>
                                </dl>
                              </div>
                              
                              {/* Double Entry Visualization */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b pb-2">
                                  Double-Entry
                                </h4>
                                {entry.debitAmount ? (
                                  <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border-l-4 border-red-500">
                                    <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">DEBIT</p>
                                    <p className="font-medium text-sm">{entry.debitAccount}</p>
                                    <p className="font-mono font-bold text-red-600">{formatCurrency(entry.debitAmount)}</p>
                                  </div>
                                ) : null}
                                {entry.creditAmount ? (
                                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border-l-4 border-emerald-500">
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">CREDIT</p>
                                    <p className="font-medium text-sm">{entry.creditAccount}</p>
                                    <p className="font-mono font-bold text-emerald-600">{formatCurrency(entry.creditAmount)}</p>
                                  </div>
                                ) : null}
                              </div>
                              
                              {/* Running Balance & Status */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b pb-2">
                                  Balance & Status
                                </h4>
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Running Balance:</span>
                                    <span className={`font-mono font-bold ${entry.balance >= 0 ? '' : 'text-red-600'}`}>
                                      {formatCurrency(entry.balance)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Reconciliation:</span>
                                    {entry.reconciled ? (
                                      <Badge className="bg-emerald-100 text-emerald-800">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Reconciled
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline">Pending</Badge>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex gap-2 pt-2">
                                  <Button variant="outline" size="sm" className="flex-1">
                                    <Eye className="w-3 h-3 mr-1" />
                                    View Journal
                                  </Button>
                                  <Button variant="outline" size="sm" className="flex-1">
                                    Edit Entry
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} • {filteredEntries.length} total entries
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AccountLedgerView
