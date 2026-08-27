'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ClipboardList,
  Plus,
  Search,
  Eye,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  FileText,
  Phone,
  Mail,
  Star,
  Target,
  RefreshCw,
  Play,
  MessageSquare,
  Users
} from 'lucide-react'

// Types
interface ApplicationQueueItem {
  id: string
  customerName: string
  amount: number
  term: number
  purpose: string
  status: 'new' | 'in_review' | 'pending_info' | 'recommended' | 'escalated'
  submittedAt: string
  priority: 'high' | 'normal' | 'low'
}

interface CurrentReview {
  applicationId: string
  customerName: string
  customerId: string
  phone: string
  requestedAmount: number
  term: number
  purpose: string
  creditScore: number
  grade: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  existingLoans: number
  existingLoanStatus: string
  monthlyIncome?: number
  employmentStatus?: string
}

interface DailyTarget {
  label: string
  current: number
  target: number
  unit: string
}

// Demo Data
const APPLICATION_QUEUE: ApplicationQueueItem[] = [
  { id: 'APP-2026-0848', customerName: 'Mary Wanjiku', amount: 15000, term: 30, purpose: 'School Fees', status: 'new', submittedAt: '10 min ago', priority: 'high' },
  { id: 'APP-2026-0842', customerName: 'James Otieno', amount: 30000, term: 30, purpose: 'Business Capital', status: 'in_review', submittedAt: '1 hr ago', priority: 'normal' },
  { id: 'APP-2026-0849', customerName: 'Grace Atieno', amount: 10000, term: 14, purpose: 'Emergency', status: 'pending_info', submittedAt: '3 hrs ago', priority: 'low' },
  { id: 'APP-2026-0850', customerName: 'Peter Njoroge', amount: 45000, term: 45, purpose: 'Home Repair', status: 'new', submittedAt: '4 hrs ago', priority: 'normal' },
  { id: 'APP-2026-0851', customerName: 'Alice Mumbi', amount: 20000, term: 21, purpose: 'Inventory', status: 'new', submittedAt: '5 hrs ago', priority: 'low' },
]

const CURRENT_REVIEW: CurrentReview = {
  applicationId: 'APP-2026-0842',
  customerName: 'James Otieno',
  customerId: 'CUS-78234',
  phone: '+254712***456',
  requestedAmount: 30000,
  term: 30,
  purpose: 'Business Capital',
  creditScore: 687,
  grade: 'B',
  riskLevel: 'MEDIUM',
  existingLoans: 2,
  existingLoanStatus: 'Both Current',
  monthlyIncome: 45000,
  employmentStatus: 'Self-Employed',
}

const DAILY_TARGETS: DailyTarget[] = [
  { label: 'Applications Processed', current: 8, target: 12, unit: '' },
  { label: 'Approvals Recommended', current: 6, target: 8, unit: '' },
]

interface LoanOfficerWorkspaceProps {
  tenantId: string
  userId: string
  userName?: string
}

export function LoanOfficerWorkspace({ 
  tenantId, 
  userId, 
  userName = 'Faith Chebet' 
}: LoanOfficerWorkspaceProps) {
  const [selectedApplication, setSelectedApplication] = useState<ApplicationQueueItem | null>(null)
  const [showCustomerDetail, setShowCustomerDetail] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const getStatusBadge = (status: ApplicationQueueItem['status']) => {
    const variants = {
      new: { label: 'New', variant: 'default' as const, className: 'bg-blue-100 text-blue-700 border-blue-200' },
      in_review: { label: 'In Review', variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      pending_info: { label: 'Pending Info', variant: 'outline' as const, className: 'bg-orange-100 text-orange-700 border-orange-200' },
      recommended: { label: 'Recommended', variant: 'default' as const, className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      escalated: { label: 'Escalated', variant: 'destructive' as const, className: 'bg-red-100 text-red-700 border-red-200' },
    }
    const config = variants[status]
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
  }

  const getPriorityIcon = (priority: ApplicationQueueItem['priority']) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'low': return <div className="w-4 h-4" />
      default: return null
    }
  }

  const getRiskColor = (risk: CurrentReview['riskLevel']) => {
    switch (risk) {
      case 'LOW': return 'text-emerald-600 bg-emerald-50'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50'
      case 'HIGH': return 'text-red-600 bg-red-50'
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-orange-600" />
            Loan Officer Workspace
          </h1>
          <p className="text-muted-foreground mt-1">Welcome back, {userName}</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Application
        </Button>
      </div>

      {/* Today's Targets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-500" />
            Today's Targets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {DAILY_TARGETS.map((target) => (
              <div key={target.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{target.label}</span>
                  <span className="font-medium">{target.current}/{target.target}{target.unit}</span>
                </div>
                <Progress value={(target.current / target.target) * 100} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  {Math.round((target.current / target.target) * 100)}% complete • {target.target - target.current} remaining
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Application Queue */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg">My Application Queue</CardTitle>
                <CardDescription>{APPLICATION_QUEUE.length} assigned to me</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1">
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {APPLICATION_QUEUE.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>{getPriorityIcon(app.priority)}</TableCell>
                      <TableCell>
                        <p className="font-medium">{app.customerName}</p>
                        <p className="text-xs text-muted-foreground">{app.id}</p>
                      </TableCell>
                      <TableCell className="font-semibold">KSh {(app.amount / 1000).toFixed(0)}K</TableCell>
                      <TableCell className="text-sm">{app.purpose}</TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant={app.status === 'in_review' ? 'default' : 'outline'}
                          size="sm"
                          className="gap-1"
                          onClick={() => setSelectedApplication(app)}
                        >
                          {app.status === 'in_review' ? (
                            <>
                              <Play className="w-3 h-3" />
                              Continue
                            </>
                          ) : app.status === 'new' ? (
                            <>
                              <Play className="w-3 h-3" />
                              Start Review
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              View
                            </>
                          )}
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Currently Reviewing Panel */}
        <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-5 h-5 text-orange-600" />
              Currently Reviewing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-white rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Application ID</span>
                <Badge variant="outline">{CURRENT_REVIEW.applicationId}</Badge>
              </div>
              
              <Separator />
              
              <div>
                <p className="font-semibold text-lg">{CURRENT_REVIEW.customerName}</p>
                <p className="text-sm text-muted-foreground">ID: {CURRENT_REVIEW.customerId}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Requested</p>
                  <p className="font-semibold">KSh {CURRENT_REVIEW.requestedAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Term</p>
                  <p className="font-semibold">{CURRENT_REVIEW.term} days</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-2">Customer Profile</p>
                <div className="flex items-center gap-4">
                  <div className={`px-3 py-1.5 rounded-full font-bold ${getRiskColor(CURRENT_REVIEW.riskLevel)}`}>
                    Score: {CURRENT_REVIEW.creditScore}
                  </div>
                  <Badge variant="outline" className="font-semibold">
                    Grade {CURRENT_REVIEW.grade}
                  </Badge>
                  <Badge 
                    variant={CURRENT_REVIEW.riskLevel === 'LOW' ? 'default' : CURRENT_REVIEW.riskLevel === 'MEDIUM' ? 'secondary' : 'destructive'}
                  >
                    Risk: {CURRENT_REVIEW.riskLevel}
                  </Badge>
                </div>
              </div>

              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Existing Loans</span>
                  <span>{CURRENT_REVIEW.existingLoans} ({CURRENT_REVIEW.existingLoanStatus})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employment</span>
                  <span>{CURRENT_REVIEW.employmentStatus}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Button className="w-full gap-2" size="sm">
                  <Eye className="w-4 h-4" />
                  View Full Profile
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="gap-1" size="sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Recommend Approve
                  </Button>
                  <Button variant="outline" className="gap-1" size="sm">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    Request Info
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="justify-start gap-2 h-auto py-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>New Application</span>
              </Button>
              <Button variant="outline" className="justify-start gap-2 h-auto py-3">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>My Customers</span>
              </Button>
              <Button variant="outline" className="justify-start gap-2 h-auto py-3">
                <Star className="w-5 h-5 text-purple-600" />
                <span>My Stats</span>
              </Button>
              <Button variant="outline" className="justify-start gap-2 h-auto py-3">
                <Phone className="w-5 h-5 text-orange-600" />
                <span>Contact Customer</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Today's Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today's Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium">Approved/Recommended</span>
                </div>
                <span className="font-semibold text-emerald-600">6</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">In Progress</span>
                </div>
                <span className="font-semibold text-blue-600">2</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium">Awaiting Info</span>
                </div>
                <span className="font-semibold text-orange-600">1</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium">Avg Processing Time</span>
                </div>
                <span className="font-semibold">18 min</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Detail Dialog */}
      <Dialog open={showCustomerDetail} onOpenChange={setShowCustomerDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details - {CURRENT_REVIEW.customerName}</DialogTitle>
            <DialogDescription>Complete customer profile and loan history</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-6 p-2">
              {/* Personal Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Full Name</p>
                  <p className="font-semibold">{CURRENT_REVIEW.customerName}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Phone</p>
                  <p className="font-semibold">{CURRENT_REVIEW.phone}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Customer ID</p>
                  <p className="font-semibold">{CURRENT_REVIEW.customerId}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Employment</p>
                  <p className="font-semibold">{CURRENT_REVIEW.employmentStatus}</p>
                </div>
              </div>

              {/* Credit Assessment */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <h4 className="font-semibold mb-3">Credit Assessment</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{CURRENT_REVIEW.creditScore}</p>
                    <p className="text-xs text-muted-foreground">Credit Score</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600">{CURRENT_REVIEW.grade}</p>
                    <p className="text-xs text-muted-foreground">Grade</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{CURRENT_REVIEW.existingLoans}</p>
                    <p className="text-xs text-muted-foreground">Active Loans</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">KSh {(CURRENT_REVIEW.monthlyIncome! / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-muted-foreground">Monthly Income</p>
                  </div>
                </div>
              </div>

              {/* Document Checklist */}
              <div>
                <h4 className="font-semibold mb-3">Document Verification</h4>
                <div className="space-y-2">
                  {[
                    { name: 'National ID', status: 'verified' },
                    { name: 'Passport Photo', status: 'verified' },
                    { name: 'Proof of Address', status: 'verified' },
                    { name: 'Bank Statement (3mo)', status: 'pending' },
                    { name: 'Payslip/Income Proof', status: 'verified' },
                  ].map((doc) => (
                    <div key={doc.name} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{doc.name}</span>
                      {doc.status === 'verified' ? (
                        <Badge className="bg-emerald-600">Verified</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomerDetail(false)}>
              Close
            </Button>
            <Button onClick={() => setShowCustomerDetail(false)}>
              Continue Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
