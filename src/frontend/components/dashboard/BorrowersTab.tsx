'use client'

import { useState } from 'react'
import { useApi } from '@/hooks/use-api'
import { LoadingSkeleton, ErrorState, KPICard, ScoreBar, CircularScore } from '@/frontend/components/dashboard/dashboard-components'
import {
  formatCurrency, formatDate, getStatusBadgeVariant, getStatusColor,
  getCountryFlag, truncate, type Business,
} from '@/lib/dashboard-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Users, UserCheck, UserX, AlertTriangle, Search, Eye,
  Phone, Mail, MapPin, Building2, Shield, Brain, Star,
} from 'lucide-react'

// ─── Constants ──────────────────────────────────────────────────

const BORROWER_STATUSES = ['All', 'Active', 'Verified', 'Pending', 'Suspended', 'Defaulted']
const KYC_STATUSES = ['All', 'verified', 'pending', 'failed', 'not_started']

const KYC_BADGE_COLOR: Record<string, string> = {
  verified: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  pending: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  failed: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  not_started: 'bg-slate-100 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300',
}

const KYC_LABEL: Record<string, string> = {
  verified: 'Verified',
  pending: 'Pending',
  failed: 'Failed',
  not_started: 'Not Started',
}

// ─── Component ──────────────────────────────────────────────────

export function BorrowersTab() {
  const { data: businesses, loading, error, refetch } = useApi<Business[]>('/api/businesses?limit=100')

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [kycFilter, setKycFilter] = useState('All')
  const [selectedBorrower, setSelectedBorrower] = useState<Business | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const allBorrowers = Array.isArray(businesses) ? businesses : []

  // ── KPI calculations ──
  const totalBorrowers = allBorrowers.length
  const activeBorrowers = allBorrowers.filter(b => b.status?.toLowerCase() === 'active' || b.status?.toLowerCase() === 'verified').length
  const pendingKyc = allBorrowers.filter(b => b.passport?.kycStatus === 'pending' || (!b.passport?.kycStatus && b.status?.toLowerCase() === 'pending')).length
  const defaultedBorrowers = allBorrowers.filter(b => b.status?.toLowerCase() === 'defaulted' || b.status?.toLowerCase() === 'suspended').length

  // ── Filtering ──
  const filtered = allBorrowers.filter(b => {
    const matchesSearch = !searchQuery ||
      b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.legalName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.registrationNo?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'All' || b.status?.toLowerCase() === statusFilter.toLowerCase()
    const matchesKyc = kycFilter === 'All' || b.passport?.kycStatus === kycFilter
    return matchesSearch && matchesStatus && matchesKyc
  })

  const openDetail = (b: Business) => {
    setSelectedBorrower(b)
    setDetailOpen(true)
  }

  const kycStatus = (b: Business) => b.passport?.kycStatus || (b.status?.toLowerCase() === 'verified' ? 'verified' : 'not_started')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">Borrowers</h3>
        <p className="text-sm text-muted-foreground">Manage borrower profiles and KYC verification</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Borrowers" value={String(totalBorrowers)} icon={Users} />
        <KPICard title="Active Borrowers" value={String(activeBorrowers)} icon={UserCheck} subtitle={totalBorrowers > 0 ? `${Math.round(activeBorrowers / totalBorrowers * 100)}% of total` : undefined} />
        <KPICard title="Pending KYC" value={String(pendingKyc)} icon={UserX} />
        <KPICard title="Defaulted / Suspended" value={String(defaultedBorrowers)} icon={AlertTriangle} />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, legal name, or reg no..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {BORROWER_STATUSES.map(s => <SelectItem key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={kycFilter} onValueChange={setKycFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="KYC Status" /></SelectTrigger>
          <SelectContent>
            {KYC_STATUSES.map(s => <SelectItem key={s} value={s}>{s === 'All' ? 'All KYC' : KYC_LABEL[s] || s}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Borrowers Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Trust Score</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm font-medium">No borrowers found</p>
                        <p className="text-xs">Try adjusting your search or filter criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(b => {
                  const kyc = kycStatus(b)
                  const trustScore = b.trustScore?.overallScore
                  return (
                    <TableRow key={b.id} className="even:bg-muted/50 cursor-pointer hover:bg-muted/80" onClick={() => openDetail(b)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                            {b.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{b.name}</p>
                            {b.legalName && b.legalName !== b.name && (
                              <p className="text-xs text-muted-foreground">{truncate(b.legalName, 25)}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-lg mr-1">{getCountryFlag(b.country)}</span>
                        <span className="text-xs">{b.country}</span>
                      </TableCell>
                      <TableCell className="text-sm">{b.industry || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] ${KYC_BADGE_COLOR[kyc] || ''}`}>
                          {KYC_LABEL[kyc] || kyc}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {typeof trustScore === 'number' ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16">
                              <ScoreBar score={trustScore} />
                            </div>
                            <span className="text-xs font-medium">{trustScore}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {typeof b.annualRevenue === 'number' ? (
                          <span className="flex items-center gap-1">
                            <span className="text-xs">🇰🇪</span>
                            {formatCurrency(b.annualRevenue, 'KES')}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(b.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openDetail(b) }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Borrower Detail Dialog ─── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedBorrower && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-lg">{getCountryFlag(selectedBorrower.country)}</span>
                  {selectedBorrower.name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-emerald-500" /> Business Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      {selectedBorrower.legalName && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Legal Name</span><span className="font-medium">{selectedBorrower.legalName}</span></div>
                      )}
                      {selectedBorrower.registrationNo && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Reg No</span><span className="font-mono text-xs">{selectedBorrower.registrationNo}</span></div>
                      )}
                      {selectedBorrower.taxId && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Tax ID / KRA PIN</span><span className="font-mono text-xs">{selectedBorrower.taxId}</span></div>
                      )}
                      <div className="flex justify-between"><span className="text-muted-foreground">Country</span><span>{getCountryFlag(selectedBorrower.country)} {selectedBorrower.country}</span></div>
                      {selectedBorrower.city && (
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">City</span><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedBorrower.city}</span></div>
                      )}
                      {selectedBorrower.industry && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Industry</span><span>{selectedBorrower.industry}</span></div>
                      )}
                      {selectedBorrower.employeeCount && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Employees</span><span>{selectedBorrower.employeeCount}</span></div>
                      )}
                      {typeof selectedBorrower.annualRevenue === 'number' && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Annual Revenue</span><span className="font-medium">🇰🇪 {formatCurrency(selectedBorrower.annualRevenue, 'KES')}</span></div>
                      )}
                      {selectedBorrower.website && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Website</span><span className="text-xs text-blue-600 truncate max-w-[180px]">{selectedBorrower.website}</span></div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-emerald-500" /> Status & Verification
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant={getStatusBadgeVariant(selectedBorrower.status)} className={getStatusColor(selectedBorrower.status)}>{selectedBorrower.status}</Badge>
                      </div>
                      {selectedBorrower.verifiedAt && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Verified</span><span className="text-xs">{formatDate(selectedBorrower.verifiedAt)}</span></div>
                      )}
                      <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="text-xs">{formatDate(selectedBorrower.createdAt)}</span></div>
                    </div>
                  </div>
                </div>

                {/* KYC / Passport Section */}
                {selectedBorrower.passport && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-blue-500" /> KYC & Passport Verification
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">KYC Status</p>
                        <Badge variant="secondary" className={`text-[10px] ${KYC_BADGE_COLOR[selectedBorrower.passport.kycStatus || 'not_started'] || ''}`}>
                          {KYC_LABEL[selectedBorrower.passport.kycStatus || 'not_started'] || selectedBorrower.passport.kycStatus || 'N/A'}
                        </Badge>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">AML Status</p>
                        <Badge variant="secondary" className="text-[10px]">{selectedBorrower.passport.amlStatus || 'N/A'}</Badge>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Credential Level</p>
                        <p className="text-sm font-medium">{selectedBorrower.passport.credentialLevel || 'N/A'}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Risk Rating</p>
                        <Badge variant="secondary" className="text-[10px]">{selectedBorrower.passport.riskRating || 'N/A'}</Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trust Score Section */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-amber-500" /> Trust Score
                  </h4>
                  {typeof selectedBorrower.trustScore?.overallScore === 'number' ? (
                    <div className="flex items-center gap-6">
                      <CircularScore score={selectedBorrower.trustScore.overallScore} size={80} />
                      <div className="flex-1">
                        <ScoreBar score={selectedBorrower.trustScore.overallScore} label="Overall Trust Score" />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No trust score available</p>
                  )}
                </div>

                {/* Digital Twin Section */}
                {selectedBorrower.digitalTwin && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                      <Brain className="h-4 w-4 text-purple-500" /> Digital Twin Insights
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Health Score</p>
                        {typeof selectedBorrower.digitalTwin.healthScore === 'number' ? (
                          <div className="flex justify-center"><ScoreBar score={selectedBorrower.digitalTwin.healthScore} /></div>
                        ) : (
                          <p className="text-sm">N/A</p>
                        )}
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Growth Trajectory</p>
                        <p className="text-sm font-medium">{selectedBorrower.digitalTwin.growthTrajectory || 'N/A'}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Risk Appetite</p>
                        <Badge variant="secondary" className="text-[10px]">{selectedBorrower.digitalTwin.riskAppetite || 'N/A'}</Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedBorrower.description && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedBorrower.description}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
