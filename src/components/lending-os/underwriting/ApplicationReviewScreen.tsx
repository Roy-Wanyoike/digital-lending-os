'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
  User,
  UserCheck,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  FileText,
  Shield,
  Clock,
  DollarSign,
  Target,
  MessageSquare,
  Send,
  Download,
  Printer,
  Eye,
  ZoomIn,
  ChevronRight,
  Info,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { ApprovalWorkflowTracker } from './ApprovalWorkflowTracker'
import { DecisionHistoryPanel } from './DecisionHistoryPanel'
import { CreditMemoGenerator } from './CreditMemoGenerator'
import { LoanApplication, RejectReason, RequestedInfoItem } from './types'
import {
  mockCustomerSummary,
  mockRiskAssessment,
  mockDocuments,
  mockPreviousLoans,
  mockWorkflowHistory,
  mockDecisionHistory,
  mockPendingApprovals,
  formatCurrency,
  formatDate,
  getRiskScoreColor
} from './mock-data'

interface ApplicationReviewScreenProps {
  application: LoanApplication
  onClose?: () => void
}

export function ApplicationReviewScreen({ application, onClose }: ApplicationReviewScreenProps) {
  const [activeTab, setActiveTab] = useState('review')
  const [decisionMode, setDecisionMode] = useState<'approve' | 'reject' | 'return' | null>(null)
  
  // Approve form state
  const [approvedAmount, setApprovedAmount] = useState(application.amountRequested)
  const [interestRate, setInterestRate] = useState(application.proposedInterestRate)
  const [termMonths, setTermMonths] = useState(application.termMonths)
  const [conditions, setConditions] = useState('')
  const [approveComment, setApproveComment] = useState('')
  
  // Reject form state
  const [rejectReason, setRejectReason] = useState<RejectReason>('other')
  const [rejectDetail, setRejectDetail] = useState('')
  const [reapplyDays, setReapplyDays] = useState(30)
  
  // Return to maker form state
  const [returnQuestions, setReturnQuestions] = useState('')
  const [requestedInfo, setRequestedInfo] = useState<RequestedInfoItem[]>([
    { item: 'Updated bank statement', required: true },
    { item: 'Proof of income (payslip)', required: false },
    { item: 'Additional ID verification', required: false },
    { item: 'Collateral documentation', required: false }
  ])
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)

  const customerSummary = mockCustomerSummary
  const riskAssessment = mockRiskAssessment
  const documents = mockDocuments
  const previousLoans = mockPreviousLoans
  const workflowHistory = mockWorkflowHistory

  // Handle approve action
  const handleApprove = async () => {
    if (!approveComment.trim()) {
      toast.error('Please provide a comment for this approval')
      return
    }
    
    setIsSubmitting(true)
    setTimeout(() => {
      toast.success(`Application ${application.applicationNumber} approved for KES ${approvedAmount.toLocaleString()}`)
      setIsSubmitting(false)
      onClose?.()
    }, 1500)
  }

  // Handle reject action
  const handleReject = async () => {
    if (!rejectDetail.trim()) {
      toast.error('Please provide details for the rejection')
      return
    }
    
    setIsSubmitting(true)
    setTimeout(() => {
      toast.success(`Application ${application.applicationNumber} rejected`)
      setIsSubmitting(false)
      onClose?.()
    }, 1500)
  }

  // Handle return to maker
  const handleReturnToMaker = async () => {
    if (!returnQuestions.trim()) {
      toast.error('Please provide questions or instructions for the maker')
      return
    }
    
    setIsSubmitting(true)
    setTimeout(() => {
      toast.success(`Application ${application.applicationNumber} returned to maker`)
      setIsSubmitting(false)
      onClose?.()
    }, 1500)
  }

  // Toggle requested info item
  const toggleRequestedInfo = (index: number) => {
    setRequestedInfo(prev => prev.map((item, i) => 
      i === index ? { ...item, required: !item.required } : item
    ))
  }

  // Calculate monthly installment
  const calculateInstallment = (amount: number, rate: number, months: number) => {
    const totalInterest = (amount * rate / 100) * (months / 12)
    return Math.ceil((amount + totalInterest) / months)
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="review">Application Review</TabsTrigger>
          <TabsTrigger value="workflow">Workflow Tracker</TabsTrigger>
          <TabsTrigger value="credit-memo">Credit Memo</TabsTrigger>
          <TabsTrigger value="history">Decision History</TabsTrigger>
        </TabsList>

        {/* Main Review Tab */}
        <TabsContent value="review" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Application Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Summary Card */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5 text-blue-600" />
                    Customer Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Full Name</p>
                          <p className="font-medium">{customerSummary.fullName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{customerSummary.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{customerSummary.email || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">ID Number</p>
                          <p className="font-medium font-mono">{customerSummary.nationalId}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Member Since</p>
                          <p className="font-medium">{new Date(customerSummary.memberSince).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Total Loans Taken</p>
                          <p className="font-medium">{customerSummary.totalLoansTaken} loans ({formatCurrency(customerSummary.totalBorrowed)})</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Repayment Rate</p>
                          <div className="flex items-center gap-2">
                            <Progress value={customerSummary.repaymentRate} className="h-2 w-20" />
                            <span className={`font-bold ${customerSummary.repaymentRate >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {customerSummary.repaymentRate}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                          <p className="font-medium">{formatCurrency(customerSummary.outstandingBalance)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Employment Info */}
                  {customerSummary.employerName && (
                    <Separator className="my-4" />
                  )}
                  {customerSummary.employerName && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div className="flex items-center gap-3">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Employment</p>
                          <p className="font-medium">{customerSummary.employmentStatus} at {customerSummary.employerName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Monthly Income</p>
                          <p className="font-medium">{formatCurrency(customerSummary.monthlyIncome || 0)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Requested Loan Card */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    Requested Loan Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Amount Requested</p>
                      <p className="text-xl font-bold text-emerald-600">{formatCurrency(application.amountRequested)}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Product Type</p>
                      <p className="font-semibold">{application.productType}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Purpose</p>
                      <p className="font-semibold">{application.purpose}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Term</p>
                      <p className="font-semibold">{application.termMonths} months</p>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-800 dark:text-blue-200">Proposed Interest Rate</span>
                      <span className="text-lg font-bold text-blue-700 dark:text-blue-300">{application.proposedInterestRate}% p.a.</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-blue-800 dark:text-blue-200">Est. Monthly Installment</span>
                      <span className="font-semibold text-blue-700 dark:text-blue-300">
                        {formatCurrency(calculateInstallment(application.amountRequested, application.proposedInterestRate, application.termMonths))}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Assessment Panel */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="w-5 h-5 text-purple-600" />
                    Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Overall Score */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl">
                    <div className="text-center">
                      <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full border-4 ${getRiskScoreColor(riskAssessment.overallScore)} text-3xl font-bold`}>
                        {riskAssessment.overallScore}
                      </div>
                      <p className="mt-2 text-sm font-medium uppercase">{riskAssessment.overallRating} Risk</p>
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Credit Score (CRB)</span>
                          <Badge variant={riskAssessment.creditScore.score >= 650 ? "default" : "destructive"}>
                            {riskAssessment.creditScore.score}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Bureau</span>
                          <span className="text-xs">{riskAssessment.creditScore.bureau}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Existing Exposure</span>
                          <span className="text-sm font-medium">{formatCurrency(riskAssessment.creditScore.totalExposure)}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Affordability</span>
                          <Badge variant={riskAssessment.affordability.status === 'pass' ? "default" : "destructive"} className={riskAssessment.affordability.status === 'pass' ? 'bg-emerald-600' : ''}>
                            {riskAssessment.affordability.status === 'pass' ? (
                              <><CheckCircle2 className="w-3 h-3 mr-1" /> PASS</>
                            ) : (
                              <><XCircle className="w-3 h-3 mr-1" /> FAIL</>
                            )}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">DTI Ratio</span>
                          <span className="text-sm font-medium">{riskAssessment.affordability.dtiRatio}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Post-Loan DTI</span>
                          <span className="text-sm font-medium">{riskAssessment.affordability.newDtiRatio}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Policy Rules Check */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <CheckCircled className="w-4 h-4 text-emerald-600" />
                      Policy Rules Check
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {riskAssessment.policyRules.map((rule) => (
                        <div 
                          key={rule.ruleId}
                          className={`flex items-start gap-2 p-3 rounded-lg border ${
                            rule.status === 'passed' 
                              ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' 
                              : rule.status === 'failed'
                              ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                              : 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
                          }`}
                        >
                          {rule.status === 'passed' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                          ) : rule.status === 'failed' ? (
                            <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{rule.ruleName}</p>
                            <p className="text-xs text-muted-foreground truncate">{rule.description}</p>
                            {rule.value !== undefined && (
                              <p className="text-xs mt-1">
                                <span className={rule.value > (rule.threshold || 0) ? 'text-red-600' : 'text-emerald-600'}>
                                  {rule.value.toLocaleString()} / {rule.threshold?.toLocaleString()}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fraud Indicators */}
                  {riskAssessment.fraudIndicators.length > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Fraud Risk Indicators
                      </h4>
                      {riskAssessment.fraudIndicators.map((indicator) => (
                        <div key={indicator.indicatorId} className="text-sm text-red-700 mt-1">
                          • {indicator.description}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Supporting Documents */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-orange-600" />
                    Supporting Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {documents.map((doc) => (
                      <div 
                        key={doc.documentId}
                        className={`relative group cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                          selectedDoc === doc.documentId 
                            ? 'border-blue-500 ring-2 ring-blue-200' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => setSelectedDoc(doc.documentId)}
                      >
                        <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <FileText className="w-12 h-12 text-slate-400" />
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ZoomIn className="w-8 h-8 text-white" />
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900">
                          <p className="text-xs font-medium truncate">{doc.fileName}</p>
                          <div className="flex items-center justify-between mt-1">
                            <Badge 
                              variant="outline" 
                              className={`text-xs px-1.5 py-0 ${
                                doc.status === 'verified' 
                                  ? 'border-emerald-300 text-emerald-700' 
                                  : doc.status === 'rejected'
                                  ? 'border-red-300 text-red-700'
                                  : 'border-amber-300 text-amber-700'
                              }`}
                            >
                              {doc.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {(doc.fileSize / 1024).toFixed(0)}KB
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Previous Loans Summary */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="w-5 h-5 text-cyan-600" />
                    Previous Loans History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Loan #</th>
                          <th className="text-right py-2 px-2 font-medium text-muted-foreground">Amount</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Product</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Status</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">Outcome</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previousLoans.map((loan) => (
                          <tr key={loan.loanId} className="border-b last:border-0">
                            <td className="py-2 px-2 font-mono text-xs">{loan.loanNumber}</td>
                            <td className="py-2 px-2 text-right font-medium">{formatCurrency(loan.amount)}</td>
                            <td className="py-2 px-2">{loan.productType}</td>
                            <td className="py-2 px-2">
                              <Badge 
                                variant="outline"
                                className={
                                  loan.status === 'completed' ? 'border-emerald-300 text-emerald-700' :
                                  loan.status === 'active' ? 'border-blue-300 text-blue-700' :
                                  loan.status === 'defaulted' ? 'border-red-300 text-red-700' :
                                  'border-gray-300 text-gray-700'
                                }
                              >
                                {loan.status.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                loan.outcome === 'good' ? 'bg-emerald-100 text-emerald-700' :
                                loan.outcome === 'late_payments' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {loan.outcome === 'good' ? '✓' : loan.outcome === 'late_payments' ? '~' : '✗'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Decision Actions */}
            <div className="space-y-6">
              {/* Maker-Checker Display */}
              <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <CardContent className="p-4">
                  <h4 className="font-medium text-sm text-muted-foreground mb-3">Maker-Checker Workflow</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Submitted By</p>
                        <p className="text-xs text-muted-foreground truncate">{application.submittedByName}</p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="ml-4 border-l-2 border-dashed border-slate-300 pl-4 pb-1"></div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Currently Reviewing</p>
                        <p className="text-xs text-muted-foreground truncate">{application.assignedToName || 'Unassigned'}</p>
                      </div>
                      <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin"></div>
                    </div>
                    
                    {/* Pending Approvers */}
                    {mockPendingApprovals.filter(p => p.requiredForAmount <= application.amountRequested).map((approver) => (
                      <>
                        <div key={approver.approverId} className="ml-4 border-l-2 border-dashed border-slate-300 pl-4 pb-1"></div>
                        <div key={`pending-${approver.approverId}`} className="flex items-center gap-3 opacity-60">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                            <UserCheck className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">Pending: {approver.role}</p>
                            <p className="text-xs text-muted-foreground truncate">{approver.approverName}</p>
                          </div>
                          <Clock className="w-4 h-4 text-slate-400" />
                        </div>
                      </>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* SLA Timer */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm text-muted-foreground">SLA Timer</h4>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {workflowHistory.steps.find(s => s.step === application.currentStep)?.slaTarget || 0}h target
                    </Badge>
                  </div>
                  {application.slaDeadline && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Time Remaining</span>
                        <span className="font-medium text-amber-600">
                          {Math.max(0, Math.ceil((new Date(application.slaDeadline!).getTime() - Date.now()) / (1000 * 60 * 60)))}h left
                        </span>
                      </div>
                      <Progress value={75} className="h-2" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Decision Section */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="w-5 h-5 text-indigo-600" />
                    Your Decision
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!decisionMode ? (
                    /* Decision Buttons */
                    <div className="space-y-3">
                      <Button 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base"
                        onClick={() => setDecisionMode('approve')}
                      >
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Approve Application
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 h-10"
                        onClick={() => setDecisionMode('reject')}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Application
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 h-10"
                        onClick={() => setDecisionMode('return')}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Return to Maker
                      </Button>
                    </div>
                  ) : (
                    /* Decision Forms */
                    <div className="space-y-4">
                      {/* Back button */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setDecisionMode(null)}
                        className="mb-2"
                      >
                        ← Back to options
                      </Button>

                      {decisionMode === 'approve' && (
                        <div className="space-y-4">
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Approve this application</p>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label>Approved Amount (KES)</Label>
                              <Input
                                type="number"
                                value={approvedAmount}
                                onChange={(e) => setApprovedAmount(Number(e.target.value))}
                                min={1000}
                                max={application.amountRequested * 1.5}
                              />
                              <p className="text-xs text-muted-foreground">
                                Requested: {formatCurrency(application.amountRequested)}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label>Interest Rate (% p.a.)</Label>
                              <Input
                                type="number"
                                value={interestRate}
                                onChange={(e) => setInterestRate(Number(e.target.value))}
                                step={0.5}
                                min={10}
                                max={30}
                              />
                              <p className="text-xs text-muted-foreground">
                                Range: 10% - 30%
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label>Loan Term (months)</Label>
                              <Select value={String(termMonths)} onValueChange={(v) => setTermMonths(Number(v))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[3, 6, 9, 12, 18, 24, 36, 48].map(m => (
                                    <SelectItem key={m} value={String(m)}>{m} months</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Conditions (optional)</Label>
                              <Textarea
                                placeholder="Any conditions for approval..."
                                value={conditions}
                                onChange={(e) => setConditions(e.target.value)}
                                rows={3}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Comment *</Label>
                              <Textarea
                                placeholder="Provide justification for this approval..."
                                value={approveComment}
                                onChange={(e) => setApproveComment(e.target.value)}
                                rows={3}
                              />
                            </div>

                            {/* Summary */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>Principal:</span>
                                <span className="font-medium">{formatCurrency(approvedAmount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Interest Rate:</span>
                                <span className="font-medium">{interestRate}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Term:</span>
                                <span className="font-medium">{termMonths} months</span>
                              </div>
                              <Separator />
                              <div className="flex justify-between font-bold">
                                <span>Monthly Payment:</span>
                                <span>{formatCurrency(calculateInstallment(approvedAmount, interestRate, termMonths))}</span>
                              </div>
                            </div>

                            <Button 
                              className="w-full bg-emerald-600 hover:bg-emerald-700"
                              onClick={handleApprove}
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? (
                                <><span className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />Processing...</>
                              ) : (
                                <><CheckCircle2 className="w-4 h-4 mr-2" />Confirm Approval</>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      {decisionMode === 'reject' && (
                        <div className="space-y-4">
                          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm font-medium text-red-800 dark:text-red-200">Reject this application</p>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label>Rejection Reason *</Label>
                              <Select value={rejectReason} onValueChange={(v) => setRejectReason(v as RejectReason)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select reason" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="insufficient_income">Insufficient Income</SelectItem>
                                  <SelectItem value="high_debt">High Debt Burden</SelectItem>
                                  <SelectItem value="crb_listing">CRB Listing</SelectItem>
                                  <SelectItem value="fraud_suspect">Fraud Suspected</SelectItem>
                                  <SelectItem value="incomplete_docs">Incomplete Documentation</SelectItem>
                                  <SelectItem value="employment_unverified">Employment Unverified</SelectItem>
                                  <SelectItem value="affordability_fail">Affordability Failed</SelectItem>
                                  <SelectItem value="policy_violation">Policy Violation</SelectItem>
                                  <SelectItem value="other">Other Reason</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Detailed Explanation *</Label>
                              <Textarea
                                placeholder="Explain why this application is being rejected..."
                                value={rejectDetail}
                                onChange={(e) => setRejectDetail(e.target.value)}
                                rows={4}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Suggest Reapply After (days)</Label>
                              <Select value={String(reapplyDays)} onValueChange={(v) => setReapplyDays(Number(v))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="7">7 days</SelectItem>
                                  <SelectItem value="14">14 days</SelectItem>
                                  <SelectItem value="30">30 days</SelectItem>
                                  <SelectItem value="60">60 days</SelectItem>
                                  <SelectItem value="90">90 days</SelectItem>
                                  <SelectItem value="0">No suggestion</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <Button 
                              className="w-full bg-red-600 hover:bg-red-700"
                              onClick={handleReject}
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? (
                                <><span className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />Processing...</>
                              ) : (
                                <><XCircle className="w-4 h-4 mr-2" />Confirm Rejection</>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      {decisionMode === 'return' && (
                        <div className="space-y-4">
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Return to maker for more information</p>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label>Request Additional Information</Label>
                              <div className="space-y-2">
                                {requestedInfo.map((item, index) => (
                                  <label key={index} className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={item.required}
                                      onCheckedChange={() => toggleRequestedInfo(index)}
                                    />
                                    <span className="text-sm">{item.item}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Questions/Instructions for Maker *</Label>
                              <Textarea
                                placeholder="What information do you need from the maker? Any specific questions?"
                                value={returnQuestions}
                                onChange={(e) => setReturnQuestions(e.target.value)}
                                rows={4}
                              />
                            </div>

                            <Button 
                              className="w-full bg-amber-600 hover:bg-amber-700"
                              onClick={handleReturnToMaker}
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? (
                                <><span className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />Processing...</>
                              ) : (
                                <><ArrowLeft className="w-4 h-4 mr-2" />Return to Maker</>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Workflow Tracker Tab */}
        <TabsContent value="workflow" className="mt-6">
          <ApprovalWorkflowTracker workflowHistory={workflowHistory} />
        </TabsContent>

        {/* Credit Memo Tab */}
        <TabsContent value="credit-memo" className="mt-6">
          <CreditMemoGenerator application={application} />
        </TabsContent>

        {/* Decision History Tab */}
        <TabsContent value="history" className="mt-6">
          <DecisionHistoryPanel 
            decisions={mockDecisionHistory}
            pendingApprovals={mockPendingApprovals.filter(p => p.requiredForAmount <= application.amountRequested)}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ApplicationReviewScreen
