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
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Eye,
  FileText,
  UserCheck,
  AlertCircle,
  ClipboardCheck,
  Scale,
  Flag,
  Download,
  Filter
} from 'lucide-react'

// Types
interface KYCQueueItem {
  id: string
  customerName: string
  customerId: string
  submittedAt: string
  documentType: 'id' | 'passport' | 'driving_license' | 'all'
  status: 'pending' | 'reviewing' | 'verified' | 'rejected'
  priority: 'high' | 'normal'
  riskScore?: number
}

interface AMLAlert {
  id: string
  type: 'suspicious_activity' | 'large_transaction' | 'rapid_movement' | 'sanction_match' | 'pattern_match'
  customerName: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'open' | 'investigating' | 'resolved' | 'escalated'
  createdAt: string
  amount?: number
}

interface ComplianceMetric {
  label: string
  value: number
  total: number
  unit: string
  color: string
}

// Demo Data
const KYC_QUEUE: KYCQueueItem[] = [
  { id: 'KYC-001', customerName: 'John Mwangi', customerId: 'CUS-90123', submittedAt: '30 min ago', documentType: 'all', status: 'pending', priority: 'high', riskScore: 15 },
  { id: 'KYC-002', customerName: 'Sarah Achieng', customerId: 'CUS-90124', submittedAt: '2 hrs ago', documentType: 'id', status: 'pending', priority: 'normal', riskScore: 8 },
  { id: 'KYC-003', customerName: 'Peter Kamau', customerId: 'CUS-90125', submittedAt: '4 hrs ago', documentType: 'passport', status: 'reviewing', priority: 'normal', riskScore: 22 },
  { id: 'KYC-004', customerName: 'Grace Wanjiku', customerId: 'CUS-90126', submittedAt: '5 hrs ago', documentType: 'all', status: 'pending', priority: 'high', riskScore: 35 },
  { id: 'KYC-005', customerName: 'James Otieno', customerId: 'CUS-90127', submittedAt: 'Yesterday', documentType: 'driving_license', status: 'verified', priority: 'normal', riskScore: 5 },
]

const AML_ALERTS: AMLAlert[] = [
  { id: 'AML-001', type: 'suspicious_activity', customerName: 'Unknown Entity', description: 'Multiple loan applications from same device within 24 hours', severity: 'high', status: 'open', createdAt: '1 hr ago' },
  { id: 'AML-002', type: 'large_transaction', customerName: 'Michael K.', description: 'Unusual large disbursement (KSh 500K) for new customer', severity: 'medium', status: 'investigating', createdAt: '3 hrs ago', amount: 500000 },
  { id: 'AML-003', type: 'rapid_movement', customerName: 'Alice M.', description: 'Rapid repayment and re-borrowing pattern detected', severity: 'medium', status: 'open', createdAt: '5 hrs ago' },
  { id: 'AML-004', type: 'pattern_match', customerName: 'Multiple Accounts', description: 'Similar contact patterns across 3 accounts', severity: 'high', status: 'investigating', createdAt: '1 day ago' },
]

const COMPLIANCE_METRICS: ComplianceMetric[] = [
  { label: 'KYC Pending Review', value: 12, total: 45, unit: '', color: 'text-orange-600' },
  { label: 'Open AML Alerts', value: 8, total: null as unknown as number, unit: '', color: 'text-red-600' },
  { label: 'This Month Reports', value: 23, total: 30, unit: '', color: 'text-blue-600' },
  { label: 'Audit Score', value: 94, total: 100, unit: '%', color: 'text-emerald-600' },
]

interface ComplianceWorkspaceProps {
  tenantId: string
  userId: string
  userName?: string
}

export function ComplianceWorkspace({ 
  tenantId, 
  userId, 
  userName = 'Sarah Achieng' 
}: ComplianceWorkspaceProps) {
  const [selectedKYC, setSelectedKYC] = useState<KYCQueueItem | null>(null)
  const [kycDialogOpen, setKycDialogOpen] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<AMLAlert | null>(null)
  const [alertDialogOpen, setAlertDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('kyc')

  const getDocumentBadge = (type: KYCQueueItem['documentType']) => {
    const labels = {
      id: 'National ID',
      passport: 'Passport',
      driving_license: "Driver's License",
      all: 'Full KYC',
    }
    return <Badge variant="outline">{labels[type]}</Badge>
  }

  const getKYCStatusBadge = (status: KYCQueueItem['status']) => {
    const variants = {
      pending: { label: 'Pending', variant: 'secondary' as const, className: '' },
      reviewing: { label: 'Reviewing', variant: 'default' as const, className: 'bg-blue-100 text-blue-700 border-blue-200' },
      verified: { label: 'Verified', variant: 'default' as const, className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      rejected: { label: 'Rejected', variant: 'destructive' as const, className: '' },
    }
    const config = variants[status]
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
  }

  const getAlertSeverityBadge = (severity: AMLAlert['severity']) => {
    const variants = {
      critical: { label: '🔴 Critical', className: 'bg-red-100 text-red-800 border-red-300' },
      high: { label: '🟠 High', className: 'bg-orange-100 text-orange-800 border-orange-300' },
      medium: { label: '🟡 Medium', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      low: { label: '🟢 Low', className: 'bg-green-100 text-green-800 border-green-300' },
    }
    const config = variants[severity]
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>
  }

  const getAlertStatusBadge = (status: AMLAlert['status']) => {
    const variants = {
      open: { label: 'Open', variant: 'secondary' as const },
      investigating: { label: 'Investigating', variant: 'default' as const, className: 'bg-blue-100 text-blue-700' },
      resolved: { label: 'Resolved', variant: 'default' as const, className: 'bg-emerald-100 text-emerald-700' },
      escalated: { label: 'Escalated', variant: 'destructive' as const },
    }
    const config = variants[status]
    return <Badge variant={config.variant} className={(config as any).className || ''}>{config.label}</Badge>
  }

  const getAlertTypeIcon = (type: AMLAlert['type']) => {
    switch (type) {
      case 'suspicious_activity': return <Flag className="w-4 h-4 text-red-500" />
      case 'large_transaction': return <AlertTriangle className="w-4 h-4 text-orange-500" />
      case 'rapid_movement': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'sanction_match': return <Shield className="w-4 h-4 text-purple-500" />
      case 'pattern_match': return <Scale className="w-4 h-4 text-blue-500" />
    }
  }

  const filteredKYC = KYC_QUEUE.filter(item =>
    item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.customerId.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-600" />
            Compliance Workspace
          </h1>
          <p className="text-muted-foreground mt-1">Welcome back, {userName}</p>
        </div>
        <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Download className="w-4 h-4" />
          Generate Report
        </Button>
      </div>

      {/* Compliance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COMPLIANCE_METRICS.map((metric) => (
          <Card key={metric.label} className="bg-gradient-to-br from-slate-50 to-white border-slate-100">
            <CardContent className="p-4 md:p-6">
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-bold ${metric.color}`}>{metric.value}{metric.unit}</span>
                {metric.total && (
                  <span className="text-sm text-muted-foreground">/ {metric.total}{metric.unit}</span>
                )}
              </div>
              {metric.total && metric.unit !== '%' && (
                <Progress value={(metric.value / metric.total) * 100} className="h-1.5 mt-2" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={activeTab === 'kyc' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('kyc')}
            className="gap-2"
          >
            <UserCheck className="w-4 h-4" />
            KYC Queue
            <Badge variant="secondary" className="ml-1">
              {KYC_QUEUE.filter(k => k.status === 'pending').length}
            </Badge>
          </Button>
          <Button 
            variant={activeTab === 'aml' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('aml')}
            className="gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            AML Alerts
            <Badge variant="destructive" className="ml-1">
              {AML_ALERTS.filter(a => a.status !== 'resolved').length}
            </Badge>
          </Button>
          <Button 
            variant={activeTab === 'checklist' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('checklist')}
            className="gap-2"
          >
            <ClipboardCheck className="w-4 h-4" />
            Checklists
          </Button>
          <Button 
            variant={activeTab === 'reports' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('reports')}
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            Regulatory Reports
          </Button>
        </div>

        {/* KYC Queue Content */}
        {activeTab === 'kyc' && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">KYC Verification Queue</CardTitle>
                  <CardDescription>{filteredKYC.filter(k => k.status === 'pending').length} pending verifications</CardDescription>
                </div>
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 sm:w-[250px]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKYC.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.customerName}</p>
                          <p className="text-xs text-muted-foreground">{item.customerId}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getDocumentBadge(item.documentType)}</TableCell>
                      <TableCell>
                        <span className={`font-semibold ${
                          (item.riskScore ?? 0) > 25 ? 'text-red-600' : 
                          (item.riskScore ?? 0) > 15 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {item.riskScore ?? '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.submittedAt}</TableCell>
                      <TableCell>{getKYCStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        {item.priority === 'high' ? (
                          <Badge variant="destructive">High</Badge>
                        ) : (
                          <Badge variant="outline">Normal</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.status !== 'verified' && (
                          <Button 
                            size="sm"
                            onClick={() => {
                              setSelectedKYC(item)
                              setKycDialogOpen(true)
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Review
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ALM Alerts Content */}
        {activeTab === 'aml' && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Anti-Money Laundering Alerts
                </CardTitle>
                <CardDescription>Suspicious activity monitoring</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[450px]">
                <div className="space-y-3">
                  {AML_ALERTS.map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                        alert.severity === 'critical' ? 'border-red-200 bg-red-50/30' :
                        alert.severity === 'high' ? 'border-orange-200 bg-orange-50/30' :
                        'border-gray-200'
                      }`}
                      onClick={() => {
                        setSelectedAlert(alert)
                        setAlertDialogOpen(true)
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          {getAlertTypeIcon(alert.type)}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{alert.customerName}</span>
                              {getAlertSeverityBadge(alert.severity)}
                              {getAlertStatusBadge(alert.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">{alert.description}</p>
                            {alert.amount && (
                              <p className="text-sm font-medium text-orange-600 mt-1">
                                Amount: KSh {alert.amount.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{alert.createdAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Checklists Content */}
        {activeTab === 'checklist' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Daily Compliance Checklist</CardTitle>
                <CardDescription>Today's required tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { task: 'Review all new KYC submissions', completed: true, critical: true },
                    { task: 'Process high-risk AML alerts', completed: false, critical: true },
                    { task: 'Verify 5 random customer files', completed: true, critical: false },
                    { task: 'Update SAR log if needed', completed: false, critical: false },
                    { task: 'Review declined applications', completed: true, critical: false },
                    { task: 'Check sanction list updates', completed: true, critical: true },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        item.completed ? 'bg-emerald-100' : 'bg-gray-100'
                      }`}>
                        {item.completed && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        {!item.completed && <div className="w-2 h-2 rounded-full bg-gray-400" />}
                      </div>
                      <span className={`flex-1 ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {item.task}
                      </span>
                      {item.critical && (
                        <Badge variant="destructive" className="text-xs">Critical</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weekly Audit Tasks</CardTitle>
                <CardDescription>This week's audit preparation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { task: 'Generate weekly compliance report', progress: 80 },
                    { task: 'Review exception reports', progress: 60 },
                    { task: 'Sample loan file review (10%)', progress: 40 },
                    { task: 'Staff access review', progress: 0 },
                    { task: 'Third-party vendor check', progress: 20 },
                  ].map((item, index) => (
                    <div key={index} className="space-y-2 p-3 border rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span>{item.task}</span>
                        <span className="text-muted-foreground">{item.progress}%</span>
                      </div>
                      <Progress value={item.progress} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reports Content */}
        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Regulatory Reports</CardTitle>
                <CardDescription>Required regulatory filings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: 'Monthly Transaction Report (CBK)', dueDate: 'Sep 5, 2026', status: 'ready' },
                  { name: 'Quarterly AML Report', dueDate: 'Sep 30, 2026', status: 'in_progress' },
                  { name: 'Annual Compliance Certificate', dueDate: 'Dec 31, 2026', status: 'not_started' },
                  { name: 'SAR Filing Log', dueDate: 'Ongoing', status: 'current' },
                ].map((report, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{report.name}</p>
                      <p className="text-sm text-muted-foreground">Due: {report.dueDate}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.status === 'ready' && <Badge className="bg-emerald-600">Ready</Badge>}
                      {report.status === 'in_progress' && <Badge className="bg-blue-600">In Progress</Badge>}
                      {report.status === 'not_started' && <Badge variant="secondary">Not Started</Badge>}
                      {report.status === 'current' && <Badge className="bg-purple-600">Current</Badge>}
                      <Button size="sm" variant="outline">
                        <FileText className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
              <CardHeader>
                <CardTitle className="text-lg">Quick Generate</CardTitle>
                <CardDescription>Common report templates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <p className="font-medium">Suspicious Activity Report (SAR)</p>
                    <p className="text-xs text-muted-foreground">For flagged transactions</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  <div className="text-left">
                    <p className="font-medium">KYC Summary Report</p>
                    <p className="text-xs text-muted-foreground">Verification statistics</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <div className="text-left">
                    <p className="font-medium">AML Monitoring Report</p>
                    <p className="text-xs text-muted-foreground">Alert trends & resolution</p>
                  </div>
                </Button>

                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                  <Download className="w-5 h-5 text-purple-600" />
                  <div className="text-left">
                    <p className="font-medium">Audit Trail Export</p>
                    <p className="text-xs text-muted-foreground">Complete activity log</p>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* KYC Review Dialog */}
      <Dialog open={kycDialogOpen} onOpenChange={setKycDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              KYC Document Review
            </DialogTitle>
            <DialogDescription>
              {selectedKYC && `Reviewing documents for ${selectedKYC.customerName}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedKYC && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Customer ID</p>
                  <p className="font-medium">{selectedKYC.customerId}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Risk Score</p>
                  <p className={`font-bold ${selectedKYC.riskScore && selectedKYC.riskScore > 20 ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedKYC.riskScore ?? 'N/A'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">Documents Submitted</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { name: 'National ID', status: 'uploaded' },
                    { name: 'Passport Photo', status: 'uploaded' },
                    { name: 'Proof of Address', status: 'pending' },
                    { name: 'Bank Statement', status: 'uploaded' },
                    { name: 'PIN Certificate', status: 'uploaded' },
                    { name: 'Selfie/Video', status: 'uploaded' },
                  ].map((doc) => (
                    <div key={doc.name} className="p-3 border rounded-lg text-center">
                      <FileText className={`w-6 h-6 mx-auto mb-1 ${doc.status === 'uploaded' ? 'text-emerald-500' : 'text-gray-300'}`} />
                      <p className="text-xs">{doc.name}</p>
                      <Badge variant={doc.status === 'uploaded' ? 'default' : 'secondary'} className="mt-1 text-xs">
                        {doc.status === 'uploaded' ? 'Uploaded' : 'Missing'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium mb-2 block">Verification Decision</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select decision..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approve">✅ Approve - All Documents Valid</SelectItem>
                    <SelectItem value="conditional">⚠️ Conditional Approval - Additional Info Needed</SelectItem>
                    <SelectItem value="reject">❌ Reject - Invalid/Fraudulent Documents</SelectItem>
                    <SelectItem value="escalate">🔝 Escalate to Senior Officer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Notes / Reason</label>
                <textarea 
                  className="w-full p-3 border rounded-lg resize-none"
                  rows={3}
                  placeholder="Add verification notes or reason for decision..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setKycDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              Submit Decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AML Alert Detail Dialog */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              AML Alert Details
            </DialogTitle>
            <DialogDescription>
              {selectedAlert && `Reviewing alert ${selectedAlert.id}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-4 py-4">
              <div className={`p-4 rounded-lg ${
                selectedAlert.severity === 'critical' ? 'bg-red-50 border border-red-200' :
                selectedAlert.severity === 'high' ? 'bg-orange-50 border border-orange-200' :
                'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Alert Type</span>
                  {getAlertSeverityBadge(selectedAlert.severity)}
                </div>
                <p className="capitalize">{selectedAlert.type.replace('_', ' ')}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Related Customer</p>
                  <p className="font-medium">{selectedAlert.customerName}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{selectedAlert.createdAt}</p>
                </div>
                {selectedAlert.amount && (
                  <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                    <p className="text-sm text-muted-foreground">Transaction Amount</p>
                    <p className="font-bold text-orange-600">KSh {selectedAlert.amount.toLocaleString()}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Description</p>
                <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedAlert.description}</p>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium mb-2 block">Resolution Action</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clear">✅ Clear Alert - False Positive</SelectItem>
                    <SelectItem value="file_sar">📋 File SAR Report</SelectItem>
                    <SelectItem value="freeze">🔒 Freeze Account Pending Investigation</SelectItem>
                    <SelectItem value="escalate">🔝 Escalate to MLRO</SelectItem>
                    <SelectItem value="monitor">👁️ Enhanced Monitoring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAlertDialogOpen(false)}>
              Close
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700">
              Submit Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
