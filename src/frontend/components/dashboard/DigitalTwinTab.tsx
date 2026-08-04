'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
// recharts is dynamically imported below to reduce initial bundle size
import { useApi, CircularScore, LoadingSkeleton, ErrorState, type TwinProfile, formatCurrency } from '@/lib/dashboard-helpers'

export function DigitalTwinTab() {
  const { data: twins, loading, error, refetch } = useApi<TwinProfile[]>('/api/twin/profiles?limit=20')
  const [selectedTwin, setSelectedTwin] = useState<TwinProfile | null>(null)
  const [Recharts, setRecharts] = useState<typeof import('recharts') | null>(null)

  useEffect(() => {
    import('recharts').then(mod => setRecharts(mod))
  }, [])

  if (loading || !Recharts) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const allTwins = twins || []
  const { AreaChart, Area, XAxis, YAxis, Tooltip: RTooltip, ResponsiveContainer, CartesianGrid, Legend } = Recharts

  const trajectoryColor = (t: string) => {
    if (t?.toLowerCase()?.includes('rapid') || t?.toLowerCase()?.includes('grow')) return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
    if (t?.toLowerCase()?.includes('stable') || t?.toLowerCase()?.includes('moderate')) return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
    return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
  }

  const riskAppetiteColor = (r: string) => {
    if (r?.toLowerCase()?.includes('conservative') || r?.toLowerCase()?.includes('low')) return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
    if (r?.toLowerCase()?.includes('moderate') || r?.toLowerCase()?.includes('balanced')) return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
    return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
  }

  const chartData = selectedTwin?.metrics?.map(m => ({
    month: m.periodDate?.slice(5),
    revenue: m.revenue ?? 0,
    expenses: m.expenses ?? 0,
    netIncome: m.netIncome ?? 0,
  })) || []

  const predData = selectedTwin?.predictions?.map(p => ({
    metric: p.predictionType?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    predicted: formatCurrency(p.predictedValue),
    confidence: Math.round((p.confidence ?? 0) * 100),
  })) || []

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold">Digital Twin Profiles</h2>
        <p className="text-sm text-muted-foreground">AI-powered business health assessments</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allTwins.map(twin => (
          <Card key={twin.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedTwin(twin)}>
            <CardContent className="p-4 sm:p-6 text-center">
              <CircularScore score={twin.healthScore ?? 0} size={90} />
              <p className="font-medium mt-3 truncate">{twin.business?.name || 'Unknown'}</p>
              <p className="text-xs text-muted-foreground">Cash Flow: {(twin.cashFlowHealth ?? 0).toFixed(0)}/100</p>
              <p className="text-xs text-muted-foreground">Credit: <span className="font-medium">{twin.creditWorthiness ?? 0}</span></p>
              <div className="flex justify-center gap-2 mt-2">
                <Badge variant="secondary" className={`text-[10px] ${trajectoryColor(twin.growthTrajectory ?? '')}`}>{twin.growthTrajectory || 'Stable'}</Badge>
                <Badge variant="secondary" className={`text-[10px] ${riskAppetiteColor(twin.riskAppetite ?? '')}`}>{twin.riskAppetite || 'Moderate'}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedTwin} onOpenChange={() => setSelectedTwin(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Digital Twin - {selectedTwin?.business?.name}</DialogTitle>
            <DialogDescription>AI-generated business profile and predictions</DialogDescription>
          </DialogHeader>
          {selectedTwin && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <CircularScore score={selectedTwin.healthScore ?? 0} size={80} />
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{selectedTwin.healthScore ?? 0}<span className="text-sm text-muted-foreground font-normal">/100</span></p>
                  <p className="text-sm text-muted-foreground">Health Score</p>
                  <p className="text-sm">Cash Flow: {(selectedTwin.cashFlowHealth ?? 0).toFixed(0)}/100 · Credit: {selectedTwin.creditWorthiness ?? 0} · Liquidity: {selectedTwin.liquidityScore ?? 0}</p>
                </div>
              </div>

              {chartData.length > 0 && (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <RTooltip contentStyle={{ borderRadius: 8, borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))' }} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" name="Revenue" stackId="1" stroke="#10b981" fill="#10b98133" />
                      <Area type="monotone" dataKey="expenses" name="Expenses" stackId="2" stroke="#ef4444" fill="#ef444433" />
                      <Area type="monotone" dataKey="netIncome" name="Net Income" stroke="#f59e0b" fill="#f59e0b22" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {predData.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Predictions</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead>Predicted</TableHead>
                        <TableHead>Confidence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {predData.map((p, i) => (
                        <TableRow key={i} className="even:bg-muted/50">
                          <TableCell className="font-medium">{p.metric}</TableCell>
                          <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">{p.predicted}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={p.confidence} className="h-1.5 w-16" />
                              <span className="text-xs">{p.confidence}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
