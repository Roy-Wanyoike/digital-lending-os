// Loan Application Review Workflow Components
// Export all underwriting components

export { ApplicationReviewDashboard } from './ApplicationReviewDashboard'
export { ApplicationReviewScreen } from './ApplicationReviewScreen'
export { ApprovalWorkflowTracker } from './ApprovalWorkflowTracker'
export { CreditMemoGenerator } from './CreditMemoGenerator'
export { DecisionHistoryPanel } from './DecisionHistoryPanel'
export { BulkApprovalModal } from './BulkApprovalModal'

// Types
export type {
  LoanApplication,
  CustomerSummary,
  RiskAssessment,
  SupportingDocument,
  PreviousLoan,
  DecisionAction,
  WorkflowStepInfo,
  WorkflowHistory,
  DecisionRecord,
  PendingApproval,
  CreditMemo,
  BulkActionConfig,
  BulkActionResult,
  ReviewDashboardStats,
  ApplicationFilters
} from './types'

export type {
  ApplicationStatus,
  PriorityLevel,
  WorkflowStep,
  PolicyRule,
  FraudIndicator,
  RiskFactor,
  DocumentType,
  RejectReason,
  RequestedInfoItem,
  AuditEntry,
  ReturnEvent,
  EscalationChain,
  CreditMemoSection,
  SignOff
} from './types'
