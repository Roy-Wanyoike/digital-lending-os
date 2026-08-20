'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  UserCheck,
  ArrowRightLeft,
  MoreHorizontal,
  Eye,
  AlertTriangle,
  TrendingUp,
  Users,
  Inbox,
  ChevronDown,
  Loader2
} from 'lucide-react'
import { ApplicationReviewScreen } from './ApplicationReviewScreen'
import { BulkApprovalModal } from './BulkApprovalModal'
import { LoanApplication, ApplicationFilters, ReviewDashboardStats } from './types'
import {
  mockApplications,
  mockDashboardStats,
  formatCurrency,
  formatDate,
  getRelativeTime,
  getPriorityBadge
} from './mock-data'

interface ApplicationReviewDashboardProps {
  onApplicationSelect?: (application: LoanApplication) => void
}

export function ApplicationReviewDashboard({ onApplicationSelect }: ApplicationReviewDashboardProps) {
  const [stats] = useState<ReviewDashboardStats>(mockDashboardStats)
  const [applications] = useState<LoanApplication[]>(mockApplications)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<ApplicationFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<LoanApplication | null>(null)
  const [showBulkApprove, setShowBulkApprove] = useState(false)
  const [showBulkReturn, setShowBulkReturn] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Filter applications
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          app.customerName.toLowerCase().includes(query) ||
          app.applicationNumber.toLowerCase().includes(query) ||
          app.phone.includes(query)
        if (!matchesSearch) return false
      }

      // Product type filter
      if (filters.productType && app.productType !== filters.productType) return false

      // Amount range filter
      if (filters.amountMin && app.amountRequested < filters.amountMin) return false
      if (filters.amountMax && app.amountRequested > filters.amountMax) return false

      // Risk score range filter
      if (filters.riskScoreMin && app.riskScore < filters.riskScoreMin) return false
      if (filters.riskScoreMax && app.riskScore > filters.riskScoreMax) return false

      // Priority filter
      if (filters.priority && app.priority !== filters.priority) return false

      // Status filter
      if (filters.status && app.status !== filters.status) return false

      return true
    })
  }, [applications, searchQuery, filters])

  // Get unique product types for filter dropdown
  const productTypes = useMemo(() => {
    const types = new Set(applications.map(app => app.productType))
    return Array.from(types).sort()
  }, [applications])

  // Handle row selection
  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Handle select all visible rows
  const handleSelectAll = () => {
    const allVisibleIds = filteredApplications.map(app => app.id)
    const allSelected = allVisibleIds.every(id => selectedIds.has(id))
    
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allVisibleIds))
    }
  }

  // Handle application click
  const handleApplicationClick = (application: LoanApplication) => {
    setSelectedApplication(application)
    onApplicationSelect?.(application)
  }

  // Handle bulk approve
  const handleBulkApprove = async () => {
    setShowBulkApprove(true)
  }

  // Handle bulk return to maker
  const handleBulkReturnToMaker = async () => {
    setIsProcessing(true)
    setTimeout(() => {
      toast.success(`${selectedIds.size} applications returned to maker`)
      setSelectedIds(new Set())
      setIsProcessing(false)
      setShowBulkReturn(false)
    }, 1500)
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({})
    setSearchQuery('')
  }

  // Stats cards data
  const statsCards = [
    {
      title: 'Pending My Review',
      value: stats.pendingMyReview,
      icon: Inbox,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      description: 'Requires your attention'
    },
    {
      title: 'Pending Approval',
      value: stats.pendingApproval,
      icon: UserCheck,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      description: 'Awaiting approval decision'
    },
    {
      title: 'Approved Today',
      value: stats.approvedToday,
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      description: `${((stats.approvedToday / (stats.approvedToday + stats.rejectedToday)) * 100).toFixed(0)}% approval rate`
    },
    {
      title: 'Rejected Today',
      value: stats.rejectedToday,
      icon: XCircle,
      color: 'text-red-600 bg-red-50 border-red-200',
      description: 'Needs review'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Application Review Queue</h2>
          <p className="text-muted-foreground mt-1">
            Review and process loan applications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            <Clock className="w-4 h-4 mr-1" />
            Avg Review: {stats.avgReviewTime}h
          </Badge>
          {stats.overdueReviews > 0 && (
            <Badge variant="destructive" className="px-3 py-1 animate-pulse">
              <AlertTriangle className="w-4 h-4 mr-1" />
              {stats.overdueReviews} Overdue
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
                <div className={`p-2 rounded-lg border ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <Button 
                    size="sm" 
                    onClick={handleBulkApprove}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Approve ({selectedIds.size})
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowBulkReturn(true)}
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-1" />
                    Return ({selectedIds.size})
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                </>
              )}
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-1" />
                Filters
                {(filters.productType || filters.priority || filters.amountMin || filters.amountMax || filters.riskScoreMin || filters.riskScoreMax) && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                    {[filters.productType, filters.priority, filters.amountMin, filters.amountMax, filters.riskScoreMin, filters.riskScoreMax].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Product Type</Label>
                  <Select 
                    value={filters.productType || 'all'} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, productType: value === 'all' ? undefined : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Products" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      {productTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select 
                    value={filters.priority || 'all'} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value === 'all' ? undefined : value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="low">Low Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amount Range (KES)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.amountMin || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, amountMin: e.target.value ? Number(e.target.value) : undefined }))}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.amountMax || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, amountMax: e.target.value ? Number(e.target.value) : undefined }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Risk Score Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      min="0"
                      max="100"
                      value={filters.riskScoreMin || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, riskScoreMin: e.target.value ? Number(e.target.value) : undefined }))}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      min="0"
                      max="100"
                      value={filters.riskScoreMax || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, riskScoreMax: e.target.value ? Number(e.target.value) : undefined }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {/* Applications Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={filteredApplications.length > 0 && filteredApplications.every(app => selectedIds.has(app.id))}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Application ID</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                      <p className="text-muted-foreground">No applications found matching your criteria</p>
                      <Button variant="link" onClick={clearFilters}>Clear filters</Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApplications.map((app) => {
                    const priority = getPriorityBadge(app.priority)
                    return (
                      <TableRow 
                        key={app.id}
                        className={`cursor-pointer transition-colors ${selectedApplication?.id === app.id ? 'bg-blue-50 dark:bg-blue-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                        onClick={() => handleApplicationClick(app)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(app.id)}
                            onCheckedChange={() => handleSelectRow(app.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <code className="text-sm font-mono">{app.applicationNumber}</code>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{app.customerName}</p>
                            <p className="text-xs text-muted-foreground">{app.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(app.amountRequested)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{app.productType}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{getRelativeTime(app.submittedAt)}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(app.submittedAt)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRiskScoreColor(app.riskScore)}`}>
                            {app.riskScore}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${priority.className}`}>
                            {priority.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{app.assignedToName || 'Unassigned'}</span>
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleApplicationClick(app)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Table Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
            <span>Showing {filteredApplications.length} of {applications.length} applications</span>
            {selectedIds.size > 0 && (
              <span>{selectedIds.size} selected</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Application Review Screen Modal */}
      {selectedApplication && (
        <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Review Application: {selectedApplication.applicationNumber}
              </DialogTitle>
              <DialogDescription>
                Customer: {selectedApplication.customerName} | Amount: {formatCurrency(selectedApplication.amountRequested)}
              </DialogDescription>
            </DialogHeader>
            <ApplicationReviewScreen 
              application={selectedApplication}
              onClose={() => setSelectedApplication(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Approval Modal */}
      <BulkApprovalModal
        open={showBulkApprove}
        onClose={() => setShowBulkApprove(false)}
        applications={applications.filter(app => selectedIds.has(app.id))}
        onComplete={() => {
          setSelectedIds(new Set())
          setShowBulkApprove(false)
        }}
      />

      {/* Return to Maker Confirmation */}
      <Dialog open={showBulkReturn} onOpenChange={setShowBulkReturn}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return to Maker</DialogTitle>
            <DialogDescription>
              Return {selectedIds.size} application(s) back to the maker for additional information?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                The maker will be notified to provide additional information or corrections.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkReturn(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              variant="default" 
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleBulkReturnToMaker}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ApplicationReviewDashboard
