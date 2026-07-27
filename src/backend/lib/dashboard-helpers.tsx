'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
  LayoutDashboard, Network, Shield, ArrowLeftRight, IdCard as PassportIcon,
  Brain, Link2, Wallet, ShieldAlert, UserCheck, BellRing, Scale,
  ArrowUpRight, ArrowDownRight, Gift, AlertTriangle, RotateCcw,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

// ─── Constants ──────────────────────────────────────────────────────────────

export const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', NGN: '🇳🇬', KES: '🇰🇪',
  GHS: '🇬🇭', UGX: '🇺🇬', TZS: '🇹🇿', RWF: '🇷🇼', BRL: '🇧🇷',
  MXN: '🇲🇽', ZAR: '🇿🇦', JPY: '🇯🇵', CNY: '🇨🇳', INR: '🇮🇳',
  CAD: '🇨🇦', AUD: '🇦🇺', CHF: '🇨🇭', AED: '🇦🇪', SGD: '🇸🇬',
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

// Matches /api/dashboard/stats response shape
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

// Matches /api/businesses response (includes nested passport + trustScore)
export interface Business {
  id: string; name: string; legalName?: string; registrationNo?: string;
  taxId?: string; country: string; city?: string;
  industry?: string; website?: string; employeeCount?: number;
  annualRevenue?: number; description?: string; logoUrl?: string;
  status: string; verifiedAt?: string; createdAt: string; updatedAt: string;
  passport?: { credentialLevel?: string; kycStatus?: string; amlStatus?: string; riskRating?: string } | null
  trustScore?: { overallScore?: number } | null
  digitalTwin?: { healthScore?: number; growthTrajectory?: string; riskAppetite?: string } | null
}

// Matches /api/escrow/transactions response
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

// Matches /api/payments/intents response
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

// Matches /api/payments/rates response
export interface ExchangeRate {
  from: string; to: string; rate: number
}

// Matches /api/payment-methods/global response
export interface PaymentMethod {
  id: string; methodName: string; provider: string; type: string;
  feePercent: number; fixedFee: number; settlementTime: number;
  countries: string; icon?: string; isActive: boolean
}

// Matches /api/passport/verifications response
export interface Verification {
  id: string; businessId: string; type: string; method: string;
  status: string; submittedAt: string; verifiedAt?: string | null;
  verifiedBy?: string | null; rejectionReason?: string | null;
  metadata?: string | null; createdAt: string; updatedAt: string;
  business?: { id: string; name: string; country: string; status: string } | null
}

// Matches /api/twin/profiles response
export interface TwinProfile {
  id: string; businessId: string; healthScore: number;
  cashFlowHealth: number; riskAppetite: string;
  creditWorthiness: number; liquidityScore: number;
  growthTrajectory: string; aiModelVersion: string;
  lastSyncAt?: string | null; createdAt: string; updatedAt: string;
  business?: { id: string; name: string; country: string; industry: string } | null
  metrics?: Array<{ period: string; periodDate: string; revenue?: number | null; expenses?: number | null; netIncome?: number | null; transactionCount?: number | null; paymentSuccessRate?: number | null }> | null
  predictions?: Array<{ predictionType: string; timeframe: string; predictedValue: number; confidence: number }> | null
}

// Matches /api/payment-links response
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

// Matches /api/wallets response
export interface WalletData {
  id: string; businessId: string; currency: string;
  balance: number; availableBalance: number;
  pendingBalance: number; frozenBalance: number;
  isDefault: boolean; status: string;
  createdAt: string; updatedAt: string;
  _transactionCount?: number
}

// Matches /api/fraud/alerts response
export interface FraudAlert {
  id: string; alertRef: string; businessId?: string | null;
  relatedType: string; relatedId?: string | null;
  severity: string; fraudType: string; score: number;
  description: string; recommendation?: string | null;
  status: string; actionTaken?: string | null;
  resolvedAt?: string | null; createdAt: string; updatedAt: string;
}

// Matches /api/fraud/rules response
export interface FraudRule {
  id: string; name: string; description?: string | null;
  condition: string; action: string;
  severity: string; isActive: boolean; triggerCount?: number;
  lastTriggeredAt?: string | null;
  createdAt: string; updatedAt: string
}

// Matches /api/matching response
export interface MatchingRecord {
  id: string; seekerId: string; candidateId: string;
  matchType: string; matchScore: number;
  reasons: string; status: string;
  createdAt: string; updatedAt: string;
  seekerName?: string | null; candidateName?: string | null
}

// Matches /api/collections response
export interface CollectionRecord {
  id: string; caseRef: string; businessId: string; debtorId: string;
  invoiceId?: string | null; originalAmount: number;
  outstandingAmount: number; currency: string;
  agingBucket: string; priority: string; status: string;
  aiStrategy?: string | null; reminderCount?: number;
  createdAt: string; updatedAt: string;
  debtorName?: string | null
}

// Matches /api/compliance/rules response
export interface ComplianceRule {
  id: string; name: string; description?: string | null;
  ruleType: string; condition: string; action: string;
  severity: string; isActive: boolean; triggerCount?: number;
  createdAt: string; updatedAt: string
}

// Matches /api/compliance/screenings response
export interface Screening {
  id: string; businessId?: string | null;
  transactionType?: string | null; transactionId?: string | null;
  screeningType: string; result: string; riskLevel: string;
  status: string; details?: string | null;
  matchedLists?: string | null; createdAt: string; updatedAt: string
}

// ─── Helper Functions ──────────────────────────────────────────────────────

export function formatCurrency(value: number, currency = 'USD'): string {
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
    'Nigeria': '🇳🇬', 'Kenya': '🇰🇪', 'Ghana': '🇬🇭', 'Uganda': '🇺🇬',
    'Tanzania': '🇹🇿', 'Rwanda': '🇷🇼', 'South Africa': '🇿🇦',
    'United States': '🇺🇸', 'United Kingdom': '🇬🇧', 'Germany': '🇩🇪',
    'Brazil': '🇧🇷', 'Mexico': '🇲🇽', 'Japan': '🇯🇵', 'China': '🇨🇳',
    'India': '🇮🇳', 'Canada': '🇨🇦', 'Australia': '🇦🇺', 'UAE': '🇦🇪',
    'Singapore': '🇸🇬', 'France': '🇫🇷', 'Netherlands': '🇳🇱',
  }
  if (nameMap[country]) return nameMap[country]
  return CURRENCY_FLAGS[country] || '🌐'
}

export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const s = status?.toLowerCase()?.replace(/[\s_-]/g, '') || ''
  if (['completed', 'active', 'clear', 'resolved', 'engaged'].includes(s)) return 'default'
  if (['disputed', 'critical', 'alert', 'confirmed', 'declined'].includes(s)) return 'destructive'
  return 'secondary'
}

export function getStatusColor(status: string): string {
  const s = status?.toLowerCase()?.replace(/[\s_-]/g, '') || ''
  if (['completed', 'active', 'clear', 'resolved', 'engaged'].includes(s)) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (['funded', 'inescrow', 'investigating', 'interested', 'potential_match'].includes(s)) return 'bg-amber-100 text-amber-700 border-amber-200'
  if (['disputed', 'critical', 'alert', 'confirmed', 'declined'].includes(s)) return 'bg-red-100 text-red-700 border-red-200'
  if (['created', 'pending', 'open', 'suggested'].includes(s)) return 'bg-slate-100 text-slate-600 border-slate-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

function safeNum(score: unknown): number {
  return typeof score === 'number' && isFinite(score) ? score : 0
}

export function getTrustScoreColor(score: number | undefined | null): string {
  const s = safeNum(score)
  if (s >= 80) return 'text-emerald-600'
  if (s >= 60) return 'text-amber-600'
  if (s >= 40) return 'text-orange-600'
  return 'text-red-600'
}

export function getTrustScoreBg(score: number | undefined | null): string {
  const s = safeNum(score)
  if (s >= 80) return 'bg-emerald-500'
  if (s >= 60) return 'bg-amber-500'
  if (s >= 40) return 'bg-orange-500'
  return 'bg-red-500'
}

export function getRiskColor(score: number | undefined | null): string {
  const s = safeNum(score)
  if (s >= 80) return 'text-red-600'
  if (s >= 60) return 'text-orange-600'
  if (s >= 40) return 'text-amber-600'
  return 'text-emerald-600'
}

export function getRiskBg(score: number | undefined | null): string {
  const s = safeNum(score)
  if (s >= 80) return 'bg-red-500'
  if (s >= 60) return 'bg-orange-500'
  if (s >= 40) return 'bg-amber-500'
  return 'bg-emerald-500'
}

export function truncate(str: string, len: number): string {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}

// ─── useApi Hook ────────────────────────────────────────────────────────────────
// Auto-unwraps { data: T } responses from API routes

export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)

  const refetch = useCallback(() => setKey(k => k + 1), [])

  useEffect(() => {
    if (!url) return
    let cancelled = false
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetch(url, { signal: controller.signal })
      .then(r => {
        if (!r.ok) {
          setError(`Request failed with status ${r.status}`)
          return null
        }
        return r.json()
      })
      .then(d => {
        if (cancelled) return
        if (d === null) {
          setData(null)
          setLoading(false)
          return
        }
        if (d && typeof d === 'object' && !Array.isArray(d) && 'data' in d) {
          const unwrapped = (d as any).data
          if (unwrapped === undefined || unwrapped === null) {
            setData(null)
          } else if (Array.isArray(unwrapped) || typeof unwrapped !== 'object' || !('error' in unwrapped)) {
            setData(unwrapped as T)
          } else {
            setError('Unexpected response format')
            setData(null)
          }
        } else if (d && typeof d === 'object' && 'error' in d) {
          setError((d as any).error || 'Request failed')
          setData(null)
        } else {
          setData(d as T)
        }
        setLoading(false)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.name === 'AbortError' ? null : 'Network error — check your connection')
          setData(null)
          setLoading(false)
        }
      })
    return () => { cancelled = true; controller.abort() }
  }, [url, key])

  return { data, loading, error, refetch }
}

// ─── Shared Sub-Components ───────────────────────────────────────

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Failed to load data</p>
        <p className="text-xs text-muted-foreground mt-1">{message || 'An error occurred while fetching data. Please try again.'}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="h-3 w-3 mr-1.5" />
          Retry
        </Button>
      )}
    </div>
  )
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  )
}

export function KPICard({ title, value, subtitle, icon: Icon, trend }: {
  title: string; value: string; subtitle?: string; icon?: React.ComponentType<{ className?: string }>; trend?: 'up' | 'down'
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
                {trend === 'down' && <ArrowDownRight className="h-3 w-3 text-red-500" />}
                {subtitle}
              </p>
            )}
          </div>
          {Icon && <Icon className="h-5 w-5 sm:h-8 sm:w-8 text-emerald-500/60" />}
        </div>
      </CardContent>
    </Card>
  )
}

// Accepts both { title, value } and { label, count } prop patterns for backward compat
export function PipelineCard(props: { title?: string; value?: number; label?: string; count?: number; color: string }) {
  const title = props.title ?? props.label ?? ''
  const value = props.value ?? props.count ?? 0
  return (
    <div className="flex-1 min-w-0">
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-3 sm:p-4 text-center">
          <p className="text-2xl sm:text-3xl font-bold" style={{ color: props.color }}>{value}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate">{title}</p>
        </CardContent>
      </Card>
    </div>
  )
}

export function ScoreBar({ score, maxScore = 100, label }: { score: number; maxScore?: number; label?: string }) {
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100))
  return (
    <div className="space-y-1">
      {label && <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-medium">{score}/{maxScore}</span></div>}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function CircularScore({ score, size = 100, strokeWidth = 6 }: { score: number | undefined | null; size?: number; strokeWidth?: number }) {
  const safe = typeof score === 'number' && isFinite(score) ? score : 0
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (safe / 100) * circumference
  const color = safe >= 80 ? '#10b981' : safe >= 60 ? '#f59e0b' : safe >= 40 ? '#f97316' : '#ef4444'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <span className="absolute text-lg font-bold" style={{ color }}>{safe}</span>
    </div>
  )
}

export function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg max-w-sm">
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}
    </AnimatePresence>
  )
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
  admin: ['overview', 'trust-graph', 'escrow', 'payments', 'passport', 'digital-twin', 'payment-links', 'wallet', 'referral', 'fraud', 'matching', 'collections', 'compliance'],
  buyer: ['overview', 'payments', 'payment-links', 'wallet', 'referral'],
  seller: ['overview', 'trust-graph', 'escrow', 'payment-links', 'wallet', 'referral'],
  auditor: ['overview', 'trust-graph', 'fraud', 'compliance', 'collections'],
  viewer: ['overview', 'trust-graph', 'payments'],
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'trust-graph', label: 'Trust Graph', icon: Network },
  { id: 'escrow', label: 'Escrow', icon: Shield },
  { id: 'payments', label: 'Payments', icon: ArrowLeftRight },
  { id: 'passport', label: 'Passport', icon: PassportIcon },
  { id: 'digital-twin', label: 'Digital Twin', icon: Brain },
  { id: 'payment-links', label: 'Payment Links', icon: Link2 },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'referral', label: 'Referral', icon: Gift },
  { id: 'fraud', label: 'Fraud', icon: ShieldAlert },
  { id: 'matching', label: 'Matching', icon: UserCheck },
  { id: 'collections', label: 'Collections', icon: BellRing },
  { id: 'compliance', label: 'Compliance', icon: Scale },
]