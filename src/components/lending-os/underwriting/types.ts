// TypeScript interfaces for Loan Application Review Workflow

// Core Application Types
export interface LoanApplication {
  id: string
  applicationNumber: string
  customerId: string
  customerName: string
  phone: string
  email?: string
  nationalId?: string
  amountRequested: number
  productType: string
  productId: string
  purpose: string
  termMonths: number
  proposedInterestRate: number
  status: ApplicationStatus
  priority: PriorityLevel
  riskScore: number
  submittedAt: string
  assignedTo?: string
  assignedToName?: string
  submittedBy: string
  submittedByName: string
  currentStep: WorkflowStep
  slaDeadline?: string
}

export type ApplicationStatus = 
  | 'submitted'
  | 'screening'
  | 'credit_analysis'
  | 'underwriting'
  | 'approval'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'disbursed'
  | 'cancelled'

export type PriorityLevel = 'high' | 'medium' | 'low'

export type WorkflowStep = 
  | 'submitted'
  | 'screening'
  | 'credit_analysis'
  | 'underwriting'
  | 'approval'
  | 'disbursement'

// Customer Information
export interface CustomerSummary {
  customerId: string
  fullName: string
  phone: string
  email?: string
  nationalId: string
  dateOfBirth?: string
  memberSince: string
  totalLoansTaken: number
  activeLoans: number
  repaymentRate: number
  totalBorrowed: number
  outstandingBalance: number
  employmentStatus?: string
  employerName?: string
  monthlyIncome?: number
}

// Risk Assessment Types
export interface RiskAssessment {
  overallScore: number
  overallRating: 'low' | 'medium' | 'high' | 'critical'
  creditScore: {
    score: number
    bureau: string
    checkedAt: string
    numberOfInquiries: number
    existingLoans: number
    totalExposure: number
  }
  affordability: {
    status: 'pass' | 'fail'
    dtiRatio: number
    monthlyIncome: number
    monthlyExpenses: number
    disposableIncome: number
    proposedInstallment: number
    newDtiRatio: number
  }
  policyRules: PolicyRule[]
  fraudIndicators: FraudIndicator[]
  keyFactors: RiskFactor[]
}

export interface PolicyRule {
  ruleId: string
  ruleName: string
  category: string
  status: 'passed' | 'failed' | 'warning'
  description: string
  value?: number
  threshold?: number
}

export interface FraudIndicator {
  indicatorId: string
  type: 'flag' | 'alert' | 'critical'
  description: string
  severity: 'low' | 'medium' | 'high'
  detectedAt: string
}

export interface RiskFactor {
  factor: string
  impact: 'positive' | 'negative' | 'neutral'
  weight: number
  contribution: number
  description: string
}

// Document Types
export interface SupportingDocument {
  documentId: string
  documentType: DocumentType
  fileName: string
  fileSize: number
  uploadedAt: string
  status: 'pending_review' | 'verified' | 'rejected'
  thumbnailUrl?: string
  verifiedBy?: string
  verifiedAt?: string
}

export type DocumentType = 
  | 'id_copy'
  | 'passport_photo'
  | 'payslip'
  | 'bank_statement'
  | 'employment_letter'
  | 'guarantor_form'
  | 'business_license'
  | 'utility_bill'
  | 'other'

// Previous Loans
export interface PreviousLoan {
  loanId: string
  loanNumber: string
  amount: number
  productType: string
  disbursedDate: string
  status: 'active' | 'completed' | 'defaulted' | 'written_off'
  outcome: 'good' | 'late_payments' | 'default'
  repaidAmount: number
  outstandingAmount: number
  daysPastDue?: number
}

// Decision Types
export interface DecisionAction {
  action: 'approve' | 'reject' | 'return_to_maker'
  approvedAmount?: number
  interestRate?: number
  termMonths?: number
  conditions?: string
  comment: string
  rejectReason?: RejectReason
  rejectReasonDetail?: string
  suggestReapplyDays?: number
  returnQuestions?: string
  requestedInfo?: RequestedInfoItem[]
}

export type RejectReason = 
  | 'insufficient_income'
  | 'high_debt'
  | 'crb_listing'
  | 'fraud_suspect'
  | 'incomplete_docs'
  | 'employment_unverified'
  | 'affordability_fail'
  | 'policy_violation'
  | 'other'

export interface RequestedInfoItem {
  item: string
  required: boolean
}

// Workflow Tracker Types
export interface WorkflowStepInfo {
  step: WorkflowStep
  stepName: string
  status: 'completed' | 'current' | 'pending' | 'skipped'
  assignedUser?: string
  timestamp?: string
  comments?: string
  duration?: number // in hours
  slaTarget?: number // in hours
}

export interface WorkflowHistory {
  applicationId: string
  currentStep: WorkflowStep
  steps: WorkflowStepInfo[]
  auditTrail: AuditEntry[]
  returnHistory?: ReturnEvent[]
}

export interface AuditEntry {
  entryId: string
  timestamp: string
  user: string
  userId: string
  action: string
  details: string
  previousStatus?: string
  newStatus?: string
}

export interface ReturnEvent {
  eventId: string
  fromStep: WorkflowStep
  toStep: WorkflowStep
  returnedBy: string
  reason: string
  timestamp: string
}

// Decision History Types
export interface DecisionRecord {
  decisionId: string
  timestamp: string
  decisionBy: string
  decisionByName: string
  role: string
  decision: 'approved' | 'rejected' | 'returned' | 'escalated'
  comments: string
  conditions?: string
  isOverride?: boolean
  overrideReason?: string
}

export interface PendingApproval {
  approverId: string
  approverName: string
  role: string
  level: number
  requiredForAmount: number
  status: 'pending' | 'completed' | 'skipped'
}

export interface EscalationChain {
  escalatedFrom: string
  escalatedTo: string
  escalatedAt: string
  reason: string
  currentAssignee: string
}

// Credit Memo Types
export interface CreditMemo {
  memoId: string
  applicationId: string
  generatedAt: string
  generatedBy: string
  sections: CreditMemoSection[]
  recommendation: 'approve' | 'reject' | 'refer'
  signOffs: SignOff[]
}

export interface CreditMemoSection {
  sectionId: string
  title: string
  content: string
  editable: boolean
  locked?: boolean
}

export interface SignOff {
  signerId: string
  signerName: string
  role: string
  signedAt?: string
  signature?: string
  status: 'pending' | 'signed' | 'declined'
}

// Bulk Action Types
export interface BulkActionConfig {
  applications: LoanApplication[]
  action: 'batch_approve' | 'batch_reject' | 'batch_return' | 'assign_reviewer'
  commonTerms: boolean
  approvedAmounts?: Record<string, number>
  interestRates?: Record<string, number>
  terms?: Record<string, number>
  assignTo?: string
  comment: string
}

export interface BulkActionResult {
  success: boolean
  processed: number
  approved: number
  rejected: number
  errors: Array<{
    applicationId: string
    error: string
  }>
  warnings: Array<{
    applicationId: string
    warning: string
  }>
}

// Dashboard Stats
export interface ReviewDashboardStats {
  pendingMyReview: number
  pendingApproval: number
  approvedToday: number
  rejectedToday: number
  avgReviewTime: number
  overdueReviews: number
  queueDistribution: Record<ApplicationStatus, number>
}

// Filter Types
export interface ApplicationFilters {
  productType?: string
  amountMin?: number
  amountMax?: number
  riskScoreMin?: number
  riskScoreMax?: number
  dateFrom?: string
  dateTo?: string
  priority?: PriorityLevel
  status?: ApplicationStatus
  assignedTo?: string
  searchQuery?: string
}
