'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Plus, Eye, DollarSign, Play, ChevronRight, AlertTriangle, CheckCircle, Clock, X, ExternalLink, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useApi, formatCurrency, getStatusBadgeVariant, getStatusColor,
  getRiskBg, getRiskColor, formatDate, ESCROW_STATUSES, PipelineCard,
  LoadingSkeleton, ErrorState, KPICard, CURRENCY_FLAGS, ScoreBar, Toast,
  type EscrowTransaction, type Business,
} from '@/lib/dashboard-helpers'

// ─── Types ────────────────────────────────────────────────────

interface Milestone { id: string; sequence: number; title: string; amount: number; status: string; releasedAt?: string | null }
interface Disbursement { id: string; amount: number; currency: string; status: string; paymentRef?: string | null }
interface Dispute { id: string; raisedBy: string; reason: string; description?: string | null; status: string; resolution?: string | null; aiRecommendation?: string | null; createdAt: string }
interface AuditEntry { id: string; action: string; actor?: string | null; details: string; createdAt: string }
interface EscrowDetail extends EscrowTransaction {
  milestones: Milestone[]
  disbursements: Disbursement[]
  disputes: Dispute[]
  auditLog: AuditEntry[]
}

// ─── Component ────────────────────────────────────────────────

export function EscrowTab() {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: transactions, loading, error: txError, refetch } = useApi<EscrowTransaction[]>(`/api/escrow/transactions?limit=50&k=${refreshKey}`)
  const { data: businesses, error: bizError } = useApi<Business[]>('/api/businesses?limit=50')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [fundOpen, setFundOpen] = useState(false)
  const [fundEscrowId, setFundEscrowId] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState('')
  const [toastVis, setToastVis] = useState(false)

  // Fund form state
  const [fundEmail, setFundEmail] = useState('')
  const [fundFirstName, setFundFirstName] = useState('')
  const [fundLastName, setFundLastName] = useState('')
  const [fundProvider, setFundProvider] = useState('')
  const [fundProviders, setFundProviders] = useState<Array<{code: string; name: string}>>([])
  const [funding, setFunding] = useState(false)

  // Create form state
  const [formBuyer, setFormBuyer] = useState('')
  const [formSeller, setFormSeller] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formCurrency, setFormCurrency] = useState('USD')
  const [formDesc, setFormDesc] = useState('')
  const [formMilestones, setFormMilestones] = useState('1')
  const [creating, setCreating] = useState(false)

  // Dispute form state
  const [disputeRaisedBy, setDisputeRaisedBy] = useState('buyer')
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeDesc, setDisputeDesc] = useState('')
  const [disputing, setDisputing] = useState(false)

  const showToast = useCallback((msg: string) => { setToastMsg(msg); setToastVis(true); setTimeout(() => setToastVis(false), 3000) }, [])

  const doAction = useCallback(async (id: string, action: string, body?: Record<string, string>) => {
    try {
      const res = await fetch(`/api/escrow/transactions/${id}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Action failed')
      showToast(`${action} successful!`)
      setRefreshKey(k => k + 1)
      return json.data
    } catch (e: any) { showToast(e.message); return null }
  }, [showToast])

  const openFundDialog = useCallback(async (escrowId: string, currency: string) => {
    setFundEscrowId(escrowId)
    setFundOpen(true)
    try {
      const res = await fetch(`/api/payments/providers?currency=${currency}`)
      const json = await res.json()
      const providers = (json.data || []).map((p: any) => ({ code: p.code, name: p.name }))
      setFundProviders(providers)
      if (providers.length > 0) setFundProvider(providers[0].code)
    } catch { setFundProviders([]) }
  }, [])

  if (loading) return <LoadingSkeleton />
  if (txError || bizError) return <ErrorState message={txError || bizError || ''} onRetry={refetch} />

  const allTxns = transactions || []
  const filtered = statusFilter === 'all' ? allTxns : allTxns.filter(t => t.status?.toLowerCase() === statusFilter.toLowerCase())

  const pipelineCounts = ESCROW_STATUSES.map(s => ({
    status: s,
    count: allTxns.filter(t => t.status?.toLowerCase() === s.toLowerCase().replace(/\s/g, '_') || t.status?.toLowerCase().replace(/\s/g, '') === s.toLowerCase().replace(/\s/g, '')).length,
  }))
  const pipelineColors = ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981', '#ef4444']

  const totalVolume = allTxns.reduce((s, t) => s + t.amount, 0)
  const activeEscrows = allTxns.filter(t => ['funded', 'in_escrow'].includes(t.status?.toLowerCase())).length
  const disputed = allTxns.filter(t => t.status?.toLowerCase() === 'disputed').length

  // ─── Derived data ────────────────────────────────────────

  const handleFund = async () => {
    if (!fundEscrowId || !fundEmail) return
    setFunding(true)
    try {
      const body: Record<string, string> = { email: fundEmail }
      if (fundFirstName) body.firstName = fundFirstName
      if (fundLastName) body.lastName = fundLastName
      if (fundProvider) body.provider = fundProvider
      const res = await fetch(`/api/escrow/transactions/${fundEscrowId}/fund`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Funding failed')
      const data = json.data
      if (data?.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer')
        showToast(`Redirecting to ${data.providerName}...`)
      } else if (data?.status === 'awaiting_payment') {
        showToast('Payment initiated! Complete it via the provider.')
      } else {
        showToast('Escrow funding initiated!')
      }
      setFundOpen(false)
      setFundEmail(''); setFundFirstName(''); setFundLastName(''); setFundProvider('')
      setRefreshKey(k => k + 1)
    } catch (e: any) { showToast(e.message) } finally { setFunding(false) }
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const milestones = Array.from({ length: parseInt(formMilestones) }, (_, i) => ({
        title: `Milestone ${i + 1}`,
        amount: Math.round((parseFloat(formAmount) / parseInt(formMilestones)) * 100) / 100,
      }))
      const res = await fetch('/api/escrow/transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerId: formBuyer, sellerId: formSeller, amount: parseFloat(formAmount), currency: formCurrency, description: formDesc || undefined, milestones }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || json.details?.[0]?.message || 'Create failed')
      showToast('Escrow created!')
      setCreateOpen(false)
      setFormBuyer(''); setFormSeller(''); setFormAmount(''); setFormDesc(''); setFormMilestones('1')
      setRefreshKey(k => k + 1)
    } catch (e: any) { showToast(e.message) } finally { setCreating(false) }
  }

  const handleDispute = async () => {
    if (!selectedId || !disputeReason) return
    setDisputing(true)
    try {
      const res = await fetch(`/api/escrow/transactions/${selectedId}/disputes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raisedBy: disputeRaisedBy, reason: disputeReason, description: disputeDesc || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Dispute failed')
      showToast('Dispute raised!')
      setDisputeOpen(false); setDisputeReason(''); setDisputeDesc('')
      setRefreshKey(k => k + 1)
    } catch (e: any) { showToast(e.message) } finally { setDisputing(false) }
  }

  const selectedTxn = allTxns.find(t => t.id === selectedId)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Volume" value={formatCurrency(totalVolume)} icon={DollarSign} />
        <KPICard title="Active Escrows" value={activeEscrows.toString()} icon={Shield} />
        <KPICard title="Disputed" value={disputed.toString()} icon={AlertTriangle} />
        <KPICard title="Total Deals" value={allTxns.length.toString()} icon={ChevronRight} />
      </div>

      {/* Pipeline */}
      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
        {pipelineCounts.map((p, i) => (
          <PipelineCard key={p.status} label={p.status} count={p.count} color={pipelineColors[i]} />
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {ESCROW_STATUSES.map(s => <SelectItem key={s} value={s.toLowerCase().replace(/\s/g, '_')}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Escrow</Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Buyer → Seller</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>AI Risk</TableHead>
                  <TableHead>Milestones</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 20).map(txn => {
                  const st = txn.status?.toLowerCase() || ''
                  const canFund = st === 'created'
                  const canActivate = st === 'funded'
                  const canRelease = st === 'in_escrow'
                  const canDispute = ['funded', 'in_escrow'].includes(st)
                  return (
                    <TableRow key={txn.id} className="even:bg-muted/50">
                      <TableCell className="font-mono text-xs">{txn.txRef}</TableCell>
                      <TableCell className="max-w-[160px] truncate text-xs">
                        <span className="text-foreground">{txn.buyer?.name}</span>
                        <span className="text-muted-foreground mx-1">→</span>
                        <span className="text-foreground">{txn.seller?.name}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(txn.amount, txn.currency)}</TableCell>
                      <TableCell><Badge variant={getStatusBadgeVariant(txn.status)} className={getStatusColor(txn.status)}>{txn.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${getRiskBg(txn.aiRiskScore || 0)}`} style={{ width: `${txn.aiRiskScore || 0}%` }} />
                          </div>
                          <span className={`text-xs font-medium ${getRiskColor(txn.aiRiskScore || 0)}`}>{txn.aiRiskLevel}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{txn.currentMilestone}/{txn.totalMilestones}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedId(txn.id)} title="View details"><Eye className="h-3.5 w-3.5" /></Button>
                          {canFund && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openFundDialog(txn.id, txn.currency)}><CreditCard className="h-3 w-3 mr-1" />Fund</Button>}
                          {canActivate && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => doAction(txn.id, 'activate')}><Play className="h-3 w-3 mr-1" />Activate</Button>}
                          {canRelease && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                            const ms = txn.milestones?.find((m: any) => m.status === 'ready' || m.status === 'pending')
                            if (ms) doAction(txn.id, 'release', { milestoneId: ms.id })
                            else showToast('No pending milestones')
                          }}><CheckCircle className="h-3 w-3 mr-1" />Release</Button>}
                          {canDispute && <Button variant="outline" size="sm" className="h-7 text-xs text-red-600" onClick={() => { setSelectedId(txn.id); setDisputeOpen(true) }}><AlertTriangle className="h-3 w-3 mr-1" />Dispute</Button>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(txn.createdAt)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedTxn && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedId(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative w-full max-w-xl bg-background shadow-xl h-full overflow-y-auto border-l">
              <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedTxn.txRef}</h3>
                  <p className="text-xs text-muted-foreground">{formatDate(selectedTxn.createdAt)}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="p-6 space-y-6">
                {/* Status & Amount */}
                <div className="flex items-center justify-between">
                  <Badge variant={getStatusBadgeVariant(selectedTxn.status)} className={getStatusColor(selectedTxn.status)}>{selectedTxn.status}</Badge>
                  <p className="text-2xl font-bold">{formatCurrency(selectedTxn.amount, selectedTxn.currency)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-muted-foreground">Buyer</p><p className="font-medium">{selectedTxn.buyer?.name}</p></div>
                  <div><p className="text-muted-foreground">Seller</p><p className="font-medium">{selectedTxn.seller?.name}</p></div>
                  <div><p className="text-muted-foreground">Funded</p><p className="font-medium text-blue-600 dark:text-blue-400">{formatCurrency(selectedTxn.fundedAmount, selectedTxn.currency)}</p></div>
                  <div><p className="text-muted-foreground">Released</p><p className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedTxn.releasedAmount, selectedTxn.currency)}</p></div>
                </div>

                {/* Risk Score */}
                <div>
                  <p className="text-sm font-medium mb-2">AI Risk Assessment</p>
                  <ScoreBar score={selectedTxn.aiRiskScore || 0} label="Risk Score" />
                </div>

                {/* Milestones */}
                {selectedTxn.milestones && selectedTxn.milestones.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Milestones</p>
                    <div className="space-y-2">
                      {selectedTxn.milestones.map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                          <div className="flex items-center gap-2">
                            {m.status === 'released' ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                            <span className="text-sm font-medium">{m.title}</span>
                          </div>
                          <span className="text-sm font-medium">{formatCurrency(m.amount, selectedTxn.currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disputes */}
                {selectedTxn.disputes && selectedTxn.disputes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Disputes</p>
                    {selectedTxn.disputes.map((d: any) => (
                      <div key={d.id} className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant={d.status === 'open' ? 'destructive' : 'secondary'}>{d.status}</Badge>
                          <span className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</span>
                        </div>
                        <p className="text-sm font-medium">{d.reason}</p>
                        {d.aiRecommendation && <p className="text-xs text-muted-foreground mt-1">AI: {d.aiRecommendation}</p>}
                        {d.resolution && <p className="text-xs text-emerald-600 mt-1">Resolution: {d.resolution}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Description */}
                {selectedTxn.description && (
                  <div>
                    <p className="text-sm font-medium mb-1">Description</p>
                    <p className="text-sm text-muted-foreground">{selectedTxn.description}</p>
                  </div>
                )}

                {/* Fees */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-muted-foreground">Fee</p><p>{formatCurrency(selectedTxn.feeAmount, selectedTxn.feeCurrency)}</p></div>
                  <div><p className="text-muted-foreground">Refunded</p><p>{formatCurrency(selectedTxn.refundedAmount, selectedTxn.currency)}</p></div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fund Dialog */}
      <Dialog open={fundOpen} onOpenChange={setFundOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Fund Escrow</DialogTitle>
            <DialogDescription>Pay via a payment provider to fund this escrow. You will be redirected to complete payment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {fundProviders.length > 0 && (
              <div className="space-y-2"><Label>Payment Provider</Label>
                <Select value={fundProvider} onValueChange={setFundProvider}>
                  <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                  <SelectContent>
                    {fundProviders.map(p => <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Auto-selected based on escrow currency. Fees apply per provider.</p>
              </div>
            )}
            {fundProviders.length === 0 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
                No payment providers configured. Payments will use demo mode. Add provider keys in .env to enable real payments.
              </div>
            )}
            <div className="space-y-2"><Label>Email *</Label><Input type="email" placeholder="payer@email.com" value={fundEmail} onChange={e => setFundEmail(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>First Name</Label><Input placeholder="John" value={fundFirstName} onChange={e => setFundFirstName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input placeholder="Doe" value={fundLastName} onChange={e => setFundLastName(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFundOpen(false)}>Cancel</Button>
            <Button onClick={handleFund} disabled={!fundEmail || funding}>{funding ? 'Initiating...' : 'Pay Now'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Escrow</DialogTitle>
            <DialogDescription>Set up a secure transaction between buyer and seller</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Buyer *</Label>
              <Select value={formBuyer} onValueChange={setFormBuyer}>
                <SelectTrigger><SelectValue placeholder="Select buyer business" /></SelectTrigger>
                <SelectContent>{(businesses || []).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Seller *</Label>
              <Select value={formSeller} onValueChange={setFormSeller}>
                <SelectTrigger><SelectValue placeholder="Select seller business" /></SelectTrigger>
                <SelectContent>{(businesses || []).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Amount *</Label><Input type="number" min="1" step="0.01" placeholder="0.00" value={formAmount} onChange={e => setFormAmount(e.target.value)} /></div>
              <div className="space-y-2"><Label>Currency</Label>
                <Select value={formCurrency} onValueChange={setFormCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['USD','EUR','GBP','CNY','JPY','SGD','AED','NGN','KES','BRL','AUD'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Input placeholder="What is this escrow for?" value={formDesc} onChange={e => setFormDesc(e.target.value)} /></div>
            <div className="space-y-2"><Label>Milestones</Label>
              <Select value={formMilestones} onValueChange={setFormMilestones}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['1','2','3','4','5'].map(n => <SelectItem key={n} value={n}>{n} milestone{n !== '1' ? 's' : ''} (equal split)</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formBuyer || !formSeller || !formAmount || isNaN(parseFloat(formAmount)) || parseFloat(formAmount) <= 0 || creating}>{creating ? 'Creating...' : 'Create Escrow'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Raise Dispute</DialogTitle>
            <DialogDescription>Report an issue with escrow {selectedTxn?.txRef}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Raised By</Label>
              <Select value={disputeRaisedBy} onValueChange={setDisputeRaisedBy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="buyer">Buyer ({selectedTxn?.buyer?.name})</SelectItem><SelectItem value="seller">Seller ({selectedTxn?.seller?.name})</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Reason *</Label><Input placeholder="Brief reason for dispute" value={disputeReason} onChange={e => setDisputeReason(e.target.value)} /></div>
            <div className="space-y-2"><Label>Description</Label><Input placeholder="Detailed description (optional)" value={disputeDesc} onChange={e => setDisputeDesc(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDispute} disabled={!disputeReason || disputing}>{disputing ? 'Submitting...' : 'Raise Dispute'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toast message={toastMsg} visible={toastVis} />
    </motion.div>
  )
}
