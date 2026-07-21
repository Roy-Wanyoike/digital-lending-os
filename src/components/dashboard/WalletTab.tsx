'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  useApi, formatCurrency, CURRENCY_FLAGS,
  LoadingSkeleton, type Business, type WalletData,
} from '@/lib/dashboard-helpers'

export function WalletTab() {
  const { data: businesses, loading: bLoading } = useApi<Business[]>('/api/businesses?limit=50')
  const [selectedBizId, setSelectedBizId] = useState<string>('')
  const bizId = selectedBizId || businesses?.[0]?.id || ''
  const { data: wallets, loading: wLoading } = useApi<WalletData[]>(bizId ? `/api/wallets?businessId=${bizId}` : '')

  if (bLoading || (bizId && wLoading)) return <LoadingSkeleton />

  const allWallets = wallets || []
  const totalPortfolio = allWallets.reduce((sum, w) => {
    try { return sum + w.balance * (w.currency === 'NGN' ? 0.00065 : w.currency === 'KES' ? 0.0077 : w.currency === 'GHS' ? 0.088 : w.currency === 'EUR' ? 1.08 : w.currency === 'GBP' ? 1.26 : 1) } catch { return sum }
  }, 0)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">Business:</span>
        <Select value={selectedBizId || businesses?.[0]?.id} onValueChange={setSelectedBizId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select business" /></SelectTrigger>
          <SelectContent>
            {(businesses || []).map(b => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-slate-500 mb-1">Total Portfolio Value (USD)</p>
          <p className="text-3xl sm:text-4xl font-bold">{formatCurrency(totalPortfolio)}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allWallets.map(w => (
          <Card key={w.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{CURRENCY_FLAGS[w.currency] || '💰'}</span>
                <span className="font-semibold">{w.currency}</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(w.balance, w.currency)}</p>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <div className="flex justify-between"><span>Available</span><span className="text-emerald-600 font-medium">{formatCurrency(w.availableBalance, w.currency)}</span></div>
                <div className="flex justify-between"><span>Pending</span><span className="text-amber-600 font-medium">{formatCurrency(w.pendingBalance, w.currency)}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {allWallets.length === 0 && bizId && !wLoading && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <p className="text-slate-500">No wallets found for this business. Try selecting a different business.</p>
          </CardContent>
        </Card>
      )}

    </motion.div>
  )
}
