// Mock data for Loan Application Review Workflow - Kenyan Context

import {
  LoanApplication,
  CustomerSummary,
  RiskAssessment,
  SupportingDocument,
  PreviousLoan,
  WorkflowHistory,
  DecisionRecord,
  CreditMemo,
  ReviewDashboardStats
} from './types'

export const mockDashboardStats: ReviewDashboardStats = {
  pendingMyReview: 12,
  pendingApproval: 8,
  approvedToday: 15,
  rejectedToday: 3,
  avgReviewTime: 4.2,
  overdueReviews: 2,
  queueDistribution: {
    submitted: 5,
    screening: 8,
    credit_analysis: 12,
    underwriting: 7,
    approval: 8,
    approved: 0,
    rejected: 0,
    returned: 3,
    disbursed: 0,
    cancelled: 0
  }
}

export const mockApplications: LoanApplication[] = [
  {
    id: 'app-001',
    applicationNumber: 'LA-2026-00145',
    customerId: 'cust-001',
    customerName: 'John Kamau Mwangi',
    phone: '+254712345678',
    email: 'john.kamau@email.com',
    nationalId: '12345678',
    amountRequested: 150000,
    productType: 'Personal Loan',
    productId: 'prod-001',
    purpose: 'School fees payment',
    termMonths: 12,
    proposedInterestRate: 18.5,
    status: 'underwriting',
    priority: 'high',
    riskScore: 72,
    submittedAt: '2026-01-20T08:30:00Z',
    assignedTo: 'user-001',
    assignedToName: 'Grace Wanjiku',
    submittedBy: 'user-002',
    submittedByName: 'Customer Portal',
    currentStep: 'underwriting',
    slaDeadline: '2026-01-21T17:00:00Z'
  },
  {
    id: 'app-002',
    applicationNumber: 'LA-2026-00146',
    customerId: 'cust-002',
    customerName: 'Mary Atieno Ochieng',
    phone: '+254723456789',
    email: 'mary.atieno@email.com',
    nationalId: '23456789',
    amountRequested: 75000,
    productType: 'Quick Cash',
    productId: 'prod-002',
    purpose: 'Emergency medical expenses',
    termMonths: 6,
    proposedInterestRate: 22.0,
    status: 'approval',
    priority: 'high',
    riskScore: 65,
    submittedAt: '2026-01-20T09:15:00Z',
    assignedTo: 'user-003',
    assignedToName: 'Peter Njoroge',
    submittedBy: 'user-002',
    submittedByName: 'Customer Portal',
    currentStep: 'approval',
    slaDeadline: '2026-01-21T14:00:00Z'
  },
  {
    id: 'app-003',
    applicationNumber: 'LA-2026-00147',
    customerId: 'cust-003',
    customerName: 'David Kiprotich',
    phone: '+254734567890',
    nationalId: '34567890',
    amountRequested: 250000,
    productType: 'Business Loan',
    productId: 'prod-003',
    purpose: 'Working capital for shop inventory',
    termMonths: 24,
    proposedInterestRate: 16.0,
    status: 'credit_analysis',
    priority: 'medium',
    riskScore: 78,
    submittedAt: '2026-01-20T07:00:00Z',
    assignedTo: 'user-004',
    assignedToName: 'Sarah Muthoni',
    submittedBy: 'loan-officer-001',
    submittedByName: 'James Omondi (Loan Officer)',
    currentStep: 'credit_analysis',
    slaDeadline: '2026-01-22T10:00:00Z'
  },
  {
    id: 'app-004',
    applicationNumber: 'LA-2026-00148',
    customerId: 'cust-004',
    customerName: 'Faith Wambui Ndungu',
    phone: '+254745678901',
    email: 'faith.w@email.com',
    nationalId: '45678901',
    amountRequested: 50000,
    productType: 'Quick Cash',
    productId: 'prod-002',
    purpose: 'Rent payment',
    termMonths: 3,
    proposedInterestRate: 25.0,
    status: 'screening',
    priority: 'low',
    riskScore: 85,
    submittedAt: '2026-01-20T10:45:00Z',
    assignedTo: 'user-001',
    assignedToName: 'Grace Wanjiku',
    submittedBy: 'user-002',
    submittedByName: 'Customer Portal',
    currentStep: 'screening',
    slaDeadline: '2026-01-21T12:00:00Z'
  },
  {
    id: 'app-005',
    applicationNumber: 'LA-2026-00149',
    customerId: 'cust-005',
    customerName: 'Michael Ouma Otieno',
    phone: '+254756789012',
    nationalId: '56789012',
    amountRequested: 500000,
    productType: 'Asset Finance',
    productId: 'prod-004',
    purpose: 'Vehicle purchase - Toyota Fielder',
    termMonths: 48,
    proposedInterestRate: 14.5,
    status: 'underwriting',
    priority: 'high',
    riskScore: 58,
    submittedAt: '2026-01-19T14:30:00Z',
    assignedTo: 'user-003',
    assignedToName: 'Peter Njoroge',
    submittedBy: 'loan-officer-002',
    submittedByName: 'Ann Wairimu (Loan Officer)',
    currentStep: 'underwriting',
    slaDeadline: '2026-01-21T10:00:00Z'
  },
  {
    id: 'app-006',
    applicationNumber: 'LA-2026-00150',
    customerId: 'cust-006',
    customerName: 'Esther Nyokabi Maina',
    phone: '+254767890123',
    email: 'esther.m@email.com',
    nationalId: '67890123',
    amountRequested: 100000,
    productType: 'Personal Loan',
    productId: 'prod-001',
    purpose: 'Home renovation',
    termMonths: 18,
    proposedInterestRate: 17.5,
    status: 'returned',
    priority: 'medium',
    riskScore: 70,
    submittedAt: '2026-01-18T11:00:00Z',
    assignedTo: 'user-002',
    assignedToName: 'Maker Queue',
    submittedBy: 'user-002',
    submittedByName: 'Customer Portal',
    currentStep: 'credit_analysis',
    slaDeadline: '2026-01-22T17:00:00Z'
  },
  {
    id: 'app-007',
    applicationNumber: 'LA-2026-00151',
    customerId: 'cust-007',
    customerName: 'Daniel Mutua Kioko',
    phone: '+254778901234',
    nationalId: '78901234',
    amountRequested: 35000,
    productType: 'Digital Instant',
    productId: 'prod-005',
    purpose: 'Airtime and data bundles',
    termMonths: 1,
    proposedInterestRate: 28.0,
    status: 'submitted',
    priority: 'low',
    riskScore: 92,
    submittedAt: '2026-01-20T11:30:00Z',
    submittedBy: 'user-002',
    submittedByName: 'Mobile App',
    currentStep: 'submitted',
    slaDeadline: '2026-01-21T09:00:00Z'
  },
  {
    id: 'app-008',
    applicationNumber: 'LA-2026-00152',
    customerId: 'cust-008',
    customerName: 'Lucy Gathoni Waithira',
    phone: '+254789012345',
    email: 'lucy.g@email.com',
    nationalId: '89012345',
    amountRequested: 200000,
    productType: 'Business Loan',
    productId: 'prod-003',
    purpose: 'Salon equipment purchase',
    termMonths: 36,
    proposedInterestRate: 15.5,
    status: 'credit_analysis',
    priority: 'medium',
    riskScore: 75,
    submittedAt: '2026-01-19T16:00:00Z',
    assignedTo: 'user-004',
    assignedToName: 'Sarah Muthoni',
    submittedBy: 'loan-officer-001',
    submittedByName: 'James Omondi (Loan Officer)',
    currentStep: 'credit_analysis',
    slaDeadline: '2026-01-22T12:00:00Z'
  },
  {
    id: 'app-009',
    applicationNumber: 'LA-2026-00153',
    customerId: 'cust-009',
    customerName: 'Joseph Kipchumba',
    phone: '+254790123456',
    nationalId: '90123456',
    amountRequested: 80000,
    productType: 'Personal Loan',
    productId: 'prod-001',
    purpose: 'Land purchase contribution',
    termMonths: 12,
    proposedInterestRate: 19.0,
    status: 'underwriting',
    priority: 'medium',
    riskScore: 68,
    submittedAt: '2026-01-20T06:30:00Z',
    assignedTo: 'user-001',
    assignedToName: 'Grace Wanjiku',
    submittedBy: 'user-002',
    submittedByName: 'Customer Portal',
    currentStep: 'underwriting',
    slaDeadline: '2026-01-21T11:00:00Z'
  },
  {
    id: 'app-010',
    applicationNumber: 'LA-2026-00154',
    customerId: 'cust-010',
    customerName: 'Peris Achieng Owino',
    phone: '+254801234567',
    email: 'peris.o@email.com',
    nationalId: '01234567',
    amountRequested: 45000,
    productType: 'Quick Cash',
    productId: 'prod-002',
    purpose: 'Grocery shopping for hotel business',
    termMonths: 6,
    proposedInterestRate: 23.5,
    status: 'approval',
    priority: 'low',
    riskScore: 81,
    submittedAt: '2026-01-19T09:00:00Z',
    assignedTo: 'user-003',
    assignedToName: 'Peter Njoroge',
    submittedBy: 'user-002',
    submittedByName: 'Customer Portal',
    currentStep: 'approval',
    slaDeadline: '2026-01-21T16:00:00Z'
  }
]

export const mockCustomerSummary: CustomerSummary = {
  customerId: 'cust-001',
  fullName: 'John Kamau Mwangi',
  phone: '+254712345678',
  email: 'john.kamau@email.com',
  nationalId: '12345678',
  dateOfBirth: '1985-03-15',
  memberSince: '2022-06-10',
  totalLoansTaken: 5,
  activeLoans: 1,
  repaymentRate: 96.5,
  totalBorrowed: 650000,
  outstandingBalance: 85000,
  employmentStatus: 'Employed',
  employerName: 'Safaricom PLC',
  monthlyIncome: 125000
}

export const mockRiskAssessment: RiskAssessment = {
  overallScore: 72,
  overallRating: 'medium',
  creditScore: {
    score: 685,
    bureau: 'Metropol CRB Kenya',
    checkedAt: '2026-01-20T08:35:00Z',
    numberOfInquiries: 3,
    existingLoans: 2,
    totalExposure: 185000
  },
  affordability: {
    status: 'pass',
    dtiRatio: 38.5,
    monthlyIncome: 125000,
    monthlyExpenses: 48000,
    disposableIncome: 77000,
    proposedInstallment: 14500,
    newDtiRatio: 42.3
  },
  policyRules: [
    { ruleId: 'pr-001', ruleName: 'Minimum Credit Score', category: 'Credit', status: 'passed', description: 'CRB score above minimum threshold (600)', value: 685, threshold: 600 },
    { ruleId: 'pr-002', ruleName: 'Maximum DTI Ratio', category: 'Affordability', status: 'passed', description: 'Debt-to-income ratio within limit (50%)', value: 42.3, threshold: 50 },
    { ruleId: 'pr-003', ruleName: 'Employment Verification', category: 'KYC', status: 'passed', description: 'Employment confirmed with Safaricom PLC' },
    { ruleId: 'pr-004', ruleName: 'ID Validation', category: 'KYC', status: 'passed', description: 'National ID verified via IPRS' },
    { ruleId: 'pr-005', ruleName: 'Maximum Exposure Limit', category: 'Concentration', status: 'warning', description: 'Total exposure approaching 300K limit', value: 185000, threshold: 200000 },
    { ruleId: 'pr-006', ruleName: 'Previous Default Check', category: 'Credit', status: 'passed', description: 'No defaults in last 24 months' },
    { ruleId: 'pr-007', ruleName: 'Age Requirement', category: 'Eligibility', status: 'passed', description: 'Applicant age between 18-65 years' },
    { ruleId: 'pr-008', ruleName: 'Residency Check', category: 'KYC', status: 'passed', description: 'Kenyan resident confirmed' }
  ],
  fraudIndicators: [],
  keyFactors: [
    { factor: 'Credit History Length', impact: 'positive', weight: 15, contribution: 12, description: '4+ years credit history with good standing' },
    { factor: 'Income Stability', impact: 'positive', weight: 20, contribution: 18, description: 'Stable employment at major corporate' },
    { factor: 'Existing Exposure', impact: 'negative', weight: 15, contribution: -8, description: 'Multiple active loans increasing exposure' },
    { factor: 'Repayment History', impact: 'positive', weight: 25, contribution: 22, description: '96.5% on-time repayment rate' },
    { factor: 'Recent Inquiries', impact: 'negative', weight: 10, contribution: -5, description: '3 inquiries in last 6 months' },
    { factor: 'Bank Account Conduct', impact: 'positive', weight: 15, contribution: 13, description: 'Good account conduct observed' }
  ]
}

export const mockDocuments: SupportingDocument[] = [
  {
    documentId: 'doc-001',
    documentType: 'id_copy',
    fileName: 'national_id_front.pdf',
    fileSize: 245000,
    uploadedAt: '2026-01-20T08:25:00Z',
    status: 'verified',
    verifiedBy: 'System',
    verifiedAt: '2026-01-20T08:26:00Z'
  },
  {
    documentId: 'doc-002',
    documentType: 'id_copy',
    fileName: 'national_id_back.pdf',
    fileSize: 230000,
    uploadedAt: '2026-01-20T08:25:00Z',
    status: 'verified',
    verifiedBy: 'System',
    verifiedAt: '2026-01-20T08:26:00Z'
  },
  {
    documentId: 'doc-003',
    documentType: 'payslip',
    fileName: 'payslip_december_2025.pdf',
    fileSize: 180000,
    uploadedAt: '2026-01-20T08:27:00Z',
    status: 'verified',
    verifiedBy: 'Grace Wanjiku',
    verifiedAt: '2026-01-20T09:15:00Z'
  },
  {
    documentId: 'doc-004',
    documentType: 'payslip',
    fileName: 'payslip_november_2025.pdf',
    fileSize: 175000,
    uploadedAt: '2026-01-20T08:27:00Z',
    status: 'verified',
    verifiedBy: 'Grace Wanjiku',
    verifiedAt: '2026-01-20T09:15:00Z'
  },
  {
    documentId: 'doc-005',
    documentType: 'bank_statement',
    fileName: 'bank_statement_6months.pdf',
    filesize: 1250000,
    uploadedAt: '2026-01-20T08:28:00Z',
    status: 'pending_review'
  },
  {
    documentId: 'doc-006',
    documentType: 'passport_photo',
    fileName: 'passport_photo.jpg',
    fileSize: 450000,
    uploadedAt: '2026-01-20T08:26:00Z',
    status: 'verified',
    verifiedBy: 'System',
    verifiedAt: '2026-01-20T08:27:00Z'
  }
]

export const mockPreviousLoans: PreviousLoan[] = [
  {
    loanId: 'loan-001',
    loanNumber: 'LN-2025-0892',
    amount: 100000,
    productType: 'Personal Loan',
    disbursedDate: '2025-05-15',
    status: 'active',
    outcome: 'good',
    repaidAmount: 70000,
    outstandingAmount: 35000
  },
  {
    loanId: 'loan-002',
    loanNumber: 'LN-2024-1245',
    amount: 75000,
    productType: 'Quick Cash',
    disbursedDate: '2024-09-10',
    status: 'completed',
    outcome: 'good',
    repaidAmount: 82500,
    outstandingAmount: 0
  },
  {
    loanId: 'loan-003',
    loanNumber: 'LN-2024-0876',
    amount: 50000,
    productType: 'Quick Cash',
    disbursedDate: '2024-03-20',
    status: 'completed',
    outcome: 'late_payments',
    repaidAmount: 55000,
    outstandingAmount: 0
  },
  {
    loanId: 'loan-004',
    loanNumber: 'LN-2023-1567',
    amount: 25000,
    productType: 'Digital Instant',
    disbursedDate: '2023-11-05',
    status: 'completed',
    outcome: 'good',
    repaidAmount: 28000,
    outstandingAmount: 0
  },
  {
    loanId: 'loan-005',
    loanNumber: 'LN-2023-0987',
    amount: 400000,
    productType: 'Business Loan',
    disbursedDate: '2023-06-15',
    status: 'completed',
    outcome: 'good',
    repaidAmount: 445000,
    outstandingAmount: 0
  }
]

export const mockWorkflowHistory: WorkflowHistory = {
  applicationId: 'app-001',
  currentStep: 'underwriting',
  steps: [
    {
      step: 'submitted',
      stepName: 'Application Submitted',
      status: 'completed',
      timestamp: '2026-01-20T08:30:00Z',
      comments: 'Application received via customer portal',
      duration: 0.1,
      slaTarget: 0.5
    },
    {
      step: 'screening',
      stepName: 'Initial Screening',
      status: 'completed',
      assignedUser: 'Auto-Screening Bot',
      timestamp: '2026-01-20T08:36:00Z',
      comments: 'All KYC checks passed automatically',
      duration: 0.1,
      slaTarget: 1
    },
    {
      step: 'credit_analysis',
      stepName: 'Credit Analysis',
      status: 'completed',
      assignedUser: 'Sarah Muthoni',
      timestamp: '2026-01-20T10:15:00Z',
      comments: 'CRB check complete. Score: 685. Affordability: PASS',
      duration: 1.5,
      slaTarget: 4
    },
    {
      step: 'underwriting',
      stepName: 'Underwriting Review',
      status: 'current',
      assignedUser: 'Grace Wanjiku',
      timestamp: '2026-01-20T10:30:00Z',
      comments: 'Pending full review',
      duration: 2,
      slaTarget: 8
    },
    {
      step: 'approval',
      stepName: 'Approval',
      status: 'pending',
      slaTarget: 4
    },
    {
      step: 'disbursement',
      stepName: 'Disbursement',
      status: 'pending',
      slaTarget: 2
    }
  ],
  auditTrail: [
    {
      entryId: 'audit-001',
      timestamp: '2026-01-20T08:30:00Z',
      user: 'Customer Portal',
      userId: 'system',
      action: 'APPLICATION_CREATED',
      details: 'New loan application submitted online',
      previousStatus: undefined,
      newStatus: 'submitted'
    },
    {
      entryId: 'audit-002',
      timestamp: '2026-01-20T08:31:00Z',
      user: 'System',
      userId: 'system',
      action: 'DOCUMENT_UPLOADED',
      details: 'ID copy (front) uploaded'
    },
    {
      entryId: 'audit-003',
      timestamp: '2026-01-20T08:32:00Z',
      user: 'System',
      userId: 'system',
      action: 'DOCUMENT_UPLOADED',
      details: 'Payslip December 2025 uploaded'
    },
    {
      entryId: 'audit-004',
      timestamp: '2026-01-20T08:35:00Z',
      user: 'Auto-Screening Bot',
      userId: 'bot-001',
      action: 'SCREENING_COMPLETE',
      details: 'Automated screening completed. All checks passed.',
      previousStatus: 'submitted',
      newStatus: 'screening'
    },
    {
      entryId: 'audit-005',
      timestamp: '2026-01-20T08:40:00Z',
      user: 'System',
      userId: 'system',
      action: 'ASSIGNED_TO_ANALYST',
      details: 'Assigned to Sarah Muthoni for credit analysis',
      newStatus: 'credit_analysis'
    },
    {
      entryId: 'audit-006',
      timestamp: '2026-01-20T10:15:00Z',
      user: 'Sarah Muthoni',
      userId: 'user-004',
      action: 'CREDIT_ANALYSIS_COMPLETE',
      details: 'Credit analysis completed. Risk score: 72. Recommendation: Approve with conditions.',
      previousStatus: 'credit_analysis',
      newStatus: 'underwriting'
    },
    {
      entryId: 'audit-007',
      timestamp: '2026-01-20T10:30:00Z',
      user: 'System',
      userId: 'system',
      action: 'ASSIGNED_TO_UNDERWRITER',
      details: 'Assigned to Grace Wanjiku for underwriting review'
    }
  ]
}

export const mockDecisionHistory: DecisionRecord[] = [
  {
    decisionId: 'dec-001',
    timestamp: '2026-01-20T10:15:00Z',
    decisionBy: 'user-004',
    decisionByName: 'Sarah Muthoni',
    role: 'Credit Analyst',
    decision: 'approved',
    comments: 'Good credit profile. Stable income. Recommend approval at requested terms. Note: Monitor exposure as customer has multiple facilities.',
    conditions: 'Require updated bank statement before disbursement'
  }
]

export const mockPendingApprovals = [
  {
    approverId: 'user-010',
    approverName: 'Hannah Mbugua',
    role: 'Senior Credit Manager',
    level: 2,
    requiredForAmount: 100000,
    status: 'pending'
  },
  {
    approverId: 'user-011',
    approverName: 'Robert Kirubi',
    role: 'Head of Credit',
    level: 3,
    requiredForAmount: 300000,
    status: 'pending'
  }
]

export const mockCreditMemo: CreditMemo = {
  memoId: 'cm-2026-00145',
  applicationId: 'app-001',
  generatedAt: '2026-01-20T10:35:00Z',
  generatedBy: 'Grace Wanjiku',
  sections: [
    {
      sectionId: 'sec-001',
      title: 'Executive Summary',
      content: `Application LA-2026-00145 for John Kamau Mwangi requesting KES 150,000 for school fees payment over 12 months at 18.5% p.a.

RECOMMENDATION: APPROVE

The applicant demonstrates strong creditworthiness with a CRB score of 685, stable employment at Safaricom PLC earning KES 125,000/month, and an excellent repayment history of 96.5% across 5 previous loans. The affordability analysis shows a post-loan DTI of 42.3%, within acceptable limits.`,
      editable: true,
      locked: false
    },
    {
      sectionId: 'sec-002',
      title: 'Applicant Background',
      content: `PERSONAL INFORMATION:
• Full Name: John Kamau Mwangi
• ID Number: 12345678
• Date of Birth: March 15, 1985
• Phone: +254 712 345 678
• Email: john.kamau@email.com

EMPLOYMENT:
• Status: Employed (Permanent)
• Employer: Safaricom PLC
• Position: Senior IT Specialist
• Monthly Income: KES 125,000
• Employment Duration: 3 years 8 months

CUSTOMER HISTORY:
• Member Since: June 10, 2022
• Total Loans Taken: 5
• Total Amount Borrowed: KES 650,000
• Active Loans: 1 (KES 85,000 outstanding)`,
      editable: false,
      locked: true
    },
    {
      sectionId: 'sec-003',
      title: 'Financial Analysis',
      content: `INCOME ASSESSMENT:
• Gross Monthly Income: KES 125,000
• Net Monthly Income: KES 98,500 (after statutory deductions)

MONTHLY EXPENSES:
• Rent: KES 25,000
• Utilities: KES 5,000
• Transport: KES 8,000
• Food & Household: KES 15,000
• Existing Loan Payments: KES 9,500
• Other Commitments: KES 5,500
• Total Expenses: KES 68,000

AFFORDABILITY CALCULATION:
• Disposable Income: KES 77,000
• Proposed Installment: KES 14,500/month
• Post-Loan DTI Ratio: 42.3%
• AFFORDABILITY STATUS: PASS`,
      editable: false,
      locked: true
    },
    {
      sectionId: 'sec-004',
      title: 'Credit History',
      content: `CREDIT BUREAU (Metropol CRB):
• Credit Score: 685 (Fair-Good)
• Last Checked: January 20, 2026
• Number of Inquiries (6 months): 3
• Total Active Exposures: KES 185,000
• Negative Listings: None
• Status: CLEAN

INTERNAL BEHAVIOR SCORE:
• Repayment Rate: 96.5%
• Average Days Late: 2.3 days
• Ever 30+ Days Past Due: No
• Ever Defaulted: No
• Customer Grade: B+ (Good)

PREVIOUS LOAN PERFORMANCE:
1. LN-2025-0892: KES 100,000 - Active, Performing (KES 70K repaid)
2. LN-2024-1245: KES 75,000 - Fully Repaid, Good Standing
3. LN-2024-0876: KES 50,000 - Fully Repaid, Minor Delinquency
4. LN-2023-1567: KES 25,000 - Fully Repaid, Excellent
5. LN-2023-0987: KES 400,000 - Business Loan, Fully Repaid`,
      editable: false,
      locked: true
    },
    {
      sectionId: 'sec-005',
      title: 'Risk Assessment',
      content: `OVERALL RISK SCORE: 72/100 (MEDIUM-LOW RISK)

KEY RISK FACTORS:

POSITIVE FACTORS (+65 points):
• Strong Income Stability: +18 points (Corporate employment)
• Excellent Repayment History: +22 points (96.5% rate)
• Long Customer Relationship: +13 points (3.5 years)
• Clean CRB Record: +12 points (No negatives)

NEGATIVE FACTORS (-13 points):
• Multiple Active Exposures: -8 points (KES 185K total)
• Recent Credit Inquiries: -5 points (3 in 6 months)
• Single Income Source: -2 points (No secondary income)

RISK MITIGANTS:
• Salary-deducted repayment available via check-off
• Strong employer (Safaricom PLC)
• Proven track record with institution`,
      editable: true,
      locked: false
    },
    {
      sectionId: 'sec-006',
      title: 'Recommendation & Conditions',
      content: `DECISION: APPROVE

APPROVED TERMS:
• Principal Amount: KES 150,000
• Interest Rate: 18.5% p.a. (flat)
• Tenure: 12 months
• Monthly Installment: KES 14,583
• Total Repayment: KES 175,000

CONDITIONS (IF ANY):
1. Obtain latest 3 months bank statements before disbursement
2. Confirm no new loans taken since application date
3. Verify school fee requirement documentation

COMMENTS:
Suitable candidate for approval. Recommend monitoring due to multiple exposures approaching internal limits. Consider for relationship-based pricing improvement after successful repayment of this facility.`,
      editable: true,
      locked: false
    }
  ],
  recommendation: 'approve',
  signOffs: [
    {
      signerId: 'user-001',
      signerName: 'Grace Wanjiku',
      role: 'Credit Underwriter',
      status: 'pending'
    },
    {
      signerId: 'user-010',
      signerName: 'Hannah Mbugua',
      role: 'Senior Credit Manager',
      status: 'pending'
    }
  ]
}

// Helper function to format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Helper function to format date
export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString))
}

// Helper function to get relative time
export function getRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffDays > 0) return `${diffDays}d ago`
  if (diffHours > 0) return `${diffHours}h ago`
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  if (diffMinutes > 0) return `${diffMinutes}m ago`
  return 'Just now'
}

// Helper function to get risk score color
export function getRiskScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
  if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200'
  if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200'
  return 'text-red-600 bg-red-50 border-red-200'
}

// Helper function to get priority badge variant
export function getPriorityBadge(priority: string): { label: string; className: string } {
  switch (priority) {
    case 'high':
      return { label: 'High', className: 'bg-red-100 text-red-700 border-red-200' }
    case 'medium':
      return { label: 'Medium', className: 'bg-amber-100 text-amber-700 border-amber-200' }
    case 'low':
      return { label: 'Low', className: 'bg-green-100 text-green-700 border-green-200' }
    default:
      return { label: priority, className: 'bg-gray-100 text-gray-700 border-gray-200' }
  }
}
