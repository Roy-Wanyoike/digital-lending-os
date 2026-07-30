'use client'

import { motion } from 'framer-motion'
import { Scale, Search, AlertTriangle, ShieldAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  useApi, formatDate, getStatusBadgeVariant, getStatusColor,
  KPICard, LoadingSkeleton, ErrorState, type ComplianceRule, type Screening,
} from '@/lib/dashboard-helpers'

export function ComplianceTab() {
  const { data: rules, loading: rLoading, error: rulesError, refetch: refetchRules } = useApi<ComplianceRule[]>('/api/compliance/rules')
  const { data: screenings, loading: sLoading, error: screeningsError, refetch: refetchScreenings } = useApi<Screening[]>('/api/compliance/screenings?limit=20')

  // Rules endpoint requires admin/auditor; degrade gracefully for other roles
  const rulesAccessDenied = rulesError && rulesError.includes('403')
  const hasError = (screeningsError && !rulesAccessDenied) || (rulesError && !rulesAccessDenied)
  const errorMessage = screeningsError || (rulesAccessDenied ? null : rulesError) || ''

  const handleRetry = () => {
    refetchRules()
    refetchScreenings()
  }

  if (rLoading || sLoading) return <LoadingSkeleton />
  if (hasError) return <ErrorState message={errorMessage} onRetry={handleRetry} />

  const allRules = rulesAccessDenied ? [] : (rules || [])
  const allScreenings = screenings || []

  const highRiskCount = allScreenings.filter(s => s.riskLevel?.toLowerCase() === 'high' || s.result?.toLowerCase() === 'alert').length
  const alertCount = allScreenings.filter(s => s.result?.toLowerCase() === 'alert' || s.result?.toLowerCase() === 'potential_match').length
  const activeScreenings = allScreenings.filter(s => s.status?.toLowerCase() === 'active' || s.status?.toLowerCase() === 'pending').length

  const screeningResultColor = (r: string) => {
    if (r?.toLowerCase() === 'clear' || r?.toLowerCase() === 'passed') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    if (r?.toLowerCase() === 'potential_match') return 'bg-amber-100 text-amber-700 border-amber-200'
    return 'bg-red-100 text-red-700 border-red-200'
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Rules" value={allRules.length.toString()} icon={Scale} />
        <KPICard title="Active Screenings" value={activeScreenings.toString()} icon={Search} />
        <KPICard title="Alerts" value={alertCount.toString()} icon={AlertTriangle} />
        <KPICard title="High Risk" value={highRiskCount.toString()} icon={ShieldAlert} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Compliance Rules</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rulesAccessDenied ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Admin or auditor role required to view compliance rules.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Trigger Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allRules.map(r => (
                    <TableRow key={r.id} className="even:bg-muted/50">
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.ruleType}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.action}</Badge></TableCell>
                      <TableCell><Badge variant={getStatusBadgeVariant(r.severity)} className={getStatusColor(r.severity)}>{r.severity}</Badge></TableCell>
                      <TableCell className="font-medium">{r.triggerCount ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Screenings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allScreenings.map(s => (
                  <TableRow key={s.id} className="even:bg-muted/50">
                    <TableCell className="max-w-[120px] truncate">{s.businessId ? s.businessId.slice(0, 8) + '...' : '—'}</TableCell>
                    <TableCell className="text-sm">{s.screeningType}</TableCell>
                    <TableCell><Badge variant="secondary" className={`text-xs ${screeningResultColor(s.result)}`}>{s.result}</Badge></TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(s.riskLevel)} className={getStatusColor(s.riskLevel)}>{s.riskLevel}</Badge></TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(s.status)} className={getStatusColor(s.status)}>{s.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(s.createdAt)}</TableCell>
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
