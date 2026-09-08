'use client'

import { useApi } from '@/hooks/use-api'
import { LoadingSkeleton, ErrorState, KPICard } from '@/frontend/components/dashboard/dashboard-components'
import { type DashboardStats, formatCurrency, formatDate, getStatusBadgeVariant, ESCROW_STATUSES, PipelineCard } from '@/lib/dashboard-helpers'
import { TrendingUp, Building2, Shield, Users, AlertTriangle, Percent, ArrowDownLeft, Banknote } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function OverviewTab() {
  const { data: stats, loading, error, refetch } = useApi<DashboardStats>('/api/dashboard/stats')
  if (loading || !stats) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  // ─── Lending KPI calculations ───────────────────────────────────
  // Map existing API data to lending context
  const totalLoansDisbursed = stats.totalPaymentsProcessed || stats.totalEscrowVolume || 0
  const activeBorrowers = stats.verifiedBusinesses || stats.totalBusinesses || 0
  // PAR & NPL: not yet available from API — placeholders until backend exposes them
  const parRatio = stats.parRatio ?? 0
  const nplRate = stats.nplRate ?? 0
  const disbursementThisMonth = stats.disbursementThisMonth ?? totalLoansDisbursed
  const collectionRate = stats.collectionRate ?? 0

  const pipelineData = ESCROW_STATUSES.map(s => ({
    status: s,
    count: stats.escrowsByStatus?.[s.toLowerCase().replace(/\s/g, '_')] || stats.escrowsByStatus?.[s] || 0,
  }))

  return (
    <div className="space-y-6">
      {/* ─── Lending Header ──────────────────────────────────────── */}
      <div>
        <h3 className="text-2xl font-bold text-foreground">Total Loans Disbursed</h3>
        <p className="text-muted-foreground text-sm">Cumulative disbursed amount across all loan products</p>
      </div>
      <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
        🇰🇪 {formatCurrency(totalLoansDisbursed, 'KES')}
      </div>

      {/* ─── Lending KPI Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard title="Active Borrowers" value={String(activeBorrowers)} icon={Users} />
        <KPICard
          title="PAR Ratio (>30 days)"
          value={`${parRatio.toFixed(1)}%`}
          subtitle="Portfolio at Risk"
          icon={AlertTriangle}
        />
        <KPICard
          title="NPL Rate"
          value={`${nplRate.toFixed(1)}%`}
          subtitle="Non-Performing Loans"
          icon={Percent}
        />
        <KPICard
          title="Disbursement (This Month)"
          value={`🇰🇪 ${formatCurrency(disbursementThisMonth, 'KES')}`}
          icon={Banknote}
        />
        <KPICard
          title="Collection Rate"
          value={`${collectionRate.toFixed(1)}%`}
          subtitle="Amount collected / Amount due"
          icon={ArrowDownLeft}
        />
        <KPICard
          title="Avg Trust Score"
          value={stats.averageTrustScore?.toFixed(1) || '0'}
          icon={Shield}
        />
      </div>

      {/* ─── Loan Pipeline (by status) ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {pipelineData.map((p, i) => <PipelineCard key={p.status} title={p.status} value={p.count} color={['#94a3b8','#3b82f6','#f59e0b','#10b981','#ef4444'][i]} />)}
      </div>

      {/* ─── Recent Loans Table ─────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle>Recent Loans</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan Ref</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Counterparty</TableHead>
                  <TableHead>Amount (🇰🇪 KES)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stats.recentTransactions || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No recent loan transactions
                    </TableCell>
                  </TableRow>
                )}
                {(stats.recentTransactions || []).map((tx: any) => (
                  <TableRow key={tx.txRef}>
                    <TableCell className="font-mono text-xs">{tx.txRef}</TableCell>
                    <TableCell className="text-sm">{tx.buyerName}</TableCell>
                    <TableCell className="text-sm">{tx.sellerName}</TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatCurrency(tx.amount, tx.currency || 'KES')}
                    </TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(tx.status)}>{tx.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
