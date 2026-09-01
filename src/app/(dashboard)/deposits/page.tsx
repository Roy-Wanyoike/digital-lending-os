'use client';

import { useState } from 'react';
import { ArrowDownLeft, Plus, RefreshCw } from 'lucide-react';
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

interface Deposit {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  depositRef?: string;
  notes?: string | null;
  createdAt: string;
  wallet?: { id: string; currency: string } | null;
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const variant = s === 'completed' ? 'default' as const : s === 'failed' ? 'destructive' as const : 'secondary' as const;
  return <Badge variant={variant}>{status}</Badge>;
}

function PaymentMethodLabel(method: string) {
  const labels: Record<string, string> = {
    bank_transfer: 'Bank Transfer',
    mobile_money: 'Mobile Money',
    card: 'Debit/Credit Card',
    manual: 'Manual',
    external: 'External',
    crypto: 'Cryptocurrency',
    payment_link: 'Payment Link',
  };
  return labels[method] || method.replace(/_/g, ' ');
}

export default function DepositsPage() {
  const [page, setPage] = useState(1);
  const { data: response, loading, error, refetch: refetchDeposits } = useApi<{ data: Deposit[]; meta?: { page: number; limit: number; total: number; pages: number } }>(`/api/deposits?page=${page}&limit=20`);
  const { data: wallets, refetch: refetchWallets } = useApi<Array<{ id: string; currency: string }>>('/api/wallets');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ walletId: '', amount: '', method: 'manual', description: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  const deposits = response?.data || (Array.isArray(response) ? response : []);
  const pagination = response?.meta;
  const walletOptions = Array.isArray(wallets) ? wallets : [];

  async function handleCreate() {
    const errors: Record<string, string> = {};
    if (!form.walletId) errors.walletId = 'Please select a wallet';
    if (!form.amount || parseFloat(form.amount) <= 0) errors.amount = 'Enter a valid amount greater than 0';
    if (parseFloat(form.amount) > 10_000_000) errors.amount = 'Amount exceeds maximum of 10,000,000';
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setCreating(true);
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId: form.walletId, amount: parseFloat(form.amount), paymentMethod: form.method, notes: form.description }),
      });
      if (!res.ok) {
        const d = await res.json();
        const msg = d.error?.message || d.error || 'Failed to create deposit';
        throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
      toast.success('Deposit created successfully');
      setShowCreate(false);
      setForm({ walletId: '', amount: '', method: 'manual', description: '' });
      setFormErrors({});
      invalidateCache('/api/deposits');
      invalidateCache('/api/wallets');
      invalidateCache('/api/dashboard/stats');
      refetchDeposits();
      refetchWallets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create deposit');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deposits</h1>
          <p className="text-muted-foreground mt-1">Add funds to your wallets</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => { invalidateCache('/api/deposits'); refetchDeposits(); }}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Deposit
          </Button>
        </div>
      </div>

      {showCreate && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-4">New Deposit</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="walletId">Wallet *</Label>
                <Select value={form.walletId} onValueChange={(v) => setForm({ ...form, walletId: v })}>
                  <SelectTrigger id="walletId"><SelectValue placeholder="Select wallet" /></SelectTrigger>
                  <SelectContent>
                    {walletOptions.map(w => (
                      <SelectItem key={w.id} value={w.id}>{CURRENCY_FLAGS[w.currency] || '💰'} {w.currency} Wallet</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.walletId && <p className="text-xs text-destructive">{formErrors.walletId}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="depAmount">Amount *</Label>
                <Input id="depAmount" type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                {formErrors.amount && <p className="text-xs text-destructive">{formErrors.amount}</p>}
              </div>
              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money (M-Pesa)</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input placeholder="Reference or notes" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create Deposit'}</Button>
              <Button variant="outline" onClick={() => { setShowCreate(false); setFormErrors({}); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card><CardContent className="p-8"><div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-4 bg-muted rounded w-1/3 animate-pulse" />)}</div></CardContent></Card>
      ) : error ? (
        <Card className="border-destructive"><CardContent className="p-6 text-destructive">{error}</CardContent></Card>
      ) : deposits.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ArrowDownLeft className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No deposits yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Create a deposit to add funds to your wallet</p>
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
                    <TableHead>Wallet</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits.map((d) => (
                    <TableRow key={d.id} className="even:bg-muted/30">
                      <TableCell className="font-mono text-xs">{d.depositRef?.slice(0, 16) || d.id.slice(0, 8)}</TableCell>
                      <TableCell>{CURRENCY_FLAGS[d.wallet?.currency || d.currency] || ''} {d.wallet?.currency || d.currency}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">+{formatCurrency(d.amount, d.currency)}</TableCell>
                      <TableCell className="text-muted-foreground">{PaymentMethodLabel(d.paymentMethod)}</TableCell>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
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
