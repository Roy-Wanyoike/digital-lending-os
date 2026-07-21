'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { useApi, CircularScore, LoadingSkeleton, type TwinProfile } from '@/lib/dashboard-helpers'

export function DigitalTwinTab() {
  const { data: twins, loading } = useApi<TwinProfile[]>('/api/twin/profiles?limit=20')
  const [selectedTwin, setSelectedTwin] = useState<TwinProfile | null>(null)

  if (loading) return <LoadingSkeleton />

  const allTwins = twins || []

  const trajectoryColor = (t: string) => {
    if (t?.toLowerCase()?.includes('strong') || t?.toLowerCase()?.includes('high')) return 'bg-emerald-100 text-emerald-700'
    if (t?.toLowerCase()?.includes('moderate') || t?.toLowerCase()?.includes('stable')) return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-700'
  }

  const riskAppetiteColor = (r: string) => {
    if (r?.toLowerCase()?.includes('conservative') || r?.toLowerCase()?.includes('low')) return 'bg-emerald-100 text-emerald-700'
    if (r?.toLowerCase()?.includes('moderate') || r?.toLowerCase()?.includes('balanced')) return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-700'
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Digital Twin Profiles</h2>
        <p className="text-sm text-slate-500">AI-powered business health assessments</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allTwins.map(twin => (
          <Card key={twin.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedTwin(twin)}>
            <CardContent className="p-4 sm:p-6 text-center">
              <CircularScore score={twin.healthScore} size={90} />
              <p className="font-medium mt-3 truncate">{twin.business?.name}</p>
              <p className="text-xs text-slate-500">Cash Flow: {twin.cashFlowHealth?.toFixed(0)}/100</p>
              <p className="text-xs text-slate-500">Credit: <span className="font-medium">{twin.creditWorthiness}</span></p>
              <div className="flex justify-center gap-2 mt-2">
                <Badge variant="secondary" className={`text-[10px] ${trajectoryColor(twin.growthTrajectory)}`}>{twin.growthTrajectory || 'Stable'}</Badge>
                <Badge variant="secondary" className={`text-[10px] ${riskAppetiteColor(twin.riskAppetite)}`}>{twin.riskAppetite || 'Moderate'}</Badge>
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
                <CircularScore score={selectedTwin.healthScore} size={80} />
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{selectedTwin.healthScore}<span className="text-sm text-slate-500 font-normal">/100</span></p>
                  <p className="text-sm text-slate-500">Health Score</p>
                  <p className="text-sm">Cash Flow: {selectedTwin.cashFlowHealth?.toFixed(0)}/100 · Credit: {selectedTwin.creditWorthiness}</p>
                </div>
              </div>

              {selectedTwin.metrics && selectedTwin.metrics.length > 0 && (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={selectedTwin.metrics} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RTooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" name="Revenue" stackId="1" stroke="#10b981" fill="#10b98133" />
                      <Area type="monotone" dataKey="expenses" name="Expenses" stackId="2" stroke="#ef4444" fill="#ef444433" />
                      <Area type="monotone" dataKey="netIncome" name="Net Income" stroke="#f59e0b" fill="#f59e0b22" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {selectedTwin.predictions && selectedTwin.predictions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Predictions</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>Predicted</TableHead>
                        <TableHead>Confidence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTwin.predictions.map((p, i) => (
                        <TableRow key={i} className="even:bg-muted/50">
                          <TableCell className="font-medium">{p.metric}</TableCell>
                          <TableCell>{p.current}</TableCell>
                          <TableCell className="font-medium text-emerald-600">{p.predicted}</TableCell>
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
    </motion.div>
  )
}
