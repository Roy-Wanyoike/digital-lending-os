'use client'

import { useState } from 'react'
import { Search, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  useApi, getCountryFlag, getStatusBadgeVariant, getStatusColor,
  getTrustScoreColor, ScoreBar, CircularScore, LoadingSkeleton, ErrorState,
  type Business,
} from '@/lib/dashboard-helpers'

export function TrustGraphTab() {
  const { data: businesses, loading: bLoading, error, refetch } = useApi<Business[]>('/api/businesses?limit=50')
  const [search, setSearch] = useState('')
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null)

  if (bLoading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const allBusinesses = businesses || []
  const filtered = allBusinesses.filter(b =>
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.country?.toLowerCase().includes(search.toLowerCase()) ||
    b.industry?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Trust Network</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} businesses in the trust graph</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search businesses..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trust Score</TableHead>
                  <TableHead>Passport</TableHead>
                  <TableHead className="sr-only">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No businesses found</TableCell></TableRow>
                )}
                {filtered.slice(0, 20).map(biz => (
                  <TableRow key={biz.id} className="even:bg-muted/50 cursor-pointer hover:bg-muted" onClick={() => setSelectedBiz(biz)}>
                    <TableCell className="font-medium">{biz.name}</TableCell>
                    <TableCell>{getCountryFlag(biz.country)} {biz.country}</TableCell>
                    <TableCell>{biz.industry}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(biz.status)} className={getStatusColor(biz.status)}>{biz.status}</Badge></TableCell>
                    <TableCell>
                      <span className={`font-bold ${getTrustScoreColor(biz.trustScore?.overallScore)}`}>{biz.trustScore?.overallScore ?? 0}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{biz.passport?.credentialLevel || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedBiz} onOpenChange={() => setSelectedBiz(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedBiz?.name}</DialogTitle>
            <DialogDescription>{selectedBiz?.country} · {selectedBiz?.industry}</DialogDescription>
          </DialogHeader>
          {selectedBiz && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CircularScore score={selectedBiz.trustScore?.overallScore} size={80} />
                <div>
                  <p className="text-2xl font-bold">{selectedBiz.trustScore?.overallScore ?? 'N/A'}<span className="text-sm text-muted-foreground font-normal">/100</span></p>
                  <p className="text-sm text-muted-foreground">Overall Trust Score</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <ScoreBar score={Math.min(100, (selectedBiz.trustScore?.overallScore ?? 0) * 1.05)} maxScore={100} label="Identity Verification" />
                <ScoreBar score={Math.min(100, (selectedBiz.trustScore?.overallScore ?? 0) * 0.95)} maxScore={100} label="Financial Health" />
                <ScoreBar score={Math.min(100, (selectedBiz.trustScore?.overallScore ?? 0) * 1.0)} maxScore={100} label="Compliance" />
                <ScoreBar score={Math.min(100, (selectedBiz.trustScore?.overallScore ?? 0) * 0.9)} maxScore={100} label="Reputation" />
                <ScoreBar score={Math.min(100, (selectedBiz.trustScore?.overallScore ?? 0) * 0.85)} maxScore={100} label="Network Strength" />
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">KYC: {selectedBiz.passport?.kycStatus || 'Pending'}</Badge>
                <Badge variant="outline">AML: {selectedBiz.passport?.amlStatus || 'Pending'}</Badge>
                <Badge variant="outline">Level: {selectedBiz.passport?.credentialLevel || 'Basic'}</Badge>
                <Badge variant="outline">Risk: {selectedBiz.passport?.riskRating || 'Low'}</Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
