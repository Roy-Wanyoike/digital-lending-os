'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  useApi, formatCurrency, getStatusBadgeVariant, getStatusColor,
  getTrustScoreBg, getTrustScoreColor, CURRENCY_FLAGS, PAYMENT_METHOD_TYPES,
  LoadingSkeleton, type PaymentIntent, type ExchangeRate, type PaymentMethod,
} from '@/lib/dashboard-helpers'

export function PaymentsTab() {
  const { data: intents, loading: iLoading } = useApi<PaymentIntent[]>('/api/payments/intents?limit=15')
  const { data: rates, loading: rLoading } = useApi<ExchangeRate[]>('/api/payments/rates')
  const { data: methods, loading: mLoading } = useApi<PaymentMethod[]>('/api/payment-methods/global')
  const [methodFilter, setMethodFilter] = useState('All')

  if (iLoading || rLoading || mLoading) return <LoadingSkeleton />

  const allIntents = intents || []
  const allRates = rates || []
  const allMethods = methods || []
  const filteredMethods = methodFilter === 'All' ? allMethods : allMethods.filter(m => m.type === methodFilter)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Exchange Rate Cards */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Live Exchange Rates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {allRates.slice(0, 5).map(rate => (
            <Card key={`${rate.from}-${rate.to}`} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span>{CURRENCY_FLAGS[rate.from] || '💱'}</span>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                  <span>{CURRENCY_FLAGS[rate.to] || '💱'}</span>
                </div>
                <p className="text-lg font-bold">{rate.from}/{rate.to}</p>
                <p className="text-2xl font-bold text-emerald-600">{(rate.rate ?? 0).toFixed(4)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment Intents Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment Intents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Routing Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allIntents.slice(0, 15).map(pi => (
                  <TableRow key={pi.id} className="even:bg-muted/50">
                    <TableCell className="font-mono text-xs">{pi.intentRef}</TableCell>
                    <TableCell className="text-xs">
                      <span className="flex items-center gap-1">
                        {CURRENCY_FLAGS[pi.sourceCurrency]} {pi.sourceCurrency}
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        {CURRENCY_FLAGS[pi.targetCurrency]} {pi.targetCurrency}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(pi.sourceAmount, pi.sourceCurrency)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{pi.routingProvider}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getTrustScoreBg(pi.routingScore)}`} style={{ width: `${pi.routingScore}%` }} />
                        </div>
                        <span className={`text-xs font-medium ${getTrustScoreColor(pi.routingScore)}`}>{pi.routingScore}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(pi.status)} className={getStatusColor(pi.status)}>{pi.status}</Badge></TableCell>
                    <TableCell className="text-xs">{formatCurrency(pi.estimatedFee)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Global Payment Methods */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Global Payment Methods</CardTitle>
          <CardDescription>{allMethods.length} methods available across the network</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHOD_TYPES.map(t => (
              <Button key={t} variant={methodFilter === t ? 'default' : 'outline'} size="sm"
                onClick={() => setMethodFilter(t)} className={methodFilter === t ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
                {t}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {filteredMethods.map(m => (
              <Card key={m.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{m.icon || '💳'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{m.methodName}</p>
                      <p className="text-xs text-slate-500">{m.provider}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="secondary" className="text-[10px]">{m.type}</Badge>
                        <span className="text-[10px] text-slate-500">{(() => { try { return JSON.parse(m.countries || '[]').length } catch { return 0 } })()} countries</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                        <span>Fee: {m.feePercent ?? 0}% + {formatCurrency(m.fixedFee)}</span>
                        <span>·</span>
                        <span>{m.settlementTime}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
