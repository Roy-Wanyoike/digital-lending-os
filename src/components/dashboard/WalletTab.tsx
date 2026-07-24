'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet as WalletIcon, Plus, ArrowDownRight, RefreshCw,
  Download, Upload, ArrowLeftRight, Bitcoin, Info,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useApi, formatCurrency, CURRENCY_FLAGS, formatDate,
  KPICard, LoadingSkeleton, Toast, type Business, type WalletData,
} from '@/lib/dashboard-helpers'

// ─── Types ───────────────────────────────────────────────────────

interface WalletTransaction {
  id: string; txRef: string; type: string; amount: number;
  balanceBefore: number; balanceAfter: number; currency: string;
  description?: string | null; referenceType?: string | null;
  status: string; createdAt: string
}

interface DepositRecord {
  id: string; depositRef: string; walletId: string; amount: number;
  currency: string; paymentMethod: string; provider?: string | null;
  bankName?: string | null; bankRef?: string | null; cardLast4?: string | null;
  notes?: string | null; status: string; completedAt?: string | null; createdAt: string
}

interface WithdrawalRecord {
  id: string; withdrawalRef: string; walletId: string; amount: number;
  currency: string; paymentMethod: string; provider?: string | null;
  bankName?: string | null; bankAccount?: string | null; recipientName?: string | null;
  feeAmount: number; netAmount?: number | null;
  notes?: string | null; status: string; completedAt?: string | null; createdAt: string
}

interface CryptoWithdrawalRecord {
  id: string; withdrawalRef: string; walletId: string; amount: number;
  cryptoAmount?: number | null; currency: string; cryptoCurrency: string;
  network: string; walletAddress: string; status: string;
  exchangeRate?: number | null; networkFee: number; processingFee: number;
  txHash?: string | null; explorerUrl?: string | null;
  notes?: string | null; completedAt?: string | null; createdAt: string
}

interface RatesData {
  fiatRates: Record<string, Record<string, number>>
  cryptoPrices: Record<string, number>
  fiatToUsd: Record<string, number>
  networkFees: Record<string, number>
  cryptoNetworks: Record<string, string[]>
  conversionFeePercent: number
  withdrawalFeePercent: number
  withdrawalFlatFee: number
  cryptoWithdrawalFeePercent: number
  cryptoWithdrawalMinFee: number
}

const TX_TYPE_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  credit: { label: 'Credit', variant: 'default' },
  debit: { label: 'Debit', variant: 'destructive' },
  transfer_in: { label: 'Transfer In', variant: 'default' },
  transfer_out: { label: 'Transfer Out', variant: 'destructive' },
  conversion: { label: 'Conversion', variant: 'outline' },
  fee: { label: 'Fee', variant: 'secondary' },
  refund: { label: 'Refund', variant: 'outline' },
  deposit: { label: 'Deposit', variant: 'default' },
  withdrawal: { label: 'Withdrawal', variant: 'destructive' },
  crypto_withdrawal: { label: 'Crypto Out', variant: 'destructive' },
}

const CRYPTO_ICONS: Record<string, string> = {
  USDT: '💲', USDC: '💎', BTC: '₿', ETH: 'Ξ', SOL: '◎', BNB: '🔶',
}

const NETWORK_LABELS: Record<string, string> = {
  trc20: 'TRC-20 (Tron)', erc20: 'ERC-20 (Ethereum)', bsc: 'BEP-20 (BSC)',
  solana: 'Solana', bitcoin: 'Bitcoin', bep2: 'BEP-2 (BNB)',
}

// ─── Component ──────────────────────────────────────────────────

export function WalletTab() {
  const { data: businesses, loading: bLoading } = useApi<Business[]>('/api/businesses?limit=50')
  const { data: rates } = useApi<RatesData>('/api/wallets/rates')
  const [selectedBizId, setSelectedBizId] = useState<string>('')
  const safeBusinesses = Array.isArray(businesses) ? businesses : []
  const bizId = selectedBizId || safeBusinesses?.[0]?.id || ''
  const [walletKey, setWalletKey] = useState(0)
  const { data: wallets, loading: wLoading } = useApi<WalletData[]>(bizId ? `/api/wallets?businessId=${bizId}&k=${walletKey}` : '')
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null)
  const [txns, setTxns] = useState<WalletTransaction[]>([])
  const [txLoading, setTxLoading] = useState(false)

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false)
  const [depositOpen, setDepositOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [cryptoOpen, setCryptoOpen] = useState(false)

  // History dialogs
  const [historyTab, setHistoryTab] = useState('transactions')
  const [deposits, setDeposits] = useState<DepositRecord[]>([])
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([])
  const [cryptoWdrs, setCryptoWdrs] = useState<CryptoWithdrawalRecord[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)

  const [toastMsg, setToastMsg] = useState('')
  const [toastVis, setToastVis] = useState(false)

  // Create wallet form
  const [newCurrency, setNewCurrency] = useState('USD')
  const [creating, setCreating] = useState(false)

  // Deposit form
  const [depAmount, setDepAmount] = useState('')
  const [depMethod, setDepMethod] = useState('bank_transfer')
  const [depNotes, setDepNotes] = useState('')
  const [depSubmitting, setDepSubmitting] = useState(false)

  // Withdraw form
  const [wdrAmount, setWdrAmount] = useState('')
  const [wdrMethod, setWdrMethod] = useState('bank_transfer')
  const [wdrBankName, setWdrBankName] = useState('')
  const [wdrBankAccount, setWdrBankAccount] = useState('')
  const [wdrRecipientName, setWdrRecipientName] = useState('')
  const [wdrNotes, setWdrNotes] = useState('')
  const [wdrSubmitting, setWdrSubmitting] = useState(false)

  // Convert form
  const [cvtFromWalletId, setCvtFromWalletId] = useState('')
  const [cvtToWalletId, setCvtToWalletId] = useState('')
  const [cvtAmount, setCvtAmount] = useState('')
  const [cvtSubmitting, setCvtSubmitting] = useState(false)

  // Crypto form
  const [crCrypto, setCrCrypto] = useState('USDT')
  const [crNetwork, setCrNetwork] = useState('trc20')
  const [crAddress, setCrAddress] = useState('')
  const [crAmount, setCrAmount] = useState('')
  const [crNotes, setCrNotes] = useState('')
  const [crSubmitting, setCrSubmitting] = useState(false)

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

  const loadHistory = useCallback(async (walletId: string, tab: string) => {
    setHistoryTab(tab)
    setHistoryOpen(true)
    try {
      if (tab === 'deposits') {
        const r = await fetch(`/api/wallets/deposit?walletId=${walletId}&limit=50`)
        setDeposits((await r.json()).data || [])
      } else if (tab === 'withdrawals') {
        const r = await fetch(`/api/wallets/withdrawal?walletId=${walletId}&limit=50`)
        setWithdrawals((await r.json()).data || [])
      } else if (tab === 'crypto') {
        const r = await fetch(`/api/wallets/crypto-withdrawal?walletId=${walletId}&limit=50`)
        setCryptoWdrs((await r.json()).data || [])
      }
    } catch { /* ignore */ }
  }, [])

  const allWallets = Array.isArray(wallets) ? wallets : []
  const totalPortfolio = allWallets.reduce((sum, w) => {
    try {
      const toUsd = rates?.fiatToUsd?.[w.currency] || 1
      return sum + w.balance * toUsd
    } catch { return sum }
  }, 0)
  const totalBalance = allWallets.reduce((s, w) => s + w.balance, 0)
  const totalPending = allWallets.reduce((s, w) => s + w.pendingBalance, 0)
  const totalFrozen = allWallets.reduce((s, w) => s + w.frozenBalance, 0)

  const selectedWallet = allWallets.find(w => w.id === selectedWalletId)

  // Conversion preview
  const conversionPreview = (() => {
    if (!cvtAmount || !cvtFromWalletId || !cvtToWalletId || !rates) return null
    const from = allWallets.find(w => w.id === cvtFromWalletId)
    const to = allWallets.find(w => w.id === cvtToWalletId)
    if (!from || !to) return null
    const amount = parseFloat(cvtAmount)
    if (isNaN(amount) || amount <= 0) return null
    const direct = rates.fiatRates[from.currency]?.[to.currency]
    if (!direct) return null
    const gross = amount * direct
    const fee = Math.round(gross * 0.005 * 100) / 100
    const net = Math.round((gross - fee) * 100) / 100
    return { rate: direct, gross, fee, net }
  })()

  // Crypto withdrawal preview
  const cryptoPreview = (() => {
    if (!crAmount || !selectedWallet || !rates) return null
    const amount = parseFloat(crAmount)
    if (isNaN(amount) || amount <= 0) return null
    const toUsd = rates.fiatToUsd[selectedWallet.currency] || 1
    const usdAmount = amount * toUsd
    const cryptoPrice = rates.cryptoPrices[crCrypto]
    if (!cryptoPrice) return null
    const cryptoAmt = usdAmount / cryptoPrice
    const netFee = rates.networkFees[crNetwork] || 0
    const netCrypto = Math.max(0, cryptoAmt - netFee)
    const procFee = Math.max(amount * (rates.cryptoWithdrawalFeePercent / 100), rates.cryptoWithdrawalMinFee)
    const totalDebit = amount + procFee
    return { usdAmount, cryptoAmt, netCrypto, netFee, procFee, totalDebit, cryptoPrice }
  })()

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
      showToast('Wallet created!')
      setCreateOpen(false)
      setWalletKey(k => k + 1)
    } catch (e: any) { showToast(e.message) } finally { setCreating(false) }
  }

  const handleDeposit = async () => {
    if (!selectedWalletId || !depAmount) return
    setDepSubmitting(true)
    try {
      const res = await fetch('/api/wallets/deposit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: selectedWalletId, amount: parseFloat(depAmount),
          paymentMethod: depMethod, provider: 'demo', notes: depNotes || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      showToast('Deposit completed!')
      setDepositOpen(false); setDepAmount(''); setDepNotes('')
      setWalletKey(k => k + 1)
      loadTransactions(selectedWalletId)
    } catch (e: any) { showToast(e.message) } finally { setDepSubmitting(false) }
  }

  const handleWithdraw = async () => {
    if (!selectedWalletId || !wdrAmount) return
    setWdrSubmitting(true)
    try {
      const res = await fetch('/api/wallets/withdrawal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: selectedWalletId, amount: parseFloat(wdrAmount),
          paymentMethod: wdrMethod, provider: 'demo',
          bankName: wdrBankName || undefined, bankAccount: wdrBankAccount || undefined,
          recipientName: wdrRecipientName || undefined, notes: wdrNotes || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      showToast('Withdrawal completed!')
      setWithdrawOpen(false); setWdrAmount(''); setWdrBankName(''); setWdrBankAccount(''); setWdrRecipientName(''); setWdrNotes('')
      setWalletKey(k => k + 1)
      loadTransactions(selectedWalletId)
    } catch (e: any) { showToast(e.message) } finally { setWdrSubmitting(false) }
  }

  const handleConvert = async () => {
    if (!cvtFromWalletId || !cvtToWalletId || !cvtAmount) return
    setCvtSubmitting(true)
    try {
      const res = await fetch('/api/wallets/convert', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromWalletId: cvtFromWalletId, toWalletId: cvtToWalletId, fromAmount: parseFloat(cvtAmount) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      showToast('Conversion completed!')
      setConvertOpen(false); setCvtAmount('')
      setWalletKey(k => k + 1)
      loadTransactions(selectedWalletId)
    } catch (e: any) { showToast(e.message) } finally { setCvtSubmitting(false) }
  }

  const handleCryptoWithdraw = async () => {
    if (!selectedWalletId || !crAmount || !crAddress) return
    setCrSubmitting(true)
    try {
      const res = await fetch('/api/wallets/crypto-withdrawal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: selectedWalletId, amount: parseFloat(crAmount),
          cryptoCurrency: crCrypto, network: crNetwork, walletAddress: crAddress.trim(),
          notes: crNotes || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      showToast('Crypto withdrawal submitted!')
      setCryptoOpen(false); setCrAmount(''); setCrAddress(''); setCrNotes('')
      setWalletKey(k => k + 1)
      loadTransactions(selectedWalletId)
    } catch (e: any) { showToast(e.message) } finally { setCrSubmitting(false) }
  }

  // When crypto changes, reset network to first valid
  useEffect(() => {
    if (rates) {
      const nets = rates.cryptoNetworks[crCrypto]
      if (nets && nets.length > 0) setCrNetwork(nets[0])
    }
  }, [crCrypto, rates])

  // When convert source wallet changes, clear target if same
  useEffect(() => {
    if (cvtFromWalletId === cvtToWalletId) setCvtToWalletId('')
  }, [cvtFromWalletId])

  if (bLoading || (bizId && wLoading)) return <LoadingSkeleton />

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Business selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Business:</span>
          <Select value={selectedBizId || businesses?.[0]?.id} onValueChange={setSelectedBizId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select business" /></SelectTrigger>
            <SelectContent>{safeBusinesses.map(b => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent>
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

      {/* Action Buttons + Transaction History */}
      <AnimatePresence>
        {selectedWalletId && selectedWallet && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="font-semibold">{selectedWallet.currency} Wallet — {CURRENCY_FLAGS[selectedWallet.currency] || ''}</h3>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => setDepositOpen(true)}><Download className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Deposit</Button>
                <Button size="sm" variant="outline" onClick={() => setWithdrawOpen(true)}><Upload className="h-3.5 w-3.5 mr-1 text-red-500" /> Withdraw</Button>
                <Button size="sm" variant="outline" onClick={() => setConvertOpen(true)}><ArrowLeftRight className="h-3.5 w-3.5 mr-1 text-amber-500" /> Convert</Button>
                <Button size="sm" variant="outline" onClick={() => setCryptoOpen(true)}><Bitcoin className="h-3.5 w-3.5 mr-1 text-orange-500" /> Crypto</Button>
                <Button size="sm" variant="ghost" onClick={() => loadHistory(selectedWalletId, 'transactions')}>History</Button>
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
                        const isCredit = tx.type === 'credit' || tx.type === 'transfer_in' || tx.type === 'refund' || tx.type === 'deposit'
                        return (
                          <TableRow key={tx.id} className="even:bg-muted/50">
                            <TableCell className="font-mono text-xs">{tx.txRef}</TableCell>
                            <TableCell><Badge variant={badge.variant}>{badge.label}</Badge></TableCell>
                            <TableCell className="max-w-[200px] truncate text-xs">{tx.description || tx.referenceType || '—'}</TableCell>
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

      {/* ═══ DIALOGS ═══ */}

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

      {/* Deposit Dialog */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle><Download className="h-4 w-4 inline mr-2 text-emerald-500" />Deposit Funds</DialogTitle><DialogDescription>Add funds to your {selectedWallet?.currency} wallet</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Amount ({selectedWallet?.currency || '—'}) *</Label>
              <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={depAmount} onChange={e => setDepAmount(e.target.value)} />
            </div>
            <div className="space-y-2"><Label>Payment Method *</Label>
              <Select value={depMethod} onValueChange={setDepMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Debit/Credit Card</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money (M-Pesa, etc.)</SelectItem>
                  <SelectItem value="payment_link">Payment Link</SelectItem>
                  <SelectItem value="external">External / Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Notes (optional)</Label>
              <Input placeholder="Reference or description" value={depNotes} onChange={e => setDepNotes(e.target.value)} />
            </div>
            <div className="bg-slate-50 rounded-md p-3 text-xs text-slate-500 space-y-1">
              <p><Info className="h-3 w-3 inline mr-1" />Deposits via <b>demo provider</b> complete instantly. In production, bank transfers take 1–3 business days, cards are instant.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositOpen(false)}>Cancel</Button>
            <Button onClick={handleDeposit} disabled={!depAmount || depSubmitting}>{depSubmitting ? 'Processing...' : 'Deposit'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle><Upload className="h-4 w-4 inline mr-2 text-red-500" />Withdraw Funds</DialogTitle><DialogDescription>Withdraw from your {selectedWallet?.currency} wallet</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-md p-3 flex justify-between text-sm">
              <span className="text-slate-500">Available</span>
              <span className="font-semibold text-emerald-700">{formatCurrency(selectedWallet?.availableBalance || 0, selectedWallet?.currency)}</span>
            </div>
            <div className="space-y-2"><Label>Amount ({selectedWallet?.currency || '—'}) *</Label>
              <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={wdrAmount} onChange={e => setWdrAmount(e.target.value)} />
            </div>
            <div className="space-y-2"><Label>Withdrawal Method *</Label>
              <Select value={wdrMethod} onValueChange={setWdrMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {wdrMethod === 'bank_transfer' && (
              <div className="space-y-3">
                <div className="space-y-2"><Label>Bank Name</Label><Input placeholder="e.g. Equity Bank Kenya" value={wdrBankName} onChange={e => setWdrBankName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Account Number</Label><Input placeholder="e.g. ****1234" value={wdrBankAccount} onChange={e => setWdrBankAccount(e.target.value)} /></div>
                <div className="space-y-2"><Label>Recipient Name</Label><Input placeholder="Account holder name" value={wdrRecipientName} onChange={e => setWdrRecipientName(e.target.value)} /></div>
              </div>
            )}
            <div className="space-y-2"><Label>Notes (optional)</Label>
              <Input placeholder="Reference or description" value={wdrNotes} onChange={e => setWdrNotes(e.target.value)} />
            </div>
            {wdrAmount && parseFloat(wdrAmount) > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs space-y-1">
                <p className="font-medium text-amber-800">Fee Estimate</p>
                <div className="flex justify-between"><span>Amount:</span><span>{formatCurrency(parseFloat(wdrAmount), selectedWallet?.currency)}</span></div>
                <div className="flex justify-between"><span>Fee (max 0.5% or $2.50):</span><span className="text-red-600">{formatCurrency(Math.max(2.5, parseFloat(wdrAmount) * 0.005), selectedWallet?.currency)}</span></div>
                <div className="flex justify-between font-medium border-t border-amber-200 pt-1 mt-1"><span>Net:</span><span>{formatCurrency(parseFloat(wdrAmount) - Math.max(2.5, parseFloat(wdrAmount) * 0.005), selectedWallet?.currency)}</span></div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)}>Cancel</Button>
            <Button onClick={handleWithdraw} disabled={!wdrAmount || wdrSubmitting}>{wdrSubmitting ? 'Processing...' : 'Withdraw'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Currency Conversion Dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle><ArrowLeftRight className="h-4 w-4 inline mr-2 text-amber-500" />Convert Currency</DialogTitle><DialogDescription>Convert between your multi-currency wallets</DialogDescription></DialogHeader>
          {allWallets.length < 2 ? (
            <p className="text-sm text-slate-500 py-4">You need at least 2 wallets in different currencies to convert.</p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2"><Label>From Wallet *</Label>
                <Select value={cvtFromWalletId} onValueChange={setCvtFromWalletId}>
                  <SelectTrigger><SelectValue placeholder="Select source wallet" /></SelectTrigger>
                  <SelectContent>{allWallets.filter(w => w.status === 'active').map(w => (
                    <SelectItem key={w.id} value={w.id}>{CURRENCY_FLAGS[w.currency]} {w.currency} — {formatCurrency(w.availableBalance, w.currency)}</SelectItem>
                  ))}</SelectContent>
                </Select>
              </div>
              <div className="flex justify-center"><ArrowDownRight className="h-5 w-5 text-slate-400 rotate-90" /></div>
              <div className="space-y-2"><Label>To Wallet *</Label>
                <Select value={cvtToWalletId} onValueChange={setCvtToWalletId}>
                  <SelectTrigger><SelectValue placeholder="Select destination wallet" /></SelectTrigger>
                  <SelectContent>{allWallets.filter(w => w.status === 'active' && w.id !== cvtFromWalletId).map(w => (
                    <SelectItem key={w.id} value={w.id}>{CURRENCY_FLAGS[w.currency]} {w.currency} — {formatCurrency(w.balance, w.currency)}</SelectItem>
                  ))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Amount *</Label>
                <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={cvtAmount} onChange={e => setCvtAmount(e.target.value)} />
              </div>
              {conversionPreview && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-xs space-y-1">
                  <p className="font-medium text-emerald-800">Conversion Preview</p>
                  <div className="flex justify-between"><span>Rate:</span><span>1 {allWallets.find(w => w.id === cvtFromWalletId)?.currency} = {conversionPreview.rate} {allWallets.find(w => w.id === cvtToWalletId)?.currency}</span></div>
                  <div className="flex justify-between"><span>Gross:</span><span>{formatCurrency(conversionPreview.gross, allWallets.find(w => w.id === cvtToWalletId)?.currency)}</span></div>
                  <div className="flex justify-between"><span>Fee (0.5%):</span><span className="text-red-600">{formatCurrency(conversionPreview.fee, allWallets.find(w => w.id === cvtToWalletId)?.currency)}</span></div>
                  <div className="flex justify-between font-medium border-t border-emerald-200 pt-1 mt-1"><span>You receive:</span><span className="text-emerald-700">{formatCurrency(conversionPreview.net, allWallets.find(w => w.id === cvtToWalletId)?.currency)}</span></div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(false)}>Cancel</Button>
            <Button onClick={handleConvert} disabled={!cvtFromWalletId || !cvtToWalletId || !cvtAmount || cvtSubmitting}>{cvtSubmitting ? 'Converting...' : 'Convert'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Crypto Withdrawal Dialog */}
      <Dialog open={cryptoOpen} onOpenChange={setCryptoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle><Bitcoin className="h-4 w-4 inline mr-2 text-orange-500" />Withdraw via Crypto</DialogTitle><DialogDescription>Convert wallet balance to cryptocurrency and send to an external wallet</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-md p-3 flex justify-between text-sm">
              <span className="text-slate-500">Available</span>
              <span className="font-semibold text-emerald-700">{formatCurrency(selectedWallet?.availableBalance || 0, selectedWallet?.currency)}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Cryptocurrency *</Label>
                <Select value={crCrypto} onValueChange={setCrCrypto}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['USDT','USDC','BTC','ETH','SOL','BNB'].map(c => (
                    <SelectItem key={c} value={c}>{CRYPTO_ICONS[c]} {c}</SelectItem>
                  ))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Network *</Label>
                <Select value={crNetwork} onValueChange={setCrNetwork}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(rates?.cryptoNetworks?.[crCrypto] || []).map(n => (
                    <SelectItem key={n} value={n}>{NETWORK_LABELS[n] || n}</SelectItem>
                  ))}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Wallet Address *</Label>
              <Input placeholder="0x... or bc1... or T..." value={crAddress} onChange={e => setCrAddress(e.target.value)} className="font-mono text-sm" />
            </div>
            <div className="space-y-2"><Label>Amount ({selectedWallet?.currency || '—'}) *</Label>
              <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={crAmount} onChange={e => setCrAmount(e.target.value)} />
            </div>
            <div className="space-y-2"><Label>Notes (optional)</Label>
              <Input placeholder="Memo, tag, or description" value={crNotes} onChange={e => setCrNotes(e.target.value)} />
            </div>
            {cryptoPreview && (
              <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-xs space-y-1">
                <p className="font-medium text-orange-800">Crypto Withdrawal Preview</p>
                <div className="flex justify-between"><span>Amount:</span><span>{formatCurrency(cryptoPreview.usdAmount, 'USD')}</span></div>
                <div className="flex justify-between"><span>Crypto Price:</span><span>{formatCurrency(cryptoPreview.cryptoPrice, 'USD')} per {crCrypto}</span></div>
                <div className="flex justify-between"><span>{crCrypto} Amount:</span><span>{cryptoPreview.cryptoAmt.toFixed(6)} {crCrypto}</span></div>
                <div className="flex justify-between"><span>Network Fee:</span><span className="text-red-600">{cryptoPreview.netFee} {crCrypto}</span></div>
                <div className="flex justify-between"><span>You Receive:</span><span className="font-medium text-orange-900">{cryptoPreview.netCrypto.toFixed(6)} {crCrypto}</span></div>
                <div className="flex justify-between border-t border-orange-200 pt-1 mt-1"><span>Processing Fee (1% min $1):</span><span className="text-red-600">{formatCurrency(cryptoPreview.procFee, selectedWallet?.currency)}</span></div>
                <div className="flex justify-between font-medium"><span>Total Debit:</span><span className="text-red-700">{formatCurrency(cryptoPreview.totalDebit, selectedWallet?.currency)}</span></div>
              </div>
            )}
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-xs text-red-700 space-y-1">
              <p className="font-medium">Warning</p>
              <p>Double-check the wallet address and network. Crypto transactions are irreversible. Sending to the wrong network may result in permanent loss of funds.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCryptoOpen(false)}>Cancel</Button>
            <Button onClick={handleCryptoWithdraw} disabled={!crAmount || !crAddress || crSubmitting}>{crSubmitting ? 'Submitting...' : 'Withdraw Crypto'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle>Transaction History</DialogTitle><DialogDescription>View detailed records for this wallet</DialogDescription></DialogHeader>
          <Tabs value={historyTab} onValueChange={(v) => loadHistory(selectedWalletId || '', v)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="transactions">All Transactions</TabsTrigger>
              <TabsTrigger value="deposits">Deposits</TabsTrigger>
              <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
              <TabsTrigger value="crypto">Crypto</TabsTrigger>
            </TabsList>
            <div className="flex-1 overflow-y-auto mt-2">
              <TabsContent value="transactions" className="mt-0">
                <Table><TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Balance</TableHead><TableHead>Date</TableHead></TableRow></TableHeader><TableBody>
                  {txns.map(tx => { const isC = ['credit','transfer_in','refund','deposit'].includes(tx.type); return (
                    <TableRow key={tx.id}><TableCell className="font-mono text-xs">{tx.txRef}</TableCell><TableCell><Badge variant={TX_TYPE_BADGE[tx.type]?.variant || 'secondary'}>{TX_TYPE_BADGE[tx.type]?.label || tx.type}</Badge></TableCell><TableCell className={`text-right ${isC ? 'text-emerald-600' : 'text-red-600'}`}>{isC ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}</TableCell><TableCell>{formatCurrency(tx.balanceAfter, tx.currency)}</TableCell><TableCell className="text-xs text-slate-500">{formatDate(tx.createdAt)}</TableCell></TableRow>
                  )})}
                </TableBody></Table>
              </TabsContent>
              <TabsContent value="deposits" className="mt-0">
                <Table><TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader><TableBody>
                  {deposits.map(d => (
                    <TableRow key={d.id}><TableCell className="font-mono text-xs">{d.depositRef}</TableCell><TableCell>{d.paymentMethod}{d.provider ? ` (${d.provider})` : ''}</TableCell><TableCell className="text-right text-emerald-600">+{formatCurrency(d.amount, d.currency)}</TableCell><TableCell><Badge variant={d.status === 'completed' ? 'default' : 'secondary'}>{d.status}</Badge></TableCell><TableCell className="text-xs text-slate-500">{formatDate(d.createdAt)}</TableCell></TableRow>
                  ))}
                </TableBody></Table>
              </TabsContent>
              <TabsContent value="withdrawals" className="mt-0">
                <Table><TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Details</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Fee</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader><TableBody>
                  {withdrawals.map(w => (
                    <TableRow key={w.id}><TableCell className="font-mono text-xs">{w.withdrawalRef}</TableCell><TableCell className="text-xs max-w-[150px] truncate">{w.bankName || w.recipientName || w.paymentMethod}</TableCell><TableCell className="text-right text-red-600">-{formatCurrency(w.amount, w.currency)}</TableCell><TableCell className="text-right text-red-400">{formatCurrency(w.feeAmount, w.currency)}</TableCell><TableCell><Badge variant={w.status === 'completed' ? 'default' : 'secondary'}>{w.status}</Badge></TableCell><TableCell className="text-xs text-slate-500">{formatDate(w.createdAt)}</TableCell></TableRow>
                  ))}
                </TableBody></Table>
              </TabsContent>
              <TabsContent value="crypto" className="mt-0">
                <Table><TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Crypto</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Crypto</TableHead><TableHead>Network</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
                  {cryptoWdrs.map(c => (
                    <TableRow key={c.id}><TableCell className="font-mono text-xs">{c.withdrawalRef}</TableCell><TableCell>{CRYPTO_ICONS[c.cryptoCurrency] || ''} {c.cryptoCurrency}</TableCell><TableCell className="text-right text-red-600">-{formatCurrency(c.amount, c.currency)}</TableCell><TableCell className="text-right">{c.cryptoAmount?.toFixed(6) || '—'}</TableCell><TableCell><Badge variant="outline" className="text-[10px]">{c.network}</Badge></TableCell><TableCell><Badge variant={c.status === 'completed' ? 'default' : 'secondary'}>{c.status}</Badge></TableCell></TableRow>
                  ))}
                </TableBody></Table>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Toast message={toastMsg} visible={toastVis} />
    </motion.div>
  )
}
