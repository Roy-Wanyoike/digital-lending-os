'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Wallet as WalletIcon, Plus, RefreshCw, Download, Upload, ArrowLeftRight, Bitcoin,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { useApi } from '@/hooks/use-api'
import {
  formatCurrency, CURRENCY_FLAGS, formatDate,
  KPICard, LoadingSkeleton, ErrorState, type Business, type WalletData,
} from '@/lib/dashboard-helpers'
import {
  CreateWalletDialog, DepositDialog, WithdrawDialog, ConvertDialog,
  CryptoWithdrawalDialog, WalletHistoryDialog,
  type WalletTransaction, type DepositRecord, type WithdrawalRecord,
  type CryptoWithdrawalRecord, type RatesData,
} from './wallet-dialogs'

// ─── Types (dialog-scoped types imported from wallet-dialogs) ──────

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

// TX_TYPE_BADGE stays here — used by the main transaction table and passed to HistoryDialog

// ─── Component ──────────────────────────────────────────────────

export function WalletTab() {
  const { data: businesses, loading: bLoading, error: bizError, refetch } = useApi<Business[]>('/api/businesses?limit=50')
  const { data: rates, error: ratesError } = useApi<RatesData>('/api/wallets/rates')
  const [selectedBizId, setSelectedBizId] = useState<string>('')
  const safeBusinesses = Array.isArray(businesses) ? businesses : []
  const bizId = selectedBizId || safeBusinesses?.[0]?.id || ''
  const [walletKey, setWalletKey] = useState(0)
  const { data: wallets, loading: wLoading, error: walletsError } = useApi<WalletData[]>(bizId ? `/api/wallets?businessId=${bizId}&k=${walletKey}` : '')
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

  const showToast = useCallback((msg: string) => { toast(msg) }, [])

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
    } catch {
      showToast('Failed to load history')
    }
  }, [showToast])

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
        body: JSON.stringify({ businessId: bizId, currency: newCurrency }),
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
      if (selectedWalletId) loadTransactions(selectedWalletId)
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
  if (bizError || ratesError || walletsError) return <ErrorState message={bizError || ratesError || walletsError || ''} onRetry={refetch} />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Business selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Business:</span>
          <Select value={selectedBizId || businesses?.[0]?.id} onValueChange={setSelectedBizId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select business" /></SelectTrigger>
            <SelectContent>{safeBusinesses.map(b => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Wallet</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 to-white dark:to-gray-900">
          <CardContent className="p-4 sm:p-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">Portfolio (USD)</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(totalPortfolio)}</p>
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
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between"><span>Available</span><span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(w.availableBalance, w.currency)}</span></div>
                <div className="flex justify-between"><span>Pending</span><span className="text-amber-600 dark:text-amber-400 font-medium">{formatCurrency(w.pendingBalance, w.currency)}</span></div>
                <div className="flex justify-between"><span>Frozen</span><span className="text-red-600 dark:text-red-400 font-medium">{formatCurrency(w.frozenBalance, w.currency)}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {allWallets.length === 0 && bizId && !wLoading && (
        <Card className="border-dashed"><CardContent className="p-12 text-center"><p className="text-muted-foreground">No wallets for this business.</p></CardContent></Card>
      )}

      {/* Action Buttons + Transaction History */}
      {selectedWalletId && selectedWallet && (
          <div className="animate-fade-in">
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
                      {txLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>}
                      {!txLoading && txns.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transactions yet</TableCell></TableRow>}
                      {txns.map(tx => {
                        const badge = TX_TYPE_BADGE[tx.type] || { label: tx.type, variant: 'secondary' as const }
                        const isCredit = tx.type === 'credit' || tx.type === 'transfer_in' || tx.type === 'refund' || tx.type === 'deposit'
                        return (
                          <TableRow key={tx.id} className="even:bg-muted/50">
                            <TableCell className="font-mono text-xs">{tx.txRef}</TableCell>
                            <TableCell><Badge variant={badge.variant}>{badge.label}</Badge></TableCell>
                            <TableCell className="max-w-[200px] truncate text-xs">{tx.description || tx.referenceType || '—'}</TableCell>
                            <TableCell className={`text-right font-medium ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{isCredit ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(tx.balanceAfter, tx.currency)}</TableCell>
                            <TableCell><Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>{tx.status}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      {/* ═══ DIALOGS ═══ */}

      <CreateWalletDialog
        open={createOpen} onOpenChange={setCreateOpen}
        newCurrency={newCurrency} setNewCurrency={setNewCurrency}
        creating={creating} onCreate={handleCreateWallet}
      />

      <DepositDialog
        open={depositOpen} onOpenChange={setDepositOpen}
        selectedWallet={selectedWallet}
        depAmount={depAmount} setDepAmount={setDepAmount}
        depMethod={depMethod} setDepMethod={setDepMethod}
        depNotes={depNotes} setDepNotes={setDepNotes}
        depSubmitting={depSubmitting} onDeposit={handleDeposit}
      />

      <WithdrawDialog
        open={withdrawOpen} onOpenChange={setWithdrawOpen}
        selectedWallet={selectedWallet}
        wdrAmount={wdrAmount} setWdrAmount={setWdrAmount}
        wdrMethod={wdrMethod} setWdrMethod={setWdrMethod}
        wdrBankName={wdrBankName} setWdrBankName={setWdrBankName}
        wdrBankAccount={wdrBankAccount} setWdrBankAccount={setWdrBankAccount}
        wdrRecipientName={wdrRecipientName} setWdrRecipientName={setWdrRecipientName}
        wdrNotes={wdrNotes} setWdrNotes={setWdrNotes}
        wdrSubmitting={wdrSubmitting} onWithdraw={handleWithdraw}
      />

      <ConvertDialog
        open={convertOpen} onOpenChange={setConvertOpen}
        allWallets={allWallets}
        cvtFromWalletId={cvtFromWalletId} setCvtFromWalletId={setCvtFromWalletId}
        cvtToWalletId={cvtToWalletId} setCvtToWalletId={setCvtToWalletId}
        cvtAmount={cvtAmount} setCvtAmount={setCvtAmount}
        cvtSubmitting={cvtSubmitting} onConvert={handleConvert}
        conversionPreview={conversionPreview}
      />

      <CryptoWithdrawalDialog
        open={cryptoOpen} onOpenChange={setCryptoOpen}
        selectedWallet={selectedWallet} rates={rates ?? undefined}
        crCrypto={crCrypto} setCrCrypto={setCrCrypto}
        crNetwork={crNetwork} setCrNetwork={setCrNetwork}
        crAddress={crAddress} setCrAddress={setCrAddress}
        crAmount={crAmount} setCrAmount={setCrAmount}
        crNotes={crNotes} setCrNotes={setCrNotes}
        crSubmitting={crSubmitting} onCryptoWithdraw={handleCryptoWithdraw}
        cryptoPreview={cryptoPreview}
      />

      <WalletHistoryDialog
        open={historyOpen} onOpenChange={setHistoryOpen}
        historyTab={historyTab} onLoadHistory={loadHistory}
        selectedWalletId={selectedWalletId || ''}
        txns={txns} deposits={deposits} withdrawals={withdrawals} cryptoWdrs={cryptoWdrs}
        txTypeBadge={TX_TYPE_BADGE}
      />


    </div>
  )
}
