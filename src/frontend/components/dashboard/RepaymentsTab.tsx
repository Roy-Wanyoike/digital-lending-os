'use client'

import { useState } from 'react'
import {
  ArrowDownLeft, Search, Filter, Eye, Clock, CheckCircle2, AlertTriangle,
  TrendingDown, RefreshCw, Smartphone, Building, CreditCard,
  Calendar, AlertOctagon, Percent,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { useApi } from '@/hooks/use-api'
import { LoadingSkeleton, ErrorState } from '@/frontend/components/dashboard/dashboard-components'
import {
  formatCurrency, formatDate, getStatusBadgeVariant, getStatusColor,
  KPICard, PipelineCard, type CollectionRecord, type Business,
} from '@/lib/dashboard-helpers'

// ─── Types ───────────────────────────────────────────────────────────

interface DepositRecord {
  id: string; depositRef: string; walletId: string;
  amount: number; currency: string;
  paymentMethod: string; provider?: string;
  status: string; description?: string;
  createdAt: string; completedAt?: string;
  wallet?: { id: string; currency: string; businessId: string; balance: number }
}

interface TransactionItem {
  id: string; amount: number; currency: string;
  status: string; description: string | null;
  source: 'wallet' | 'payment'; createdAt: string;
  [key: string]: unknown
}

// Derived repayment record from deposits + collections
interface RepaymentRecord {
  id: string; ref: string; borrowerId: string; borrowerName: string;
  amount: number; currency: string; channel: string;
  status: string; dueDate: string; paidDate: string;
  daysOverdue: number; isAutoDeduct: boolean;
  source: 'deposit' | 'collection'
}

// ─── Constants ──────────────────────────────────────────────────────

const REPAYMENT_STATUSES = ['On Time', 'Late', 'Overdue', 'Defaulted']
const AGING_BUCKETS_REPAYMENT = ['Current', '1-30', '31-60', '61-90', '90+']
const AGING_COLORS = ['#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444']

const CHANNEL_LABEL: Record<string, string> = {
  'mobile_money': 'M-Pesa',
  'bank_transfer': 'Bank Transfer',
  'card': 'Card',
  'external': 'External',
  'payment_link': 'Payment Link',
}

const CHANNEL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  'mobile_money': Smartphone,
  'bank_transfer': Building,
  'card': CreditCard,
}

// ─── Component ──────────────────────────────────────────────────────

export function RepaymentsTab() {
  const { data: deposits, loading: dLoading, error: dError, refetch: refetchDeposits } = useApi<DepositRecord[]>('/api/wallets/deposit?limit=50')
  const { data: transactions, loading: tLoading } = useApi<TransactionItem[]>('/api/transactions?type=wallet&limit=50')
  const { data: collections, loading: cLoading, error: cError, refetch: refetchCollections } = useApi<CollectionRecord[]>('/api/collections?limit=50')
  const { data: businesses } = useApi<Business[]>('/api/businesses?limit=100')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRepayment, setSelectedRepayment] = useState<RepaymentRecord | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const loading = dLoading || cLoading
  const error = dError || cError

  const handleRetry = () => {
    refetchDeposits()
    refetchCollections()
  }

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} onRetry={handleRetry} />

  const allDeposits = Array.isArray(deposits) ? deposits : []
  const allCollections = Array.isArray(collections) ? collections : []
  const bizMap = new Map(businesses?.map(b => [b.id, b.name]))

  // ─── Build repayment records from deposits ────────────────────────
  const depositRepayments: RepaymentRecord[] = allDeposits.map(dep => {
    const borrowerId = dep.wallet?.businessId || ''
    const borrowerName = bizMap.get(borrowerId) || borrowerId.slice(0, 12) || 'Unknown'
    const channel = CHANNEL_LABEL[dep.paymentMethod] || dep.paymentMethod || '—'
    const isAutoDeduct = dep.paymentMethod === 'mobile_money' && (dep.provider?.toLowerCase() || '').includes('safaricom')
    const daysOverdue = 0 // Deposits are incoming payments, so they're on time or late
    const status = dep.status?.toLowerCase() === 'completed' ? 'On Time' :
                   dep.status?.toLowerCase() === 'pending' ? 'Late' : 'Overdue'

    return {
      id: dep.id,
      ref: dep.depositRef,
      borrowerId,
      borrowerName,
      amount: dep.amount,
      currency: dep.currency || 'KES',
      channel,
      status,
      dueDate: dep.createdAt, // For deposits, due date = created date
      paidDate: dep.completedAt || dep.createdAt,
      daysOverdue,
      isAutoDeduct,
      source: 'deposit',
    }
  })

  // ─── Build repayment records from overdue collections ─────────────
  const collectionRepayments: RepaymentRecord[] = allCollections.map(col => {
    const daysOverdue = col.agingBucket === '1-30' ? 15 :
                        col.agingBucket === '31-60' ? 45 :
                        col.agingBucket === '61-90' ? 75 :
                        col.agingBucket === '90+' ? 120 : 0
    const status = daysOverdue === 0 ? 'On Time' :
                   daysOverdue <= 30 ? 'Late' :
                   daysOverdue <= 90 ? 'Overdue' : 'Defaulted'

    return {
      id: col.id,
      ref: col.caseRef,
      borrowerId: col.debtorId,
      borrowerName: col.debtorName || col.debtorId?.slice(0, 12) || 'Unknown',
      amount: col.outstandingAmount,
      currency: col.currency || 'KES',
      channel: 'M-Pesa', // Collections are typically via M-Pesa
      status,
      dueDate: col.createdAt,
      paidDate: '',
      daysOverdue,
      isAutoDeduct: false,
      source: 'collection',
    }
  })

  const allRepayments = [...depositRepayments, ...collectionRepayments].sort(
    (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
  )

  // ─── KPI Calculations ─────────────────────────────────────────────
  const totalRepayments = depositRepayments
    .filter(r => r.status === 'On Time')
    .reduce((sum, r) => sum + r.amount, 0)

  const onTimeCount = allRepayments.filter(r => r.status === 'On Time').length
  const totalPaid = allRepayments.length
  const onTimeRate = totalPaid > 0 ? (onTimeCount / totalPaid) * 100 : 0

  const lateCount = allRepayments.filter(r => r.status === 'Late').length
  const overdueAmount = allRepayments
    .filter(r => r.status === 'Overdue' || r.status === 'Defaulted')
    .reduce((sum, r) => sum + r.amount, 0)

  const collectedAmount = depositRepayments.reduce((sum, r) => sum + r.amount, 0)
  const totalDueAmount = collectedAmount + overdueAmount
  const collectionRate = totalDueAmount > 0 ? (collectedAmount / totalDueAmount) * 100 : 0

  // ─── Aging distribution ───────────────────────────────────────────
  const agingCounts = AGING_BUCKETS_REPAYMENT.map(bucket => ({
    bucket,
    count: allCollections.filter(c => c.agingBucket?.toLowerCase() === bucket.toLowerCase()).length,
    total: allCollections
      .filter(c => c.agingBucket?.toLowerCase() === bucket.toLowerCase())
      .reduce((sum, c) => sum + c.outstandingAmount, 0),
  }))

  // ─── Status distribution ──────────────────────────────────────────
  const statusCounts = REPAYMENT_STATUSES.map(s => ({
    status: s,
    count: allRepayments.filter(r => r.status === s).length,
  }))
  const statusColors: Record<string, string> = {
    'On Time': '#10b981', 'Late': '#f59e0b', 'Overdue': '#f97316', 'Defaulted': '#ef4444',
  }

  // ─── Filtering ───────────────────────────────────────────────────
  const filtered = allRepayments.filter(r => {
    if (search) {
      const q = search.toLowerCase()
      if (!r.ref?.toLowerCase().includes(q) && !r.borrowerName?.toLowerCase().includes(q)) return false
    }
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    return true
  })

  // ─── Helpers ─────────────────────────────────────────────────────
  const repaymentStatusColor = (status: string) => {
    if (status === 'On Time') return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
    if (status === 'Late') return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
    if (status === 'Overdue') return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
    if (status === 'Defaulted') return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
    return 'bg-slate-100 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300'
  }

  const channelBadgeColor = (channel: string) => {
    if (channel === 'M-Pesa') return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
    if (channel === 'Bank Transfer') return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    return ''
  }

  const getDaysOverdueDisplay = (days: number) => {
    if (days === 0) return <span className="text-emerald-600 dark:text-emerald-400">—</span>
    if (days <= 30) return <span className="text-amber-600 dark:text-amber-400 font-medium">{days}d</span>
    if (days <= 90) return <span className="text-orange-600 dark:text-orange-400 font-medium">{days}d</span>
    return <span className="text-red-600 dark:text-red-400 font-bold">{days}d</span>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Total Repayments" value={formatCurrency(totalRepayments, 'KES')} icon={ArrowDownLeft} trend="up" />
        <KPICard title="On-Time Rate" value={`${onTimeRate.toFixed(1)}%`} subtitle={`${onTimeCount} of ${totalPaid}`} icon={CheckCircle2} />
        <KPICard title="Late Payments" value={String(lateCount)} icon={Clock} />
        <KPICard title="Overdue Amount" value={formatCurrency(overdueAmount, 'KES')} icon={AlertOctagon} />
        <KPICard title="Collection Rate" value={`${collectionRate.toFixed(1)}%`} icon={Percent} />
      </div>

      {/* ─── Aging Buckets ─────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Overdue Aging Buckets</h3>
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
          {agingCounts.map((a, i) => (
            <div key={a.bucket} className="flex-1 min-w-0">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-2xl sm:text-3xl font-bold" style={{ color: AGING_COLORS[i] }}>{a.count}</p>
                  <p className="text-xs text-muted-foreground">{a.bucket === 'Current' ? 'Current' : `${a.bucket} days`}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatCurrency(a.total, 'KES')}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Status Distribution ───────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Repayments by Status</h3>
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
          {statusCounts.map(s => (
            <PipelineCard key={s.status} label={s.status} count={s.count} color={statusColors[s.status]} />
          ))}
        </div>
      </div>

      {/* ─── Filter Bar ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ref or borrower..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {REPAYMENT_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={handleRetry}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* ─── Repayments Table ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Repayment Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Amount (KES)</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Auto-Deduct</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {allRepayments.length === 0 ? 'No repayment records yet' : 'No matching repayments'}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(r => {
                  const isMpesa = r.channel === 'M-Pesa'
                  const ChannelIcon = r.channel === 'M-Pesa' ? Smartphone :
                                      r.channel === 'Bank Transfer' ? Building :
                                      r.channel === 'Card' ? CreditCard : ArrowDownLeft
                  return (
                    <TableRow key={r.id} className={`even:bg-muted/50 ${r.status === 'Overdue' || r.status === 'Defaulted' ? 'border-l-2 border-l-red-500' : isMpesa ? 'border-l-2 border-l-green-500' : ''}`}>
                      <TableCell className="font-mono text-xs">{r.ref}</TableCell>
                      <TableCell className="text-sm max-w-[120px] truncate">{r.borrowerName}</TableCell>
                      <TableCell className="font-medium">
                        <span className={isMpesa ? 'text-green-600 dark:text-green-400' : ''}>
                          {formatCurrency(r.amount, r.currency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${channelBadgeColor(r.channel)}`}>
                          <ChannelIcon className="h-3 w-3 mr-1" />
                          {r.channel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(r.dueDate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.paidDate ? formatDate(r.paidDate) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] ${repaymentStatusColor(r.status)}`}>
                          {r.status === 'Overdue' && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {getDaysOverdueDisplay(r.daysOverdue)}
                      </TableCell>
                      <TableCell>
                        {r.isAutoDeduct ? (
                          <Badge className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-[10px]">
                            <Smartphone className="h-3 w-3 mr-1" /> Auto
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedRepayment(r); setDetailOpen(true) }}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Overdue Section ───────────────────────────────────── */}
      {allCollections.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-red-500" />
              Overdue Collections
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case Ref</TableHead>
                    <TableHead>Debtor</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Aging</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>AI Strategy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allCollections.map(c => {
                    const agingBucket = c.agingBucket || 'Current'
                    const isOverdue = agingBucket !== 'Current'
                    const agingColor = agingBucket === 'Current' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' :
                                       agingBucket === '1-30' ? 'bg-lime-100 dark:bg-lime-900/40 text-lime-700 dark:text-lime-300' :
                                       agingBucket === '31-60' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' :
                                       agingBucket === '61-90' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' :
                                       'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                    return (
                      <TableRow key={c.id} className={`even:bg-muted/50 ${isOverdue ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}>
                        <TableCell className="font-mono text-xs">{c.caseRef}</TableCell>
                        <TableCell className="text-sm max-w-[100px] truncate">{c.debtorName ?? '—'}</TableCell>
                        <TableCell className="font-medium text-red-600 dark:text-red-400">{formatCurrency(c.outstandingAmount, c.currency)}</TableCell>
                        <TableCell><Badge variant="secondary" className={`text-[10px] ${agingColor}`}>{agingBucket}</Badge></TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`text-[10px] ${c.priority === 'Urgent' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : c.priority === 'High' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'}`}>
                            {c.priority}
                          </Badge>
                        </TableCell>
                        <TableCell><Badge variant={getStatusBadgeVariant(c.status)} className={getStatusColor(c.status)}>{c.status}</Badge></TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">{c.aiStrategy || '—'}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Detail Dialog ─────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Repayment Details</DialogTitle>
            <DialogDescription>
              {selectedRepayment?.ref || ''}
            </DialogDescription>
          </DialogHeader>
          {selectedRepayment && (
            <div className="space-y-4 text-sm">
              {/* Status & Channel */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={repaymentStatusColor(selectedRepayment.status)}>
                  {selectedRepayment.status}
                </Badge>
                <Badge variant="outline" className={channelBadgeColor(selectedRepayment.channel)}>
                  {selectedRepayment.channel}
                </Badge>
                {selectedRepayment.channel === 'M-Pesa' && (
                  <Badge className="bg-green-600 text-white text-[10px]">M-Pesa</Badge>
                )}
                {selectedRepayment.isAutoDeduct && (
                  <Badge className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-[10px]">
                    <Smartphone className="h-3 w-3 mr-1" /> Auto-Deduct
                  </Badge>
                )}
              </div>

              {/* Amount Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Repayment Amount</p>
                  <p className="font-medium">{formatCurrency(selectedRepayment.amount, selectedRepayment.currency || 'KES')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Currency</p>
                  <p className="font-medium">{selectedRepayment.currency || 'KES'}</p>
                </div>
              </div>

              {/* Borrower Info */}
              <div className="border-t pt-3">
                <p className="font-medium mb-2">Borrower Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Borrower</p>
                    <p className="font-medium truncate">{selectedRepayment.borrowerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Source</p>
                    <p className="font-medium">{selectedRepayment.source === 'deposit' ? 'Deposit' : 'Collection'}</p>
                  </div>
                </div>
              </div>

              {/* Payment Schedule */}
              <div className="border-t pt-3">
                <p className="font-medium mb-2">Payment Schedule</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Due Date</p>
                    <p className="font-medium">{formatDate(selectedRepayment.dueDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Paid Date</p>
                    <p className="font-medium">{selectedRepayment.paidDate ? formatDate(selectedRepayment.paidDate) : 'Not paid'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Days Overdue</p>
                    <p className={`font-medium ${selectedRepayment.daysOverdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {selectedRepayment.daysOverdue > 0 ? `${selectedRepayment.daysOverdue} days` : 'On time'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Channel</p>
                    <p className="font-medium">{selectedRepayment.channel}</p>
                  </div>
                </div>
              </div>

              {/* M-Pesa Auto-Deduct Info */}
              {selectedRepayment.isAutoDeduct && (
                <div className="border-t pt-3">
                  <p className="font-medium mb-2">M-Pesa Auto-Deduction</p>
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="font-medium text-green-700 dark:text-green-300">Active Auto-Deduction</span>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      This repayment is processed via M-Pesa recurring auto-deduction. Funds are automatically collected from the borrower&apos;s M-Pesa account on the due date.
                    </p>
                  </div>
                </div>
              )}

              {/* Next Due Date placeholder */}
              {selectedRepayment.status === 'On Time' && (
                <div className="border-t pt-3">
                  <p className="font-medium mb-2">Next Payment</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Next installment due — schedule auto-calculated based on loan terms</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
