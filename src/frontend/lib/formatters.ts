/**
 * @fileoverview Dashboard types, constants, and formatter functions.
 * Canonical location — re-exported by @/lib/dashboard-helpers for backward compat.
 */

import { format } from 'date-fns'

// ─── Constants ──────────────────────────────────────────────────────────────

export const CURRENCY_FLAGS: Record<string, string> = {
  USD: '\u{1F1FA}\u{1F1F8}', EUR: '\u{1F1EA}\u{1F1FA}', GBP: '\u{1F1EC}\u{1F1E7}', NGN: '\u{1F1F3}\u{1F1EC}', KES: '\u{1F1F0}\u{1F1EA}',
  GHS: '\u{1F1EC}\u{1F1ED}', UGX: '\u{1F1FA}\u{1F1EC}', TZS: '\u{1F1F9}\u{1F1FF}', RWF: '\u{1F1F7}\u{1F1FC}', BRL: '\u{1F1E7}\u{1F1F7}',
  MXN: '\u{1F1F2}\u{1F1FD}', ZAR: '\u{1F1FF}\u{1F1E6}', JPY: '\u{1F1EF}\u{1F1F5}', CNY: '\u{1F1E8}\u{1F1F3}', INR: '\u{1F1EE}\u{1F1F3}',
  CAD: '\u{1F1E8}\u{1F1E6}', AUD: '\u{1F1E6}\u{1F1FA}', CHF: '\u{1F1E8}\u{1F1ED}', AED: '\u{1F1E6}\u{1F1EA}', SGD: '\u{1F1F8}\u{1F1EC}',
}

export const CHART_COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#6366f1', '#8b5cf6', '#06b6d4', '#84cc16']

export const ESCROW_STATUSES = ['Created', 'Funded', 'In Escrow', 'Completed', 'Disputed']
export const FRAUD_SEVERITIES = ['Critical', 'High', 'Medium', 'Low']
export const FRAUD_STATUSES = ['Open', 'Investigating', 'Confirmed', 'Resolved']
export const MATCHING_STATUSES = ['Suggested', 'Contacted', 'Interested', 'Engaged', 'Declined']
export const AGING_BUCKETS = ['Current', '1-30', '31-60', '61-90', '90+']
export const PRIORITY_LEVELS = ['Urgent', 'High', 'Normal', 'Low']
export const PAYMENT_METHOD_TYPES = ['All', 'Mobile Money', 'Digital Wallet', 'Real-Time', 'Bank', 'Card', 'Crypto']

// ─── Type Definitions ────────────────────────────────────────────────────────

export type Role = 'admin' | 'buyer' | 'seller' | 'auditor' | 'viewer'

export interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export interface DashboardStats {
  totalBusinesses: number
  verifiedBusinesses: number
  activeEscrows: number
  totalEscrowVolume: number
  totalPaymentsProcessed: number
  averageTrustScore: number
  recentDisputes: number
  activeRelationships: number
  escrowsByStatus: Record<string, number>
  businessesByCountry: Record<string, number>
  paymentsByMethod: Record<string, number>
  recentTransactions: Array<{
    id: string; txRef: string; amount: number; currency: string;
    status: string; createdAt: string;
    buyerName: string; sellerName: string;
  }>,
  trustScoreDistribution: Record<string, number>
}

export interface Business {
  id: string; name: string; legalName?: string; registrationNo?: string;
  taxId?: string; country: string; city?: string;
  industry?: string; website?: string; employeeCount?: number;
  annualRevenue?: number; description?: string; logoUrl?: string;
  status: string; verifiedAt?: string; createdAt: string; updatedAt: string;
  passport?: { credentialLevel?: string; kycStatus?: string; amlStatus?: string; riskRating?: string } | null
  trustScore?: { overallScore?: number } | null
}

export interface EscrowTransaction {
  id: string; txRef: string; buyerId: string; sellerId: string;
  amount: number; currency: string; description?: string | null;
  status: string; currentMilestone: number; totalMilestones: number;
  fundedAmount: number; releasedAmount: number; refundedAmount: number;
  feeAmount: number; feeCurrency: string; aiRiskScore: number;
  aiRiskLevel: string; expiresAt?: string | null;
  completedAt?: string | null; createdAt: string; updatedAt: string;
  buyer?: { id: string; name: string } | null
  seller?: { id: string; name: string } | null
  milestones?: Array<{ id: string; sequence: number; title: string; amount: number; status: string }>
  disputes?: Array<{ id: string; raisedBy: string; reason: string; description?: string | null; status: string; resolution?: string | null; aiRecommendation?: string | null; createdAt: string }>
}

export interface PaymentIntent {
  id: string; intentRef: string; fromBusinessId: string; toBusinessId: string;
  sourceAmount: number; sourceCurrency: string;
  targetAmount: number; targetCurrency: string;
  exchangeRate: number; status: string;
  paymentMethod?: string | null; routingProvider?: string | null;
  routingScore?: number | null; estimatedFee?: number | null;
  actualFee?: number | null; estimatedTime?: number | null;
  completedAt?: string | null; createdAt: string; updatedAt: string;
}

export interface ExchangeRate {
  from: string; to: string; rate: number
}

export interface PaymentMethod {
  id: string; methodName: string; provider: string; type: string;
  feePercent: number; fixedFee: number; settlementTime: number;
  countries: string; icon?: string; isActive: boolean
}

export interface Verification {
  id: string; businessId: string; type: string; method: string;
  status: string; submittedAt: string; verifiedAt?: string | null;
  verifiedBy?: string | null; rejectionReason?: string | null;
  metadata?: string | null; createdAt: string; updatedAt: string;
  business?: { id: string; name: string; country: string; status: string } | null
}

export interface PaymentLink {
  id: string; linkRef: string; businessId: string;
  title?: string | null; description?: string | null;
  amount?: number | null; currency: string;
  status: string; allowedMethods?: string | null;
  allowedCountries?: string | null; maxPayments: number;
  totalCollected?: number;
  expiresAt?: string | null; createdAt: string; updatedAt: string;
  _paymentCount?: number
}

export interface WalletData {
  id: string; businessId: string; currency: string;
  balance: number; availableBalance: number;
  pendingBalance: number; frozenBalance: number;
  isDefault: boolean; status: string;
  createdAt: string; updatedAt: string;
  _transactionCount?: number
}

export interface FraudAlert {
  id: string; alertRef: string; businessId?: string | null;
  relatedType: string; relatedId?: string | null;
  severity: string; fraudType: string; score: number;
  description: string; recommendation?: string | null;
  status: string; actionTaken?: string | null;
  resolvedAt?: string | null; createdAt: string; updatedAt: string;
}

export interface FraudRule {
  id: string; name: string; description?: string | null;
  condition: string; action: string;
  severity: string; isActive: boolean; triggerCount?: number;
  lastTriggeredAt?: string | null;
  createdAt: string; updatedAt: string
}

export interface MatchingRecord {
  id: string; seekerId: string; candidateId: string;
  matchType: string; matchScore: number;
  reasons: string; status: string;
  createdAt: string; updatedAt: string;
  seekerName?: string | null; candidateName?: string | null
}

export interface CollectionRecord {
  id: string; caseRef: string; businessId: string; debtorId: string;
  invoiceId?: string | null; originalAmount: number;
  outstandingAmount: number; currency: string;
  agingBucket: string; priority: string; status: string;
  aiStrategy?: string | null; reminderCount?: number;
  createdAt: string; updatedAt: string;
  debtorName?: string | null
}

export interface ComplianceRule {
  id: string; name: string; description?: string | null;
  ruleType: string; condition: string; action: string;
  severity: string; isActive: boolean; triggerCount?: number;
  createdAt: string; updatedAt: string
}

export interface Screening {
  id: string; businessId?: string | null;
  transactionType?: string | null; transactionId?: string | null;
  screeningType: string; result: string; riskLevel: string;
  status: string; details?: string | null;
  matchedLists?: string | null; createdAt: string; updatedAt: string
}

export interface TwinProfile {
  id: string
  healthScore?: number | null
  cashFlowHealth?: number | null
  creditWorthiness?: number | null
  liquidityScore?: number | null
  growthTrajectory?: string | null
  riskAppetite?: string | null
  business?: { name: string } | null
  metrics?: Array<{
    periodDate?: string | null
    revenue?: number | null
    expenses?: number | null
    netIncome?: number | null
  }> | null
  predictions?: Array<{
    predictionType?: string | null
    predictedValue?: number | null
    confidence?: number | null
  }> | null
}

// ─── Navigation Config ─────────────────────────────────────────────────────

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  buyer: 'Buyer',
  seller: 'Seller',
  auditor: 'Auditor',
  viewer: 'Viewer',
}

export const ROLE_TABS: Record<Role, string[]> = {
  admin: ['overview', 'trust-graph', 'escrow', 'payments', 'passport', 'payment-links', 'wallet', 'referral', 'fraud', 'matching', 'collections', 'compliance'],
  buyer: ['overview', 'payments', 'payment-links', 'wallet', 'referral'],
  seller: ['overview', 'trust-graph', 'escrow', 'payment-links', 'wallet', 'referral'],
  auditor: ['overview', 'trust-graph', 'fraud', 'compliance', 'collections'],
  viewer: ['overview', 'trust-graph', 'payments'],
}

// ─── Formatter Functions ──────────────────────────────────────────────────────

export function formatCurrency(value: number, currency = 'USD'): string {
  const safe = typeof value === 'number' && isFinite(value) ? value : 0
  if (currency === 'JPY') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(safe)
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(safe)
}

/** Compact currency formatter for KPI cards (e.g. $1.0M, $500K) */
export function formatCurrencyCompact(value: number, currency = 'USD'): string {
  const safe = typeof value === 'number' && isFinite(value) ? value : 0
  if (currency === 'JPY' || safe >= 1000000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0, notation: 'compact' }).format(safe)
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(safe)
}

export function abbreviateNumber(value: number): string {
  const safe = typeof value === 'number' && isFinite(value) ? value : 0
  if (safe >= 1000000) return `$${(safe / 1000000).toFixed(1)}M`
  if (safe >= 1000) return `$${(safe / 1000).toFixed(safe >= 10000 ? 1 : 0)}K`
  return safe.toString()
}

export function formatDate(dateStr: string): string {
  try { return format(new Date(dateStr), 'MMM dd, yyyy') } catch { return dateStr }
}

export function getCountryFlag(country: string): string {
  const nameMap: Record<string, string> = {
    'Nigeria': '\u{1F1F3}\u{1F1EC}', 'Kenya': '\u{1F1F0}\u{1F1EA}', 'Ghana': '\u{1F1EC}\u{1F1ED}', 'Uganda': '\u{1F1FA}\u{1F1EC}',
    'Tanzania': '\u{1F1F9}\u{1F1FF}', 'Rwanda': '\u{1F1F7}\u{1F1FC}', 'South Africa': '\u{1F1FF}\u{1F1E6}',
    'United States': '\u{1F1FA}\u{1F1F8}', 'United Kingdom': '\u{1F1EC}\u{1F1E7}', 'Germany': '\u{1F1E9}\u{1F1EA}',
    'Brazil': '\u{1F1E7}\u{1F1F7}', 'Mexico': '\u{1F1F2}\u{1F1FD}', 'Japan': '\u{1F1EF}\u{1F1F5}', 'China': '\u{1F1E8}\u{1F1F3}',
    'India': '\u{1F1EE}\u{1F1F3}', 'Canada': '\u{1F1E8}\u{1F1E6}', 'Australia': '\u{1F1E6}\u{1F1FA}', 'UAE': '\u{1F1E6}\u{1F1EA}',
    'Singapore': '\u{1F1F8}\u{1F1EC}', 'France': '\u{1F1EB}\u{1F1F7}', 'Netherlands': '\u{1F1F3}\u{1F1F1}',
  }
  if (nameMap[country]) return nameMap[country]
  return CURRENCY_FLAGS[country] || '\u{1F310}'
}

export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const s = status?.toLowerCase()?.replace(/[\s_-]/g, '') || ''
  if (['completed', 'paid', 'clear', 'resolved', 'engaged'].includes(s)) return 'default'
  if (['failed', 'disputed', 'critical', 'alert', 'confirmed', 'declined', 'overdue'].includes(s)) return 'destructive'
  return 'outline'
}

export function getStatusColor(status: string): string {
  const s = status?.toLowerCase()?.replace(/[\s_-]/g, '') || ''
  if (['completed', 'paid', 'clear', 'resolved', 'engaged'].includes(s))
    return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
  if (['failed', 'disputed', 'critical', 'alert', 'confirmed', 'declined', 'overdue'].includes(s))
    return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800'
  if (['active', 'inescrow', 'processing', 'sent', 'investigating', 'interested', 'potential_match'].includes(s))
    return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800'
  if (['pending', 'funded'].includes(s))
    return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
  return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700'
}

function safeNum(score: unknown): number {
  return typeof score === 'number' && isFinite(score) ? score : 0
}

export function getTrustScoreColor(score: number | undefined | null): string {
  const s = safeNum(score)
  if (s >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (s >= 60) return 'text-amber-600 dark:text-amber-400'
  if (s >= 40) return 'text-orange-600 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400'
}

export function getTrustScoreBg(score: number | undefined | null): string {
  const s = safeNum(score)
  if (s >= 80) return 'bg-emerald-500 dark:bg-emerald-600'
  if (s >= 60) return 'bg-amber-500 dark:bg-amber-600'
  if (s >= 40) return 'bg-orange-500 dark:bg-orange-600'
  return 'bg-red-500 dark:bg-red-600'
}

export function getRiskColor(score: number | undefined | null): string {
  const s = safeNum(score)
  if (s >= 80) return 'text-red-600 dark:text-red-400'
  if (s >= 60) return 'text-orange-600 dark:text-orange-400'
  if (s >= 40) return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

export function getRiskBg(score: number | undefined | null): string {
  const s = safeNum(score)
  if (s >= 80) return 'bg-red-500 dark:bg-red-600'
  if (s >= 60) return 'bg-orange-500 dark:bg-orange-600'
  if (s >= 40) return 'bg-amber-500 dark:bg-amber-600'
  return 'bg-emerald-500 dark:bg-emerald-600'
}

export function truncate(str: string, len: number): string {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}
