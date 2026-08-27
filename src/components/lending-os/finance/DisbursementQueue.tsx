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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Progress
} from '@/components/ui/progress'
import {
  Truck,
  RefreshCw,
  Play,
  Pause,
  XCircle,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Filter,
  Search,
  ArrowUpRight,
  User,
  Phone,
  CreditCard,
  Building2,
  Zap,
  Timer
} from 'lucide-react'

// Types
interface DisbursementItem {
  id: string
  customerName: string
  customerPhone: string
  amount: number
  currency: string
  accountType: 'mpesa' | 'bank'
  accountNumber: string
  loanProduct: string
  loanNumber: string
  priority: 'high' | 'normal' | 'low'
  status: DisbursementStatus
  timeInQueue: number // minutes
  queuedAt: Date | string
  processedAt?: Date | string
  
  // Provider response tracking
  providerResponse?: {
    status: 'success' | 'failed' | 'pending'
    reference?: string
    errorCode?: string
    errorMessage?: string
    timestamp?: Date | string
  }
  
  // Retry info
  retryCount?: number
  maxRetries?: number
}

type DisbursementStatus = 
  | 'pending_approval' 
  | 'approved' 
  | 'processing' 
  | 'completed' 
  | 'failed'

interface QueueSummary {
  totalPending: number
  todayTotal: number
  todayCompleted: number
  todayFailed: number
  dailyLimit: number
  dailyUtilized: number
  totalAmount: number
}

// Mock Data Generator
const generateMockDisbursements = (): DisbursementItem[] => {
  const customers = [
    { name: 'John Kamau Mwangi', phone: '+254712345678', mpesa: '0712345678', bank: 'CBA - ****4589' },
    { name: 'Sarah Wanjiku Njoroge', phone: '+254723456789', mpesa: '0723456789', bank: 'KCB - ****7823' },
    { name: 'Peter Ochieng Odhiambo', phone: '+254734567890', mpesa: '0734567890', bank: 'Equity - ****3156' },
    { name: 'Grace Achieng Otieno', phone: '+254745678901', mpesa: '0745678901', bank: 'NCBA - ****9012' },
    { name: 'David Kimani Githu', phone: '+254756789012', mpesa: '0756789012', bank: 'Co-op - ****5678' },
    { name: 'Faith Nyashomba Muthoni', phone: '+254767890123', mpesa: '0767890123', bank: 'Stanbic - ****2345' },
    { name: 'Michael Omondi Owino', phone: '+254778901234', mpesa: '0778901234', bank: 'Absa - ****6789' },
    { name: 'Lucy Wanjiru Kamau', phone: '+254789012345', mpesa: '0789012345', bank: 'I&M - ****0123' }
  ]

  const products = ['Quick Loan', 'Salary Advance', 'Business Loan', 'Emergency Loan']
  const statuses: Array<DisbursementStatus> = ['pending_approval', 'approved', 'processing', 'completed', 'failed']
  const priorities: Array<'high' | 'normal' | 'low'> = ['high', 'normal', 'low']

  const disbursements: DisbursementItem[] = []
  
  for (let i = 0; i < 35; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)]
    const isMpesa = Math.random() > 0.3
    const statusIndex = Math.floor(Math.random() * statuses.length)
    const status = statuses[statusIndex]
    
    const queuedAt = new Date()
    queuedAt.setMinutes(queuedAt.getMinutes() - Math.floor(Math.random() * 480))
    
    disbursements.push({
      id: `DISB-${String(100000 + i).padStart(6, '0')}`,
      customerName: customer.name,
      customerPhone: customer.phone,
      amount: Math.round((Math.random() * 100000 + 2000) / 500) * 500,
      currency: 'KES',
      accountType: isMpesa ? 'mpesa' : 'bank',
      accountNumber: isMpesa ? customer.mpesa : customer.bank,
      loanProduct: products[Math.floor(Math.random() * products.length)],
      loanNumber: `LN-2024-${String(100000 + i).padStart(6, '0')}`,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      status,
      timeInQueue: Math.floor((Date.now() - queuedAt.getTime()) / 60000),
      queuedAt: queuedAt.toISOString(),
      
      ...(status === 'completed' ? {
        processedAt: new Date(queuedAt.getTime() + Math.random() * 1800000).toISOString(),
        providerResponse: {
          status: 'success',
          reference: `TX${Date.now().toString().slice(-8)}${i}`
        }
      } : {}),
      
      ...(status === 'failed' ? {
        processedAt: new Date(queuedAt.getTime() + Math.random() * 600000).toISOString(),
        providerResponse: {
          status: 'failed',
          errorCode: Math.random() > 0.5 ? 'INSUFFICIENT_FUNDS' : 'TIMEOUT',
          errorMessage: Math.random() > 0.5 ? 'Insufficient float balance' : 'Provider timeout',
          timestamp: new Date(queuedAt.getTime() + Math.random() * 600000).toISOString()
        },
        retryCount: Math.floor(Math.random() * 3),
        maxRetries: 3
      } : {}),
      
      ...(status === 'processing' ? {
        providerResponse: {
          status: 'pending',
          reference: `PENDING-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
        }
      } : {})
    })
  }

  return disbursements.sort((a, b) => {
    // Sort by priority first, then by time in queue
    const priorityOrder = { high: 0, normal: 1, low: 2 }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    return b.timeInQueue - a.timeInQueue
  })
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

function formatTimeInQueue(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

const mockSummary: QueueSummary = {
  totalPending: 28,
  todayTotal: 47,
  todayCompleted: 38,
  todayFailed: 3,
  dailyLimit: 5000000,
  dailyUtilized: 3250000,
  totalAmount: 4850000
}

export function DisbursementQueue() {
  const [disbursements, setDisbursements] = useState<DisbursementItem[]>([])
  const [summary, setSummary] = useState<QueueSummary>(mockSummary)
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Selection for bulk actions
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  
  // Detail dialog
  const [selectedDisbursement, setSelectedDisbursement] = useState<DisbursementItem | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisbursements(generateMockDisbursements())
      setLoading(false)
    }, 600)
    
    return () => clearTimeout(timer)
  }, [])

  // Filtered data
  const filteredDisbursements = useMemo(() => {
    return disbursements.filter(d => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false
      if (priorityFilter !== 'all' && d.priority !== priorityFilter) return false
      
      if (searchTerm) {
        const s = searchTerm.toLowerCase()
        return (
          d.customerName.toLowerCase().includes(s) ||
          d.loanNumber.toLowerCase().includes(s) ||
          d.id.toLowerCase().includes(s) ||
          d.accountNumber.includes(s)
        )
      }
      
      return true
    })
  }, [disbursements, statusFilter, priorityFilter, searchTerm])

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => {
      setDisbursements(generateMockDisbursements())
      setLoading(false)
    }, 500)
  }

  const toggleSelection = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllVisible = () => {
    const approvedIds = filteredDisbursements
      .filter(d => d.status === 'approved')
      .map(d => d.id)
    setSelectedItems(new Set(approvedIds))
  }

  const clearSelection = () => setSelectedItems(new Set())

  const handleBulkRelease = async () => {
    // Simulate bulk release
    setDisbursements(prev => prev.map(d => 
      selectedItems.has(d.id) ? { ...d, status: 'processing' as const } : d
    ))
    clearSelection()
  }

  const handleRetry = (id: string) => {
    setDisbursements(prev => prev.map(d =>
      d.id === id ? { ...d, status: 'approved' as const, retryCount: 0 } : d
    ))
  }

  const handleCancel = (id: string) => {
    setDisbursements(prev => prev.filter(d => d.id !== id))
  }

  const getStatusBadge = (status: DisbursementStatus) => {
    switch (status) {
      case 'pending_approval':
        return <Badge className="bg-slate-100 text-slate-800 gap-1"><Clock className="w-3 h-3" />Pending Approval</Badge>
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800 gap-1"><CheckCircle2 className="w-3 h-3" />Approved</Badge>
      case 'processing':
        return <Badge className="bg-amber-100 text-amber-800 gap-1 animate-pulse"><RotateCcw className="w-3 h-3" />Processing</Badge>
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 gap-1"><CheckCircle2 className="w-3 h-3" />Completed</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 gap-1"><XCircle className="w-3 h-3" />Failed</Badge>
    }
  }

  const getPriorityBadge = (priority: 'high' | 'normal' | 'low') => {
    switch (priority) {
      case 'high':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">High</Badge>
      case 'normal':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Normal</Badge>
      case 'low':
        return <Badge variant="secondary" className="bg-slate-100 text-slate-800">Low</Badge>
    }
  }

  const utilizationPercent = (summary.dailyUtilized / summary.dailyLimit) * 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Truck className="w-6 h-6 text-slate-600" />
            Disbursement Queue
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            Manage and monitor loan disbursements to customers
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedItems.size > 0 && (
            <Button onClick={handleBulkRelease}>
              <Play className="w-4 h-4 mr-2" />
              Release Selected ({selectedItems.size})
            </Button>
          )}
          
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{summary.totalPending}</p>
            <p className="text-xs text-muted-foreground mt-1">Pending</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{summary.todayTotal}</p>
            <p className="text-xs text-muted-foreground mt-1">Today Total</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{summary.todayCompleted}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{summary.todayFailed}</p>
            <p className="text-xs text-muted-foreground mt-1">Failed</p>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Daily Limit Utilization
              </span>
              <span className="text-sm text-muted-foreground">
                {formatCurrency(summary.dailyUtilized)} / {formatCurrency(summary.dailyLimit)}
              </span>
            </div>
            <Progress 
              value={utilizationPercent} 
              className={`h-2 ${
                utilizationPercent > 90 ? '[&>div]:bg-red-500' :
                utilizationPercent > 70 ? '[&>div]:bg-amber-500' :
                '[&>div]:bg-emerald-500'
              }`}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {utilizationPercent.toFixed(1)}% utilized • {formatCurrency(summary.dailyLimit - summary.dailyUtilized)} remaining
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, loan #, or account..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[170px]">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {selectedItems.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground">
                  {selectedItems.size} selected
                </span>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Disbursements Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Disbursement Queue</CardTitle>
              <CardDescription>
                {filteredDisbursements.length} items • 
                {filteredDisbursements.filter(d => d.status === 'approved').length} ready to release
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAllVisible} disabled={!filteredDisbursements.some(d => d.status === 'approved')}>
                Select All Approved
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[550px] overflow-auto rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="hidden lg:table-cell">Loan Product</TableHead>
                  <TableHead className="hidden md:table-cell">Time in Queue</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(9)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-5 bg-muted rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredDisbursements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                      <p className="text-lg font-medium text-muted-foreground">No disbursements found</p>
                      <p className="text-sm text-muted-foreground mt-1">Adjust your filters or wait for new requests</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDisbursements.map(item => (
                    <TableRow key={item.id} className={
                      item.priority === 'high' && item.status === 'approved' ? 'bg-amber-50/50 dark:bg-amber-900/5' : ''
                    }>
                      <TableCell>
                        {item.status === 'approved' && (
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={() => toggleSelection(item.id)}
                            className="rounded border-gray-300"
                          />
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{item.customerName}</p>
                          <p className="text-xs text-muted-foreground">{item.customerPhone}</p>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <span className="font-mono font-semibold">{formatCurrency(item.amount)}</span>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {item.accountType === 'mpesa' ? (
                            <CreditCard className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          <span className="text-xs font-mono">{item.accountNumber}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="hidden lg:table-cell text-sm">
                        {item.loanProduct}
                      </TableCell>
                      
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1 text-sm">
                          <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className={item.timeInQueue > 30 ? 'text-amber-600 font-medium' : ''}>
                            {formatTimeInQueue(item.timeInQueue)}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {/* View Details */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => setSelectedDisbursement(item)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle>Disbursement Details</DialogTitle>
                                <DialogDescription>
                                  Full details and tracking information
                                </DialogDescription>
                              </DialogHeader>
                              {selectedDisbursement && (
                                <DisbursementDetailModal item={selectedDisbursement} />
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          {/* Retry Failed */}
                          {item.status === 'failed' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700"
                              onClick={() => handleRetry(item.id)}
                              title="Retry disbursement"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {/* Cancel Pending */}
                          {(item.status === 'pending_approval' || item.status === 'approved') && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleCancel(item.id)}
                              title="Cancel disbursement"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// Detail Modal Component
function DisbursementDetailModal({ item }: { item: DisbursementItem }) {
  return (
    <div className="space-y-6 mt-4">
      {/* Customer & Amount */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3 p-4 bg-muted rounded-lg">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Customer Information</h4>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm">Name:</dt>
              <dd className="font-medium">{item.customerName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm">Phone:</dt>
              <dd className="font-mono">{item.customerPhone}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm">Account Type:</dt>
              <dd className="capitalize flex items-center gap-1">
                {item.accountType === 'mpesa' ? (
                  <><CreditCard className="w-3.5 h-3.5 text-green-600" /> M-Pesa</>
                ) : (
                  <><Building2 className="w-3.5 h-3.5 text-blue-600" /> Bank</>
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm">Account Number:</dt>
              <dd className="font-mono">{item.accountNumber}</dd>
            </div>
          </dl>
        </div>
        
        <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Disbursement Details</h4>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm">Amount:</dt>
              <dd className="font-mono font-bold text-xl text-primary">{formatCurrency(item.amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm">Loan Number:</dt>
              <dd className="font-mono">{item.loanNumber}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm">Product:</dt>
              <dd>{item.loanProduct}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm">Priority:</dt>
              <dd>{item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}</dd>
            </div>
          </dl>
        </div>
      </div>
      
      {/* Status & Timing */}
      <div className="space-y-3 p-4 bg-muted rounded-lg">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Status & Timing</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Current Status</p>
            {getStatusDetailBadge(item.status)}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Time in Queue</p>
            <p className="font-mono font-medium">{formatTimeInQueue(item.timeInQueue)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Queued At</p>
            <p className="text-sm">{new Date(item.queuedAt).toLocaleString()}</p>
          </div>
          {item.processedAt && (
            <div>
              <p className="text-sm text-muted-foreground">Processed At</p>
              <p className="text-sm">{new Date(item.processedAt).toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Provider Response */}
      {item.providerResponse && (
        <div className={`space-y-3 p-4 rounded-lg border ${
          item.providerResponse.status === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200' :
          item.providerResponse.status === 'failed' ? 'bg-red-50 dark:bg-red-900/20 border-red-200' :
          'bg-amber-50 dark:bg-amber-900/20 border-amber-200'
        }`}>
          <h4 className="font-medium text-sm uppercase tracking-wide">Provider Response</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Status:</p>
              <p className="font-medium capitalize">{item.providerResponse.status}</p>
            </div>
            {item.providerResponse.reference && (
              <div>
                <p className="text-muted-foreground">Reference:</p>
                <p className="font-mono">{item.providerResponse.reference}</p>
              </div>
            )}
            {item.providerResponse.errorCode && (
              <div>
                <p className="text-muted-foreground">Error Code:</p>
                <p className="font-mono text-red-600">{item.providerResponse.errorCode}</p>
              </div>
            )}
            {item.providerResponse.errorMessage && (
              <div>
                <p className="text-muted-foreground">Error Message:</p>
                <p className="text-red-600">{item.providerResponse.errorMessage}</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Retry Info */}
      {item.retryCount !== undefined && (
        <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="text-sm">
              Retry attempt {item.retryCount} of {item.maxRetries || 3}
            </span>
          </div>
          <Progress 
            value={(item.retryCount / (item.maxRetries || 3)) * 100} 
            className="w-32 h-2 [&>div]:bg-amber-500"
          />
        </div>
      )}
      
      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        {item.status === 'failed' && (
          <Button className="bg-amber-600 hover:bg-amber-700">
            <RotateCcw className="w-4 h-4 mr-2" />
            Retry Disbursement
          </Button>
        )}
        {(item.status === 'pending_approval' || item.status === 'approved') && (
          <>
            <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
              <XCircle className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            {item.status === 'approved' && (
              <Button>
                <Play className="w-4 h-4 mr-2" />
                Process Now
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function getStatusDetailBadge(status: DisbursementStatus) {
  switch (status) {
    case 'pending_approval':
      return <Badge className="bg-slate-100 text-slate-800 gap-1 w-fit"><Clock className="w-3 h-3" />Pending Approval</Badge>
    case 'approved':
      return <Badge className="bg-blue-100 text-blue-800 gap-1 w-fit"><CheckCircle2 className="w-3 h-3" />Approved</Badge>
    case 'processing':
      return <Badge className="bg-amber-100 text-amber-800 gap-1 w-fit animate-pulse"><RotateCcw className="w-3 h-3" />Processing</Badge>
    case 'completed':
      return <Badge className="bg-emerald-100 text-emerald-800 gap-1 w-fit"><CheckCircle2 className="w-3 h-3" />Completed</Badge>
    case 'failed':
      return <Badge className="bg-red-100 text-red-800 gap-1 w-fit"><XCircle className="w-3 h-3" />Failed</Badge>
  }
}

export default DisbursementQueue
