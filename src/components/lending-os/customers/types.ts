// Customer Profile Types for Digital Lending OS

export interface CustomerProfile {
  id: string
  customerId: string
  firstName: string
  lastName: string
  phone: string
  email?: string
  nationalId?: string
  alternativePhone?: string
  county?: string
  city?: string
  physicalAddress?: string
  employmentStatus?: string
  employerName?: string
  incomeAmount?: number
  businessName?: string
  bankName?: string
  bankAccount?: string
  mpesaPhone?: string
  creditScore?: number
  crbStatus: 'CLEAN' | 'LISTED' | 'PENDING_CHECK' | 'UNKNOWN'
  totalBorrowed: number
  totalRepaid: number
  outstandingBalance: number
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED' | 'FROZEN' | 'PENDING_VERIFICATION'
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
  createdAt: string
  lastLoginAt?: string
  lastLoanDate?: string
  memberSince: string
  avatarUrl?: string
}

export interface CustomerQuickStats {
  activeLoans: number
  totalBorrowed: number
  totalRepaid: number
  creditScore: number
  status: CustomerProfile['status']
  availableCredit: number
  utilizationRatio: number
}

export interface ActivityEvent {
  id: string
  type: 'LOGIN' | 'APPLICATION_SUBMITTED' | 'LOAN_DISBURSED' | 'PAYMENT_RECEIVED' | 'PROFILE_UPDATED' | 'DOCUMENT_UPLOADED' | 'SMS_SENT' | 'CALL_LOGGED'
  description: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface AccountHealth {
  repaymentTrackRecord: number // percentage on-time
  loanUtilizationRatio: number // percentage
  accountAgeDays: number
  accountAgeLabel: string
  daysSinceLastPayment: number
  averagePaymentDelay: number
}

export interface KYCVerification {
  id: string
  type: 'NATIONAL_ID' | 'MPESA_VERIFICATION' | 'CRB_STATUS' | 'FACE_RECOGNITION' | 'ADDRESS_VERIFICATION'
  status: 'VERIFIED' | 'PENDING' | 'FAILED' | 'NOT_STARTED'
  verifiedAt?: string
  details?: string
  data?: Record<string, unknown>
}

export interface KYCDocument {
  id: string
  type: 'ID_FRONT' | 'ID_BACK' | 'SELFIE' | 'PROOF_OF_ADDRESS' | 'OTHER'
  fileName: string
  fileUrl?: string
  fileSize: number
  uploadedAt: string
  uploadedBy: string
  status: 'VERIFIED' | 'UNVERIFIED' | 'REJECTED'
  verifiedBy?: string
  verifiedAt?: string
  rejectionReason?: string
  thumbnailUrl?: string
  livenessScore?: number
}

export interface LoanRecord {
  id: string
  loanNumber: string
  productId: string
  productName: string
  principal: number
  interestRate: number
  termDays: number
  termMonths: number
  disbursementDate: string
  status: 'ACTIVE' | 'PAID' | 'DEFAULTED' | 'IN_ARREARS' | 'PENDING_DISBURSEMENT' | 'WRITTEN_OFF'
  outstandingBalance: number
  totalRepaid: number
  totalRepayable: number
  nextPaymentDue?: string
  paidPercentage: number
  disbursementMethod: string
  paymentSchedule?: PaymentScheduleItem[]
  payments?: PaymentRecord[]
}

export interface PaymentScheduleItem {
  installmentNumber: number
  dueDate: string
  principalAmount: number
  interestAmount: number
  feeAmount: number
  totalAmount: number
  status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE'
  paidAmount?: number
  paidAt?: string
}

export interface PaymentRecord {
  id: string
  date: string
  loanReference: string
  loanId: string
  amount: number
  method: 'MPESA' | 'BANK_TRANSFER' | 'CASH' | 'CARD' | 'STK_PUSH'
  transactionId: string
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REVERSED'
  receiptUrl?: string
  runningBalance: number
  notes?: string
}

export interface DocumentFile {
  id: string
  name: string
  category: 'KYC_DOCUMENTS' | 'LOAN_APPLICATIONS' | 'CONTRACTS' | 'CORRESPONDENCE' | 'OTHER'
  fileUrl?: string
  fileType: string
  fileSize: number
  uploadedAt: string
  uploadedBy: string
  status: 'VERIFIED' | 'UNVERIFIED'
  verifiedBy?: string
  thumbnailUrl?: string
}

export interface CustomerNote {
  id: string
  authorId: string
  authorName: string
  authorRole: string
  type: 'CALL' | 'EMAIL' | 'VISIT' | 'SYSTEM' | 'OTHER'
  content: string
  isPrivate: boolean
  isInternal: boolean
  isPinned: boolean
  createdAt: string
  updatedAt: string
  attachments?: NoteAttachment[]
  mentions?: string[]
}

export interface NoteAttachment {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
}

export interface PaymentSummaryByMonth {
  month: string
  year: number
  totalPaid: number
  transactionCount: number
  mpesaTotal: number
  bankTotal: number
  cashTotal: number
}

export interface PaymentMethodBreakdown {
  method: string
  amount: number
  percentage: number
  count: number
}
