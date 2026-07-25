'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowUpRight, Plus, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface Withdrawal {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  referenceId: string;
  destination: string | null;
  description: string | null;
  rejectionReason: string | null;
  createdAt: string;
  wallet: { id: string; currency: string };
}

export default function WithdrawalsPage() {
  const { data: session } = useSession();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ walletId: '', amount: '', method: 'bank_transfer', destination: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [wallets, setWallets] = useState<Array<{ id: string; currency: string; balance: number }>>([]);

  useEffect(() => { fetchWithdrawals(); fetchWallets(); }, []);

  async function fetchWithdrawals() {
    try {
      setLoading(true);
      const res = await fetch('/api/withdrawals');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setWithdrawals(data.withdrawals || []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setLoading(false); }
  }

  async function fetchWallets() {
    try {
      const res = await fetch('/api/wallets');
      if (res.ok) {
        const data = await res.json();
        setWallets((data.wallets || []).map((w: any) => ({ id: w.id, currency: w.currency, balance: w.balance || 0 })));
      }
    } catch (e) { /* ignore */ }
  }

  async function handleCreate() {
    if (!form.walletId || !form.amount || !form.method) { alert('All fields required'); return; }
    try {
      setCreating(true);
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setShowCreate(false);
      setForm({ walletId: '', amount: '', method: 'bank_transfer', destination: '', description: '' });
      fetchWithdrawals();
      fetchWallets(); // Refresh balances
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed'); }
    finally { setCreating(false); }
  }

  const statusIcon = (s: string) => {
    switch (s) {
      case 'COMPLETED': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'PENDING': case 'PROCESSING': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'FAILED': case 'REJECTED': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const selectedWallet = wallets.find(w => w.id === form.walletId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Withdrawals</h1>
          <p className="text-gray-500 mt-1">Withdraw funds from your wallets</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchWithdrawals} className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Refresh</button>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"><Plus className="h-4 w-4" /> New Withdrawal</button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-medium text-gray-900 mb-4">New Withdrawal</h3>
          {selectedWallet && (
            <p className="text-sm text-gray-500 mb-4">Available balance: <span className="font-semibold text-gray-900">{selectedWallet.balance.toLocaleString()} {selectedWallet.currency}</span></p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <select value={form.walletId} onChange={(e) => setForm({ ...form, walletId: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Select Wallet</option>
              {wallets.map(w => <option key={w.id} value={w.id}>{w.currency} — {w.balance.toLocaleString()} available</option>)}
            </select>
            <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="bank_transfer">Bank Transfer</option>
              <option value="mobile_money">Mobile Money (M-Pesa)</option>
              <option value="crypto">Cryptocurrency</option>
            </select>
            <input type="text" placeholder={form.method === 'crypto' ? 'Wallet Address (BTC, ETH, USDT...)' : form.method === 'mobile_money' ? 'Phone Number (e.g. 2547...)' : 'Bank Account Number'} value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">{creating ? 'Processing...' : 'Submit Withdrawal'}</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
          {form.method === 'crypto' && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              Crypto withdrawals support BTC, ETH, and USDT. Ensure the destination address is correct.
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white rounded-xl shadow-sm border p-5 animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/3"></div></div>)}</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">{error}</div>
      ) : withdrawals.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <ArrowUpRight className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No withdrawals yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {withdrawals.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-500">{w.referenceId?.slice(0, 16) || w.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-red-600">-{w.amount.toLocaleString()} {w.currency}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{w.method.replace('_', ' ')}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{w.destination ? (w.destination.length > 20 ? w.destination.slice(0, 20) + '...' : w.destination) : 'N/A'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      {statusIcon(w.status)}
                      <span className="text-sm">{w.status}</span>
                    </div>
                    {w.rejectionReason && <p className="text-xs text-red-500 mt-1">{w.rejectionReason}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(w.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
