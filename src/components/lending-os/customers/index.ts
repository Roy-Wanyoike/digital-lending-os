// Customer Profile Components for Digital Lending OS
// Complete customer profile detail view with tabs

// Main Components
export { CustomerProfilePage } from './CustomerProfilePage'
export { CustomerOverviewTab } from './CustomerOverviewTab'
export { KYCIdentityTab } from './KYCIdentityTab'
export { LoanHistoryTab } from './LoanHistoryTab'
export { PaymentHistoryTab } from './PaymentHistoryTab'
export { DocumentsTab } from './DocumentsTab'
export { CustomerNotesTab } from './CustomerNotesTab'

// Types
export type {
  CustomerProfile,
  CustomerQuickStats,
  ActivityEvent,
  AccountHealth,
  KYCVerification,
  KYCDocument,
  LoanRecord,
  PaymentScheduleItem,
  PaymentRecord,
  DocumentFile,
  CustomerNote,
  NoteAttachment,
  PaymentSummaryByMonth,
  PaymentMethodBreakdown
} from './types'

// Mock Data (for development/testing)
export {
  mockCustomer,
  mockCustomerStats,
  mockActivities,
  mockAccountHealth,
  mockKYCVerifications,
  mockKYCDocuments,
  mockLoans,
  mockPayments,
  mockDocuments,
  mockNotes,
  mockPaymentSummaries,
  mockPaymentMethodBreakdown
} from './mock-data'
