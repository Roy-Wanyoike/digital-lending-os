/**
 * Type Definitions
 * 
 * Core type definitions for the Digital Lending OS backend.
 */

import { Request } from 'express';
import { User, Tenant, Customer, Loan, LoanApplication, Transaction, Repayment } from '@prisma/client';

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

export type UserRole = 
  | 'SUPER_ADMIN'
  | 'TENANT_ADMIN'
  | 'MANAGER'
  | 'LOAN_OFFICER'
  | 'COLLECTION_AGENT'
  | 'FINANCE_OFFICER'
  | 'STAFF'
  | 'VIEWER'
  | 'CUSTOMER';

export type TenantPlan = 
  | 'STARTER'
  | 'PROFESSIONAL'
  | 'ENTERPRISE'
  | 'CUSTOM';

export type TenantStatus = 
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'PENDING_ONBOARDING'
  | 'PENDING_APPROVAL'
  | 'DEACTIVATED';

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
  | 'ACTIVE'
  | 'IN_ARREARS'
  | 'DEFAULTED'
  | 'PAID_OFF'
  | 'WRITTEN_OFF'
  | 'CANCELLED'
  | 'RESTRUCTURED';

export type ArrearsStatus = 
  | 'CURRENT'
  | '1_30_DAYS'
  | '31_60_DAYS'
  | '61_90_DAYS'
  | 'OVER_90_DAYS';

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
  | 'REJECTED'
  | 'CANCELLED'
  | 'WITHDRAWN'
  | 'PENDING_DISBURSEMENT'
  | 'DISBURSED';

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
