'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeftRight, RefreshCw, AlertCircle, Info } from 'lucide-react';

interface Wallet {
  id: string;
  currency: string;
  balance: number;
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

export default function ConversionPage() {
  const { data: session } = useSession();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<ConversionResult | null>(null);
  const [converting, setConverting] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => { fetchWallets(); fetchHistory(); }, []);

  async function fetchWallets() {
    try {
      setLoading(true);
      const res = await fetch('/api/wallets');
      if (res.ok) {
        const data = await res.json();
        setWallets(data.wallets || []);
      }
    } catch (err) { setError('Failed to load wallets'); }
    finally { setLoading(false); }
  }

  async function fetchHistory() {
    try {
      // Fetch from the convert API or a dedicated history endpoint
      // For now, we'll use the transactions API filtered by conversion type
    } catch (e) { /* ignore */ }
  }

  async function getQuote() {
    if (!fromWalletId || !toWalletId || !amount) return;
    try {
      setQuoteLoading(true);
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromWalletId, toWalletId, amount: parseFloat(amount) }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to get quote'); }
      const data = await res.json();
      setQuote(data);
    } catch (err) {
      setQuote(null);
      alert(err instanceof Error ? err.message : 'Failed to get quote');
    } finally { setQuoteLoading(false); }
  }

  async function executeConversion() {
    if (!fromWalletId || !toWalletId || !amount || !quote) return;
    if (!confirm(`Convert ${amount} to ${quote.finalAmount.toFixed(2)} ${quote.to.currency}? Fee: ${quote.fee.toFixed(2)}`)) return;
    try {
      setConverting(true);
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromWalletId, toWalletId, amount: parseFloat(amount), execute: true }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Conversion failed'); }
      setQuote(null);
      setAmount('');
      fetchWallets(); // Refresh balances
      alert('Conversion completed successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Conversion failed');
    } finally { setConverting(false); }
  }

  const fromWallet = wallets.find(w => w.id === fromWalletId);
  const toWallet = wallets.find(w => w.id === toWalletId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Currency Conversion</h1>
          <p className="text-gray-500 mt-1">Convert between currencies at market rates</p>
        </div>
        <button onClick={fetchWallets} className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      {loading ? (
        <div className="animate-pulse"><div className="bg-white rounded-xl shadow-sm border p-8 h-64"></div></div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">{error}</div>
      ) : wallets.length < 2 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <ArrowLeftRight className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">You need at least 2 wallets with different currencies to convert</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversion Form */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Convert Currency</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <select value={fromWalletId} onChange={(e) => { setFromWalletId(e.target.value); setQuote(null); }} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select source wallet</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.currency} — {w.balance.toLocaleString()} {w.currency} available</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setQuote(null); }} placeholder="Enter amount" className="w-full border rounded-lg px-3 py-2 text-sm" />
                {fromWallet && (
                  <p className="text-xs text-gray-500 mt-1">Available: {fromWallet.balance.toLocaleString()} {fromWallet.currency}</p>
                )}
              </div>
              <div className="flex justify-center">
                <button onClick={() => { setFromWalletId(toWalletId); setToWalletId(fromWalletId); setQuote(null); }} className="p-2 rounded-full border hover:bg-gray-50" title="Swap">
                  <ArrowLeftRight className="h-5 w-5 text-gray-600" />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <select value={toWalletId} onChange={(e) => { setToWalletId(e.target.value); setQuote(null); }} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select target wallet</option>
                  {wallets.filter(w => w.id !== fromWalletId).map(w => (
                    <option key={w.id} value={w.id}>{w.currency} — {w.balance.toLocaleString()} {w.currency}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={getQuote} disabled={!fromWalletId || !toWalletId || !amount || quoteLoading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {quoteLoading ? 'Getting Quote...' : 'Get Quote'}
                </button>
              </div>
            </div>

            {/* Quote Display */}
            {quote && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-3">Conversion Quote</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-blue-700">You send:</span><span className="font-medium">{parseFloat(amount).toLocaleString()} {quote.from.currency}</span></div>
                  <div className="flex justify-between"><span className="text-blue-700">Exchange rate:</span><span className="font-medium">{quote.rate}</span></div>
                  <div className="flex justify-between"><span className="text-blue-700">Fee (1.5%):</span><span className="font-medium">{quote.fee.toFixed(2)} {quote.to.currency}</span></div>
                  <div className="flex justify-between border-t border-blue-200 pt-2"><span className="text-blue-900 font-semibold">You receive:</span><span className="font-bold text-blue-900">{quote.finalAmount.toFixed(2)} {quote.to.currency}</span></div>
                </div>
                <button onClick={executeConversion} disabled={converting} className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {converting ? 'Converting...' : 'Execute Conversion'}
                </button>
              </div>
            )}

            <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-start gap-2 text-xs text-gray-500">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>Exchange rates are indicative. A 1.5% conversion fee applies to all transactions. Rates update periodically.</p>
            </div>
          </div>

          {/* Supported Currencies */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Supported Currencies</h2>
            <div className="grid grid-cols-2 gap-3">
              {wallets.map(w => (
                <div key={w.id} className="p-3 border rounded-lg">
                  <p className="font-medium text-gray-900">{w.currency}</p>
                  <p className="text-sm text-gray-500">{w.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
