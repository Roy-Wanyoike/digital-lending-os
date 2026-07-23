'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownRight, X, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  useApi, formatCurrency, CURRENCY_FLAGS, formatDate,
  KPICard, LoadingSkeleton, Toast, type Business, type WalletData,
} from '@/lib/dashboard-helpers'

interface WalletTransaction {
  id: string; txRef: string; type: string; amount: number;
  balanceBefore: number; balanceAfter: number; currency: string;
  description?: string | null; referenceType?: string | null;
  status: string; createdAt: string
}

const TX_TYPE_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  credit: { label: 'Credit', variant: 'default' },
  debit: { label: 'Debit', variant: 'destructive' },
  transfer_in: { label: 'Transfer In', variant: 'default' },
  transfer_out: { label: 'Transfer Out', variant: 'destructive' },
  conversion: { label: 'Conversion', variant: 'outline' },
  fee: { label: 'Fee', variant: 'secondary' },
  refund: { label: 'Refund', variant: 'outline' },
}

export function WalletTab() {
  const { data: businesses, loading: bLoading } = useApi<Business[]>('/api/businesses?limit=50')
  const [selectedBizId, setSelectedBizId] = useState<string>('')
  const bizId = selectedBizId || businesses?.[0]?.id || ''
  const [walletKey, setWalletKey] = useState(0)
  const { data: wallets, loading: wLoading } = useApi<WalletData[]>(bizId ? `/api/wallets?businessId=${bizId}&k=${walletKey}` : '')
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null)
  const [txns, setTxns] = useState<WalletTransaction[]>([])
  const [txLoading, setTxLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [creditOpen, setCreditOpen] = useState(false)
  const [debitOpen, setDebitOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastVis, setToastVis] = useState(false)

  // Create wallet form
  const [newCurrency, setNewCurrency] = useState('USD')
  const [creating, setCreating] = useState(false)
  // Credit/debit form
  const [txAmount, setTxAmount] = useState('')
  const [txDesc, setTxDesc] = useState('')
  const [txRefType, setTxRefType] = useState('general')
  const [txSubmitting, setTxSubmitting] = useState(false)

  const showToast = useCallback((msg: string) => { setToastMsg(msg); setToastVis(true); setTimeout(() => setToastVis(false), 3000) }, [])

  const loadTransactions = useCallback(async (walletId: string) => {
 setSelectedWalletId(walletId)
    setTxLoading(true)
    try {
      const res = await fetch(`/api/wallets/${walletId}/transactions?limit=50`)
      const json = await res.json()
      setTxns(json.data || [])
    } catch { setTxns([]) } finally { setTxLoading(false) }
  }, [])

  const allWallets = wallets || []
  const totalPortfolio = allWallets.reduce((sum, w) => {
    try { return sum + w.balance * (w.currency === 'NGN' ? 0.00065 : w.currency === 'KES' ? 0.0077 : w.currency === 'GHS' ? 0.088 : w.currency === 'EUR' ? 1.08 : w.currency === 'GBP' ? 1.26 : w.currency === 'JPY' ? 0.0067 : w.currency === 'INR' ? 0.012 : w.currency === 'BRL' ? 0.2 : w.currency === 'CNY' ? 0.14 : 1) } catch { return sum }
  }, 0)
  const totalBalance = allWallets.reduce((s, w) => s + w.balance, 0)
  const totalPending = allWallets.reduce((s, w) => s + w.pendingBalance, 0)
  const totalFrozen = allWallets.reduce((s, w) => s + w.frozenBalance, 0)

  const handleCreateWallet = async () => {
    if (!bizId) return
    setCreating(true)
    try {
      const res = await fetch('/api/wallets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: bizId, currency: newCurrency, isDefault: allWallets.length === 0 }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      showToast(`Wallet created!`)
      setCreateOpen(false)
      setWalletKey(k => k + 1)
    } catch (e: any) { showToast(e.message) } finally { setCreating(false) }
  }

  const handleTransaction = async (type: 'credit' | 'debit') => {
    if (!selectedWalletId || !txAmount) return
    setTxSubmitting(true)
    try {
      const res = await fetch(`/api/wallets/${selectedWalletId}/transactions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, amount: parseFloat(txAmount), description: txDesc || undefined, referenceType: txRefType }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      showToast(`${type === 'credit' ? 'Credit' : 'Debit'} successful!`)
      setCreditOpen(false); setDebitOpen(false)
      setTxAmount(''); setTxDesc('')
      setWalletKey(k => k + 1)
      loadTransactions(selectedWalletId)
    } catch (e: any) { showToast(e.message) } finally { setTxSubmitting(false) }
  }

  if (bLoading || (bizId && wLoading)) return <LoadingSkeleton />

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Business selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Business:</span>
          <Select value={selectedBizId || businesses?.[0]?.id} onValueChange={setSelectedBizId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select business" /></SelectTrigger>
            <SelectContent>{(businesses || []).map(b => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Wallet</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
          <CardContent className="p-4 sm:p-6 text-center">
            <p className="text-xs text-slate-500 mb-1">Portfolio (USD)</p>
            <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalPortfolio)}</p>
          </CardContent>
        </Card>
        <KPICard title="Total Balance" value={formatCurrency(totalBalance)} icon={WalletIcon} />
        <KPICard title="Pending" value={formatCurrency(totalPending)} icon={RefreshCw} />
        <KPICard title="Frozen" value={formatCurrency(totalFrozen)} icon={WalletIcon} />
      </div>

      {/* Wallet Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allWallets.map(w => (
          <Card key={w.id} className={`hover:shadow-md transition-shadow cursor-pointer ${selectedWalletId === w.id ? 'ring-2 ring-emerald-500' : ''}`} onClick={() => loadTransactions(w.id)}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{CURRENCY_FLAGS[w.currency] || '💰'}</span>
                  <span className="font-semibold">{w.currency}</span>
                  {w.isDefault && <Badge variant="outline" className="text-[10px]">Default</Badge>}
                </div>
                <Badge variant={w.status === 'active' ? 'default' : 'destructive'}>{w.status}</Badge>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(w.balance, w.currency)}</p>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <div className="flex justify-between"><span>Available</span><span className="text-emerald-600 font-medium">{formatCurrency(w.availableBalance, w.currency)}</span></div>
                <div className="flex justify-between"><span>Pending</span><span className="text-amber-600 font-medium">{formatCurrency(w.pendingBalance, w.currency)}</span></div>
                <div className="flex justify-between"><span>Frozen</span><span className="text-red-600 font-medium">{formatCurrency(w.frozenBalance, w.currency)}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {allWallets.length === 0 && bizId && !wLoading && (
        <Card className="border-dashed"><CardContent className="p-12 text-center"><p className="text-slate-500">No wallets for this business.</p></CardContent></Card>
      )}

      {/* Transaction History */}
      <AnimatePresence>
        {selectedWalletId && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Transaction History</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setCreditOpen(true)}><ArrowDownRight className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Credit</Button>
                <Button size="sm" variant="outline" onClick={() => setDebitOpen(true)}><ArrowUpRight className="h-3.5 w-3.5 mr-1 text-red-500" /> Debit</Button>
              </div>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Balance After</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {txLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>}
                      {!txLoading && txns.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">No transactions yet</TableCell></TableRow>}
                      {txns.map(tx => {
                        const badge = TX_TYPE_BADGE[tx.type] || { label: tx.type, variant: 'secondary' as const }
                        const isCredit = tx.type === 'credit' || tx.type === 'transfer_in' || tx.type === 'refund'
                        return (
                          <TableRow key={tx.id} className="even:bg-muted/50">
                            <TableCell className="font-mono text-xs">{tx.txRef}</TableCell>
                            <TableCell><Badge variant={badge.variant}>{badge.label}</Badge></TableCell>
                            <TableCell className="max-w-[150px] truncate text-xs">{tx.description || tx.referenceType || '—'}</TableCell>
                            <TableCell className={`text-right font-medium ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>{isCredit ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(tx.balanceAfter, tx.currency)}</TableCell>
                            <TableCell><Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>{tx.status}</Badge></TableCell>
                            <TableCell className="text-xs text-slate-500">{formatDate(tx.createdAt)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Wallet Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create New Wallet</DialogTitle><DialogDescription>Add a multi-currency wallet for this business</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Currency *</Label>
              <Select value={newCurrency} onValueChange={setNewCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['USD','EUR','GBP','NGN','KES','CNY','JPY','SGD','AED','BRL','AUD','INR','GHS','UGX','TZS','ZAR','CAD','CHF'].map(c => <SelectItem key={c} value={c}>{CURRENCY_FLAGS[c] || '💰'} {c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateWallet} disabled={creating}>{creating ? 'Creating...' : 'Create Wallet'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit/Debit Dialog */}
      <Dialog open={creditOpen || debitOpen} onOpenChange={(open) => { if (!open) { setCreditOpen(false); setDebitOpen(false) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{creditOpen ? 'Credit Wallet' : 'Debit Wallet'}</DialogTitle><DialogDescription>{creditOpen ? 'Add funds to this wallet' : 'Withdraw funds from this wallet'}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Amount *</Label><Input type="number" min="0.01" step="0.01" placeholder="0.00" value={txAmount} onChange={e => setTxAmount(e.target.value)} /></div>
            <div className="space-y-2"><Label>Reference Type</Label>
              <Select value={txRefType} onValueChange={setTxRefType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['general','escrow','payment_link','invoice','transfer','conversion'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Description</Label><Input placeholder="Optional note" value={txDesc} onChange={e => setTxDesc(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreditOpen(false); setDebitOpen(false) }}>Cancel</Button>
            <Button onClick={() => handleTransaction(creditOpen ? 'credit' : 'debit')} disabled={!txAmount || txSubmitting}>{txSubmitting ? 'Processing...' : creditOpen ? 'Credit' : 'Debit'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toast message={toastMsg} visible={toastVis} />
    </motion.div>
  )
}
