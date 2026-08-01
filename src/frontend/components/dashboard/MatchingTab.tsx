'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  useApi, formatDate, getStatusBadgeVariant, getStatusColor,
  MATCHING_STATUSES, PipelineCard, LoadingSkeleton, ErrorState, type MatchingRecord,
} from '@/lib/dashboard-helpers'

export function MatchingTab() {
  const { data: matches, loading, error, refetch } = useApi<MatchingRecord[]>('/api/matching?limit=20')

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const allMatches = matches || []

  const pipelineCounts = MATCHING_STATUSES.map(s => ({
    status: s,
    count: allMatches.filter(m => m.status?.toLowerCase() === s.toLowerCase()).length,
  }))
  const pipelineColors = ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981', '#ef4444']

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
        {pipelineCounts.map((p, i) => (
          <PipelineCard key={p.status} label={p.status} count={p.count} color={pipelineColors[i]} />
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seeker</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Match Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reasons</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allMatches.map(m => (
                  <TableRow key={m.id} className={`even:bg-muted/50 ${m.matchScore > 85 ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}>
                    <TableCell className="font-medium max-w-[120px] truncate">{m.seekerName ?? '—'}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{m.candidateName ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{m.matchType}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={m.matchScore} className="h-2 w-16" />
                        <span className={`text-xs font-bold ${m.matchScore > 85 ? 'text-emerald-600 dark:text-emerald-400' : m.matchScore > 60 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>{m.matchScore}%</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(m.status)} className={getStatusColor(m.status)}>{m.status}</Badge></TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{(() => { try { const r = JSON.parse(m.reasons || '[]'); return Array.isArray(r) ? r.slice(0,2).join(', ') : m.reasons } catch { return m.reasons } })()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(m.createdAt)}</TableCell>
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
