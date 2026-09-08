'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useApi } from '@/hooks/use-api'
import { LoadingSkeleton, ErrorState, KPICard, CircularScore, ScoreBar } from '@/frontend/components/dashboard/dashboard-components'
import {
  formatCurrency, formatDate, getCountryFlag, getStatusBadgeVariant,
} from '@/lib/dashboard-helpers'
import {
  Brain, AlertTriangle, Clock, Search, Eye, TrendingUp, TrendingDown,
  Minus, ShieldCheck, Activity, BarChart3, Landmark,
} from 'lucide-react'

// ─── Full TwinProfile type (matches /api/twin/profiles response) ────────

interface TwinProfileBusiness {
  id: string
  name: string
  country: string
  industry: string
}

interface TwinProfileMetric {
  period: string
  periodDate: string
  revenue?: number | null
  expenses?: number | null
  netIncome?: number | null
  transactionCount?: number | null
  paymentSuccessRate?: number | null
}

interface TwinProfilePrediction {
  predictionType: string
  timeframe: string
  predictedValue: number
  confidence: number
}

interface TwinProfile {
  id: string
  businessId: string
  healthScore: number
  cashFlowHealth: number
  riskAppetite: string
  creditWorthiness: number
  liquidityScore: number
  growthTrajectory: string
  aiModelVersion: string
  lastSyncAt?: string | null
  createdAt: string
  updatedAt: string
  business?: TwinProfileBusiness | null
  metrics?: TwinProfileMetric[] | null
  predictions?: TwinProfilePrediction[] | null
}

// ─── Risk bucket definitions ────────────────────────────────────────────

const RISK_BUCKETS = [
  { label: 'Very High Risk', range: '0–40', min: 0, max: 40, color: '#ef4444', bg: 'bg-red-500' },
  { label: 'High Risk', range: '40–60', min: 40, max: 60, color: '#f97316', bg: 'bg-orange-500' },
  { label: 'Moderate', range: '60–80', min: 60, max: 80, color: '#f59e0b', bg: 'bg-amber-500' },
  { label: 'Low Risk', range: '80–100', min: 80, max: 100, color: '#10b981', bg: 'bg-emerald-500' },
] as const

const RISK_FILTERS = ['All', 'Very High Risk', 'High Risk', 'Moderate', 'Low Risk'] as const
const GROWTH_FILTERS = ['All', 'Growing', 'Stable', 'Declining'] as const

// ─── Helper functions ───────────────────────────────────────────────────

function getRiskBucket(score: number): string {
  if (score < 40) return 'Very High Risk'
  if (score < 60) return 'High Risk'
  if (score < 80) return 'Moderate'
  return 'Low Risk'
}

function getRiskBadgeClass(risk: string): string {
  const r = risk?.toLowerCase() || ''
  if (r.includes('very') && r.includes('high')) return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
  if (r.includes('high')) return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
  if (r.includes('moderate')) return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
  return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
}

function getGrowthBadgeClass(growth: string): string {
  const g = growth?.toLowerCase() || ''
  if (g === 'growing') return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
  if (g === 'stable') return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
  return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
}

function getGrowthIcon(growth: string) {
  const g = growth?.toLowerCase() || ''
  if (g === 'growing') return <TrendingUp className="h-3 w-3" />
  if (g === 'stable') return <Minus className="h-3 w-3" />
  return <TrendingDown className="h-3 w-3" />
}

function formatKES(value: number | null | undefined): string {
  if (value == null) return '—'
  return formatCurrency(value, 'KES')
}

// ─── Credit Score Distribution Bar Chart ────────────────────────────────

function ScoreDistributionChart({ profiles }: { profiles: TwinProfile[] }) {
  const buckets = RISK_BUCKETS.map(bucket => ({
    ...bucket,
    count: profiles.filter(p => (p.healthScore ?? 0) >= bucket.min && (p.healthScore ?? 0) < bucket.max).length
      + (bucket.max === 100 ? profiles.filter(p => (p.healthScore ?? 0) === 100).length : 0),
  }))
  const maxCount = Math.max(...buckets.map(b => b.count), 1)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-emerald-500" />
          Credit Score Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {buckets.map(bucket => (
            <div key={bucket.label} className="flex items-center gap-3">
              <div className="w-28 sm:w-32 text-right">
                <span className="text-xs font-medium text-foreground">{bucket.label}</span>
                <span className="text-[10px] text-muted-foreground ml-1">({bucket.range})</span>
              </div>
              <div className="flex-1 h-6 bg-muted rounded overflow-hidden relative">
                <div
                  className={`h-full rounded transition-all duration-700 ease-out ${bucket.bg}`}
                  style={{ width: `${(bucket.count / maxCount) * 100}%`, minWidth: bucket.count > 0 ? '4px' : '0' }}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground">
                  {bucket.count}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Based on AI health scores from digital twin profiles
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Credit Profile Detail Dialog ───────────────────────────────────────

function ProfileDetailDialog({
  profile,
  open,
  onOpenChange,
}: {
  profile: TwinProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: predictions } = useApi<TwinProfilePrediction[]>(
    `/api/twin/profiles/${profile?.id}/predictions`,
    { enabled: open && !!profile?.id }
  )

  if (!profile) return null

  const allPredictions = predictions || profile.predictions || []
  const metrics = profile.metrics || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-emerald-500" />
            Credit Profile: {profile.business?.name || 'Unknown Borrower'}
          </DialogTitle>
          <DialogDescription>
            AI-powered credit risk assessment{' '}
            {profile.business?.country
              ? `${getCountryFlag(profile.business.country)} ${profile.business.country}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        {/* Overview Section */}
        <div className="space-y-4 mt-2">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="flex flex-col items-center gap-2">
              <CircularScore score={profile.healthScore ?? 0} size={120} strokeWidth={8} />
              <span className="text-xs text-muted-foreground">Health Score</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Credit Worthiness</p>
                <p className="text-lg font-bold text-foreground">{profile.creditWorthiness ?? 0}/100</p>
                <ScoreBar score={profile.creditWorthiness ?? 0} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Cash Flow Health</p>
                <p className="text-lg font-bold text-foreground">{profile.cashFlowHealth ?? 0}/100</p>
                <ScoreBar score={profile.cashFlowHealth ?? 0} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Liquidity Score</p>
                <p className="text-lg font-bold text-foreground">{profile.liquidityScore ?? 0}/100</p>
                <ScoreBar score={profile.liquidityScore ?? 0} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Risk Appetite</p>
                <Badge variant="secondary" className={`text-xs ${getRiskBadgeClass(profile.riskAppetite ?? '')}`}>
                  {profile.riskAppetite ?? '—'}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Growth Trajectory</p>
                <Badge variant="secondary" className={`text-xs ${getGrowthBadgeClass(profile.growthTrajectory ?? '')}`}>
                  {getGrowthIcon(profile.growthTrajectory ?? '')}
                  <span className="ml-1">{profile.growthTrajectory ?? '—'}</span>
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">AI Model</p>
                <p className="text-xs font-mono text-foreground">{profile.aiModelVersion || '—'}</p>
              </div>
            </div>
          </div>

          {/* Historical Metrics Table */}
          {metrics.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Historical Metrics</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Revenue (KES)</TableHead>
                        <TableHead>Expenses (KES)</TableHead>
                        <TableHead>Net Income (KES)</TableHead>
                        <TableHead>Tx Count</TableHead>
                        <TableHead>Payment Success</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.map((m, i) => (
                        <TableRow key={i} className="even:bg-muted/50">
                          <TableCell className="text-xs font-medium">{m.period || m.periodDate || '—'}</TableCell>
                          <TableCell className="text-xs">{formatKES(m.revenue)}</TableCell>
                          <TableCell className="text-xs">{formatKES(m.expenses)}</TableCell>
                          <TableCell className="text-xs font-medium">{formatKES(m.netIncome)}</TableCell>
                          <TableCell className="text-xs text-center">{m.transactionCount ?? '—'}</TableCell>
                          <TableCell className="text-xs">
                            {m.paymentSuccessRate != null ? `${(m.paymentSuccessRate * 100).toFixed(1)}%` : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Predictions Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                AI Predictions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allPredictions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No predictions available for this borrower
                </p>
              ) : (
                <div className="space-y-3">
                  {allPredictions.map((pred, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-foreground">{pred.predictionType}</p>
                        <p className="text-xs text-muted-foreground">Timeframe: {pred.timeframe}</p>
                      </div>
                      <div className="text-right sm:text-right">
                        <p className="text-sm font-bold text-foreground">{formatKES(pred.predictedValue)}</p>
                        <div className="flex items-center gap-2 justify-end mt-1">
                          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${(pred.confidence ?? 0) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {((pred.confidence ?? 0) * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* CRB Section (placeholder) */}
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Landmark className="h-4 w-4 text-muted-foreground" />
                CRB Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center py-4 text-center">
                <ShieldCheck className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">CRB integration pending</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Will show official credit bureau data from Metropol, TransUnion, and Creditinfo Kenya once CRB APIs are connected.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main CreditScoringTab ──────────────────────────────────────────────

export function CreditScoringTab() {
  const { data: profiles, loading, error, refetch } = useApi<TwinProfile[]>('/api/twin/profiles?limit=100')

  const [searchQuery, setSearchQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState<string>('All')
  const [growthFilter, setGrowthFilter] = useState<string>('All')
  const [selectedProfile, setSelectedProfile] = useState<TwinProfile | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const allProfiles = profiles || []

  // ── Derived KPIs ──
  const avgScore = allProfiles.length > 0
    ? Math.round(allProfiles.reduce((sum, p) => sum + (p.healthScore ?? 0), 0) / allProfiles.length)
    : 0
  const highRiskCount = allProfiles.filter(p => (p.healthScore ?? 0) < 60).length
  const pendingReviews = allProfiles.filter(p => !p.lastSyncAt).length
  const crbChecksThisMonth = allProfiles.filter(p => {
    if (!p.lastSyncAt) return false
    const syncDate = new Date(p.lastSyncAt)
    const now = new Date()
    return syncDate.getMonth() === now.getMonth() && syncDate.getFullYear() === now.getFullYear()
  }).length
  // Model accuracy: average confidence across all predictions
  const allPredictions = allProfiles.flatMap(p => p.predictions || [])
  const modelAccuracy = allPredictions.length > 0
    ? Math.round((allPredictions.reduce((sum, p) => sum + (p.confidence ?? 0), 0) / allPredictions.length) * 100)
    : 0

  // ── Filtering ──
  const filteredProfiles = useMemo(() => {
    return allProfiles.filter(p => {
      // Search by borrower name
      if (searchQuery) {
        const name = p.business?.name?.toLowerCase() || ''
        if (!name.includes(searchQuery.toLowerCase())) return false
      }
      // Risk level filter
      if (riskFilter !== 'All') {
        const bucket = getRiskBucket(p.healthScore ?? 0)
        if (bucket !== riskFilter) return false
      }
      // Growth trajectory filter
      if (growthFilter !== 'All') {
        if (p.growthTrajectory !== growthFilter) return false
      }
      return true
    })
  }, [allProfiles, searchQuery, riskFilter, growthFilter])

  const openDetail = (profile: TwinProfile) => {
    setSelectedProfile(profile)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Credit Scoring</h2>
        <p className="text-sm text-muted-foreground">AI-powered credit risk assessment for Kenyan borrowers</p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Avg Credit Score" value={String(avgScore)} icon={Brain} />
        <KPICard title="High Risk Borrowers" value={String(highRiskCount)} icon={AlertTriangle} subtitle="Score &lt; 60" />
        <KPICard title="Pending Reviews" value={String(pendingReviews)} icon={Clock} />
        <KPICard title="CRB Checks This Month" value={String(crbChecksThisMonth)} icon={Landmark} />
        <KPICard title="Model Accuracy" value={`${modelAccuracy}%`} icon={ShieldCheck} />
      </div>

      {/* Credit Score Distribution */}
      <ScoreDistributionChart profiles={allProfiles} />

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by borrower name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                {RISK_FILTERS.map(r => (
                  <SelectItem key={r} value={r}>{r === 'All' ? 'All Risk Levels' : r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={growthFilter} onValueChange={setGrowthFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Growth Trajectory" />
              </SelectTrigger>
              <SelectContent>
                {GROWTH_FILTERS.map(g => (
                  <SelectItem key={g} value={g}>{g === 'All' ? 'All Trajectories' : g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Credit Profiles Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Credit Profiles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Credit Score</TableHead>
                  <TableHead>Risk Appetite</TableHead>
                  <TableHead>Cash Flow</TableHead>
                  <TableHead>Credit Worthiness</TableHead>
                  <TableHead>Liquidity</TableHead>
                  <TableHead>Growth</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {allProfiles.length === 0
                        ? 'No credit profiles found. Digital twin profiles will appear here when created.'
                        : 'No profiles match your filters.'}
                    </TableCell>
                  </TableRow>
                )}
                {filteredProfiles.map(p => (
                  <TableRow key={p.id} className="even:bg-muted/50">
                    <TableCell className="font-medium text-sm max-w-[150px] truncate">
                      {p.business?.name || '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="flex items-center gap-1">
                        {p.business?.country ? getCountryFlag(p.business.country) : '🌐'}
                        {p.business?.country || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <CircularScore score={p.healthScore ?? 0} size={48} strokeWidth={4} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-[10px] ${getRiskBadgeClass(p.riskAppetite ?? '')}`}>
                        {p.riskAppetite ?? '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="w-16">
                        <ScoreBar score={p.cashFlowHealth ?? 0} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-16">
                        <ScoreBar score={p.creditWorthiness ?? 0} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-16">
                        <ScoreBar score={p.liquidityScore ?? 0} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-[10px] ${getGrowthBadgeClass(p.growthTrajectory ?? '')}`}>
                        {getGrowthIcon(p.growthTrajectory ?? '')}
                        <span className="ml-1">{p.growthTrajectory ?? '—'}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.lastSyncAt ? formatDate(p.lastSyncAt) : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => openDetail(p)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Profile Detail Dialog */}
      <ProfileDetailDialog
        profile={selectedProfile}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
