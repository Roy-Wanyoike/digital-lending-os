'use client';

import { useState } from 'react';
import { ArrowUpRight, Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { useApi, invalidateCache } from '@/hooks/use-api';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDate, CURRENCY_FLAGS } from '@/backend/lib/dashboard-helpers';

interface Withdrawal {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  withdrawalRef?: string;
  destination: string | null;
  notes: string | null;
  failedReason?: string | null;
  createdAt: string;
  wallet?: { id: string; currency: string } | null;
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
  if (s === 'completed') variant = 'default';
  else if (s === 'failed' || s === 'rejected') variant = 'destructive';
  return <Badge variant={variant}>{status}</Badge>;
}

function PaymentMethodLabel(method: string) {
  const labels: Record<string, string> = {
    bank_transfer: 'Bank Transfer',
    mobile_money: 'Mobile Money',
    external: 'External',
    crypto: 'Cryptocurrency',
  };
  return labels[method] || method.replace(/_/g, ' ');
}

export default function WithdrawalsPage() {
  const [page, setPage] = useState(1);
  const { data: response, loading, error, refetch: refetchWithdrawals } = useApi<{ data: Withdrawal[]; meta?: { page: number; limit: number; total: number; pages: number } }>('/api/withdrawals?page=1&limit=20');
  const { data: wallets, refetch: refetchWallets } = useApi<Array<{ id: string; currency: string; balance: number }>>('/api/wallets');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ walletId: '', amount: '', method: 'bank_transfer', destination: '', description: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  const withdrawals = response?.data || (Array.isArray(response) ? response : []);
  const pagination = response?.meta;
  const walletOptions = Array.isArray(wallets) ? wallets : [];
  const selectedWallet = walletOptions.find(w => w.id === form.walletId);

  async function handleCreate() {
    const errors: Record<string, string> = {};
    if (!form.walletId) errors.walletId = 'Please select a wallet';
    if (!form.amount || parseFloat(form.amount) <= 0) errors.amount = 'Enter a valid amount greater than 0';
    if (parseFloat(form.amount) > 10_000_000) errors.amount = 'Amount exceeds maximum of 10,000,000';
    if (form.method === 'crypto' && !form.destination.trim()) errors.destination = 'Wallet address is required for crypto withdrawals';
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setCreating(true);
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: form.walletId, amount: parseFloat(form.amount),
          paymentMethod: form.method, notes: form.description || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        const msg = d.error?.message || d.error || 'Failed to create withdrawal';
        throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
      toast.success('Withdrawal submitted successfully');
      setShowCreate(false);
      setForm({ walletId: '', amount: '', method: 'bank_transfer', destination: '', description: '' });
      setFormErrors({});
      invalidateCache('/api/withdrawals');
      invalidateCache('/api/wallets');
      invalidateCache('/api/dashboard/stats');
      refetchWithdrawals();
      refetchWallets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create withdrawal');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Withdrawals</h1>
          <p className="text-muted-foreground mt-1">Withdraw funds from your wallets</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => { invalidateCache('/api/withdrawals'); refetchWithdrawals(); }}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Withdrawal
          </Button>
        </div>
      </div>

      {showCreate && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-4">New Withdrawal</h3>
            {selectedWallet && (
              <div className="bg-muted rounded-md p-3 flex justify-between text-sm mb-4">
                <span className="text-muted-foreground">Available</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">{formatCurrency(selectedWallet.balance, selectedWallet.currency)}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Wallet *</Label>
                <Select value={form.walletId} onValueChange={(v) => setForm({ ...form, walletId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select wallet" /></SelectTrigger>
                  <SelectContent>
                    {walletOptions.map(w => (
                      <SelectItem key={w.id} value={w.id}>{CURRENCY_FLAGS[w.currency] || '💰'} {w.currency} — {formatCurrency(w.balance, w.currency)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.walletId && <p className="text-xs text-destructive">{formErrors.walletId}</p>}
              </div>
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                {formErrors.amount && <p className="text-xs text-destructive">{formErrors.amount}</p>}
              </div>
              <div className="space-y-2">
                <Label>Method *</Label>
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v, destination: '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money (M-Pesa)</SelectItem>
                    <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{form.method === 'crypto' ? 'Wallet Address' : form.method === 'mobile_money' ? 'Phone Number' : 'Bank Account Number'}</Label>
                <Input placeholder={form.method === 'crypto' ? 'BTC, ETH, USDT address...' : form.method === 'mobile_money' ? 'e.g. 2547...' : 'e.g. ****1234'} value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
                {formErrors.destination && <p className="text-xs text-destructive">{formErrors.destination}</p>}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notes (optional)</Label>
                <Input placeholder="Reference or description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            {form.method === 'crypto' && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md text-sm text-blue-700 dark:text-blue-300">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Crypto withdrawals support BTC, ETH, and USDT. Ensure the destination address is correct.
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <Button onClick={handleCreate} disabled={creating}>{creating ? 'Processing...' : 'Submit Withdrawal'}</Button>
              <Button variant="outline" onClick={() => { setShowCreate(false); setFormErrors({}); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card><CardContent className="p-8"><div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-4 bg-muted rounded w-1/3 animate-pulse" />)}</div></CardContent></Card>
      ) : error ? (
        <Card className="border-destructive"><CardContent className="p-6 text-destructive">{error}</CardContent></Card>
      ) : withdrawals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ArrowUpRight className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No withdrawals yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((w) => (
                    <TableRow key={w.id} className="even:bg-muted/30">
                      <TableCell className="font-mono text-xs">{w.withdrawalRef?.slice(0, 16) || w.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-right font-medium text-red-600 dark:text-red-400">-{formatCurrency(w.amount, w.currency)}</TableCell>
                      <TableCell className="text-muted-foreground">{PaymentMethodLabel(w.paymentMethod)}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{w.destination ? (w.destination.length > 20 ? w.destination.slice(0, 20) + '...' : w.destination) : '—'}</TableCell>
                      <TableCell>
                        <StatusBadge status={w.status} />
                        {w.failedReason && <p className="text-xs text-destructive mt-1">{w.failedReason}</p>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(w.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t">
                <p className="text-xs text-muted-foreground">Page {pagination.page} of {pagination.pages} ({pagination.total} total)</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
