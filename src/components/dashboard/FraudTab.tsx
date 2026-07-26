'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  useApi, getStatusBadgeVariant, getStatusColor, getRiskBg, getRiskColor,
  truncate, FRAUD_SEVERITIES, FRAUD_STATUSES, PipelineCard, LoadingSkeleton, formatDate,
  type FraudAlert, type FraudRule,
} from '@/lib/dashboard-helpers'

export function FraudTab() {
  const { data: alerts, loading: aLoading } = useApi<FraudAlert[]>('/api/fraud/alerts?limit=20')
  const { data: rules, loading: rLoading } = useApi<FraudRule[]>('/api/fraud/rules')

  if (aLoading || rLoading) return <LoadingSkeleton />

  const allAlerts = alerts || []
  const allRules = rules || []

  const severityCounts = FRAUD_SEVERITIES.map(s => ({
    severity: s,
    count: allAlerts.filter(a => a.severity?.toLowerCase() === s.toLowerCase()).length,
  }))
  const severityColors: Record<string, string> = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#10b981' }

  const statusCounts = FRAUD_STATUSES.map(s => ({
    status: s,
    count: allAlerts.filter(a => a.status?.toLowerCase() === s.toLowerCase()).length,
  }))

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Alerts by Severity</h3>
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
          {severityCounts.map(p => (
            <PipelineCard key={p.severity} label={p.severity} count={p.count} color={severityColors[p.severity]} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Alerts by Status</h3>
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
          {statusCounts.map((p, i) => (
            <PipelineCard key={p.status} label={p.status} count={p.count} color={['#94a3b8', '#f59e0b', '#ef4444', '#10b981'][i]} />
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Fraud Alerts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allAlerts.map(a => (
                  <TableRow key={a.id} className="even:bg-muted/50">
                    <TableCell className="font-mono text-xs">{a.alertRef}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(a.severity)} className={getStatusColor(a.severity)}>{a.severity}</Badge></TableCell>
                    <TableCell className="text-sm">{a.fraudType}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getRiskBg(a.score)}`} style={{ width: `${a.score}%` }} />
                        </div>
                        <span className={`text-xs font-medium ${getRiskColor(a.score)}`}>{a.score}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[100px] truncate">{a.businessId ? a.businessId.slice(0, 8) + '...' : '—'}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(a.status)} className={getStatusColor(a.status)}>{a.status}</Badge></TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs">{truncate(a.description, 40)}</TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(a.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Fraud Rules</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Triggered</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {allRules.map(r => (
                  <TableRow key={r.id} className="even:bg-muted/50">
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{r.action}</Badge></TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(r.severity)} className={getStatusColor(r.severity)}>{r.severity}</Badge></TableCell>
                    <TableCell className="font-medium">{r.triggerCount ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
