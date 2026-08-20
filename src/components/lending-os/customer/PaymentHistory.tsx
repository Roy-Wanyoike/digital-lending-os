'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Search,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Receipt,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react'

// Types
interface PaymentRecord {
  id: string
  referenceNumber: string
  loanNumber: string
  amount: number
  principalPortion: number
  interestPortion: number
  feePortion: number
  paymentMethod: 'MPESA' | 'BANK_TRANSFER' | 'PESALINK' | 'CARD'
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REVERSED'
  paymentDate: string
  processedAt?: string
  description?: string
}

interface PaymentHistoryProps {
  payments?: PaymentRecord[]
}

// Mock data
const mockPayments: PaymentRecord[] = [
  {
    id: '1',
    referenceNumber: 'MP20260820001',
    loanNumber: 'LN-2026-0042',
    amount: 4200,
    principalPortion: 3500,
    interestPortion: 455,
    feePortion: 245,
    paymentMethod: 'MPESA',
    status: 'COMPLETED',
    paymentDate: '2026-08-20T10:30:00Z',
    processedAt: '2026-08-20T10:31:15Z',
    description: 'Monthly installment - August 2026'
  },
  {
    id: '2',
    referenceNumber: 'MP20260810001',
    loanNumber: 'LN-2026-0042',
    amount: 4200,
    principalPortion: 3500,
    interestPortion: 455,
    feePortion: 245,
    paymentMethod: 'MPESA',
    status: 'COMPLETED',
    paymentDate: '2026-08-10T09:15:00Z',
    processedAt: '2026-08-10T09:16:22Z',
    description: 'Monthly installment - July 2026'
  },
  {
    id: '3',
    referenceNumber: 'BK20260725001',
    loanNumber: 'LN-2026-0042',
    amount: 4200,
    principalPortion: 3500,
    interestPortion: 455,
    feePortion: 245,
    paymentMethod: 'BANK_TRANSFER',
    status: 'COMPLETED',
    paymentDate: '2026-07-25T14:20:00Z',
    processedAt: '2026-07-25T16:45:00Z',
    description: 'Monthly installment - June 2026 (Bank Transfer)'
  },
  {
    id: '4',
    referenceNumber: 'PS20260710001',
    loanNumber: 'LN-2026-0015',
    amount: 16950,
    principalPortion: 15000,
    interestPortion: 1500,
    feePortion: 450,
    paymentMethod: 'PESALINK',
    status: 'COMPLETED',
    paymentDate: '2026-03-15T11:00:00Z',
    processedAt: '2026-03-15T11:02:30Z',
    description: 'Final payment - Loan fully settled'
  },
  {
    id: '5',
    referenceNumber: 'MP20260705001',
    loanNumber: 'LN-2026-0042',
    amount: 4200,
    principalPortion: 3500,
    interestPortion: 455,
    feePortion: 245,
    paymentMethod: 'MPESA',
    status: 'FAILED',
    paymentDate: '2026-07-05T08:00:00Z',
    description: 'Insufficient funds - Payment failed'
  },
  {
    id: '6',
    referenceNumber: 'CD20260628001',
    loanNumber: 'LN-2026-0028',
    amount: 11300,
    principalPortion: 10000,
    interestPortion: 1000,
    feePortion: 300,
    paymentMethod: 'CARD',
    status: 'COMPLETED',
    paymentDate: '2026-05-31T23:55:00Z',
    processedAt: '2026-06-01T00:01:12Z',
    description: 'Final payment - Loan fully settled'
  }
]

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateShort = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-KE', {
    month: 'short',
    day: 'numeric',
    year: new Date(dateStr).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  })
}

// Status badge component
function StatusBadge({ status }: { status: PaymentRecord['status'] }) {
  const config = {
    COMPLETED: {
      icon: <CheckCircle2 className="w-4 h-4" />,
      label: 'Completed',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
    },
    PENDING: {
      icon: <Clock className="w-4 h-4 animate-pulse" />,
      label: 'Pending',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'
    },
    FAILED: {
      icon: <XCircle className="w-4 h-4" />,
      label: 'Failed',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
    },
    REVERSED: {
      icon: <AlertTriangle className="w-4 h-4" />,
      label: 'Reversed',
      className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
    }
  }

  const { icon, label, className } = config[status]

  return (
    <Badge variant="secondary" className={`gap-1 ${className}`}>
      {icon}
      {label}
    </Badge>
  )
}

// Payment method badge
function MethodBadge({ method }: { method: PaymentRecord['paymentMethod'] }) {
  const config = {
    MPESA: { label: 'M-Pesa', color: 'text-green-600' },
    BANK_TRANSFER: { label: 'Bank Transfer', color: 'text-blue-600' },
    PESALINK: { label: 'Pesalink', color: 'text-purple-600' },
    CARD: { label: 'Card', color: 'text-orange-600' }
  }

  return (
    <span className={`font-medium text-sm ${config[method].color}`}>
      {config[method].label}
    </span>
  )
}

export function PaymentHistory({ payments = mockPayments }: PaymentHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<'paymentDate' | 'amount'>('paymentDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filter and sort payments
  const filteredPayments = useMemo(() => {
    let result = [...payments]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.referenceNumber.toLowerCase().includes(query) ||
        p.loanNumber.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter)
    }

    // Apply method filter
    if (methodFilter !== 'all') {
      result = result.filter(p => p.paymentMethod === methodFilter)
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0
      
      if (sortField === 'paymentDate') {
        comparison = new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
      } else {
        comparison = a.amount - b.amount
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [payments, searchQuery, statusFilter, methodFilter, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage)
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Calculate totals
  const totalPaid = filteredPayments
    .filter(p => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + p.amount, 0)

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleDownloadReceipt = (payment: PaymentRecord) => {
    toast?.success(`Downloading receipt for ${payment.referenceNumber}`)
    // In real app, this would trigger a PDF download
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Payment History</h2>
          <p className="text-muted-foreground mt-1">
            View all your past transactions and download receipts
          </p>
        </div>
        
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export All
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Transactions</p>
            <p className="text-2xl font-bold">{filteredPayments.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Successful Payments</p>
            <p className="text-2xl font-bold text-blue-600">
              {filteredPayments.filter(p => p.status === 'COMPLETED').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by reference or loan number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="REVERSED">Reversed</SelectItem>
              </SelectContent>
            </Select>

            {/* Method Filter */}
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="MPESA">M-Pesa</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="PESALINK">Pesalink</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range */}
            <Button variant="outline" className="gap-2 whitespace-nowrap">
              <Calendar className="w-4 h-4" />
              Date Range
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Loan</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('amount')}
                >
                  <span className="flex items-center gap-1">
                    Amount
                    <ArrowUpDown className="w-4 h-4" />
                  </span>
                </TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('paymentDate')}
                >
                  <span className="flex items-center gap-1">
                    Date
                    <ArrowUpDown className="w-4 h-4" />
                  </span>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Receipt className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No payments found</p>
                    <p className="text-sm text-muted-foreground/70">
                      Try adjusting your filters or search query
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPayments.map((payment) => (
                  <TableRow key={payment.id} className="hover:bg-muted/50">
                    <TableCell>
                      <span className="font-mono text-sm font-medium">
                        {payment.referenceNumber}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{payment.loanNumber}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                        <div className="text-xs text-muted-foreground">
                          P: {formatCurrency(payment.principalPortion)} + 
                          I: {formatCurrency(payment.interestPortion)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <MethodBadge method={payment.paymentMethod} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <span>{formatDateShort(payment.paymentDate)}</span>
                        {payment.processedAt && (
                          <div className="text-xs text-muted-foreground">
                            Processed {formatDateShort(payment.processedAt)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadReceipt(payment)}
                        disabled={payment.status !== 'COMPLETED'}
                        className="gap-1"
                      >
                        <Download className="w-4 h-4" />
                        Receipt
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredPayments.length)} of{' '}
                {filteredPayments.length} results
              </p>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setCurrentPage(page)}
                    className="w-9 h-9"
                  >
                    {page}
                  </Button>
                ))}
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PaymentHistory
