/**
 * Type Definitions
 * 
 * Core type definitions for the Digital Lending OS backend.
 * Note: We define types locally to avoid direct @prisma/client dependency issues.
 */

import { Request } from 'express';

// Re-export Prisma-compatible types (defined locally to match schema)
// These would normally come from @prisma/client after code generation

// =============================================================================
// AUTHENTICATION TYPES
// =============================================================================

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
  type: 'refresh';
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  tenant?: TenantContext;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  tenantId: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
}

export interface TenantContext {
  id: string;
  slug: string;
  name: string;
  plan: TenantPlan;
  status: TenantStatus;
}

// User Role enum - matches Prisma schema UserRole
export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN' as const,
  TENANT_ADMIN: 'TENANT_ADMIN' as const,
  MANAGER: 'MANAGER' as const,
  STAFF: 'STAFF' as const,
  AGENT: 'AGENT' as const,
  VIEWER: 'VIEWER' as const,
  // Extended roles for application logic (mapped to schema roles)
  LOAN_OFFICER: 'LOAN_OFFICER' as const,
  COLLECTION_AGENT: 'COLLECTION_AGENT' as const,
  FINANCE_OFFICER: 'FINANCE_OFFICER' as const,
  CUSTOMER: 'CUSTOMER' as const,
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

// All valid role values for validation
export const VALID_USER_ROLES: readonly string[] = Object.values(UserRole);

export type TenantPlan = 
  | 'STARTER'
  | 'PROFESSIONAL'
  | 'ENTERPRISE'
  | 'CUSTOM';

export const TenantPlan = {
  STARTER: 'STARTER' as const,
  PROFESSIONAL: 'PROFESSIONAL' as const,
  ENTERPRISE: 'ENTERPRISE' as const,
  CUSTOM: 'CUSTOM' as const,
} as const;

export type TenantStatus = 
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'TRIAL'
  | 'PENDING_ONBOARDING'
  | 'TERMINATED'
  | 'PENDING_APPROVAL'
  | 'DEACTIVATED';

export const TenantStatus = {
  ACTIVE: 'ACTIVE' as const,
  SUSPENDED: 'SUSPENDED' as const,
  TRIAL: 'TRIAL' as const,
  PENDING_ONBOARDING: 'PENDING_ONBOARDING' as const,
  TERMINATED: 'TERMINATED' as const,
} as const;

// =============================================================================
// CUSTOMER TYPES
// =============================================================================

export interface CreateCustomerInput {
  tenantId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  alternativePhone?: string;
  dateOfBirth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  nationalId?: string;
  kraPin?: string;
  employmentStatus?: 'EMPLOYED' | 'SELF_EMPLOYED' | 'UNEMPLOYED' | 'STUDENT' | 'RETIRED';
  employerName?: string;
  incomeAmount?: number;
  incomeFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
  businessName?: string;
  county?: string;
  city?: string;
  bankName?: string;
  bankAccount?: string;
  mpesaPhone?: string;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BLACKLISTED';
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  kycStatus?: 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
}

// =============================================================================
// LOAN TYPES
// =============================================================================

export interface CreateLoanInput {
  tenantId: string;
  customerId: string;
  applicationId?: string;
  productId: string;
  principal: number;
  approvedAmount?: number;
  interestRate: number;
  interestType?: 'FLAT_RATE' | 'REDUCING_BALANCE' | 'DIMINISHING';
  termDays: number;
  processingFee?: number;
  insuranceFee?: number;
  disbursementMethod?: 'MPESA' | 'BANK_TRANSFER' | 'CHEQUE';
  disbursementAccount?: string;
}

export type LoanStatus = 
  | 'PENDING_DISBURSEMENT'
  | 'APPROVED'
  | 'DISBURSED'
  | 'ACTIVE'
  | 'IN_ARREARS'
  | 'DEFAULTED'
  | 'FULLY_PAID'
  | 'PAID_OFF'
  | 'WRITTEN_OFF'
  | 'CANCELLED'
  | 'RESTRUCTURED';

export const LoanStatus = {
  PENDING_DISBURSEMENT: 'PENDING_DISBURSEMENT' as const,
  APPROVED: 'APPROVED' as const,
  DISBURSED: 'DISBURSED' as const,
  ACTIVE: 'ACTIVE' as const,
  IN_ARREARS: 'IN_ARREARS' as const,
  DEFAULTED: 'DEFAULTED' as const,
  FULLY_PAID: 'FULLY_PAID' as const,
  PAID_OFF: 'PAID_OFF' as const,
  WRITTEN_OFF: 'WRITTEN_OFF' as const,
  CANCELLED: 'CANCELLED' as const,
  RESTRUCTURED: 'RESTRUCTURED' as const,
} as const;

export type ArrearsStatus = 
  | 'CURRENT'
  | 'DAYS_1_7'
  | 'DAYS_8_30'
  | 'DAYS_31_60'
  | 'DAYS_61_90'
  | 'DAYS_91_PLUS'
  | '1_30_DAYS'
  | '31_60_DAYS'
  | '61_90_DAYS'
  | 'OVER_90_DAYS';

export const ArrearsStatus = {
  CURRENT: 'CURRENT' as const,
  DAYS_1_7: 'DAYS_1_7' as const,
  DAYS_8_30: 'DAYS_8_30' as const,
  DAYS_31_60: 'DAYS_31_60' as const,
  DAYS_61_90: 'DAYS_61_90' as const,
  DAYS_91_PLUS: 'DAYS_91_PLUS' as const,
} as const;

export interface RepaymentScheduleItem {
  installmentNo: number;
  dueDate: string;
  principal: number;
  interest: number;
  fees: number;
  total: number;
  status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'WAIVED';
  paidDate?: Date;
  paidAmount?: number;
}

// =============================================================================
// APPLICATION TYPES
// =============================================================================

export interface CreateApplicationInput {
  tenantId: string;
  customerId: string;
  productId: string;
  requestedAmount: number;
  purpose?: string;
  termDays?: number;
  employmentDetails?: EmploymentDetails;
  expenses?: ExpenseDetails;
  references?: ContactReference[];
  documents?: DocumentUpload[];
}

export interface EmploymentDetails {
  employerName: string;
  employmentType: 'FORMAL' | 'INFORMAL' | 'CONTRACT' | 'SELF_EMPLOYED';
  monthlyIncome: number;
  yearsEmployed: number;
  workPhone?: string;
  workAddress?: string;
}

export interface ExpenseDetails {
  rent: number;
  utilities: number;
  transport: number;
  food: number;
  schoolFees: number;
  otherLoans: number;
  otherExpenses: number;
  totalExpenses: number;
}

export interface ContactReference {
  name: string;
  relationship: string;
  phone: string;
  address?: string;
  knownYears?: number;
}

export interface DocumentUpload {
  type: 'ID_FRONT' | 'ID_BACK' | 'PASSPORT' | 'PAYSLIP' | 'BANK_STATEMENT' | 'UTILITY_BILL' | 'OTHER';
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

export type ApplicationStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'CONDITIONALLY_APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'WITHDRAWN'
  | 'PENDING_DISBURSEMENT'
  | 'DISBURSED'
  | 'DISBURSEMENT_FAILED';

export const ApplicationStatus = {
  DRAFT: 'DRAFT' as const,
  SUBMITTED: 'SUBMITTED' as const,
  UNDER_REVIEW: 'UNDER_REVIEW' as const,
  APPROVED: 'APPROVED' as const,
  CONDITIONALLY_APPROVED: 'CONDITIONALLY_APPROVED' as const,
  REJECTED: 'REJECTED' as const,
  CANCELLED: 'CANCELLED' as const,
  WITHDRAWN: 'WITHDRAWN' as const,
  PENDING_DISBURSEMENT: 'PENDING_DISBURSEMENT' as const,
  DISBURSED: 'DISBURSED' as const,
  DISBURSEMENT_FAILED: 'DISBURSEMENT_FAILED' as const,
} as const;

// Application Step enum - matches Prisma schema
export type ApplicationStep = 
  | 'SUBMISSION'
  | 'KYC_VERIFICATION'
  | 'CREDIT_ASSESSMENT'
  | 'AFFORDABILITY_CHECK'
  | 'MANUAL_REVIEW'
  | 'MANAGER_APPROVAL'
  | 'DOCUMENT_SIGNING'
  | 'DISBURSEMENT_PREPARATION'
  | 'DISBURSED'
  | 'COMPLETED'
  | 'CANCELLED';

export const ApplicationStep = {
  SUBMISSION: 'SUBMISSION' as const,
  KYC_VERIFICATION: 'KYC_VERIFICATION' as const,
  CREDIT_ASSESSMENT: 'CREDIT_ASSESSMENT' as const,
  AFFORDABILITY_CHECK: 'AFFORDABILITY_CHECK' as const,
  MANUAL_REVIEW: 'MANUAL_REVIEW' as const,
  MANAGER_APPROVAL: 'MANAGER_APPROVAL' as const,
  DOCUMENT_SIGNING: 'DOCUMENT_SIGNING' as const,
  DISBURSEMENT_PREPARATION: 'DISBURSEMENT_PREPARATION' as const,
  DISBURSED: 'DISBURSED' as const,
  COMPLETED: 'COMPLETED' as const,
  CANCELLED: 'CANCELLED' as const,
} as const;

// =============================================================================
// PAYMENT TYPES
// =============================================================================

export interface StkPushRequest {
  phone: string;
  amount: number;
  accountReference?: string;
  transactionDesc?: string;
  callbackUrl?: string;
  loanId?: string;
  accountId?: string;
}

export interface StkPushResponse {
  success: boolean;
  checkoutRequestID?: string;
  merchantRequestID?: string;
  responseCode?: string;
  responseDescription?: string;
  customerMessage?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface B2CRequest {
  phone: string;
  amount: number;
  occasion?: string;
  remarks?: string;
  commandID?: 'SalaryPayment' | 'BusinessPayment' | 'PromotionPayment';
  loanId?: string;
}

// =============================================================================
// COLLECTIONS TYPES
// =============================================================================

export interface CollectionActionInput {
  loanId: string;
  action: 'CALL' | 'SMS' | 'EMAIL' | 'VISIT' | 'LEGAL_NOTICE' | 'DEBT_RECOVERY' | 'WRITE_OFF' | 'WAIVE';
  notes?: string;
  outcome?: string;
  followUpDate?: Date;
  promiseToPayAmount?: number;
  promiseToPayDate?: Date;
}

export interface PromiseToPayInput {
  loanId: string;
  amount: number;
  promiseDate: Date;
  notes?: string;
  channel: 'PHONE' | 'SMS' | 'EMAIL' | 'IN_PERSON';
}

// =============================================================================
// FINANCE TYPES
// =============================================================================

export interface TransactionFilter {
  tenantId: string;
  startDate?: Date;
  endDate?: Date;
  type?: TransactionType;
  status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  accountId?: string;
  search?: string;
}

export type TransactionType = 
  | 'DISBURSEMENT'
  | 'REPAYMENT_PRINCIPAL'
  | 'REPAYMENT_INTEREST'
  | 'FEE_CHARGED'
  | 'FEE_COLLECTED'
  | 'PENALTY_CHARGED'
  | 'PENALTY_COLLECTED'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'WRITE_OFF'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT';

export interface LedgerEntry {
  id: string;
  date: Date;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  type: TransactionType;
  reference: string;
  reconciled: boolean;
  reconciledAt?: Date;
}

// =============================================================================
// CREDIT & RISK TYPES
// =============================================================================

export interface CreditAssessmentInput {
  customerId: string;
  tenantId: string;
  requestedAmount: number;
  termDays: number;
  includeCRBCheck?: boolean;
}

export interface CreditScoreResult {
  score: number; // 0-1000
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  maxRecommendedAmount: number;
  recommendedInterestRate: number;
  factors: CreditFactor[];
  crbSummary?: CRBSummary;
  decision?: 'APPROVE' | 'REJECT' | 'REVIEW';
  assessedAt?: Date;
  validUntil?: Date;
}

export interface CreditFactor {
  category: string;
  weight: number;
  score: number;
  description: string;
}

export interface CRBSummary {
  totalOutstandingDebt: number;
  numberOfActiveLoans: number;
  paymentHistoryScore: number;
  lastDefaultDate?: Date;
  inquiriesLast6Months: number;
}

export interface EligibilityRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  enabled: boolean;
  priority: number;
  action: 'APPROVE' | 'REJECT' | 'REFER' | 'REVIEW';
}

// =============================================================================
// REPORTS TYPES
// =============================================================================

export interface ReportConfig {
  id: string;
  name: string;
  category: ReportCategory;
  endpoint: string;
  parameters: ReportParameter[];
  permissions: string[];
  refreshInterval: string;
}

export type ReportCategory = 
  | 'portfolio'
  | 'customer'
  | 'financial'
  | 'operational'
  | 'compliance';

export interface ReportParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  required: boolean;
  defaultValue?: unknown;
  options?: string[];
  description: string;
}

// =============================================================================
// PROVIDER HEALTH TYPES
// =============================================================================

export interface ProviderHealthStatus {
  provider: ProviderName;
  status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
  latency: number;
  lastChecked: Date;
  uptime: number;
  errorRate: number;
  incidents: Incident[];
}

export type ProviderName = 
  | 'MPESA_DARAJA'
  | 'MPESA_C2B'
  | 'MPESA_B2C'
  | 'CRB_METROPOL'
  | 'CRB_TRANSUNION'
  | 'CRB_CREDITINFO'
  | 'SMS_GATEWAY'
  | 'EMAIL_SERVICE'
  | 'KYC_VERIFICATION'
  | 'DATABASE';

export interface Incident {
  id: string;
  type: 'OUTAGE' | 'DEGRADED_PERFORMANCE' | 'ERROR_SPIKE' | 'MAINTENANCE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ACTIVE' | 'RESOLVED' | 'ACKNOWLEDGED';
  startedAt: Date;
  resolvedAt?: Date;
  description: string;
  impact: string;
}

// =============================================================================
// RISK TYPES
// =============================================================================

export type RiskLevel = 
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'VERY_HIGH'
  | 'CRITICAL';

export const RiskLevel = {
  LOW: 'LOW' as const,
  MEDIUM: 'MEDIUM' as const,
  HIGH: 'HIGH' as const,
  VERY_HIGH: 'VERY_HIGH' as const,
  CRITICAL: 'CRITICAL' as const,
} as const;

// =============================================================================
// DASHBOARD TYPES
// =============================================================================

export interface DashboardStats {
  totalCustomers: number;
  activeLoans: number;
  totalDisbursed: number;
  totalCollected: number;
  portfolioAtRisk: number;
  approvalRate: number;
  averageLoanSize: number;
  pendingApplications: number;
  overdueLoans: number;
  collectionEfficiency: number;
}

// =============================================================================
// PAGINATION & FILTERING
// =============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: unknown;
}

export interface QueryParams extends PaginationParams, FilterParams {}

// =============================================================================
// AUDIT LOG TYPES
// =============================================================================

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  tenantId?: string;
}
