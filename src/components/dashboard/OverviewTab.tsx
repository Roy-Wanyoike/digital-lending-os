'use client'

import { useApi, LoadingSkeleton, type DashboardStats, formatCurrency, formatDate, getStatusBadgeVariant, ESCROW_STATUSES, KPICard, PipelineCard } from '@/lib/dashboard-helpers'
import { TrendingUp, Building2, Shield, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function OverviewTab() {
  const { data: stats, loading } = useApi<DashboardStats>('/api/dashboard/stats')
  if (loading || !stats) return <LoadingSkeleton />
  const pipelineData = ESCROW_STATUSES.map(s => ({
    status: s,
    count: stats.escrowsByStatus?.[s.toLowerCase().replace(/\s/g, '_')] || stats.escrowsByStatus?.[s] || 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Verified Commerce Volume</h1>
        <p className="text-slate-500 text-sm">Total value of verified transactions</p>
      </div>
      <div className="text-4xl font-bold text-emerald-600">{formatCurrency(stats.totalEscrowVolume)}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Verified Businesses" value={String(stats.totalBusinesses)} icon={Building2} />
        <KPICard title="Active Deals" value={String(stats.activeEscrows)} icon={Shield} />
        <KPICard title="VCV" value={formatCurrency(stats.totalEscrowVolume)} subtitle="Verified Commerce Volume" icon={TrendingUp} />
        <KPICard title="Avg Trust Score" value={stats.averageTrustScore?.toFixed(1) || '0'} icon={Star} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {pipelineData.map((p, i) => <PipelineCard key={p.status} title={p.status} value={p.count} color={['#94a3b8','#3b82f6','#f59e0b','#10b981','#ef4444'][i]} />)}
      </div>
      <Card><CardHeader><CardTitle>Recent Deals</CardTitle></CardHeader><CardContent>
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow>
            <TableHead>Reference</TableHead><TableHead>Buyer</TableHead><TableHead>Seller</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead>
          </TableRow></TableHeader><TableBody>
            {(stats.recentTransactions || []).map((tx: any) => (
              <TableRow key={tx.txRef}>
                <TableCell className="font-mono text-xs">{tx.txRef}</TableCell>
                <TableCell className="text-sm">{tx.buyerBusinessName}</TableCell>
                <TableCell className="text-sm">{tx.sellerBusinessName}</TableCell>
                <TableCell className="text-sm font-medium">{formatCurrency(tx.amount, tx.currency)}</TableCell>
                <TableCell><Badge variant={getStatusBadgeVariant(tx.status)}>{tx.status}</Badge></TableCell>
                <TableCell className="text-xs text-slate-500">{formatDate(tx.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      </CardContent></Card>
    </div>
  )
}