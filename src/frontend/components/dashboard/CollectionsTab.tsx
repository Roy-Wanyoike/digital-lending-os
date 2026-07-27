'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  useApi, formatCurrency, formatDate, getStatusBadgeVariant, getStatusColor,
  truncate, AGING_BUCKETS, PRIORITY_LEVELS, PipelineCard, LoadingSkeleton, ErrorState,
  type CollectionRecord,
} from '@/lib/dashboard-helpers'

export function CollectionsTab() {
  const { data: collections, loading, error, refetch } = useApi<CollectionRecord[]>('/api/collections?limit=20')

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const allCollections = collections || []

  const agingCounts = AGING_BUCKETS.map(a => ({
    bucket: a,
    count: allCollections.filter(c => c.agingBucket?.toLowerCase() === a.toLowerCase()).length,
    total: allCollections.filter(c => c.agingBucket?.toLowerCase() === a.toLowerCase()).reduce((sum, c) => sum + c.outstandingAmount, 0),
  }))
  const agingColors = ['#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444']

  const priorityCounts = PRIORITY_LEVELS.map(p => ({
    priority: p,
    count: allCollections.filter(c => c.priority === p).length,
  }))
  const priorityColors: Record<string, string> = { Urgent: '#ef4444', High: '#f97316', Normal: '#f59e0b', Low: '#10b981' }

  const agingBadgeColor = (aging: string) => {
    const a = aging?.toLowerCase() || ''
    if (a === 'current') return 'bg-emerald-100 text-emerald-700'
    if (a === '1-30') return 'bg-lime-100 text-lime-700'
    if (a === '31-60') return 'bg-amber-100 text-amber-700'
    if (a === '61-90') return 'bg-orange-100 text-orange-700'
    return 'bg-red-100 text-red-700'
  }

  const priorityBadgeColor = (p: string) => {
    const v = p?.toLowerCase() || ''
    if (v === 'urgent') return 'bg-red-100 text-red-700'
    if (v === 'high') return 'bg-orange-100 text-orange-700'
    if (v === 'normal') return 'bg-amber-100 text-amber-700'
    return 'bg-emerald-100 text-emerald-700'
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Aging Summary</h3>
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
          {agingCounts.map((a, i) => (
            <div key={a.bucket} className="flex-1 min-w-0">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-2xl sm:text-3xl font-bold" style={{ color: agingColors[i] }}>{a.count}</p>
                  <p className="text-xs text-muted-foreground">{a.bucket} days</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatCurrency(a.total)}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Priority Distribution</h3>
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
          {priorityCounts.map(p => (
            <PipelineCard key={p.priority} label={p.priority} count={p.count} color={priorityColors[p.priority]} />
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Debtor</TableHead>
                  <TableHead>Original</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Aging</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reminders</TableHead>
                  <TableHead>AI Strategy</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allCollections.map(c => (
                  <TableRow key={c.id} className="even:bg-muted/50">
                    <TableCell className="font-mono text-xs">{c.caseRef}</TableCell>
                    <TableCell className="max-w-[100px] truncate">{c.debtorName ?? '—'}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(c.originalAmount, c.currency)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(c.outstandingAmount, c.currency)}</TableCell>
                    <TableCell><Badge variant="secondary" className={`text-[10px] ${agingBadgeColor(c.agingBucket ?? '')}`}>{c.agingBucket}</Badge></TableCell>
                    <TableCell><Badge variant="secondary" className={`text-[10px] ${priorityBadgeColor(c.priority)}`}>{c.priority}</Badge></TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(c.status)} className={getStatusColor(c.status)}>{c.status}</Badge></TableCell>
                    <TableCell className="text-center">{c.reminderCount ?? 0}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">{truncate(c.aiStrategy || '—', 35)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
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
