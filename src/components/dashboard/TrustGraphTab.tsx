'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  useApi, getCountryFlag, getStatusBadgeVariant, getStatusColor,
  getTrustScoreColor, ScoreBar, CircularScore, LoadingSkeleton,
  type Business,
} from '@/lib/dashboard-helpers'

export function TrustGraphTab() {
  const { data: businesses, loading: bLoading } = useApi<Business[]>('/api/businesses?limit=50')
  const { data: _trustData, loading: tLoading } = useApi('/api/trust/scores')
  const [search, setSearch] = useState('')
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null)

  if (bLoading || tLoading) return <LoadingSkeleton />

  const allBusinesses = businesses || []
  const filtered = allBusinesses.filter(b =>
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.country?.toLowerCase().includes(search.toLowerCase()) ||
    b.industry?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Trust Network</h2>
          <p className="text-sm text-slate-500">{filtered.length} businesses in the trust graph</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 20).map(biz => (
                  <TableRow key={biz.id} className="even:bg-muted/50 cursor-pointer hover:bg-muted" onClick={() => setSelectedBiz(biz)}>
                    <TableCell className="font-medium">{biz.name}</TableCell>
                    <TableCell>{getCountryFlag(biz.country)} {biz.country}</TableCell>
                    <TableCell>{biz.industry}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(biz.status)} className={getStatusColor(biz.status)}>{biz.status}</Badge></TableCell>
                    <TableCell>
                      <span className={`font-bold ${getTrustScoreColor(biz.trustScore)}`}>{biz.trustScore}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{biz.passportLevel || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-slate-400" /></TableCell>
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
                <CircularScore score={selectedBiz.trustScore} size={80} />
                <div>
                  <p className="text-2xl font-bold">{selectedBiz.trustScore}<span className="text-sm text-slate-500 font-normal">/100</span></p>
                  <p className="text-sm text-slate-500">Overall Trust Score</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <ScoreBar score={Math.min(100, selectedBiz.trustScore * 1.05)} maxScore={100} label="Identity Verification" />
                <ScoreBar score={Math.min(100, selectedBiz.trustScore * 0.95)} maxScore={100} label="Financial Health" />
                <ScoreBar score={Math.min(100, selectedBiz.trustScore * 1.0)} maxScore={100} label="Compliance" />
                <ScoreBar score={Math.min(100, selectedBiz.trustScore * 0.9)} maxScore={100} label="Reputation" />
                <ScoreBar score={Math.min(100, selectedBiz.trustScore * 0.85)} maxScore={100} label="Network Strength" />
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">KYC: {selectedBiz.kycStatus || 'Pending'}</Badge>
                <Badge variant="outline">AML: {selectedBiz.amlStatus || 'Pending'}</Badge>
                <Badge variant="outline">Level: {selectedBiz.credentialLevel || 'Basic'}</Badge>
                <Badge variant="outline">Risk: {selectedBiz.riskRating || 'Low'}</Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
