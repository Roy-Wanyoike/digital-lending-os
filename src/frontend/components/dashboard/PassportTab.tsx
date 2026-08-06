'use client'

import { CheckCircle, Clock, XCircle, Shield, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  useApi, getCountryFlag, formatDate, getStatusBadgeVariant, getStatusColor,
  KPICard, LoadingSkeleton, ErrorState, type Business, type Verification,
} from '@/lib/dashboard-helpers'

export function PassportTab() {
  const { data: businesses, loading: bLoading, error: bizError } = useApi<Business[]>('/api/businesses?limit=50')
  const { data: verifications, loading: vLoading, error: verifError, refetch } = useApi<Verification[]>('/api/passport/verifications?limit=15')

  if (bLoading || vLoading) return <LoadingSkeleton />
  if (bizError || verifError) return <ErrorState message={bizError || verifError || ''} onRetry={refetch} />

  const allBiz = businesses || []
  const allVerif = verifications || []

  const kycCounts = { verified: 0, pending: 0, failed: 0 }
  const amlCounts = { clear: 0, pending: 0, flagged: 0 }
  allBiz.forEach(b => {
    const ks = b.passport?.kycStatus?.toLowerCase() || 'pending'
    if (ks === 'verified' || ks === 'approved' || ks === 'complete') kycCounts.verified++
    else if (ks === 'failed' || ks === 'rejected') kycCounts.failed++
    else kycCounts.pending++
    const as = b.passport?.amlStatus?.toLowerCase() || 'pending'
    if (as === 'clear' || as === 'passed') amlCounts.clear++
    else if (as === 'flagged' || as === 'alert') amlCounts.flagged++
    else amlCounts.pending++
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <KPICard title="KYC Verified" value={kycCounts.verified.toString()} icon={CheckCircle} />
        <KPICard title="KYC Pending" value={kycCounts.pending.toString()} icon={Clock} />
        <KPICard title="KYC Failed" value={kycCounts.failed.toString()} icon={XCircle} />
        <KPICard title="AML Clear" value={amlCounts.clear.toString()} icon={Shield} />
        <KPICard title="AML Pending" value={amlCounts.pending.toString()} icon={Clock} />
        <KPICard title="AML Flagged" value={amlCounts.flagged.toString()} icon={AlertTriangle} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Compliance Grid</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {allBiz.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">No businesses found</div>
            )}
            {allBiz.map(biz => (
              <Card key={biz.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Avatar className="h-8 w-8"><AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs">{biz.name?.charAt(0)}</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{biz.name}</p>
                      <p className="text-xs text-muted-foreground">{getCountryFlag(biz.country)} {biz.country}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={`text-[10px] ${biz.passport?.kycStatus?.toLowerCase() === 'verified' || biz.passport?.kycStatus?.toLowerCase() === 'approved' ? 'border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300' : 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'}`}>KYC: {biz.passport?.kycStatus || 'Pending'}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={`text-[10px] ${biz.passport?.amlStatus?.toLowerCase() === 'clear' || biz.passport?.amlStatus?.toLowerCase() === 'passed' ? 'border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300' : 'border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'}`}>AML: {biz.passport?.amlStatus || 'Pending'}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px]">{biz.passport?.credentialLevel || 'Basic'}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px]">Risk: {biz.passport?.riskRating || 'Low'}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Verifications</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allVerif.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No verifications yet</TableCell></TableRow>
                )}
                {allVerif.map(v => (
                  <TableRow key={v.id} className="even:bg-muted/50">
                    <TableCell className="font-mono text-xs">{v.id}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{v.business?.name}</TableCell>
                    <TableCell>{v.type}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(v.status)} className={getStatusColor(v.status)}>{v.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(v.createdAt)}</TableCell>
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
