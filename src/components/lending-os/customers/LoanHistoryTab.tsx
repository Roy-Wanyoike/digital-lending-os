'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { mockLoans } from './mock-data'
import type { LoanRecord } from './types'
import {
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  Search,
  CreditCard,
  TrendingUp,
  Wallet,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  FileText
} from 'lucide-react'

interface LoanHistoryTabProps {
  customerId: string
}

export function LoanHistoryTab({ customerId }: LoanHistoryTabProps) {
  const [loans] = useState<LoanRecord[]>(mockLoans)
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [productFilter, setProductFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Get unique products for filter
  const uniqueProducts = useMemo(() => {
    const products = [...new Set(loans.map(loan => loan.productName))]
    return products.sort()
  }, [loans])

  // Filter loans
  const filteredLoans = useMemo(() => {
    return loans.filter(loan => {
      const matchesStatus = statusFilter === 'all' || loan.status === statusFilter.toUpperCase()
      const matchesProduct = productFilter === 'all' || loan.productName === productFilter
      const matchesSearch = searchQuery === '' || 
        loan.loanNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loan.productName.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesStatus && matchesProduct && matchesSearch
    })
  }, [loans, statusFilter, productFilter, searchQuery])

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalLoans = filteredLoans.length
    const totalDisbursed = filteredLoans.reduce((sum, loan) => sum + loan.principal, 0)
    const totalRepaid = filteredLoans.reduce((sum, loan) => sum + loan.totalRepaid, 0)
    const activeLoans = filteredLoans.filter(l => l.status === 'ACTIVE').length
    
    return { totalLoans, totalDisbursed, totalRepaid, activeLoans }
  }, [filteredLoans])

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-0 dark:bg-emerald-900/40 dark:text-emerald-400">
            Active
          </Badge>
        )
      case 'PAID':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-0 dark:bg-blue-900/40 dark:text-blue-400">
            Paid
          </Badge>
        )
      case 'DEFAULTED':
        return (
          <Badge className="bg-red-100 text-red-800 border-0 dark:bg-red-900/40 dark:text-red-400">
            Defaulted
          </Badge>
        )
      case 'IN_ARREARS':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-0 dark:bg-orange-900/40 dark:text-orange-400">
            In Arrears
          </Badge>
        )
      case 'PENDING_DISBURSEMENT':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-0 dark:bg-amber-900/40 dark:text-amber-400">
            Pending
          </Badge>
        )
      case 'WRITTEN_OFF':
        return (
          <Badge className="bg-slate-200 text-slate-800 border-0 dark:bg-slate-700 dark:text-slate-300">
            Written Off
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-blue-500'
    if (percentage >= 50) return 'bg-emerald-500'
    if (percentage >= 25) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const toggleExpand = (loanId: string) => {
    setExpandedLoan(expandedLoan === loanId ? null : loanId)
  }

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['Loan Number', 'Product', 'Amount', 'Term', 'Disbursement Date', 'Status', 'Balance', 'Paid %']
    const rows = filteredLoans.map(loan => [
      loan.loanNumber,
      loan.productName,
      loan.principal.toString(),
      `${loan.termMonths} months`,
      loan.disbursementDate,
      loan.status,
      loan.outstandingBalance.toString(),
      `${loan.paidPercentage}%`
    ])
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `loan_history_${customerId}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    
    toast.success('Loan history exported successfully!')
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Loans</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{summaryStats.totalLoans}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Disbursed</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(summaryStats.totalDisbursed)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Total Repaid</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(summaryStats.totalRepaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">Active Loans</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{summaryStats.activeLoans}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Loan History
              </CardTitle>
              <CardDescription>{filteredLoans.length} loans found</CardDescription>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative flex-1 md:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search loans..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full md:w-48"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-36">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="defaulted">Defaulted</SelectItem>
                  <SelectItem value="in_arrears">In Arrears</SelectItem>
                </SelectContent>
              </Select>

              {/* Product Filter */}
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {uniqueProducts.map(product => (
                    <SelectItem key={product} value={product}>{product}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Export Button */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExportCSV}
                className="dark:border-slate-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <ScrollArea className="h-[450px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Loan ID</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Disbursement Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="min-w-[120px]">Paid %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.map((loan) => (
                  <>
                    <TableRow 
                      key={loan.id}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      onClick={() => toggleExpand(loan.id)}
                    >
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {expandedLoan === loan.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono font-medium text-sm">
                        {loan.loanNumber}
                      </TableCell>
                      <TableCell>{loan.productName}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(loan.principal)}
                      </TableCell>
                      <TableCell>{loan.termMonths > 0 ? `${loan.termMonths} mo` : `${loan.termDays} d`}</TableCell>
                      <TableCell>{formatDate(loan.disbursementDate)}</TableCell>
                      <TableCell>{getStatusBadge(loan.status)}</TableCell>
                      <TableCell className={`text-right font-medium ${loan.outstandingBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {formatCurrency(loan.outstandingBalance)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={Math.min(loan.paidPercentage, 100)} 
                            className="h-2 flex-1 max-w-[80px]"
                          />
                          <span className="text-xs text-slate-500 min-w-[35px]">
                            {Math.round(loan.paidPercentage)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Row Content */}
                    {expandedLoan === loan.id && (
                      <TableRow key={`${loan.id}-expanded`}>
                        <TableCell colSpan={9} className="p-0 bg-slate-50/50 dark:bg-slate-800/30">
                          <div className="p-4 space-y-4">
                            <Separator />
                            
                            {/* Payment Schedule Mini Table */}
                            {loan.paymentSchedule && loan.paymentSchedule.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-slate-500" />
                                  Payment Schedule
                                </h4>
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="text-xs">#</TableHead>
                                        <TableHead className="text-xs">Due Date</TableHead>
                                        <TableHead className="text-xs text-right">Principal</TableHead>
                                        <TableHead className="text-xs text-right">Interest</TableHead>
                                        <TableHead className="text-xs text-right">Fees</TableHead>
                                        <TableHead className="text-xs text-right">Total</TableHead>
                                        <TableHead className="text-xs">Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {loan.paymentSchedule.map((schedule) => (
                                        <TableRow key={schedule.installmentNumber}>
                                          <TableCell className="text-xs">{schedule.installmentNumber}</TableCell>
                                          <TableCell className="text-xs">{formatDate(schedule.dueDate)}</TableCell>
                                          <TableCell className="text-xs text-right">{formatCurrency(schedule.principalAmount)}</TableCell>
                                          <TableCell className="text-xs text-right">{formatCurrency(schedule.interestAmount)}</TableCell>
                                          <TableCell className="text-xs text-right">{formatCurrency(schedule.feeAmount)}</TableCell>
                                          <TableCell className="text-xs text-right font-medium">{formatCurrency(schedule.totalAmount)}</TableCell>
                                          <TableCell>
                                            {schedule.status === 'PAID' ? (
                                              <Badge className="bg-emerald-100 text-emerald-800 border-0 text-xs">
                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                Paid
                                              </Badge>
                                            ) : schedule.status === 'OVERDUE' ? (
                                              <Badge className="bg-red-100 text-red-800 border-0 text-xs">
                                                <XCircle className="w-3 h-3 mr-1" />
                                                Overdue
                                              </Badge>
                                            ) : (
                                              <Badge variant="outline" className="text-xs">
                                                <Clock className="w-3 h-3 mr-1" />
                                                Pending
                                              </Badge>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}

                            {/* Payment History Summary */}
                            {loan.payments && loan.payments.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                  <Wallet className="w-4 h-4 text-emerald-500" />
                                  Payment History Summary
                                </h4>
                                <div className="space-y-2">
                                  {loan.payments.map((payment) => (
                                    <div key={payment.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium">{formatCurrency(payment.amount)}</p>
                                          <p className="text-xs text-slate-500">{formatDate(payment.date)} • {payment.method.replace('_', '-')}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <Badge className="bg-emerald-100 text-emerald-800 border-0 text-xs">
                                          Completed
                                        </Badge>
                                        <p className="text-xs text-slate-500 mt-1">Bal: {formatCurrency(payment.runningBalance)}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Loan Details Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                <p className="text-xs text-slate-500">Interest Rate</p>
                                <p className="text-lg font-semibold">{loan.interestRate}%</p>
                              </div>
                              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                <p className="text-xs text-slate-500">Total Repayable</p>
                                <p className="text-lg font-semibold">{formatCurrency(loan.totalRepayable)}</p>
                              </div>
                              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                <p className="text-xs text-slate-500">Disbursement Method</p>
                                <p className="text-lg font-semibold capitalize">{loan.disbursementMethod.replace('_', '-')}</p>
                              </div>
                              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                <p className="text-xs text-slate-500">Next Payment</p>
                                <p className="text-lg font-semibold">{loan.nextPaymentDue ? formatDate(loan.nextPaymentDue) : '-'}</p>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
                
                {filteredLoans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="text-slate-500 dark:text-slate-400">No loans found matching your criteria.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoanHistoryTab
