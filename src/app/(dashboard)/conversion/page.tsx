'use client';

import { useState, useCallback } from 'react';
import { ArrowLeftRight, RefreshCw, Info, Loader2 } from 'lucide-react';
import { useApi, invalidateCache } from '@/hooks/use-api';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDate, CURRENCY_FLAGS } from '@/backend/lib/dashboard-helpers';

interface Wallet {
  id: string;
  currency: string;
  balance: number;
  availableBalance?: number;
  label?: string | null;
}

interface ConversionResult {
  from: { walletId: string; currency: string; amount: number };
  to: { walletId: string; currency: string; amount: number };
  rate: number;
  fee: number;
  convertedAmount: number;
  finalAmount: number;
}

interface ConversionRecord {
  id: string;
  conversionRef: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  feeAmount: number;
  netAmount: number;
  status: string;
  createdAt: string;
}

export default function ConversionPage() {
  const { data: wallets, loading, error, refetch: refetchWallets } = useApi<Wallet[]>('/api/wallets');
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState<ConversionResult | null>(null);
  const [converting, setConverting] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [conversions, setConversions] = useState<ConversionRecord[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const safeWallets = Array.isArray(wallets) ? wallets : [];
  const fromWallet = safeWallets.find(w => w.id === fromWalletId);
  const toWallet = safeWallets.find(w => w.id === toWalletId);

  async function getQuote() {
    const errors: Record<string, string> = {};
    if (!fromWalletId) errors.fromWalletId = 'Select a source wallet';
    if (!toWalletId) errors.toWalletId = 'Select a target wallet';
    if (!amount || parseFloat(amount) <= 0) errors.amount = 'Enter a valid amount';
    if (fromWalletId && toWalletId && fromWalletId === toWalletId) errors.toWalletId = 'Must differ from source';
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setQuoteLoading(true);
      setQuote(null);
      const res = await fetch('/api/wallets/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromWalletId, toWalletId, fromAmount: parseFloat(amount) }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(typeof d.error === 'string' ? d.error : d.error?.message || 'Failed to get quote');
      }
      const json = await res.json();
      // The convert endpoint returns { data: conversionRecord }
      const data = json.data || json;
      setQuote({
        from: { walletId: fromWalletId, currency: fromWallet!.currency, amount: parseFloat(amount) },
        to: { walletId: toWalletId, currency: toWallet!.currency, amount: data.netAmount || data.toAmount },
        rate: data.exchangeRate || 0,
        fee: data.feeAmount || 0,
        convertedAmount: data.toAmount || 0,
        finalAmount: data.netAmount || 0,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to get quote');
    } finally {
      setQuoteLoading(false);
    }
  }

  function openConfirm() {
    if (!quote) return;
    setConfirmOpen(true);
  }

  async function executeConversion() {
    if (!fromWalletId || !toWalletId || !amount || !quote) return;
    try {
      setConverting(true);
      const res = await fetch('/api/wallets/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromWalletId, toWalletId, fromAmount: parseFloat(amount) }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(typeof d.error === 'string' ? d.error : d.error?.message || 'Conversion failed');
      }
      setConfirmOpen(false);
      setQuote(null);
      setAmount('');
      toast.success('Conversion completed successfully!');
      invalidateCache('/api/wallets');
      refetchWallets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setConverting(false);
    }
  }

  const loadHistory = useCallback(async () => {
    // Find any wallet to load conversions for
    if (safeWallets.length === 0) return;
    setHistoryLoading(true);
    setHistoryOpen(true);
    try {
      // Load conversions across all wallets
      const results = await Promise.allSettled(
        safeWallets.slice(0, 5).map(w =>
          fetch(`/api/wallets/convert?walletId=${w.id}&limit=10`).then(r => r.json())
        )
      );
      const all: ConversionRecord[] = [];
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value?.data) {
          all.push(...r.value.data);
        }
      }
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setConversions(all.slice(0, 50));
    } catch {
      toast.error('Failed to load conversion history');
    } finally {
      setHistoryLoading(false);
    }
  }, [safeWallets]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Currency Conversion</h1>
          <p className="text-muted-foreground mt-1">Convert between currencies at market rates</p>
        </div>
        <div className="flex gap-3">
          {safeWallets.length > 0 && (
            <Button variant="outline" size="sm" onClick={loadHistory}>
              <ArrowLeftRight className="h-4 w-4 mr-1" /> History
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { invalidateCache('/api/wallets'); refetchWallets(); }}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="p-8"><div className="h-64 bg-muted rounded animate-pulse" /></CardContent></Card>
      ) : error ? (
        <Card className="border-destructive"><CardContent className="p-6 text-destructive">{error}</CardContent></Card>
      ) : safeWallets.length < 2 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ArrowLeftRight className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">You need at least 2 wallets with different currencies to convert</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversion Form */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-6">Convert Currency</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fromWallet">From *</Label>
                  <Select value={fromWalletId} onValueChange={(v) => { setFromWalletId(v); setQuote(null); setFormErrors({}); }}>
                    <SelectTrigger id="fromWallet"><SelectValue placeholder="Select source wallet" /></SelectTrigger>
                    <SelectContent>
                      {safeWallets.map(w => (
                        <SelectItem key={w.id} value={w.id}>{CURRENCY_FLAGS[w.currency] || '💰'} {w.currency} — {formatCurrency(w.balance, w.currency)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.fromWalletId && <p className="text-xs text-destructive">{formErrors.fromWalletId}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input id="amount" type="number" min="0.01" step="0.01" placeholder="Enter amount" value={amount} onChange={(e) => { setAmount(e.target.value); setQuote(null); }} />
                  {formErrors.amount && <p className="text-xs text-destructive">{formErrors.amount}</p>}
                  {fromWallet && (
                    <p className="text-xs text-muted-foreground">Available: {formatCurrency(fromWallet.balance, fromWallet.currency)}</p>
                  )}
                </div>
                <div className="flex justify-center">
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={() => { const tmp = fromWalletId; setFromWalletId(toWalletId); setToWalletId(tmp); setQuote(null); }} aria-label="Swap currencies">
                    <ArrowLeftRight className="h-5 w-5" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>To *</Label>
                  <Select value={toWalletId} onValueChange={(v) => { setToWalletId(v); setQuote(null); setFormErrors({}); }}>
                    <SelectTrigger><SelectValue placeholder="Select target wallet" /></SelectTrigger>
                    <SelectContent>
                      {safeWallets.filter(w => w.id !== fromWalletId).map(w => (
                        <SelectItem key={w.id} value={w.id}>{CURRENCY_FLAGS[w.currency] || '💰'} {w.currency} — {formatCurrency(w.balance, w.currency)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.toWalletId && <p className="text-xs text-destructive">{formErrors.toWalletId}</p>}
                </div>
                <Button onClick={getQuote} disabled={quoteLoading} className="w-full">
                  {quoteLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Getting Quote...</> : 'Get Quote'}
                </Button>
              </div>

              {quote && (
                <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <h3 className="font-medium text-emerald-900 dark:text-emerald-200 mb-3">Conversion Quote</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-emerald-700 dark:text-emerald-300">You send:</span><span className="font-medium">{formatCurrency(quote.from.amount, quote.from.currency)}</span></div>
                    <div className="flex justify-between"><span className="text-emerald-700 dark:text-emerald-300">Exchange rate:</span><span className="font-medium">{quote.rate}</span></div>
                    <div className="flex justify-between"><span className="text-emerald-700 dark:text-emerald-300">Gross:</span><span className="font-medium">{formatCurrency(quote.convertedAmount, quote.to.currency)}</span></div>
                    <div className="flex justify-between"><span className="text-emerald-700 dark:text-emerald-300">Fee (0.5%):</span><span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(quote.fee, quote.to.currency)}</span></div>
                    <div className="flex justify-between border-t border-emerald-200 dark:border-emerald-800 pt-2"><span className="text-emerald-900 dark:text-emerald-100 font-semibold">You receive:</span><span className="font-bold text-emerald-900 dark:text-emerald-100">{formatCurrency(quote.finalAmount, quote.to.currency)}</span></div>
                  </div>
                  <Button onClick={openConfirm} className="w-full mt-4">Execute Conversion</Button>
                </div>
              )}

              <div className="mt-4 p-3 bg-muted rounded-lg flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>Exchange rates are indicative. A 0.5% conversion fee applies. Rates update periodically.</p>
              </div>
            </CardContent>
          </Card>

          {/* Supported Currencies */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Your Wallets</h2>
              <div className="grid grid-cols-2 gap-3">
                {safeWallets.map(w => (
                  <div key={w.id} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{CURRENCY_FLAGS[w.currency] || '💰'}</span>
                      <span className="font-medium">{w.currency}</span>
                      {w.label && <Badge variant="outline" className="text-[10px]">{w.label}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{formatCurrency(w.balance, w.currency)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Conversion</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {quote && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">You send:</span><span className="font-medium">{formatCurrency(quote.from.amount, quote.from.currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">You receive:</span><span className="font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(quote.finalAmount, quote.to.currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fee:</span><span>{formatCurrency(quote.fee, quote.to.currency)}</span></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={executeConversion} disabled={converting}>{converting ? 'Converting...' : 'Confirm'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle>Conversion History</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {historyLoading ? (
              <div className="space-y-3 py-4">{[1,2,3].map(i => <div key={i} className="h-4 bg-muted rounded animate-pulse" />)}</div>
            ) : conversions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No conversions yet</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>From</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>To</TableHead><TableHead className="text-right">Received</TableHead><TableHead>Rate</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {conversions.map(c => (
                    <TableRow key={c.id} className="even:bg-muted/30">
                      <TableCell className="font-mono text-xs">{c.conversionRef?.slice(0, 12) || '—'}</TableCell>
                      <TableCell>{CURRENCY_FLAGS[c.fromCurrency] || ''} {c.fromCurrency}</TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400">-{formatCurrency(c.fromAmount, c.fromCurrency)}</TableCell>
                      <TableCell>{CURRENCY_FLAGS[c.toCurrency] || ''} {c.toCurrency}</TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400">+{formatCurrency(c.netAmount, c.toCurrency)}</TableCell>
                      <TableCell className="text-xs">{c.exchangeRate}</TableCell>
                      <TableCell><Badge variant={c.status === 'completed' ? 'default' : 'secondary'}>{c.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
