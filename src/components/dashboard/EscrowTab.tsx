'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  useApi, formatCurrency, getStatusBadgeVariant, getStatusColor,
  getRiskBg, formatDate, ESCROW_STATUSES, PipelineCard, LoadingSkeleton,
  CURRENCY_FLAGS, type EscrowTransaction,
} from '@/lib/dashboard-helpers'

export function EscrowTab() {
  const { data: transactions, loading } = useApi<EscrowTransaction[]>('/api/escrow/transactions?limit=20')
  const [statusFilter, setStatusFilter] = useState('all')

  if (loading) return <LoadingSkeleton />

  const allTxns = transactions || []
  const filtered = statusFilter === 'all' ? allTxns : allTxns.filter(t => t.status?.toLowerCase() === statusFilter.toLowerCase())

  const pipelineCounts = ESCROW_STATUSES.map(s => ({
    status: s,
    count: allTxns.filter(t => t.status?.toLowerCase() === s.toLowerCase().replace(/\s/g, '_') || t.status?.toLowerCase().replace(/\s/g, '') === s.toLowerCase().replace(/\s/g, '')).length,
  }))
  const pipelineColors = ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981', '#ef4444']

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
        {pipelineCounts.map((p, i) => (
          <PipelineCard key={p.status} label={p.status} count={p.count} color={pipelineColors[i]} />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">Filter by status:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ESCROW_STATUSES.map(s => <SelectItem key={s} value={s.toLowerCase().replace(/\s/g, '_')}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>AI Risk</TableHead>
                  <TableHead>Milestones</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 15).map(txn => (
                  <TableRow key={txn.id} className="even:bg-muted/50">
                    <TableCell className="font-mono text-xs">{txn.reference}</TableCell>
                    <TableCell className="max-w-[100px] truncate">{txn.buyerBusinessName}</TableCell>
                    <TableCell className="max-w-[100px] truncate">{txn.sellerBusinessName}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(txn.amount, txn.currency)}</TableCell>
                    <TableCell>{CURRENCY_FLAGS[txn.currency]} {txn.currency}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(txn.status)} className={getStatusColor(txn.status)}>{txn.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getRiskBg(txn.aiRiskScore)}`} style={{ width: `${txn.aiRiskScore}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{txn.aiRiskLevel} ({txn.aiRiskScore})</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{txn.currentMilestone}/{txn.totalMilestones}</TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(txn.createdAt)}</TableCell>
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
