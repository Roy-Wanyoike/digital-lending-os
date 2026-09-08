'use client'

import { useState } from 'react'
import {
  ArrowLeftRight, Search, Filter, Eye, Clock, CheckCircle2, XCircle,
  AlertCircle, TrendingUp, Zap, Smartphone, Building, CreditCard,
  RefreshCw,
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
  KPICard, PipelineCard, type PaymentIntent, type Business,
} from '@/lib/dashboard-helpers'

// ─── Constants ──────────────────────────────────────────────────────

const DISBURSEMENT_STATUSES = ['pending', 'processing', 'completed', 'failed', 'cancelled']
const PAYMENT_METHODS = ['All', 'M-Pesa', 'Bank Transfer', 'Card', 'Mobile Money']

const METHOD_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  'mpesa': Smartphone,
  'm-pesa': Smartphone,
  'mobile_money': Smartphone,
  'mobile money': Smartphone,
  'bank_transfer': Building,
  'bank transfer': Building,
  'card': CreditCard,
}

const METHOD_LABEL: Record<string, string> = {
  'mpesa': 'M-Pesa',
  'm-pesa': 'M-Pesa',
  'mobile_money': 'Mobile Money',
  'mobile money': 'Mobile Money',
  'bank_transfer': 'Bank Transfer',
  'bank transfer': 'Bank Transfer',
  'card': 'Card',
}

const PROVIDER_MPESA = new Set(['safaricom', 'mpesa', 'm-pesa', 'daraja'])

// ─── Component ──────────────────────────────────────────────────────

export function DisbursementsTab() {
  const { data: intents, loading, error, refetch } = useApi<PaymentIntent[]>('/api/payments/intents?limit=50')
  const { data: businesses } = useApi<Business[]>('/api/businesses?limit=100')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('All')
  const [selectedIntent, setSelectedIntent] = useState<PaymentIntent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const allIntents = Array.isArray(intents) ? intents : []
  const bizMap = new Map(businesses?.map(b => [b.id, b.name]))

  // ─── KPI Calculations ─────────────────────────────────────────────
  const completed = allIntents.filter(i => i.status?.toLowerCase() === 'completed')
  const pending = allIntents.filter(i => ['pending', 'processing'].includes(i.status?.toLowerCase()))
  const failed = allIntents.filter(i => i.status?.toLowerCase() === 'failed')

  const totalDisbursed = completed.reduce((sum, i) => sum + (i.targetAmount || i.sourceAmount), 0)
  const pendingAmount = pending.reduce((sum, i) => sum + (i.targetAmount || i.sourceAmount), 0)
  const failedCount = failed.length

  const avgProcessingTime = completed.length > 0
    ? completed.reduce((sum, i) => {
        if (i.completedAt && i.createdAt) {
          const diff = new Date(i.completedAt).getTime() - new Date(i.createdAt).getTime()
          return sum + (diff / 1000 / 60) // minutes
        }
        return sum
      }, 0) / completed.length
    : 0

  const successRate = allIntents.length > 0
    ? (completed.length / allIntents.length) * 100
    : 0

  // ─── Status distribution for pipeline ────────────────────────────
  const statusCounts = DISBURSEMENT_STATUSES.map(s => ({
    status: s,
    count: allIntents.filter(i => i.status?.toLowerCase() === s).length,
  }))
  const statusColors: Record<string, string> = {
    pending: '#94a3b8', processing: '#3b82f6', completed: '#10b981',
    failed: '#ef4444', cancelled: '#6b7280',
  }

  // ─── Filtering ───────────────────────────────────────────────────
  const filtered = allIntents.filter(i => {
    if (search && !i.intentRef?.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== 'all' && i.status?.toLowerCase() !== statusFilter) return false
    if (methodFilter !== 'All') {
      const method = (i.paymentMethod || '').toLowerCase()
      if (methodFilter === 'M-Pesa' && !METHOD_LABEL[method]?.includes('M-Pesa') && method !== 'mpesa' && method !== 'm-pesa') return false
      if (methodFilter === 'Bank Transfer' && method !== 'bank_transfer' && method !== 'bank transfer') return false
      if (methodFilter === 'Card' && method !== 'card') return false
      if (methodFilter === 'Mobile Money' && method !== 'mobile_money' && method !== 'mobile money') return false
    }
    return true
  })

  // ─── Helpers ─────────────────────────────────────────────────────
  const getMethodLabel = (m?: string | null) => {
    if (!m) return '—'
    return METHOD_LABEL[m.toLowerCase()] || m
  }

  const isMpesa = (intent: PaymentIntent) => {
    const method = (intent.paymentMethod || '').toLowerCase()
    return method === 'mpesa' || method === 'm-pesa'
  }

  const isMpesaProvider = (intent: PaymentIntent) => {
    const provider = (intent.routingProvider || '').toLowerCase()
    return PROVIDER_MPESA.has(provider)
  }

  const formatProcessingTime = (minutes: number) => {
    if (minutes < 1) return '<1 min'
    if (minutes < 60) return `${Math.round(minutes)} min`
    return `${(minutes / 60).toFixed(1)} hrs`
  }

  const getTimeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = diff / 1000 / 60
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${Math.round(mins)}m ago`
    const hrs = mins / 60
    if (hrs < 24) return `${Math.round(hrs)}h ago`
    return `${Math.round(hrs / 24)}d ago`
  }

  const disbursementStatusColor = (status: string) => {
    const s = status?.toLowerCase() || ''
    if (s === 'completed') return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
    if (s === 'processing') return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
    if (s === 'pending') return 'bg-slate-100 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300'
    if (s === 'failed') return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
    if (s === 'cancelled') return 'bg-gray-100 dark:bg-gray-900/40 text-gray-600 dark:text-gray-300'
    return 'bg-slate-100 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300'
  }

  const handleViewDetail = (intent: PaymentIntent) => {
    setSelectedIntent(intent)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Total Disbursed" value={formatCurrency(totalDisbursed, 'KES')} icon={ArrowLeftRight} trend="up" />
        <KPICard title="Pending" value={formatCurrency(pendingAmount, 'KES')} subtitle={`${pending.length} transactions`} icon={Clock} />
        <KPICard title="Failed" value={String(failedCount)} icon={XCircle} />
        <KPICard title="Avg Time" value={formatProcessingTime(avgProcessingTime)} subtitle="processing" icon={Zap} />
        <KPICard title="Success Rate" value={`${successRate.toFixed(1)}%`} icon={CheckCircle2} />
      </div>

      {/* ─── Status Pipeline ───────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Disbursements by Status</h3>
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
            placeholder="Search by reference..."
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
            {DISBURSEMENT_STATUSES.map(s => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={refetch}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* ─── Disbursements Table ───────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Loan Disbursements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>From → To</TableHead>
                  <TableHead>Amount (KES)</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {allIntents.length === 0 ? 'No disbursements yet' : 'No matching disbursements'}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(intent => {
                  const mpesa = isMpesa(intent) || isMpesaProvider(intent)
                  const MethodIcon = METHOD_ICON[(intent.paymentMethod || '').toLowerCase()] || ArrowLeftRight
                  return (
                    <TableRow key={intent.id} className={`even:bg-muted/50 ${mpesa ? 'border-l-2 border-l-green-500' : ''}`}>
                      <TableCell className="font-mono text-xs">{intent.intentRef}</TableCell>
                      <TableCell className="text-xs">
                        <span className="text-muted-foreground">
                          {bizMap.get(intent.fromBusinessId)?.slice(0, 12) || intent.fromBusinessId?.slice(0, 8)}→{bizMap.get(intent.toBusinessId)?.slice(0, 12) || intent.toBusinessId?.slice(0, 8)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className={mpesa ? 'text-green-600 dark:text-green-400' : ''}>
                          {formatCurrency(intent.targetAmount || intent.sourceAmount, intent.targetCurrency || intent.sourceCurrency || 'KES')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${mpesa ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' : ''}`}
                        >
                          <MethodIcon className="h-3 w-3 mr-1" />
                          {getMethodLabel(intent.paymentMethod)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {intent.routingProvider ? (
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${mpesa ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : ''}`}
                          >
                            {mpesa && <Smartphone className="h-3 w-3 mr-1" />}
                            {intent.routingProvider}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {intent.actualFee != null ? formatCurrency(intent.actualFee, intent.sourceCurrency || 'KES') : intent.estimatedFee != null ? `~${formatCurrency(intent.estimatedFee, intent.sourceCurrency || 'KES')}` : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] ${disbursementStatusColor(intent.status)}`}>
                          {intent.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {intent.completedAt ? getTimeSince(intent.completedAt) : getTimeSince(intent.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(intent.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetail(intent)}>
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

      {/* ─── Detail Dialog ─────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Disbursement Details</DialogTitle>
            <DialogDescription>
              {selectedIntent?.intentRef || ''}
            </DialogDescription>
          </DialogHeader>
          {selectedIntent && (
            <div className="space-y-4 text-sm">
              {/* Status & Method */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={disbursementStatusColor(selectedIntent.status)}>
                  {selectedIntent.status}
                </Badge>
                <Badge variant="outline" className={isMpesa(selectedIntent) ? 'bg-green-50 text-green-700 border-green-200' : ''}>
                  {getMethodLabel(selectedIntent.paymentMethod)}
                </Badge>
                {isMpesa(selectedIntent) && (
                  <Badge className="bg-green-600 text-white text-[10px]">M-Pesa</Badge>
                )}
              </div>

              {/* Amount Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Source Amount</p>
                  <p className="font-medium">{formatCurrency(selectedIntent.sourceAmount, selectedIntent.sourceCurrency || 'KES')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Target Amount</p>
                  <p className="font-medium">{formatCurrency(selectedIntent.targetAmount, selectedIntent.targetCurrency || 'KES')}</p>
                </div>
                {selectedIntent.exchangeRate !== 1 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Exchange Rate</p>
                    <p className="font-medium">{selectedIntent.exchangeRate}</p>
                  </div>
                )}
              </div>

              {/* Routing Info */}
              <div className="border-t pt-3">
                <p className="font-medium mb-2">Routing Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Provider</p>
                    <p className="font-medium">{selectedIntent.routingProvider || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Routing Score</p>
                    <p className="font-medium">{selectedIntent.routingScore ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Method</p>
                    <p className="font-medium">{getMethodLabel(selectedIntent.paymentMethod)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Est. Processing Time</p>
                    <p className="font-medium">{selectedIntent.estimatedTime ? `${selectedIntent.estimatedTime} min` : '—'}</p>
                  </div>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="border-t pt-3">
                <p className="font-medium mb-2">Fee Breakdown</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated Fee</p>
                    <p className="font-medium">{selectedIntent.estimatedFee != null ? formatCurrency(selectedIntent.estimatedFee, selectedIntent.sourceCurrency || 'KES') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Actual Fee</p>
                    <p className="font-medium">{selectedIntent.actualFee != null ? formatCurrency(selectedIntent.actualFee, selectedIntent.sourceCurrency || 'KES') : '—'}</p>
                  </div>
                </div>
              </div>

              {/* Business Details */}
              <div className="border-t pt-3">
                <p className="font-medium mb-2">Business Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">From (Lender)</p>
                    <p className="font-medium truncate">{bizMap.get(selectedIntent.fromBusinessId) || selectedIntent.fromBusinessId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">To (Borrower)</p>
                    <p className="font-medium truncate">{bizMap.get(selectedIntent.toBusinessId) || selectedIntent.toBusinessId}</p>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="border-t pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="font-medium">{formatDate(selectedIntent.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p className="font-medium">{selectedIntent.completedAt ? formatDate(selectedIntent.completedAt) : '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
