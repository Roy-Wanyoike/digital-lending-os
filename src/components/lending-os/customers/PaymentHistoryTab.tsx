'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts'
import { mockPayments, mockPaymentSummaries, mockPaymentMethodBreakdown } from './mock-data'
import type { PaymentRecord, PaymentSummaryByMonth, PaymentMethodBreakdown } from './types'
import {
  Download,
  Filter,
  Search,
  Wallet,
  Smartphone,
  Building2,
  Banknote,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Receipt,
  TrendingUp
} from 'lucide-react'

interface PaymentHistoryTabProps {
  customerId: string
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

export function PaymentHistoryTab({ customerId }: PaymentHistoryTabProps) {
  const [payments] = useState<PaymentRecord[]>(mockPayments)
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Get method icon
  const getMethodIcon = (method: string) => {
    switch (method.toUpperCase()) {
      case 'MPESA':
        return <Smartphone className="w-4 h-4 text-green-600" />
      case 'BANK_TRANSFER':
        return <Building2 className="w-4 h-4 text-blue-600" />
      case 'CASH':
        return <Banknote className="w-4 h-4 text-amber-600" />
      case 'STK_PUSH':
        return <CreditCard className="w-4 h-4 text-purple-600" />
      default:
        return <Wallet className="w-4 h-4 text-slate-500" />
    }
  }

  const getMethodLabel = (method: string) => {
    return method.replace('_', '-')
  }

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-0 dark:bg-emerald-900/40 dark:text-emerald-400">
            Completed
          </Badge>
        )
      case 'PENDING':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-0 dark:bg-amber-900/40 dark:text-amber-400">
            Pending
          </Badge>
        )
      case 'FAILED':
        return (
          <Badge className="bg-red-100 text-red-800 border-0 dark:bg-red-900/40 dark:text-red-400">
            Failed
          </Badge>
        )
      case 'REVERSED':
        return (
          <Badge className="bg-slate-200 text-slate-800 border-0 dark:bg-slate-700 dark:text-slate-300">
            Reversed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const matchesMethod = methodFilter === 'all' || payment.method === methodFilter.toUpperCase()
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter.toUpperCase()
      const matchesSearch = searchQuery === '' ||
        payment.transactionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.loanReference.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesMethod && matchesStatus && matchesSearch
    })
  }, [payments, methodFilter, statusFilter, searchQuery])

  // Group payments by month
  const paymentsByMonth = useMemo(() => {
    const grouped: Record<string, PaymentRecord[]> = {}
    
    filteredPayments.forEach(payment => {
      const date = new Date(payment.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!grouped[monthKey]) {
        grouped[monthKey] = []
      }
      grouped[monthKey].push(payment)
    })
    
    return Object.entries(grouped)
      .map(([key, paymentList]) => ({
        key,
        monthName: new Date(key + '-01').toLocaleDateString('en-KE', { month: 'long', year: 'numeric' }),
        payments: paymentList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        totalPaid: paymentList.reduce((sum, p) => sum + p.amount, 0),
        transactionCount: paymentList.length
      }))
      .sort((a, b) => b.key.localeCompare(a.key))
  }, [filteredPayments])

  // Calculate totals
  const totalPaid = filteredPayments.reduce((sum, p) => sum + p.amount, 0)

  // Handle receipt download
  const handleDownloadReceipt = (paymentId: string, transactionId: string) => {
    toast.success(`Downloading receipt for ${transactionId}`)
  }

  // Handle export
  const handleExportCSV = () => {
    const headers = ['Date', 'Loan Reference', 'Amount', 'Method', 'Transaction ID', 'Status', 'Running Balance']
    const rows = filteredPayments.map(p => [
      p.date,
      p.loanReference,
      p.amount.toString(),
      p.method,
      p.transactionId,
      p.status,
      p.runningBalance.toString()
    ])
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `payment_history_${customerId}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    
    toast.success('Payment history exported successfully!')
  }

  // Prepare chart data - filter out zero values for cleaner display
  const chartData = mockPaymentMethodBreakdown.filter(d => d.amount > 0).map(item => ({
    name: item.name.replace('-', ' '),
    value: item.amount,
    percentage: item.percentage,
    count: item.count
  }))

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Payments</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Transactions</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{filteredPayments.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Avg. Transaction</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {filteredPayments.length > 0 ? formatCurrency(Math.round(totalPaid / filteredPayments.length)) : formatCurrency(0)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Payment Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                  Payment Transactions
                </CardTitle>
                <CardDescription>{filteredPayments.length} transactions</CardDescription>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:flex-initial">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full md:w-40"
                  />
                </div>

                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger className="w-full md:w-32">
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="MPESA">M-Pesa</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="STK_PUSH">STK Push</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-28">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleExportCSV}
                  className="dark:border-slate-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <ScrollArea className="h-[450px] overflow-auto">
              {/* Monthly Groupings */}
              <div className="space-y-4">
                {paymentsByMonth.map(({ key, monthName, payments: monthPayments, totalPaid: monthTotal, transactionCount }) => (
                  <div key={key}>
                    {/* Month Header - Collapsible */}
                    <button
                      onClick={() => setExpandedMonth(expandedMonth === key ? null : key)}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedMonth === key ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                        <span className="font-medium text-slate-900 dark:text-white">{monthName}</span>
                        <Badge variant="secondary" className="text-xs">{transactionCount} txns</Badge>
                      </div>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(monthTotal)}
                      </span>
                    </button>

                    {/* Month's Payments */}
                    {(expandedMonth === key || expandedMonth === null) && (
                      <div className="mt-2 overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Date</TableHead>
                              <TableHead>Loan Ref</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead>Method</TableHead>
                              <TableHead>Transaction ID</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Balance</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {monthPayments.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell className="text-sm whitespace-nowrap">
                                  {formatDate(payment.date)}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {payment.loanReference}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(payment.amount)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    {getMethodIcon(payment.method)}
                                    <span className="text-sm">{getMethodLabel(payment.method)}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs text-slate-500">
                                  {payment.transactionId.slice(0, 12)}...
                                </TableCell>
                                <TableCell>{getStatusBadge(payment.status)}</TableCell>
                                <TableCell className="text-right text-sm text-slate-500">
                                  {formatCurrency(payment.runningBalance)}
                                </TableCell>
                                <TableCell>
                                  {payment.status === 'COMPLETED' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleDownloadReceipt(payment.id, payment.transactionId)}
                                    >
                                      <Receipt className="w-4 h-4" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    <Separator className="mt-4" />
                  </div>
                ))}

                {paymentsByMonth.length === 0 && (
                  <div className="text-center py-12">
                    <Receipt className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">No payments found matching your criteria.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Payment Method Breakdown Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Payment Methods
            </CardTitle>
            <CardDescription>Breakdown by payment type</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Pie Chart */}
            <div className="h-[200px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-sm text-slate-600 dark:text-slate-300">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Method Details List */}
            <div className="space-y-3">
              {mockPaymentMethodBreakdown.map((item, index) => (
                <div key={item.method} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm">{item.name.replace('-', ' ')}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(item.amount)}</p>
                    <p className="text-xs text-slate-500">{item.count} txns • {item.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default PaymentHistoryTab
