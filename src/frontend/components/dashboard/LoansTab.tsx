'use client'

import { useState } from 'react'
import { useApi } from '@/hooks/use-api'
import { LoadingSkeleton, ErrorState, KPICard, ScoreBar, CircularScore } from '@/frontend/components/dashboard/dashboard-components'
import {
  formatCurrency, formatDate, getStatusBadgeVariant, getStatusColor,
  getRiskBg, getRiskColor, truncate, ESCROW_STATUSES,
  type EscrowTransaction,
} from '@/lib/dashboard-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  FileText, TrendingUp, AlertTriangle, BarChart3, Eye,
  Search, ArrowRight, Shield, Milestone, AlertOctagon,
} from 'lucide-react'

// ─── Constants ──────────────────────────────────────────────────

const LOAN_STATUSES = ['All', ...ESCROW_STATUSES]
const RISK_LEVELS = ['All', 'low', 'medium', 'high', 'critical']

const RISK_BADGE_COLOR: Record<string, string> = {
  low: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  medium: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  high: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  critical: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
}

const MILESTONE_STATUS_COLOR: Record<string, string> = {
  completed: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  released: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  pending: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  funded: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  disputed: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
}

// ─── Component ──────────────────────────────────────────────────

export function LoansTab() {
  const { data: transactions, loading, error, refetch } = useApi<EscrowTransaction[]>('/api/escrow/transactions?limit=50')

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [riskFilter, setRiskFilter] = useState('All')
  const [selectedLoan, setSelectedLoan] = useState<EscrowTransaction | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const allLoans = Array.isArray(transactions) ? transactions : []

  // ── KPI calculations ──
  const totalLoans = allLoans.length
  const activeLoans = allLoans.filter(l => ['funded', 'in_escrow'].includes(l.status?.toLowerCase().replace(/\s/g, '_'))).length
  const totalDisbursed = allLoans.reduce((sum, l) => sum + (l.fundedAmount || l.amount || 0), 0)
  const avgLoanSize = totalLoans > 0 ? totalDisbursed / totalLoans : 0

  // PAR ratio: loans past due >30 days (simplified — uses risk score as proxy)
  const parLoans = allLoans.filter(l => l.aiRiskScore >= 60 && ['funded', 'in_escrow'].includes(l.status?.toLowerCase().replace(/\s/g, '_'))).length
  const parRatio = activeLoans > 0 ? (parLoans / activeLoans) * 100 : 0

  // NPL: defaulted/disputed loans
  const nplLoans = allLoans.filter(l => ['disputed', 'defaulted'].includes(l.status?.toLowerCase())).length
  const nplRate = totalLoans > 0 ? (nplLoans / totalLoans) * 100 : 0

  // ── Filtering ──
  const filtered = allLoans.filter(l => {
    const matchesSearch = !searchQuery ||
      l.txRef?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.buyer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.seller?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'All' || l.status === statusFilter
    const matchesRisk = riskFilter === 'All' || l.aiRiskLevel?.toLowerCase() === riskFilter.toLowerCase()
    return matchesSearch && matchesStatus && matchesRisk
  })

  const openDetail = (l: EscrowTransaction) => {
    setSelectedLoan(l)
    setDetailOpen(true)
  }

  const milestoneProgress = (l: EscrowTransaction) => {
    if (!l.totalMilestones || l.totalMilestones === 0) return null
    const completed = l.milestones?.filter(m => m.status?.toLowerCase() === 'completed' || m.status?.toLowerCase() === 'released').length || 0
    return { completed, total: l.totalMilestones }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">Loans</h3>
        <p className="text-sm text-muted-foreground">Manage loan products, applications, and approvals</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Total Loans" value={String(totalLoans)} icon={FileText} />
        <KPICard title="Active Loans" value={String(activeLoans)} icon={TrendingUp} />
        <KPICard title="Disbursed (KES)" value={formatCurrency(totalDisbursed, 'KES')} icon={BarChart3} />
        <KPICard title="Avg Loan Size" value={formatCurrency(avgLoanSize, 'KES')} icon={FileText} />
        <KPICard title="PAR Ratio (>30d)" value={`${parRatio.toFixed(1)}%`} icon={AlertTriangle} subtitle="Portfolio at Risk" />
        <KPICard title="NPL Rate" value={`${nplRate.toFixed(1)}%`} icon={AlertOctagon} subtitle="Non-Performing Loans" />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ref, borrower, or description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {LOAN_STATUSES.map(s => <SelectItem key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Risk Level" /></SelectTrigger>
          <SelectContent>
            {RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r === 'All' ? 'All Risk' : r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Loans Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan Ref</TableHead>
                  <TableHead>Borrower → Lender</TableHead>
                  <TableHead>Amount (KES)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Milestones</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm font-medium">No loans found</p>
                        <p className="text-xs">Try adjusting your search or filter criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(l => {
                  const mp = milestoneProgress(l)
                  return (
                    <TableRow key={l.id} className="even:bg-muted/50 cursor-pointer hover:bg-muted/80" onClick={() => openDetail(l)}>
                      <TableCell className="font-mono text-xs">{l.txRef}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <span className="truncate max-w-[100px]">{l.buyer?.name || '—'}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="truncate max-w-[100px]">{l.seller?.name || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        <span className="flex items-center gap-1">
                          <span className="text-xs">🇰🇪</span>
                          {formatCurrency(l.amount, l.currency || 'KES')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(l.status)} className={getStatusColor(l.status)}>{l.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${getRiskBg(l.aiRiskScore)}`} style={{ width: `${l.aiRiskScore}%` }} />
                          </div>
                          <span className={`text-xs font-medium ${getRiskColor(l.aiRiskScore)}`}>{l.aiRiskScore}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {mp ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(mp.completed / mp.total) * 100}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{mp.completed}/{mp.total}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(l.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openDetail(l) }}>
                          <Eye className="h-4 w-4" />
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

      {/* ─── Loan Detail Dialog ─── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedLoan && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-500" />
                  Loan {selectedLoan.txRef}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Loan Overview */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-emerald-500" /> Loan Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono text-xs">{selectedLoan.txRef}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-medium">🇰🇪 {formatCurrency(selectedLoan.amount, selectedLoan.currency || 'KES')}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Funded</span><span className="font-medium">🇰🇪 {formatCurrency(selectedLoan.fundedAmount, selectedLoan.currency || 'KES')}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Released</span><span>🇰🇪 {formatCurrency(selectedLoan.releasedAmount, selectedLoan.currency || 'KES')}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Refunded</span><span>🇰🇪 {formatCurrency(selectedLoan.refundedAmount, selectedLoan.currency || 'KES')}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span>{formatCurrency(selectedLoan.feeAmount, selectedLoan.feeCurrency || 'KES')}</span></div>
                      {selectedLoan.description && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Description</span><span className="text-xs truncate max-w-[200px]">{selectedLoan.description}</span></div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-emerald-500" /> Parties
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Borrower</span><span className="font-medium">{selectedLoan.buyer?.name || selectedLoan.buyerId?.slice(0, 8) + '...'}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Lender</span><span className="font-medium">{selectedLoan.seller?.name || selectedLoan.sellerId?.slice(0, 8) + '...'}</span></div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant={getStatusBadgeVariant(selectedLoan.status)} className={getStatusColor(selectedLoan.status)}>{selectedLoan.status}</Badge>
                      </div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="text-xs">{formatDate(selectedLoan.createdAt)}</span></div>
                      {selectedLoan.completedAt && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span className="text-xs">{formatDate(selectedLoan.completedAt)}</span></div>
                      )}
                      {selectedLoan.expiresAt && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Expires</span><span className="text-xs">{formatDate(selectedLoan.expiresAt)}</span></div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Risk Assessment */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> Risk Assessment
                  </h4>
                  <div className="flex items-center gap-6">
                    <CircularScore score={selectedLoan.aiRiskScore} size={80} />
                    <div className="flex-1 space-y-2">
                      <ScoreBar score={selectedLoan.aiRiskScore} label="AI Risk Score" />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Risk Level:</span>
                        <Badge variant="secondary" className={`text-[10px] ${RISK_BADGE_COLOR[selectedLoan.aiRiskLevel?.toLowerCase() || ''] || ''}`}>
                          {selectedLoan.aiRiskLevel || 'N/A'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Milestones */}
                {selectedLoan.milestones && selectedLoan.milestones.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                      <Milestone className="h-4 w-4 text-blue-500" /> Milestones ({selectedLoan.currentMilestone}/{selectedLoan.totalMilestones})
                    </h4>
                    <div className="space-y-2">
                      {selectedLoan.milestones.sort((a, b) => a.sequence - b.sequence).map(m => (
                        <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground w-6">#{m.sequence}</span>
                            <span className="font-medium">{m.title}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs">🇰🇪 {formatCurrency(m.amount, selectedLoan.currency || 'KES')}</span>
                            <Badge variant="secondary" className={`text-[10px] ${MILESTONE_STATUS_COLOR[m.status?.toLowerCase() || ''] || ''}`}>
                              {m.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disputes */}
                {selectedLoan.disputes && selectedLoan.disputes.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                      <AlertOctagon className="h-4 w-4 text-red-500" /> Disputes ({selectedLoan.disputes.length})
                    </h4>
                    <div className="space-y-3">
                      {selectedLoan.disputes.map(d => (
                        <div key={d.id} className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{d.reason}</span>
                            <Badge variant={getStatusBadgeVariant(d.status)} className={getStatusColor(d.status)}>{d.status}</Badge>
                          </div>
                          {d.description && <p className="text-xs text-muted-foreground mb-1">{d.description}</p>}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Raised by: {d.raisedBy}</span>
                            <span>{formatDate(d.createdAt)}</span>
                          </div>
                          {d.resolution && (
                            <div className="mt-2 p-2 rounded bg-emerald-50 dark:bg-emerald-950/20 text-xs">
                              <span className="font-medium">Resolution:</span> {d.resolution}
                            </div>
                          )}
                          {d.aiRecommendation && (
                            <div className="mt-1 p-2 rounded bg-blue-50 dark:bg-blue-950/20 text-xs">
                              <span className="font-medium">AI Recommendation:</span> {d.aiRecommendation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
