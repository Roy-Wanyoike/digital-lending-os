// Mock data for Customer Profile components
import type {
  CustomerProfile,
  CustomerQuickStats,
  ActivityEvent,
  AccountHealth,
  KYCVerification,
  KYCDocument,
  LoanRecord,
  PaymentRecord,
  DocumentFile,
  CustomerNote,
  PaymentSummaryByMonth,
  PaymentMethodBreakdown
} from './types'

export const mockCustomer: CustomerProfile = {
  id: 'cust-001',
  customerId: 'ABP-2024-00847',
  firstName: 'Grace',
  lastName: 'Wanjiku',
  phone: '+254 712 345 678',
  email: 'grace.wanjiku@gmail.com',
  nationalId: '28456789',
  alternativePhone: '+254 111 222 333',
  county: 'Nairobi',
  city: 'Nairobi',
  physicalAddress: 'P.O. Box 12345, Nairobi, Kenya',
  employmentStatus: 'EMPLOYED',
  employerName: 'Safaricom PLC',
  incomeAmount: 85000,
  businessName: undefined,
  bankName: 'Equity Bank',
  bankAccount: '0123456789012',
  mpesaPhone: '+254 712 345 678',
  creditScore: 698,
  crbStatus: 'CLEAN',
  totalBorrowed: 285000,
  totalRepaid: 245667,
  outstandingBalance: 39333,
  status: 'ACTIVE',
  riskLevel: 'MEDIUM',
  createdAt: '2024-03-15T10:30:00Z',
  lastLoginAt: '2026-01-20T08:15:00Z',
  lastLoanDate: '2026-01-10T14:00:00Z',
  memberSince: '2024-03-15'
}

export const mockCustomerStats: CustomerQuickStats = {
  activeLoans: 1,
  totalBorrowed: 285000,
  totalRepaid: 245667,
  creditScore: 698,
  status: 'ACTIVE',
  availableCredit: 65000,
  utilizationRatio: 37.8
}

export const mockActivities: ActivityEvent[] = [
  {
    id: 'act-001',
    type: 'LOGIN',
    description: 'Customer logged in via mobile app',
    timestamp: '2026-01-20T08:15:00Z',
    metadata: { device: 'Android', ip: '196.202.xxx.xxx' }
  },
  {
    id: 'act-002',
    type: 'PAYMENT_RECEIVED',
    description: 'M-Pesa payment of KSh 8,500 received for loan LN-2026-00042',
    timestamp: '2026-01-18T09:30:00Z',
    metadata: { transactionId: 'QG89HJ2KLM', method: 'MPESA' }
  },
  {
    id: 'act-003',
    type: 'LOAN_DISBURSED',
    description: 'Loan LN-2026-00042 disbursed via M-Pesa (KSh 50,000)',
    timestamp: '2026-01-10T14:00:00Z',
    metadata: { reference: 'MPESA-XKLP9234' }
  },
  {
    id: 'act-004',
    type: 'APPLICATION_SUBMITTED',
    description: 'New loan application submitted - Personal Loan (KSh 50,000)',
    timestamp: '2026-01-08T11:20:00Z',
    metadata: { applicationId: 'APP-2026-0123' }
  },
  {
    id: 'act-005',
    type: 'PAYMENT_RECEIVED',
    description: 'Final payment received for loan LN-2025-00115 (fully settled)',
    timestamp: '2025-12-20T16:45:00Z',
    metadata: { transactionId: 'RG12MN4OPQ', method: 'MPESA' }
  },
  {
    id: 'act-006',
    type: 'DOCUMENT_UPLOADED',
    description: 'Updated proof of address document uploaded',
    timestamp: '2025-12-15T10:00:00Z',
    metadata: { documentType: 'PROOF_OF_ADDRESS' }
  },
  {
    id: 'act-007',
    type: 'PROFILE_UPDATED',
    description: 'Updated employer information',
    timestamp: '2025-11-20T13:30:00Z'
  },
  {
    id: 'act-008',
    type: 'CALL_LOGGED',
    description: 'Collection call - Reminder for upcoming payment',
    timestamp: '2025-11-10T09:00:00Z',
    metadata: { agent: 'Jane Muthoni', duration: '3m 24s' }
  },
  {
    id: 'act-009',
    type: 'SMS_SENT',
    description: 'Payment reminder SMS sent',
    timestamp: '2025-11-05T08:00:00Z',
    metadata: { template: 'PAYMENT_REMINDER' }
  },
  {
    id: 'act-010',
    type: 'LOGIN',
    description: 'Customer logged in via web portal',
    timestamp: '2025-10-28T14:22:00Z',
    metadata: { device: 'Chrome/Windows', ip: '41.204.xxx.xxx' }
  }
]

export const mockAccountHealth: AccountHealth = {
  repaymentTrackRecord: 86.2,
  loanUtilizationRatio: 37.8,
  accountAgeDays: 671,
  accountAgeLabel: '1 year, 10 months',
  daysSinceLastPayment: 2,
  averagePaymentDelay: 1.8
}

export const mockKYCVerifications: KYCVerification[] = [
  {
    id: 'kyc-001',
    type: 'NATIONAL_ID',
    status: 'VERIFIED',
    verifiedAt: '2024-03-16T09:00:00Z',
    details: 'ID verified against government database',
    data: { idNumber: '28456789', maskedNumber: '****6789', issueDate: '2019-05-15', expiryDate: '2029-05-15' }
  },
  {
    id: 'kyc-002',
    type: 'MPESA_VERIFICATION',
    status: 'VERIFIED',
    verifiedAt: '2024-03-15T10:30:00Z',
    details: 'Phone number matches M-Pesa registered name',
    data: { phoneNumber: '+254712345678', registeredName: 'GRACE WANJIKU' }
  },
  {
    id: 'kyc-003',
    type: 'CRB_STATUS',
    status: 'VERIFIED',
    verifiedAt: '2026-01-08T06:00:00Z',
    details: 'No adverse listings found',
    data: { status: 'CLEAN', lastChecked: '2026-01-08', bureau: 'Metropol CRB' }
  },
  {
    id: 'kyc-004',
    type: 'FACE_RECOGNITION',
    status: 'VERIFIED',
    verifiedAt: '2024-03-16T09:30:00Z',
    details: 'Liveness check passed with high confidence',
    data: { confidenceScore: 98.5, livenessDetected: true }
  },
  {
    id: 'kyc-005',
    type: 'ADDRESS_VERIFICATION',
    status: 'VERIFIED',
    verifiedAt: '2024-04-01T11:00:00Z',
    details: 'Address verified via utility bill',
    data: { verificationMethod: 'UTILITY_BILL', utilityProvider: 'Kenya Power' }
  }
]

export const mockKYCDocuments: KYCDocument[] = [
  {
    id: 'doc-001',
    type: 'ID_FRONT',
    fileName: 'id_front_grace_wanjiku.jpg',
    fileUrl: '/documents/id_front.jpg',
    fileSize: 245000,
    uploadedAt: '2024-03-15T10:35:00Z',
    uploadedBy: 'System (Self-upload)',
    status: 'VERIFIED',
    verifiedBy: 'Admin User',
    verifiedAt: '2024-03-16T09:05:00Z',
    thumbnailUrl: '/thumbnails/id_front.jpg'
  },
  {
    id: 'doc-002',
    type: 'ID_BACK',
    fileName: 'id_back_grace_wanjiku.jpg',
    fileUrl: '/documents/id_back.jpg',
    fileSize: 238000,
    uploadedAt: '2024-03-15T10:36:00Z',
    uploadedBy: 'System (Self-upload)',
    status: 'VERIFIED',
    verifiedBy: 'Admin User',
    verifiedAt: '2024-03-16T09:05:00Z',
    thumbnailUrl: '/thumbnails/id_back.jpg'
  },
  {
    id: 'doc-003',
    type: 'SELFIE',
    fileName: 'selfie_liveness_grace.jpg',
    fileUrl: '/documents/selfie.jpg',
    fileSize: 512000,
    uploadedAt: '2024-03-16T09:28:00Z',
    uploadedBy: 'System (Liveness capture)',
    status: 'VERIFIED',
    verifiedBy: 'System (Auto)',
    verifiedAt: '2024-03-16T09:30:00Z',
    thumbnailUrl: '/thumbnails/selfie.jpg',
    livenessScore: 98.5
  },
  {
    id: 'doc-004',
    type: 'PROOF_OF_ADDRESS',
    fileName: 'kenya_power_bill_dec2025.pdf',
    fileUrl: '/documents/utility_bill.pdf',
    fileSize: 156000,
    uploadedAt: '2025-12-15T10:02:00Z',
    uploadedBy: 'Grace Wanjiku',
    status: 'VERIFIED',
    verifiedBy: 'Jane Muthoni',
    verifiedAt: '2025-12-16T11:20:00Z',
    thumbnailUrl: '/thumbnails/utility_bill.png'
  }
]

export const mockLoans: LoanRecord[] = [
  {
    id: 'loan-001',
    loanNumber: 'LN-2026-00042',
    productId: 'prod-001',
    productName: 'Personal Loan',
    principal: 50000,
    interestRate: 15,
    termDays: 90,
    termMonths: 3,
    disbursementDate: '2026-01-10',
    status: 'ACTIVE',
    outstandingBalance: 39333,
    totalRepaid: 10667,
    totalRepayable: 50000,
    nextPaymentDue: '2026-02-10',
    paidPercentage: 21.3,
    disbursementMethod: 'MPESA',
    paymentSchedule: [
      { installmentNumber: 1, dueDate: '2026-02-10', principalAmount: 13889, interestAmount: 625, feeAmount: 481, totalAmount: 14995, status: 'PAID', paidAmount: 15000, paidAt: '2026-01-18' },
      { installmentNumber: 2, dueDate: '2026-03-10', principalAmount: 13889, interestAmount: 625, feeAmount: 481, totalAmount: 14995, status: 'PENDING' },
      { installmentNumber: 3, dueDate: '2026-04-10', principalAmount: 13889, interestAmount: 556, feeAmount: 443, totalAmount: 14888, status: 'PENDING' }
    ],
    payments: [
      { id: 'pay-001', date: '2026-01-18', loanReference: 'LN-2026-00042', loanId: 'loan-001', amount: 15000, method: 'MPESA', transactionId: 'QG89HJ2KLM', status: 'COMPLETED', runningBalance: 35000 }
    ]
  },
  {
    id: 'loan-002',
    loanNumber: 'LN-2025-00115',
    productId: 'prod-002',
    productName: 'Salary Advance',
    principal: 30000,
    interestRate: 10,
    termDays: 30,
    termMonths: 1,
    disbursementDate: '2025-09-20',
    status: 'PAID',
    outstandingBalance: 0,
    totalRepaid: 33000,
    totalRepayable: 33000,
    paidPercentage: 100,
    disbursementMethod: 'MPESA',
    paymentSchedule: [
      { installmentNumber: 1, dueDate: '2025-10-20', principalAmount: 30000, interestAmount: 2500, feeAmount: 500, totalAmount: 33000, status: 'PAID', paidAmount: 33000, paidAt: '2025-12-20' }
    ],
    payments: [
      { id: 'pay-002', date: '2025-12-20', loanReference: 'LN-2025-00115', loanId: 'loan-002', amount: 18000, method: 'MPESA', transactionId: 'RG12MN4OPQ', status: 'COMPLETED', runningBalance: 15000 },
      { id: 'pay-003', date: '2025-12-20', loanReference: 'LN-2025-00115', loanId: 'loan-002', amount: 15000, method: 'BANK_TRANSFER', transactionId: 'BKTRF998877', status: 'COMPLETED', runningBalance: 0 }
    ]
  },
  {
    id: 'loan-003',
    loanNumber: 'LN-2025-00089',
    productId: 'prod-003',
    productName: 'Emergency Loan',
    principal: 25000,
    interestRate: 18,
    termDays: 60,
    termMonths: 2,
    disbursementDate: '2025-06-15',
    status: 'PAID',
    outstandingBalance: 0,
    totalRepaid: 27500,
    totalRepayable: 27500,
    paidPercentage: 100,
    disbursementMethod: 'MPESA',
    paymentSchedule: [
      { installmentNumber: 1, dueDate: '2025-07-15', principalAmount: 12500, interestAmount: 1125, feeAmount: 375, totalAmount: 14000, status: 'PAID', paidAmount: 14000, paidAt: '2025-07-14' },
      { installmentNumber: 2, dueDate: '2025-08-15', principalAmount: 12500, interestAmount: 1125, feeAmount: 375, totalAmount: 14000, status: 'PAID', paidAmount: 13500, paidAt: '2025-08-17' }
    ],
    payments: [
      { id: 'pay-004', date: '2025-07-14', loanReference: 'LN-2025-00089', loanId: 'loan-003', amount: 14000, method: 'MPESA', transactionId: 'MP456DEF789', status: 'COMPLETED', runningBalance: 11000 },
      { id: 'pay-005', date: '2025-08-17', loanReference: 'LN-2025-00089', loanId: 'loan-003', amount: 13500, method: 'MPESA', transactionId: 'MP789GHI012', status: 'COMPLETED', runningBalance: 0 }
    ]
  },
  {
    id: 'loan-004',
    loanNumber: 'LN-2025-00045',
    productId: 'prod-001',
    productName: 'Personal Loan',
    principal: 75000,
    interestRate: 14,
    termDays: 180,
    termMonths: 6,
    disbursementDate: '2025-03-01',
    status: 'PAID',
    outstandingBalance: 0,
    totalRepaid: 82500,
    totalRepayable: 82500,
    paidPercentage: 100,
    disbursementMethod: 'BANK_TRANSFER',
    paymentSchedule: Array.from({ length: 6 }, (_, i) => ({
      installmentNumber: i + 1,
      dueDate: new Date(2025, 3 + i, 1).toISOString().split('T')[0],
      principalAmount: 12500,
      interestAmount: i < 5 ? 875 : 750,
      feeAmount: 250,
      totalAmount: i < 5 ? 13625 : 13500,
      status: 'PAID' as const,
      paidAmount: i < 5 ? 13625 : 13500,
      paidAt: new Date(2025, 3 + i, i === 5 ? 3 : 28).toISOString()
    })),
    payments: []
  },
  {
    id: 'loan-005',
    loanNumber: 'LN-2024-00092',
    productId: 'prod-004',
    productName: 'Business Quick Loan',
    principal: 100000,
    interestRate: 20,
    termDays: 120,
    termMonths: 4,
    disbursementDate: '2024-08-15',
    status: 'PAID',
    outstandingBalance: 0,
    totalRepaid: 115000,
    totalRepayable: 115000,
    paidPercentage: 100,
    disbursementMethod: 'MPESA',
    paymentSchedule: [],
    payments: []
  },
  {
    id: 'loan-006',
    loanNumber: 'LN-2024-00033',
    productId: 'prod-002',
    productName: 'Salary Advance',
    principal: 5000,
    interestRate: 8,
    termDays: 14,
    termMonths: 0,
    disbursementDate: '2024-05-10',
    status: 'DEFAULTED',
    outstandingBalance: 5500,
    totalRepaid: 0,
    totalRepayable: 5500,
    paidPercentage: 0,
    disbursementMethod: 'MPESA',
    paymentSchedule: [],
    payments: []
  }
]

export const mockPayments: PaymentRecord[] = [
  { id: 'pay-001', date: '2026-01-18', loanReference: 'LN-2026-00042', loanId: 'loan-001', amount: 15000, method: 'MPESA', transactionId: 'QG89HJ2KLM', status: 'COMPLETED', runningBalance: 35000 },
  { id: 'pay-002', date: '2025-12-20', loanReference: 'LN-2025-00115', loanId: 'loan-002', amount: 18000, method: 'MPESA', transactionId: 'RG12MN4OPQ', status: 'COMPLETED', runningBalance: 15000 },
  { id: 'pay-003', date: '2025-12-20', loanReference: 'LN-2025-00115', loanId: 'loan-002', amount: 15000, method: 'BANK_TRANSFER', transactionId: 'BKTRF998877', status: 'COMPLETED', runningBalance: 0 },
  { id: 'pay-004', date: '2025-08-17', loanReference: 'LN-2025-00089', loanId: 'loan-003', amount: 13500, method: 'MPESA', transactionId: 'MP789GHI012', status: 'COMPLETED', runningBalance: 0 },
  { id: 'pay-005', date: '2025-07-14', loanReference: 'LN-2025-00089', loanId: 'loan-003', amount: 14000, method: 'MPESA', transactionId: 'MP456DEF789', status: 'COMPLETED', runningBalance: 11000 },
  { id: 'pay-006', date: '2025-06-28', loanReference: 'LN-2025-00045', loanId: 'loan-004', amount: 13625, method: 'MPESA', transactionId: 'MP234ABC567', status: 'COMPLETED', runningBalance: 40875 },
  { id: 'pay-007', date: '2025-05-28', loanReference: 'LN-2025-00045', loanId: 'loan-004', amount: 13625, method: 'BANK_TRANSFER', transactionId: 'BKTRF556677', status: 'COMPLETED', runningBalance: 54500 },
  { id: 'pay-008', date: '2025-04-29', loanReference: 'LN-2025-00045', loanId: 'loan-004', amount: 13625, method: 'MPESA', transactionId: 'MP890JKL123', status: 'COMPLETED', runningBalance: 68125 },
  { id: 'pay-009', date: '2025-03-28', loanReference: 'LN-2025-00045', loanId: 'loan-004', amount: 13625, method: 'MPESA', transactionId: 'MP345MNO789', status: 'COMPLETED', runningBalance: 81750 },
  { id: 'pay-010', date: '2025-03-03', loanReference: 'LN-2025-00045', loanId: 'loan-004', amount: 13500, method: 'BANK_TRANSFER', transactionId: 'BKTRF112233', status: 'COMPLETED', runningBalance: 95250 },
  { id: 'pay-011', date: '2024-12-10', loanReference: 'LN-2024-00092', loanId: 'loan-005', amount: 30000, method: 'MPESA', transactionId: 'MP667QRS890', status: 'COMPLETED', runningBalance: 85000 },
  { id: 'pay-012', date: '2024-11-10', loanReference: 'LN-2024-00092', loanId: 'loan-005', amount: 30000, method: 'MPESA', transactionId: 'MP445TUV234', status: 'COMPLETED', runningBalance: 55000 },
  { id: 'pay-013', date: '2024-10-10', loanReference: 'LN-2024-00092', loanId: 'loan-005', amount: 28000, method: 'STK_PUSH', transactionId: 'STK112WXY567', status: 'COMPLETED', runningBalance: 27000 },
  { id: 'pay-014', date: '2024-09-10', loanReference: 'LN-2024-00092', loanId: 'loan-005', amount: 27000, method: 'MPESA', transactionId: 'MP889ZAB012', status: 'COMPLETED', runningBalance: 0 }
]

export const mockDocuments: DocumentFile[] = [
  { id: 'file-001', name: 'National_ID_Front.pdf', category: 'KYC_DOCUMENTS', fileType: 'application/pdf', fileSize: 245000, uploadedAt: '2024-03-15T10:35:00Z', uploadedBy: 'Grace Wanjiku', status: 'VERIFIED', verifiedBy: 'Admin User', thumbnailUrl: '/thumbnails/id_front.png' },
  { id: 'file-002', name: 'National_ID_Back.pdf', category: 'KYC_DOCUMENTS', fileType: 'application/pdf', fileSize: 238000, uploadedAt: '2024-03-15T10:36:00Z', uploadedBy: 'Grace Wanjiku', status: 'VERIFIED', verifiedBy: 'Admin User', thumbnailUrl: '/thumbnails/id_back.png' },
  { id: 'file-003', name: 'Selfie_Liveness.jpg', category: 'KYC_DOCUMENTS', fileType: 'image/jpeg', fileSize: 512000, uploadedAt: '2024-03-16T09:28:00Z', uploadedBy: 'System (Auto)', status: 'VERIFIED', verifiedBy: 'System' },
  { id: 'file-004', name: 'Kenya_Power_Bill_Dec2025.pdf', category: 'KYC_DOCUMENTS', fileType: 'application/pdf', fileSize: 156000, uploadedAt: '2025-12-15T10:02:00Z', uploadedBy: 'Grace Wanjiku', status: 'VERIFIED', verifiedBy: 'Jane Muthoni' },
  { id: 'file-005', name: 'Loan_Application_LN202600042.pdf', category: 'LOAN_APPLICATIONS', fileType: 'application/pdf', fileSize: 89000, uploadedAt: '2026-01-08T11:20:00Z', uploadedBy: 'Grace Wanjiku', status: 'UNVERIFIED' },
  { id: 'file-006', name: 'Loan_Agreement_LN202600042.pdf', category: 'CONTRACTS', fileType: 'application/pdf', fileSize: 145000, uploadedAt: '2026-01-09T09:00:00Z', uploadedBy: 'System', status: 'VERIFIED', verifiedBy: 'System' },
  { id: 'file-007', name: 'Employment_Letter.pdf', category: 'KYC_DOCUMENTS', fileType: 'application/pdf', fileSize: 78000, uploadedAt: '2024-03-15T11:00:00Z', uploadedBy: 'Grace Wanjiku', status: 'VERIFIED', verifiedBy: 'Admin User' },
  { id: 'file-008', name: 'Pay_Slips_Nov_Dec2025.pdf', category: 'KYC_DOCUMENTS', fileType: 'application/pdf', fileSize: 234000, uploadedAt: '2026-01-07T14:30:00Z', uploadedBy: 'Grace Wanjiku', status: 'UNVERIFIED' },
  { id: 'file-009', name: 'SMS_Correspondence_Jan2026.pdf', category: 'CORRESPONDENCE', fileType: 'application/pdf', fileSize: 45000, uploadedAt: '2026-01-19T16:00:00Z', uploadedBy: 'System', status: 'UNVERIFIED' },
  { id: 'file-010', name: 'Bank_Statement_Oct_Dec2025.pdf', category: 'KYC_DOCUMENTS', fileType: 'application/pdf', filesize: 567000, uploadedAt: '2026-01-05T09:15:00Z', uploadedBy: 'Grace Wanjiku', status: 'UNVERIFIED' } as DocumentFile
]

export const mockNotes: CustomerNote[] = [
  {
    id: 'note-001',
    authorId: 'staff-001',
    authorName: 'Jane Muthoni',
    authorRole: 'Loan Officer',
    type: 'CALL',
    content: 'Called customer to confirm employment details at Safaricom PLC. Customer confirmed current position as Senior Analyst, monthly salary KSh 85,000. Verified start date of March 2022.',
    isPrivate: false,
    isInternal: true,
    isPinned: true,
    createdAt: '2026-01-19T10:30:00Z',
    updatedAt: '2026-01-19T10:30:00Z'
  },
  {
    id: 'note-002',
    authorId: 'staff-002',
    authorName: 'Peter Ochieng',
    authorRole: 'Collections Agent',
    type: 'CALL',
    content: 'Follow-up call regarding upcoming payment on LN-2026-00042. Customer confirmed payment will be made before due date (Feb 10). No financial difficulties reported.',
    isPrivate: false,
    isInternal: true,
    isPinned: false,
    createdAt: '2026-01-17T14:15:00Z',
    updatedAt: '2026-01-17T14:15:00Z'
  },
  {
    id: 'note-003',
    authorId: 'staff-001',
    authorName: 'Jane Muthoni',
    authorRole: 'Loan Officer',
    type: 'EMAIL',
    content: 'Sent loan agreement for signature. Customer requested clarification on early repayment penalty clause. Explained that 2% penalty applies only if repaid within first 30 days.',
    isPrivate: false,
    isInternal: false,
    isPinned: false,
    createdAt: '2026-01-09T11:45:00Z',
    updatedAt: '2026-01-09T11:45:00Z'
  },
  {
    id: 'note-004',
    authorId: 'system',
    authorName: 'System',
    authorRole: 'Automated',
    type: 'SYSTEM',
    content: 'Credit score updated: 685 → 698 (+13 points). Improvement due to consistent on-time payments over last 6 months.',
    isPrivate: false,
    isInternal: false,
    isPinned: false,
    createdAt: '2026-01-08T06:00:00Z',
    updatedAt: '2026-01-08T06:00:00Z'
  },
  {
    id: 'note-005',
    authorId: 'staff-003',
    authorName: 'Sarah Kamau',
    authorRole: 'Compliance Officer',
    type: 'VISIT',
    content: 'Physical address verification completed. Confirmed residence at provided address in South B, Nairobi. Met with landlord who confirmed tenant has been residing there since January 2023.',
    isPrivate: true,
    isInternal: true,
    isPinned: false,
    createdAt: '2025-12-10T15:00:00Z',
    updatedAt: '2025-12-10T15:00:00Z'
  },
  {
    id: 'note-006',
    authorId: 'staff-002',
    authorName: 'Peter Ochieng',
    authorRole: 'Collections Agent',
    type: 'OTHER',
    content: 'Customer requested information about credit limit increase process. Explained requirements: minimum 6 months history, no missed payments, current utilization below 50%. Customer eligible for review in February 2026.',
    isPrivate: false,
    isInternal: false,
    isPinned: false,
    createdAt: '2025-11-28T09:20:00Z',
    updatedAt: '2025-11-28T09:20:00Z'
  },
  {
    id: 'note-007',
    authorId: 'staff-001',
    authorName: 'Jane Muthoni',
    authorRole: 'Loan Officer',
    type: 'CALL',
    content: 'Initial contact for new loan application. Discussed loan purpose (home improvement) and preferred terms. Application submitted same day.',
    isPrivate: false,
    isInternal: true,
    isPinned: false,
    createdAt: '2025-11-20T13:30:00Z',
    updatedAt: '2025-11-20T13:30:00Z'
  }
]

export const mockPaymentSummaries: PaymentSummaryByMonth[] = [
  { month: 'January', year: 2026, totalPaid: 15000, transactionCount: 1, mpesaTotal: 15000, bankTotal: 0, cashTotal: 0 },
  { month: 'December', year: 2025, totalPaid: 33000, transactionCount: 2, mpesaTotal: 18000, bankTotal: 15000, cashTotal: 0 },
  { month: 'August', year: 2025, totalPaid: 27500, transactionCount: 2, mpesaTotal: 27500, bankTotal: 0, cashTotal: 0 },
  { month: 'July', year: 2025, totalPaid: 14000, transactionCount: 1, mpesaTotal: 14000, bankTotal: 0, cashTotal: 0 },
  { month: 'June', year: 2025, totalPaid: 13625, transactionCount: 1, mpesaTotal: 13625, bankTotal: 0, cashTotal: 0 },
  { month: 'May', year: 2025, totalPaid: 13625, transactionCount: 1, mpesaTotal: 0, bankTotal: 13625, cashTotal: 0 },
  { month: 'April', year: 2025, totalPaid: 13625, transactionCount: 1, mpesaTotal: 13625, bankTotal: 0, cashTotal: 0 },
  { month: 'March', year: 2025, totalPaid: 27125, transactionCount: 2, mpesaTotal: 13625, bankTotal: 13500, cashTotal: 0 }
]

export const mockPaymentMethodBreakdown: PaymentMethodBreakdown[] = [
  { method: 'M-Pesa', amount: 168875, percentage: 82.4, count: 10 },
  { method: 'Bank Transfer', amount: 28625, percentage: 14.0, count: 3 },
  { method: 'STK Push', amount: 28000, percentage: 3.6, count: 1 },
  { method: 'Cash', amount: 0, percentage: 0, count: 0 }
]
