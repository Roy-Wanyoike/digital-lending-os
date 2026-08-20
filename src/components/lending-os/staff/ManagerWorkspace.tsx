'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  UserCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Users,
  DollarSign,
  FileText,
  BarChart3,
  ArrowRight,
  RefreshCw,
  Filter
} from 'lucide-react'

// Types
interface PendingApplication {
  id: string
  applicantName: string
  amount: number
  term: number
  creditScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  purpose: string
  submittedAt: string
  loanOfficer: string
}

interface TeamMember {
  id: string
  name: string
  role: 'LOAN_OFFICER' | 'COLLECTIONS_AGENT'
  todayProcessed: number
  todayApproved: number
  weeklyTarget: number
  weeklyProgress: number
}

interface CreditDecision {
  approved: number
  rejected: number
  pending: number
  avgProcessingTime: number // hours
}

// Demo Data
const PENDING_APPLICATIONS: PendingApplication[] = [
  { id: 'APP-2026-0845', applicantName: 'John Mwangi', amount: 50000, term: 30, creditScore: 722, riskLevel: 'LOW', purpose: 'Business Expansion', submittedAt: '2 hrs ago', loanOfficer: 'Faith C.' },
  { id: 'APP-2026-0846', applicantName: 'Sarah Achieng', amount: 25000, term: 14, creditScore: 654, riskLevel: 'MEDIUM', purpose: 'School Fees', submittedAt: '4 hrs ago', loanOfficer: 'David K.' },
  { id: 'APP-2026-0847', applicantName: 'Peter Kamau', amount: 80000, term: 45, creditScore: 589, riskLevel: 'HIGH', purpose: 'Emergency Medical', submittedAt: '6 hrs ago', loanOfficer: 'Faith C.' },
]

const TEAM_MEMBERS: TeamMember[] = [
  { id: '1', name: 'Faith Chebet', role: 'LOAN_OFFICER', todayProcessed: 8, todayApproved: 6, weeklyTarget: 40, weeklyProgress: 32 },
  { id: '2', name: 'David Kimani', role: 'LOAN_OFFICER', todayProcessed: 5, todayApproved: 4, weeklyTarget: 40, weeklyProgress: 28 },
  { id: '3', name: 'Grace Mwangi', role: 'COLLECTIONS_AGENT', todayProcessed: 12, todayApproved: 0, weeklyTarget: 60, weeklyProgress: 45 },
  { id: '4', name: 'Joseph Mutua', role: 'COLLECTIONS_AGENT', todayProcessed: 8, todayApproved: 0, weeklyTarget: 60, weeklyProgress: 38 },
]

const CREDIT_DECISIONS: CreditDecision = {
  approved: 34,
  rejected: 8,
  pending: 3,
  avgProcessingTime: 4.2,
}

interface ManagerWorkspaceProps {
  tenantId: string
  userId: string
  userName?: string
}

export function ManagerWorkspace({ 
  tenantId, 
  userId, 
  userName = 'Samuel Otieno' 
}: ManagerWorkspaceProps) {
  const [selectedApp, setSelectedApp] = useState<PendingApplication | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [activeTab, setActiveTab] = useState('approvals')

  const getRiskBadge = (risk: PendingApplication['riskLevel']) => {
    const variants = {
      LOW: { label: 'Low Risk', variant: 'default' as const, className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      MEDIUM: { label: 'Medium', variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      HIGH: { label: 'High Risk', variant: 'outline' as const, className: 'bg-orange-100 text-orange-700 border-orange-200' },
      CRITICAL: { label: 'Critical', variant: 'destructive' as const, className: 'bg-red-100 text-red-700 border-red-200' },
    }
    const config = variants[risk]
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
  }

  const getScoreColor = (score: number) => {
    if (score >= 700) return 'text-emerald-600 font-bold'
    if (score >= 600) return 'text-blue-600 font-semibold'
    if (score >= 500) return 'text-orange-600 font-semibold'
    return 'text-red-600 font-bold'
  }

  const handleApprove = (app: PendingApplication) => {
    // In real app, would call API
    console.log('Approving application:', app.id)
  }

  const handleReject = () => {
    if (selectedApp && rejectReason) {
      console.log('Rejecting application:', selectedApp.id, 'Reason:', rejectReason)
      setRejectDialogOpen(false)
      setRejectReason('')
      setSelectedApp(null)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <UserCheck className="w-8 h-8 text-blue-600" />
            Manager Workspace
          </h1>
          <p className="text-muted-foreground mt-1">Welcome back, {userName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 px-3 py-1">
            <Clock className="w-3 h-3" />
            {PENDING_APPLICATIONS.length} Pending Approvals
          </Badge>
        </div>
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Applications This Week</p>
                <p className="text-2xl font-bold">45</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" /> +15% vs Last Week
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approval Rate</p>
                <p className="text-2xl font-bold">78%</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" /> +3% vs Last Month
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-full">
                <ThumbsUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Collections Today</p>
                <p className="text-2xl font-bold">KSh 89K</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" /> +12% vs Yesterday
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
          <TabsTrigger value="team">Team Queue</TabsTrigger>
          <TabsTrigger value="decisions">Credit Decisions</TabsTrigger>
        </TabsList>

        {/* Pending Approvals Tab */}
        <TabsContent value="approvals" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    Pending My Approval
                  </CardTitle>
                  <CardDescription>{PENDING_APPLICATIONS.length} applications awaiting your review</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PENDING_APPLICATIONS.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{app.applicantName}</p>
                          <p className="text-xs text-muted-foreground">{app.purpose}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">KSh {(app.amount / 1000).toFixed(0)}K</TableCell>
                      <TableCell className={getScoreColor(app.creditScore)}>{app.creditScore}</TableCell>
                      <TableCell>{getRiskBadge(app.riskLevel)}</TableCell>
                      <TableCell className="text-muted-foreground">{app.submittedAt}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {/* View details */}}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleApprove(app)}
                          >
                            <ThumbsUp className="w-3 h-3" />
                            Approve
                          </Button>
                          <Dialog open={rejectDialogOpen && selectedApp?.id === app.id} onOpenChange={(open) => {
                            setRejectDialogOpen(open)
                            if (open) setSelectedApp(app)
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="gap-1"
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Reject Application</DialogTitle>
                                <DialogDescription>
                                  You are rejecting {app.applicantName}'s application for KSh {app.amount.toLocaleString()}. Please provide a reason.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                <Textarea
                                  placeholder="Enter rejection reason..."
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  rows={4}
                                />
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button variant="destructive" onClick={handleReject}>
                                  Reject Application
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Queue Tab */}
        <TabsContent value="team" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Loan Officers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Loan Officers
                </CardTitle>
                <CardDescription>Today's processing activity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {TEAM_MEMBERS.filter(m => m.role === 'LOAN_OFFICER').map((member) => (
                  <div key={member.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-medium">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">Loan Officer</p>
                        </div>
                      </div>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Processed Today</p>
                        <p className="font-semibold">{member.todayProcessed} apps</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Approved</p>
                        <p className="font-semibold text-emerald-600">{member.todayApproved} apps</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Weekly Progress</span>
                        <span>{member.weeklyProgress}/{member.weeklyTarget}</span>
                      </div>
                      <Progress value={(member.weeklyProgress / member.weeklyTarget) * 100} className="h-2" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Collections Agents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  Collections Agents
                </CardTitle>
                <CardDescription>Today's recovery activity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {TEAM_MEMBERS.filter(m => m.role === 'COLLECTIONS_AGENT').map((member) => (
                  <div key={member.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-medium">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">Collections Agent</p>
                        </div>
                      </div>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Accounts Contacted</p>
                        <p className="font-semibold">{member.todayProcessed}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Recovered</p>
                        <p className="font-semibold text-emerald-600">KSh {(member.todayProcessed * 3.7).toFixed(0)}K</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Weekly Target</span>
                        <span>{member.weeklyProgress}/{member.weeklyTarget}</span>
                      </div>
                      <Progress value={(member.weeklyProgress / member.weeklyTarget) * 100} className="h-2" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Credit Decisions Tab */}
        <TabsContent value="decisions" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Decision Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                  This Week's Decisions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-emerald-50 rounded-lg">
                    <p className="text-3xl font-bold text-emerald-600">{CREDIT_DECISIONS.approved}</p>
                    <p className="text-sm text-muted-foreground">Approved</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-3xl font-bold text-red-600">{CREDIT_DECISIONS.rejected}</p>
                    <p className="text-sm text-muted-foreground">Rejected</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-3xl font-bold text-yellow-600">{CREDIT_DECISIONS.pending}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Approval Rate</span>
                    <span className="font-semibold text-emerald-600">
                      {Math.round(CREDIT_DECISIONS.approved / (CREDIT_DECISIONS.approved + CREDIT_DECISIONS.rejected) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg Processing Time</span>
                    <span className="font-semibold">{CREDIT_DECISIONS.avgProcessingTime} hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Volume Approved</span>
                    <span className="font-semibold">KSh 1.8M</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>Common manager tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Filter className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Bulk Review</p>
                    <p className="text-xs text-muted-foreground">Review multiple applications at once</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Override Policy</p>
                    <p className="text-xs text-muted-foreground">Approve edge cases with justification</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Reassign Workload</p>
                    <p className="text-xs text-muted-foreground">Balance team assignments</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Escalations</p>
                    <p className="text-xs text-muted-foreground">Handle escalated applications</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Team Reports</p>
                    <p className="text-xs text-muted-foreground">View performance analytics</p>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
