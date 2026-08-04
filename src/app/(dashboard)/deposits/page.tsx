'use client';

import { useState } from 'react';
import { ArrowDownLeft, Plus, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useApi, invalidateCache } from '@/hooks/use-api';

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

export default function DepositsPage() {
  const { data: deposits, loading, error, refetch: refetchDeposits } = useApi<Deposit[]>('/api/deposits');
  const { data: wallets, refetch: refetchWallets } = useApi<Array<{ id: string; currency: string }>>('/api/wallets');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ walletId: '', amount: '', method: 'manual', description: '' });
  const [creating, setCreating] = useState(false);

  // Derive wallet options for the form dropdown
  const walletOptions = wallets
    ? wallets.map((w: any) => ({ id: w.id, currency: w.currency }))
    : [];

  async function handleCreate() {
    if (!form.walletId || !form.amount) { alert('Wallet and amount required'); return; }
    try {
      setCreating(true);
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId: form.walletId, amount: parseFloat(form.amount), paymentMethod: form.method, notes: form.description }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error?.message || d.error || 'Failed'); }
      setShowCreate(false);
      setForm({ walletId: '', amount: '', method: 'manual', description: '' });
      // Invalidate caches so other tabs see updated data
      invalidateCache('/api/deposits');
      invalidateCache('/api/wallets');
      invalidateCache('/api/dashboard/stats');
      refetchDeposits();
      refetchWallets();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    } finally { setCreating(false); }
  }

  const statusIcon = (s: string) => {
    switch (s) {
      case 'COMPLETED': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'PENDING': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'FAILED': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deposits</h1>
          <p className="text-gray-500 mt-1">Add funds to your wallets</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { invalidateCache('/api/deposits'); refetchDeposits(); }} className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Refresh</button>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"><Plus className="h-4 w-4" /> New Deposit</button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-medium text-gray-900 mb-4">New Deposit</h3>
          <div className="grid grid-cols-2 gap-4">
            <select value={form.walletId} onChange={(e) => setForm({ ...form, walletId: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Select Wallet</option>
              {walletOptions.map(w => <option key={w.id} value={w.id}>{w.currency} Wallet</option>)}
            </select>
            <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="manual">Manual Bank Transfer</option>
              <option value="mobile_money">Mobile Money (M-Pesa)</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="crypto">Cryptocurrency</option>
            </select>
            <input type="text" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">{creating ? 'Creating...' : 'Create Deposit'}</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white rounded-xl shadow-sm border p-5 animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/3"></div></div>)}</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">{error}</div>
      ) : !deposits || deposits.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <ArrowDownLeft className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No deposits yet</p>
          <p className="text-sm text-gray-400 mt-1">Create a deposit to add funds to your wallet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wallet</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {deposits.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-500">{d.depositRef?.slice(0, 16) || d.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{d.wallet?.currency || d.currency}</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-green-600">+{d.amount.toLocaleString()} {d.currency}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{(d.paymentMethod || '').replace('_', ' ')}</td>
                  <td className="px-6 py-4"><div className="flex items-center gap-1.5">{statusIcon(d.status)}<span className="text-sm">{d.status}</span></div></td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(d.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
