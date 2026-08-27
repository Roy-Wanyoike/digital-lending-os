'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Shield,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Eye,
  History,
  UserCheck,
  AlertCircle,
  Calendar,
  FileSpreadsheet,
  FileDown,
  Search,
  Filter,
  RefreshCw,
  Upload,
  Stamp,
  ClipboardCheck
} from 'lucide-react'

// Types
interface RegulatoryReportGeneratorProps {
  dateRange?: string
  exportFormat?: string
}

// Mock Data - Kenya DCP Regulatory Context
const formatKES = (value: number): string => {
  if (value >= 1000000000) return `KSh ${(value / 1000000000).toFixed(2)}B`
  if (value >= 1000000) return `KSh ${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `KSh ${(value / 1000).toFixed(0)}K`
  return `KSh ${value.toFixed(0)}`
}

// CBK Report Types
const cbkReportTypes = [
  {
    id: 'monthly-returns',
    name: 'Monthly Prudential Returns',
    category: 'Prudential',
    frequency: 'Monthly',
    deadline: '15th of following month',
    description: 'Core financial position and risk metrics as per CBK prudential guidelines',
    status: 'active',
    lastSubmitted: '2025-01-15',
    nextDue: '2025-02-15',
    icon: '📊'
  },
  {
    id: 'quarterly-financials',
    name: 'Quarterly Financial Statements',
    category: 'Financial',
    frequency: 'Quarterly',
    deadline: '30 days after quarter end',
    description: 'Audited/unaudited financial statements for regulatory review',
    status: 'active',
    lastSubmitted: '2024-12-31',
    nextDue: '2025-03-31',
    icon: '📈'
  },
  {
    id: 'annual-audited',
    name: 'Annual Audited Reports',
    category: 'Compliance',
    frequency: 'Annual',
    deadline: '90 days after year end',
    description: 'Full audited financial statements with external auditor opinion',
    status: 'pending_review',
    lastSubmitted: '2024-03-31',
    nextDue: '2025-03-31',
    icon: '📋'
  },
  {
    id: 'customer-protection',
    name: 'Customer Protection Metrics',
    category: 'Consumer',
    frequency: 'Monthly',
    deadline: '20th of following month',
    description: 'Customer complaints, resolution times, and protection KPIs',
    status: 'active',
    lastSubmitted: '2025-01-18',
    nextDue: '2025-02-20',
    icon: '🛡️'
  },
  {
    id: 'aml-report',
    name: 'AML/CFT Returns',
    category: 'Compliance',
    frequency: 'Quarterly',
    deadline: '30 days after quarter end',
    description: 'Anti-Money Laundering and Counter-Terrorism Financing reports',
    status: 'active',
    lastSubmitted: '2024-12-30',
    nextDue: '2025-03-30',
    icon: '🔍'
  },
  {
    id: 'credit-risk',
    name: 'Credit Risk Assessment',
    category: 'Risk',
    frequency: 'Monthly',
    deadline: '15th of following month',
    description: 'Portfolio quality, PAR analysis, and credit risk metrics',
    status: 'active',
    lastSubmitted: '2025-01-14',
    nextDue: '2025-02-15',
    icon: '⚠️'
  },
  {
    id: 'capital-adequacy',
    name: 'Capital Adequacy Return',
    category: 'Prudential',
    frequency: 'Quarterly',
    deadline: '45 days after quarter end',
    description: 'Capital ratios and adequacy assessment per DCP regulations',
    status: 'draft',
    lastSubmitted: '2024-10-15',
    nextDue: '2025-02-15',
    icon: '💰'
  },
  {
    id: 'large-exposures',
    name: 'Large Exposures Report',
    category: 'Risk',
    frequency: 'Monthly',
    deadline: '15th of following month',
    description: 'Single borrower limits and concentration risk reporting',
    status: 'active',
    lastSubmitted: '2025-01-12',
    nextDue: '2025-02-15',
    icon: '📊'
  }
]

// Submission History
const submissionHistory = [
  {
    id: 1,
    reportName: 'Monthly Prudential Returns',
    period: 'December 2024',
    submittedDate: '2025-01-15T09:32:00',
    submittedBy: 'Jane Wanjiku (CFO)',
    status: 'accepted',
    format: 'Excel',
    size: '2.4 MB',
    cbkReference: 'CBK-DCP-2024-12847'
  },
  {
    id: 2,
    reportName: 'Customer Protection Metrics',
    period: 'December 2024',
    submittedDate: '2025-01-18T14:15:00',
    submittedBy: 'Mary Nyokabi (Compliance)',
    status: 'accepted',
    format: 'PDF',
    size: '1.8 MB',
    cbkReference: 'CBK-DCP-2024-12852'
  },
  {
    id: 3,
    reportName: 'Credit Risk Assessment',
    period: 'December 2024',
    submittedDate: '2025-01-14T11:45:00',
    submittedBy: 'Peter Kamau (Risk Manager)',
    status: 'queried',
    format: 'Excel',
    size: '3.1 MB',
    cbkReference: null,
    queryDetails: 'Please clarify PAR calculation methodology used for loans restructured in December'
  },
  {
    id: 4,
    reportName: 'AML/CFT Returns',
    period: 'Q4 2024',
    submittedDate: '2024-12-28T16:00:00',
    submittedBy: 'David Mutiso (MLRO)',
    status: 'accepted',
    format: 'PDF',
    size: '4.2 MB',
    cbkReference: 'CBK-DCP-2024-Q4-892'
  },
  {
    id: 5,
    reportName: 'Quarterly Financial Statements',
    period: 'Q3 2024',
    submittedDate: '2024-10-28T10:00:00',
    submittedBy: 'Jane Wanjiku (CFO)',
    status: 'accepted',
    format: 'PDF',
    size: '8.5 MB',
    cbkReference: 'CBK-DCP-2024-Q3-756'
  }
]

// Data Validation Checks
const validationChecks = [
  { check: 'Data Completeness', status: 'passed', message: 'All required fields populated' },
  { check: 'PAR Calculation', status: 'passed', message: 'Matches CBK definition' },
  { check: 'Capital Ratio', status: 'warning', message: 'Below recommended buffer' },
  { check: 'Large Exposure Limits', status: 'passed', message: 'Within regulatory limits' },
  { check: 'Provisioning Coverage', status: 'passed', message: 'Meets minimum requirements' },
  { check: 'Customer Data Accuracy', status: 'passed', message: 'KYC data current' },
  { check: 'Reporting Period', status: 'passed', message: 'Correct period selected' },
  { check: 'Signatory Authorization', status: 'pending', message: 'Awaiting digital signature' }
]

// Audit Trail Entries
const auditTrail = [
  {
    timestamp: '2025-01-20T14:32:00',
    user: 'Jane Wanjiku',
    action: 'Report Generated',
    details: 'Monthly Prudential Returns - January 2025 draft generated',
    ipAddress: '192.168.1.100'
  },
  {
    timestamp: '2025-01-20T14:35:00',
    user: 'Jane Wanjiku',
    action: 'Data Validation Run',
    details: '8 checks executed, 6 passed, 1 warning, 1 pending',
    ipAddress: '192.168.1.100'
  },
  {
    timestamp: '2025-01-20T14:40:00',
    user: 'Peter Kamau',
    action: 'Review Started',
    details: 'Risk section reviewed and approved',
    ipAddress: '192.168.1.105'
  },
  {
    timestamp: '2025-01-20T14:50:00',
    user: 'Mary Nyokabi',
    action: 'Compliance Review',
    details: 'Customer protection data verified against source systems',
    ipAddress: '192.168.1.108'
  },
  {
    timestamp: '2025-01-20T15:00:00',
    user: 'John Ochieng (CEO)',
    action: 'Awaiting Signature',
    details: 'Report ready for authorized signatory approval',
    ipAddress: 'Pending'
  }
]

export function RegulatoryReportGenerator({ dateRange = 'last30days', exportFormat = 'pdf' }: RegulatoryReportGeneratorProps) {
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [activeTab, setActiveTab] = useState('reports')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="outline" className="border-green-500 text-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Accepted</Badge>
      case 'submitted':
        return <Badge variant="secondary"><Send className="w-3 h-3 mr-1" />Submitted</Badge>
      case 'queried':
        return <Badge variant="outline" className="border-red-500 text-red-600"><AlertCircle className="w-3 h-3 mr-1" />Queried</Badge>
      case 'draft':
        return <Badge variant="secondary" className="bg-slate-200">Draft</Badge>
      case 'pending_review':
        return <Badge variant="outline" className="border-amber-500 text-amber-600"><Clock className="w-3 h-3 mr-1" />Pending Review</Badge>
      case 'active':
        return <Badge variant="outline" className="border-emerald-500 text-emerald-600"><RefreshCw className="w-3 h-3 mr-1" />Active</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-600" />
            CBK Regulatory Reporting
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Central Bank of Kenya compliance reporting for Digital Credit Providers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-blue-500 text-blue-600">
            DCP License: DCP/2022/001234
          </Badge>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Compliance Status Banner */}
      <Card className="bg-gradient-to-r from-emerald-50 via-white to-blue-50 dark:from-emerald-950/20 dark:via-slate-900 dark:to-blue-950/20 border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-emerald-800 dark:text-emerald-200">Regulatory Compliance Status</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">All critical submissions up to date</p>
              </div>
            </div>
            <div className="flex items-center gap-6 ml-auto">
              <div className="text-center">
                <p className="text-xs text-slate-500">Reports Due This Month</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">4</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Submitted On Time</p>
                <p className="text-xl font-bold text-green-600">92%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Open Queries</p>
                <p className="text-xl font-bold text-amber-600">1</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 bg-slate-100 dark:bg-slate-800 p-1">
          <TabsTrigger value="reports">Report Templates</TabsTrigger>
          <TabsTrigger value="history">Submission History</TabsTrigger>
          <TabsTrigger value="validation">Data Validation</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-6 space-y-6">
          {/* Category Filter */}
          <div className="flex items-center gap-4">
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="prudential">Prudential</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="consumer">Consumer Protection</SelectItem>
                <SelectItem value="risk">Risk Management</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Frequencies</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Report Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {cbkReportTypes.map((report) => (
              <Card key={report.id} className={`hover:shadow-lg transition-all cursor-pointer ${
                selectedReport === report.id ? 'ring-2 ring-emerald-500' : ''
              }`} onClick={() => setSelectedReport(report.id)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{report.icon}</span>
                    {getStatusBadge(report.status)}
                  </div>
                  <CardTitle className="text-base mt-2 line-clamp-2">{report.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">{report.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Category:</span>
                      <Badge variant="secondary" className="text-xs">{report.category}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Frequency:</span>
                      <span>{report.frequency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Next Due:</span>
                      <span className={new Date(report.nextDue) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'text-red-600 font-medium' : ''}>
                        {new Date(report.nextDue).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="flex-1" onClick={(e) => e.stopPropagation()}>
                          <Eye className="w-3 h-3 mr-1" /> Preview
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            {report.name}
                          </DialogTitle>
                          <DialogDescription>Preview of {report.name} template</DialogDescription>
                        </DialogHeader>
                        <ReportPreviewTemplate report={report} />
                      </DialogContent>
                    </Dialog>
                    <Button size="sm" className="flex-1" onClick={(e) => e.stopPropagation()}>
                      <FileDown className="w-3 h-3 mr-1" /> Generate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Submission History Tab */}
        <TabsContent value="history" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" />
                    Submission History
                  </CardTitle>
                  <CardDescription>All regulatory submissions to CBK</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" /> Export Log
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Submitted Date</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>CBK Reference</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissionHistory.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">{submission.reportName}</TableCell>
                        <TableCell>{submission.period}</TableCell>
                        <TableCell>
                          {new Date(submission.submittedDate).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="text-sm">{submission.submittedBy}</TableCell>
                        <TableCell>{getStatusBadge(submission.status)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {submission.format === 'PDF' ? <FileDown className="w-3 h-3 mr-1 inline" /> : 
                             submission.format === 'Excel' ? <FileSpreadsheet className="w-3 h-3 mr-1 inline" /> : null}
                            {submission.format}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {submission.cbkReference || '-'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Query Details */}
              {submissionHistory.find(s => s.status === 'queried') && (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">Open Query from CBK</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        {submissionHistory.find((s) => s.status === "queried").queryDetails}
                      </p>
                      <Button size="sm" variant="outline" className="mt-2">
                        Respond to Query
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-purple-600" />
                Pre-Submission Data Validation
              </CardTitle>
              <CardDescription>Automated checks before CBK submission</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {validationChecks.map((check, index) => (
                  <div key={index} className={`flex items-center justify-between p-4 rounded-lg ${
                    check.status === 'passed' ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800' :
                    check.status === 'warning' ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800' :
                    'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                  }`}>
                    <div className="flex items-center gap-3">
                      {check.status === 'passed' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                      {check.status === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                      {check.status === 'pending' && <Clock className="w-5 h-5 text-slate-400" />}
                      <div>
                        <p className="font-medium">{check.check}</p>
                        <p className="text-sm text-slate-500">{check.message}</p>
                      </div>
                    </div>
                    <Badge variant={
                      check.status === 'passed' ? 'outline' :
                      check.status === 'warning' ? 'secondary' : 'default'
                    } className={
                      check.status === 'passed' ? 'border-green-500 text-green-600 capitalize' : 'capitalize'
                    }>
                      {check.status}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-200">Validation Summary</p>
                    <p className="text-sm text-blue-600 dark:text-blue-300">6 passed, 1 warning, 1 pending action</p>
                  </div>
                  <Button disabled={validationChecks.some(c => c.status !== 'passed')}>
                    <Send className="w-4 h-4 mr-2" /> Submit to CBK
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-slate-600" />
                Audit Trail
              </CardTitle>
              <CardDescription>Complete history of report generation and modifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                
                <div className="space-y-6">
                  {auditTrail.map((entry, index) => (
                    <div key={index} className="relative flex gap-6 pl-12">
                      <div className={`absolute left-4 w-5 h-5 rounded-full border-2 ${
                        index === auditTrail.length - 1 ? 'bg-blue-500 border-blue-500' :
                        'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                      }`} />
                      
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{entry.action}</p>
                            <p className="text-sm text-slate-500 mt-0.5">{entry.details}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                {entry.user}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(entry.timestamp).toLocaleString()}
                              </span>
                              {entry.ipAddress !== 'Pending' && (
                                <span>IP: {entry.ipAddress}</span>
                              )}
                            </div>
                          </div>
                          
                          {index === auditTrail.length - 1 && (
                            <Button size="sm" className="shrink-0">
                              <Stamp className="w-4 h-4 mr-1" /> Sign & Submit
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Digital Signature Section */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stamp className="w-5 h-5 text-indigo-600" />
                Authorized Signatory
              </CardTitle>
              <CardDescription>Digital signature representation for regulatory submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 p-6 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  JO
                </div>
                <div>
                  <p className="font-semibold text-lg">John Ochieng</p>
                  <p className="text-slate-500">Chief Executive Officer</p>
                  <p className="text-sm text-slate-400 mt-1">Authorized Signatory for CBK Submissions</p>
                  <Badge variant="outline" className="mt-2 border-indigo-500 text-indigo-600">
                    <UserCheck className="w-3 h-3 mr-1" /> Verified
                  </Badge>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-sm text-slate-500">Digital Certificate</p>
                  <p className="font-mono text-xs text-slate-400">CN=John Ochieng, O=Abepot Credit Ltd, C=KE</p>
                  <p className="text-xs text-slate-400 mt-1">Valid until: Dec 2026</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Report Preview Template Component
function ReportPreviewTemplate({ report }: { report: typeof cbkReportTypes[0] }) {
  // Mock preview data based on report type
  const getPreviewContent = () => {
    switch (report.id) {
      case 'monthly-returns':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-slate-50 rounded">
                <p className="text-xs text-slate-500">Total Assets</p>
                <p className="text-lg font-bold">{formatKES(1250000000)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded">
                <p className="text-xs text-slate-500">Total Liabilities</p>
                <p className="text-lg font-bold">{formatKES(980000000)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded">
                <p className="text-xs text-slate-500">Capital Ratio</p>
                <p className="text-lg font-bold">18.5%</p>
              </div>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Metric</TableHead><TableHead>Value</TableHead><TableHead>Note</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell>Gross Loan Portfolio</TableCell><TableCell className="font-mono">{formatKES(487650000)}</TableCell><TableCell>Before provisions</TableCell></TableRow>
                <TableRow><TableCell>NPL Ratio (PAR90)</TableCell><TableCell className="font-mono">3.8%</TableCell><TableCell>Within limit</TableCell></TableRow>
                <TableRow><TableCell>Provisioning Coverage</TableCell><TableCell className="font-mono">95.2%</TableCell><TableCell>Above minimum</TableCell></TableRow>
                <TableRow><TableCell>Liquidity Ratio</TableCell><TableCell className="font-mono">42.5%</TableCell><TableCell>Healthy</TableCell></TableRow>
              </TableBody>
            </Table>
          </div>
        )
      default:
        return (
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Preview content for {report.name}</p>
            <p className="text-sm mt-2">This would show the actual report template with sample data</p>
          </div>
        )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
        <div>
          <p className="font-medium">Period: January 2025</p>
          <p className="text-sm text-slate-500">Generated: {new Date().toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><FileSpreadsheet className="w-4 h-4 mr-1" /> Excel</Button>
          <Button variant="outline" size="sm"><FileDown className="w-4 h-4 mr-1" /> PDF</Button>
        </div>
      </div>
      
      {getPreviewContent()}
    </div>
  )
}

export default RegulatoryReportGenerator
