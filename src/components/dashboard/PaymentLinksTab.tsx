'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Link2, Plus, DollarSign, Zap, Copy, ExternalLink, X, CreditCard } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  useApi, formatCurrency, formatDate, CURRENCY_FLAGS, getStatusBadgeVariant, getStatusColor,
  KPICard, LoadingSkeleton, Toast, type Business, type PaymentLink,
} from '@/lib/dashboard-helpers'

interface LinkPayment {
  id: string; payerName?: string | null; payerEmail?: string | null; payerCountry?: string | null
  amount: number; currency: string; paymentMethod: string; provider?: string | null
  feeAmount?: number | null; netAmount?: number | null; status: string; createdAt: string
}

interface PaymentLinkDetail extends PaymentLink {
  payments: LinkPayment[]
}

export function PaymentLinksTab() {
  const [linkKey, setLinkKey] = useState(0)
  const { data: links, loading } = useApi<PaymentLink[]>(`/api/payment-links?limit=50&k=${linkKey}`)
  const { data: businesses } = useApi<Business[]>('/api/businesses?limit=50')
  const [selectedLink, setSelectedLink] = useState<PaymentLinkDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [payLinkId, setPayLinkId] = useState<string | null>(null)
  const [payLinkCurrency, setPayLinkCurrency] = useState('USD')
  const [payProviders, setPayProviders] = useState<Array<{code: string; name: string}>>([])
  const [payProvider, setPayProvider] = useState('')
  const [toastMsg, setToastMsg] = useState('')
  const [toastVis, setToastVis] = useState(false)

  // Create form
  const [formBizId, setFormBizId] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formCurrency, setFormCurrency] = useState('USD')
  const [formMaxPay, setFormMaxPay] = useState('1')
  const [formOpenAmt, setFormOpenAmt] = useState(false)
  const [creating, setCreating] = useState(false)

  // Pay form
  const [payName, setPayName] = useState('')
  const [payEmail, setPayEmail] = useState('')
  const [payCountry, setPayCountry] = useState('')
  const [payMethod, setPayMethod] = useState('card')
  const [payAmount, setPayAmount] = useState('')
  const [paying, setPaying] = useState(false)

  const showToast = useCallback((msg: string) => { setToastMsg(msg); setToastVis(true); setTimeout(() => setToastVis(false), 3000) }, [])

  if (loading) return <LoadingSkeleton />

  const allLinks = links || []
  const totalLinks = allLinks.length
  const activeLinks = allLinks.filter(l => l.status?.toLowerCase() === 'active').length
  const totalCollected = allLinks.reduce((s, l) => s + (l.totalCollected || 0), 0)
  const totalPayments = allLinks.reduce((s, l) => s + (l._paymentCount || 0), 0)

  const openDetail = async (link: PaymentLink) => {
    setDetailLoading(true)
    setSelectedLink(null)
    try {
      const res = await fetch(`/api/payment-links/${link.id}`)
      const json = await res.json()
      setSelectedLink(json.data)
    } catch { setSelectedLink(null) } finally { setDetailLoading(false) }
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/payment-links', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: formBizId,
          title: formTitle || undefined,
          amount: formOpenAmt ? 0 : parseFloat(formAmount) || 0,
          currency: formCurrency,
          maxPayments: parseInt(formMaxPay),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      showToast('Payment link created!')
      setCreateOpen(false)
      setFormTitle(''); setFormAmount(''); setFormMaxPay('1'); setFormOpenAmt(false)
      setLinkKey(k => k + 1)
    } catch (e: any) { showToast(e.message) } finally { setCreating(false) }
  }

  const handlePay = async () => {
    if (!payLinkId) return
    setPaying(true)
    try {
      const body: Record<string, any> = { amount: parseFloat(payAmount), payerName: payName, payerEmail: payEmail, payerCountry: payCountry, paymentMethod: payMethod }
      if (payProvider) body.provider = payProvider
      const res = await fetch(`/api/payment-links/${payLinkId}/pay`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Payment failed')
      const data = json.data
      if (data?.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer')
        showToast(`Redirecting to ${data.providerName}...`)
      } else {
        showToast('Payment processed!')
      }
      setPayOpen(false)
      setPayName(''); setPayEmail(''); setPayCountry(''); setPayAmount('')
      setLinkKey(k => k + 1)
      if (selectedLink?.id === payLinkId) openDetail(selectedLink as any)
    } catch (e: any) { showToast(e.message) } finally { setPaying(false) }
  }

  const copyLink = (ref: string) => {
    const url = `${window.location.origin}/pay/${ref}`
    navigator.clipboard.writeText(url).then(() => showToast('Link copied to clipboard!')).catch(() => showToast('Failed to copy'))
  }

  const openLink = async (link: PaymentLink) => {
    setPayLinkId(link.id)
    setPayLinkCurrency(link.currency)
    setPayAmount(link.amount ? String(link.amount) : '')
    setPayOpen(true)
    try {
      const res = await fetch(`/api/payments/providers?currency=${link.currency}`)
      const json = await res.json()
      const providers = (json.data || []).map((p: any) => ({ code: p.code, name: p.name }))
      setPayProviders(providers)
      if (providers.length > 0) setPayProvider(providers[0].code)
    } catch { setPayProviders([]) }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Links" value={totalLinks.toString()} icon={Link2} />
        <KPICard title="Active" value={activeLinks.toString()} icon={Zap} />
        <KPICard title="Total Collected" value={formatCurrency(totalCollected)} icon={DollarSign} />
        <KPICard title="Total Payments" value={totalPayments.toString()} icon={Link2} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{allLinks.length} payment links</p>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Link</Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payments</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allLinks.map(link => (
                  <TableRow key={link.id} className="even:bg-muted/50">
                    <TableCell className="font-mono text-xs">{link.linkRef}</TableCell>
                    <TableCell className="font-medium max-w-[150px] truncate">{link.title || '—'}</TableCell>
                    <TableCell>{link.amount ? formatCurrency(link.amount, link.currency) : <Badge variant="outline">Open</Badge>}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(link.status)} className={getStatusColor(link.status)}>{link.status}</Badge></TableCell>
                    <TableCell className="text-xs">{link._paymentCount ?? 0}{link.maxPayments ? `/${link.maxPayments}` : ' (unlimited)'}</TableCell>
                    <TableCell className="font-medium text-emerald-600">{formatCurrency(link.totalCollected || 0, link.currency)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetail(link)} title="View"><ExternalLink className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyLink(link.linkRef)} title="Copy link"><Copy className="h-3.5 w-3.5" /></Button>
                        {link.status === 'active' && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openLink(link)}>Pay</Button>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(link.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLink || detailLoading} onOpenChange={(open) => { if (!open) setSelectedLink(null) }}>
        <DialogContent className="max-w-lg">
          {detailLoading && <p className="text-center py-8 text-slate-400">Loading...</p>}
          {selectedLink && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedLink.title || 'Payment Link'}</DialogTitle>
                <DialogDescription className="font-mono text-xs">{selectedLink.linkRef}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-slate-500">Amount</p><p className="font-medium">{selectedLink.amount ? formatCurrency(selectedLink.amount, selectedLink.currency) : 'Open Amount'}</p></div>
                  <div><p className="text-slate-500">Collected</p><p className="font-medium text-emerald-600">{formatCurrency(selectedLink.totalCollected || 0, selectedLink.currency)}</p></div>
                  <div><p className="text-slate-500">Status</p><Badge variant={getStatusBadgeVariant(selectedLink.status)} className={getStatusColor(selectedLink.status)}>{selectedLink.status}</Badge></div>
                  <div><p className="text-slate-500">Payments</p><p className="font-medium">{selectedLink.payments?.length || 0}{selectedLink.maxPayments ? ` / ${selectedLink.maxPayments}` : ' (unlimited)'}</p></div>
                </div>
                <Separator />
                <h4 className="text-sm font-semibold">Payment History</h4>
                <div className="max-h-64 overflow-y-auto">
                  {selectedLink.payments && selectedLink.payments.length > 0 ? selectedLink.payments.map(p => (
                    <div key={p.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                      <div>
                        <p className="font-medium text-xs">{p.payerName} <span className="text-slate-400">({p.payerEmail})</span></p>
                        <p className="text-xs text-slate-400">{p.paymentMethod} via {p.provider} · {formatDate(p.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-emerald-600">{formatCurrency(p.amount, p.currency)}</p>
                        <p className="text-xs text-slate-400">fee: {p.feeAmount || 0}</p>
                      </div>
                    </div>
                  )) : <p className="text-sm text-slate-400 text-center py-4">No payments yet</p>}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Payment Link</DialogTitle><DialogDescription>Generate a shareable payment URL for your customers</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Business *</Label>
              <Select value={formBizId} onValueChange={setFormBizId}>
                <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
                <SelectContent>{(businesses || []).map(b => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Title</Label><Input placeholder="e.g. Q4 Invoice Payment" value={formTitle} onChange={e => setFormTitle(e.target.value)} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="openAmt" checked={formOpenAmt} onChange={e => setFormOpenAmt(e.target.checked)} className="rounded" />
              <Label htmlFor="openAmt" className="text-sm">Open amount (payer decides)</Label>
            </div>
            {!formOpenAmt && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Amount *</Label><Input type="number" min="0.01" step="0.01" placeholder="0.00" value={formAmount} onChange={e => setFormAmount(e.target.value)} /></div>
                <div className="space-y-2"><Label>Currency</Label>
                  <Select value={formCurrency} onValueChange={setFormCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['USD','EUR','GBP','NGN','KES','CNY','JPY','BRL','AUD','INR','AED','SGD'].map(c => <SelectItem key={c} value={c}>{CURRENCY_FLAGS[c] || ''} {c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="space-y-2"><Label>Max Payments</Label>
              <Select value={formMaxPay} onValueChange={setFormMaxPay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[['1','1 payment'],['5','5 payments'],['10','10 payments'],['0','Unlimited']].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formBizId || creating}>{creating ? 'Creating...' : 'Create Link'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Pay via Link</DialogTitle><DialogDescription>Complete a payment through this payment link</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Payer Name *</Label><Input placeholder="John Doe" value={payName} onChange={e => setPayName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Payer Email *</Label><Input type="email" placeholder="john@example.com" value={payEmail} onChange={e => setPayEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label>Country *</Label>
              <Select value={payCountry} onValueChange={setPayCountry}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>{['US','GB','NG','KE','IN','DE','BR','CN','JP','SG','AE','AU','ZA','GH','UG','TZ'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {payProviders.length > 0 && (
              <div className="space-y-2"><Label>Payment Provider</Label>
                <Select value={payProvider} onValueChange={setPayProvider}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {payProviders.map(p => <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">Auto-selected based on link currency ({payLinkCurrency})</p>
              </div>
            )}
            {payProviders.length === 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                No payment providers configured for {payLinkCurrency}. Payment will be recorded in demo mode. Add provider keys in .env.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Amount *</Label><Input type="number" min="0.01" step="0.01" placeholder="0.00" value={payAmount} onChange={e => setPayAmount(e.target.value)} /></div>
              <div className="space-y-2"><Label>Payment Method</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['bank_transfer','card','mobile_money','digital_wallet','crypto','mpesa'].map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={handlePay} disabled={!payName || !payEmail || !payCountry || !payAmount || paying}>{paying ? 'Processing...' : 'Pay Now'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toast message={toastMsg} visible={toastVis} />
    </motion.div>
  )
}
