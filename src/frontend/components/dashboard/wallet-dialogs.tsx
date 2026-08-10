'use client'

import {
  Download, Upload, ArrowLeftRight, Bitcoin, Info, ArrowDownRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, CURRENCY_FLAGS, formatDate, type WalletData } from '@/lib/dashboard-helpers'

// ─── Types (dialog-scoped) ──────────────────────────────────────

export interface WalletTransaction {
  id: string; txRef: string; type: string; amount: number;
  balanceBefore: number; balanceAfter: number; currency: string;
  description?: string | null; referenceType?: string | null;
  status: string; createdAt: string
}

export interface DepositRecord {
  id: string; depositRef: string; walletId: string; amount: number;
  currency: string; paymentMethod: string; provider?: string | null;
  bankName?: string | null; bankRef?: string | null; cardLast4?: string | null;
  notes?: string | null; status: string; completedAt?: string | null; createdAt: string
}

export interface WithdrawalRecord {
  id: string; withdrawalRef: string; walletId: string; amount: number;
  currency: string; paymentMethod: string; provider?: string | null;
  bankName?: string | null; bankAccount?: string | null; recipientName?: string | null;
  feeAmount: number; netAmount?: number | null;
  notes?: string | null; status: string; completedAt?: string | null; createdAt: string
}

export interface CryptoWithdrawalRecord {
  id: string; withdrawalRef: string; walletId: string; amount: number;
  cryptoAmount?: number | null; currency: string; cryptoCurrency: string;
  network: string; walletAddress: string; status: string;
  exchangeRate?: number | null; networkFee: number; processingFee: number;
  txHash?: string | null; explorerUrl?: string | null;
  notes?: string | null; completedAt?: string | null; createdAt: string
}

export interface RatesData {
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

// ─── Constants (dialog-scoped) ──────────────────────────────────

export const CRYPTO_ICONS: Record<string, string> = {
  USDT: '💲', USDC: '💎', BTC: '₿', ETH: 'Ξ', SOL: '◎', BNB: '🔶',
}

export const NETWORK_LABELS: Record<string, string> = {
  trc20: 'TRC-20 (Tron)', erc20: 'ERC-20 (Ethereum)', bsc: 'BEP-20 (BSC)',
  solana: 'Solana', bitcoin: 'Bitcoin', bep2: 'BEP-2 (BNB)',
}

export type TxTypeBadgeMap = Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }>

// ─── 1. Create Wallet Dialog ────────────────────────────────────

export function CreateWalletDialog({
  open, onOpenChange, newCurrency, setNewCurrency, creating, onCreate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  newCurrency: string
  setNewCurrency: (v: string) => void
  creating: boolean
  onCreate: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onCreate} disabled={creating}>{creating ? 'Creating...' : 'Create Wallet'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── 2. Deposit Dialog ──────────────────────────────────────────

export function DepositDialog({
  open, onOpenChange, selectedWallet, depAmount, setDepAmount,
  depMethod, setDepMethod, depNotes, setDepNotes, depSubmitting, onDeposit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  selectedWallet: WalletData | undefined
  depAmount: string
  setDepAmount: (v: string) => void
  depMethod: string
  setDepMethod: (v: string) => void
  depNotes: string
  setDepNotes: (v: string) => void
  depSubmitting: boolean
  onDeposit: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <div className="bg-muted rounded-md p-3 text-xs text-muted-foreground space-y-1">
            <p><Info className="h-3 w-3 inline mr-1" />Deposits via <b>demo provider</b> complete instantly. In production, bank transfers take 1–3 business days, cards are instant.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onDeposit} disabled={!depAmount || depSubmitting}>{depSubmitting ? 'Processing...' : 'Deposit'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── 3. Withdraw Dialog ─────────────────────────────────────────

export function WithdrawDialog({
  open, onOpenChange, selectedWallet, wdrAmount, setWdrAmount,
  wdrMethod, setWdrMethod, wdrBankName, setWdrBankName,
  wdrBankAccount, setWdrBankAccount, wdrRecipientName, setWdrRecipientName,
  wdrNotes, setWdrNotes, wdrSubmitting, onWithdraw,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  selectedWallet: WalletData | undefined
  wdrAmount: string
  setWdrAmount: (v: string) => void
  wdrMethod: string
  setWdrMethod: (v: string) => void
  wdrBankName: string
  setWdrBankName: (v: string) => void
  wdrBankAccount: string
  setWdrBankAccount: (v: string) => void
  wdrRecipientName: string
  setWdrRecipientName: (v: string) => void
  wdrNotes: string
  setWdrNotes: (v: string) => void
  wdrSubmitting: boolean
  onWithdraw: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle><Upload className="h-4 w-4 inline mr-2 text-red-500" />Withdraw Funds</DialogTitle><DialogDescription>Withdraw from your {selectedWallet?.currency} wallet</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted rounded-md p-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Available</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">{formatCurrency(selectedWallet?.availableBalance || 0, selectedWallet?.currency)}</span>
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
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-xs space-y-1">
              <p className="font-medium text-amber-800 dark:text-amber-200">Fee Estimate</p>
              <div className="flex justify-between"><span>Amount:</span><span>{formatCurrency(parseFloat(wdrAmount), selectedWallet?.currency)}</span></div>
              <div className="flex justify-between"><span>Fee (max 0.5% or $2.50):</span><span className="text-red-600 dark:text-red-400">{formatCurrency(Math.max(2.5, parseFloat(wdrAmount) * 0.005), selectedWallet?.currency)}</span></div>
              <div className="flex justify-between font-medium border-t border-amber-200 dark:border-amber-800 pt-1 mt-1"><span>Net:</span><span>{formatCurrency(parseFloat(wdrAmount) - Math.max(2.5, parseFloat(wdrAmount) * 0.005), selectedWallet?.currency)}</span></div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onWithdraw} disabled={!wdrAmount || wdrSubmitting}>{wdrSubmitting ? 'Processing...' : 'Withdraw'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── 4. Convert Dialog ──────────────────────────────────────────

export function ConvertDialog({
  open, onOpenChange, allWallets, cvtFromWalletId, setCvtFromWalletId,
  cvtToWalletId, setCvtToWalletId, cvtAmount, setCvtAmount,
  cvtSubmitting, onConvert, conversionPreview,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  allWallets: WalletData[]
  cvtFromWalletId: string
  setCvtFromWalletId: (v: string) => void
  cvtToWalletId: string
  setCvtToWalletId: (v: string) => void
  cvtAmount: string
  setCvtAmount: (v: string) => void
  cvtSubmitting: boolean
  onConvert: () => void
  conversionPreview: { rate: number; gross: number; fee: number; net: number } | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle><ArrowLeftRight className="h-4 w-4 inline mr-2 text-amber-500" />Convert Currency</DialogTitle><DialogDescription>Convert between your multi-currency wallets</DialogDescription></DialogHeader>
        {allWallets.length < 2 ? (
          <p className="text-sm text-muted-foreground py-4">You need at least 2 wallets in different currencies to convert.</p>
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
            <div className="flex justify-center"><ArrowDownRight className="h-5 w-5 text-muted-foreground rotate-90" /></div>
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
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-md p-3 text-xs space-y-1">
                <p className="font-medium text-emerald-800 dark:text-emerald-200">Conversion Preview</p>
                <div className="flex justify-between"><span>Rate:</span><span>1 {allWallets.find(w => w.id === cvtFromWalletId)?.currency} = {conversionPreview.rate} {allWallets.find(w => w.id === cvtToWalletId)?.currency}</span></div>
                <div className="flex justify-between"><span>Gross:</span><span>{formatCurrency(conversionPreview.gross, allWallets.find(w => w.id === cvtToWalletId)?.currency)}</span></div>
                <div className="flex justify-between"><span>Fee (0.5%):</span><span className="text-red-600 dark:text-red-400">{formatCurrency(conversionPreview.fee, allWallets.find(w => w.id === cvtToWalletId)?.currency)}</span></div>
                <div className="flex justify-between font-medium border-t border-emerald-200 dark:border-emerald-800 pt-1 mt-1"><span>You receive:</span><span className="text-emerald-700 dark:text-emerald-300">{formatCurrency(conversionPreview.net, allWallets.find(w => w.id === cvtToWalletId)?.currency)}</span></div>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onConvert} disabled={!cvtFromWalletId || !cvtToWalletId || !cvtAmount || cvtSubmitting}>{cvtSubmitting ? 'Converting...' : 'Convert'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── 5. Crypto Withdrawal Dialog ────────────────────────────────

export function CryptoWithdrawalDialog({
  open, onOpenChange, selectedWallet, rates, crCrypto, setCrCrypto,
  crNetwork, setCrNetwork, crAddress, setCrAddress, crAmount, setCrAmount,
  crNotes, setCrNotes, crSubmitting, onCryptoWithdraw, cryptoPreview,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  selectedWallet: WalletData | undefined
  rates: RatesData | undefined
  crCrypto: string
  setCrCrypto: (v: string) => void
  crNetwork: string
  setCrNetwork: (v: string) => void
  crAddress: string
  setCrAddress: (v: string) => void
  crAmount: string
  setCrAmount: (v: string) => void
  crNotes: string
  setCrNotes: (v: string) => void
  crSubmitting: boolean
  onCryptoWithdraw: () => void
  cryptoPreview: { usdAmount: number; cryptoAmt: number; netCrypto: number; netFee: number; procFee: number; totalDebit: number; cryptoPrice: number } | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle><Bitcoin className="h-4 w-4 inline mr-2 text-orange-500" />Withdraw via Crypto</DialogTitle><DialogDescription>Convert wallet balance to cryptocurrency and send to an external wallet</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted rounded-md p-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Available</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">{formatCurrency(selectedWallet?.availableBalance || 0, selectedWallet?.currency)}</span>
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
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-md p-3 text-xs space-y-1">
              <p className="font-medium text-orange-800 dark:text-orange-200">Crypto Withdrawal Preview</p>
              <div className="flex justify-between"><span>Amount:</span><span>{formatCurrency(cryptoPreview.usdAmount, 'USD')}</span></div>
              <div className="flex justify-between"><span>Crypto Price:</span><span>{formatCurrency(cryptoPreview.cryptoPrice, 'USD')} per {crCrypto}</span></div>
              <div className="flex justify-between"><span>{crCrypto} Amount:</span><span>{cryptoPreview.cryptoAmt.toFixed(6)} {crCrypto}</span></div>
              <div className="flex justify-between"><span>Network Fee:</span><span className="text-red-600 dark:text-red-400">{cryptoPreview.netFee} {crCrypto}</span></div>
              <div className="flex justify-between"><span>You Receive:</span><span className="font-medium text-orange-900 dark:text-orange-100">{cryptoPreview.netCrypto.toFixed(6)} {crCrypto}</span></div>
              <div className="flex justify-between border-t border-orange-200 dark:border-orange-800 pt-1 mt-1"><span>Processing Fee (1% min $1):</span><span className="text-red-600 dark:text-red-400">{formatCurrency(cryptoPreview.procFee, selectedWallet?.currency)}</span></div>
              <div className="flex justify-between font-medium"><span>Total Debit:</span><span className="text-red-700 dark:text-red-300">{formatCurrency(cryptoPreview.totalDebit, selectedWallet?.currency)}</span></div>
            </div>
          )}
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-3 text-xs text-red-700 dark:text-red-300 space-y-1">
            <p className="font-medium">Warning</p>
            <p>Double-check the wallet address and network. Crypto transactions are irreversible. Sending to the wrong network may result in permanent loss of funds.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onCryptoWithdraw} disabled={!crAmount || !crAddress || crSubmitting}>{crSubmitting ? 'Submitting...' : 'Withdraw Crypto'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── 6. Wallet History Dialog ───────────────────────────────────

export function WalletHistoryDialog({
  open, onOpenChange, historyTab, onLoadHistory, selectedWalletId,
  txns, deposits, withdrawals, cryptoWdrs, txTypeBadge,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  historyTab: string
  onLoadHistory: (walletId: string, tab: string) => void
  selectedWalletId: string
  txns: WalletTransaction[]
  deposits: DepositRecord[]
  withdrawals: WithdrawalRecord[]
  cryptoWdrs: CryptoWithdrawalRecord[]
  txTypeBadge: TxTypeBadgeMap
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>Transaction History</DialogTitle><DialogDescription>View detailed records for this wallet</DialogDescription></DialogHeader>
        <Tabs value={historyTab} onValueChange={(v) => onLoadHistory(selectedWalletId || '', v)} className="flex-1 flex flex-col min-h-0">
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
                  <TableRow key={tx.id}><TableCell className="font-mono text-xs">{tx.txRef}</TableCell><TableCell><Badge variant={txTypeBadge[tx.type]?.variant || 'secondary'}>{txTypeBadge[tx.type]?.label || tx.type}</Badge></TableCell><TableCell className={`text-right ${isC ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{isC ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}</TableCell><TableCell>{formatCurrency(tx.balanceAfter, tx.currency)}</TableCell><TableCell className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</TableCell></TableRow>
                )})}
                {txns.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No transactions yet</TableCell></TableRow>}
              </TableBody></Table>
            </TabsContent>
            <TabsContent value="deposits" className="mt-0">
              <Table><TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader><TableBody>
                {deposits.map(d => (
                  <TableRow key={d.id}><TableCell className="font-mono text-xs">{d.depositRef}</TableCell><TableCell>{d.paymentMethod}{d.provider ? ` (${d.provider})` : ''}</TableCell><TableCell className="text-right text-emerald-600 dark:text-emerald-400">+{formatCurrency(d.amount, d.currency)}</TableCell><TableCell><Badge variant={d.status === 'completed' ? 'default' : 'secondary'}>{d.status}</Badge></TableCell><TableCell className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</TableCell></TableRow>
                ))}
                {deposits.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No deposits yet</TableCell></TableRow>}
              </TableBody></Table>
            </TabsContent>
            <TabsContent value="withdrawals" className="mt-0">
              <Table><TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Details</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Fee</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader><TableBody>
                {withdrawals.map(w => (
                  <TableRow key={w.id}><TableCell className="font-mono text-xs">{w.withdrawalRef}</TableCell><TableCell className="text-xs max-w-[150px] truncate">{w.bankName || w.recipientName || w.paymentMethod}</TableCell><TableCell className="text-right text-red-600 dark:text-red-400">-{formatCurrency(w.amount, w.currency)}</TableCell><TableCell className="text-right text-red-400 dark:text-red-300">{formatCurrency(w.feeAmount, w.currency)}</TableCell><TableCell><Badge variant={w.status === 'completed' ? 'default' : 'secondary'}>{w.status}</Badge></TableCell><TableCell className="text-xs text-muted-foreground">{formatDate(w.createdAt)}</TableCell></TableRow>
                ))}
                {withdrawals.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No withdrawals yet</TableCell></TableRow>}
              </TableBody></Table>
            </TabsContent>
            <TabsContent value="crypto" className="mt-0">
              <Table><TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Crypto</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Crypto</TableHead><TableHead>Network</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
                {cryptoWdrs.map(c => (
                  <TableRow key={c.id}><TableCell className="font-mono text-xs">{c.withdrawalRef}</TableCell><TableCell>{CRYPTO_ICONS[c.cryptoCurrency] || ''} {c.cryptoCurrency}</TableCell><TableCell className="text-right text-red-600 dark:text-red-400">-{formatCurrency(c.amount, c.currency)}</TableCell><TableCell className="text-right">{c.cryptoAmount?.toFixed(6) || '—'}</TableCell><TableCell><Badge variant="outline" className="text-[10px]">{c.network}</Badge></TableCell><TableCell><Badge variant={c.status === 'completed' ? 'default' : 'secondary'}>{c.status}</Badge></TableCell></TableRow>
                ))}
                {cryptoWdrs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No crypto withdrawals yet</TableCell></TableRow>}
              </TableBody></Table>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
