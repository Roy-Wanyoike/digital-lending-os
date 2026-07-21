'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
  LayoutDashboard, Network, Shield, ArrowLeftRight, IdCard as PassportIcon,
  Brain, Link2, Wallet, ShieldAlert, UserCheck, BellRing, Scale,
  TrendingUp, Building2, ArrowUpRight, ArrowDownRight, Zap, Star,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Constants ──────────────────────────────────────────────────────

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

// ─── Type Definitions ──────────────────────────────────────────────────────

export type Role = 'admin' | 'buyer' | 'seller' | 'auditor' | 'viewer'

export interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export interface EscrowTransaction {
  id: string; reference: string; buyerBusinessId: string; buyerBusinessName: string
  sellerBusinessId: string; sellerBusinessName: string; amount: number; currency: string
  status: string; aiRiskScore: number; aiRiskLevel: string; currentMilestone: number
  totalMilestones: number; createdAt: string; updatedAt: string
}

export interface Business {
  id: string; name: string; country: string; industry: string; status: string
  trustScore: number; passportLevel: string; kycStatus: string; amlStatus: string
  credentialLevel: string; riskRating: string
}

export interface TrustScoreBreakdown {
  identity: number; financial: number; compliance: number; reputation: number; network: number
}

export interface PaymentIntent {
  id: string; reference: string; fromCurrency: string; toCurrency: string
  fromAmount: number; toAmount: number; provider: string; routingScore: number
  status: string; fee: number; createdAt: string
}

export interface ExchangeRate {
  id: string; fromCurrency: string; toCurrency: string; rate: number; provider: string; updatedAt: string
}

export interface PaymentMethod {
  id: string; methodName: string; provider: string; type: string; feePercentage: number
  fixedFee: number; settlementTime: string; countries: string[]; icon: string
}

export interface Verification {
  id: string; reference: string; businessId: string; businessName: string
  type: string; status: string; result: string; createdAt: string
}

export interface TwinProfile {
  id: string; businessId: string; businessName: string; healthScore: number
  cashFlow: string; creditScore: number; growthTrajectory: string; riskAppetite: string
  metrics: { month: string; revenue: number; expenses: number; netIncome: number }[]
  predictions: { metric: string; current: number; predicted: number; confidence: number }[]
}

export interface PaymentLink {
  id: string; reference: string; title: string; amount: number | null; currency: string
  status: string; paymentCount: number; maxPayments: number | null; totalCollected: number
  createdAt: string; payments?: PaymentIntent[]
}

export interface WalletData {
  id: string; businessId: string; currency: string; balance: number
  availableBalance: number; pendingBalance: number; transactions: WalletTransaction[]
}

export interface WalletTransaction {
  id: string; reference: string; type: string; amount: number; currency: string; description: string; createdAt: string
}

export interface FraudAlert {
  id: string; reference: string; severity: string; type: string; score: number
  businessName: string; businessId: string; status: string; description: string; createdAt: string
}

export interface FraudRule {
  id: string; name: string; type: string; action: string; severity: string; triggerCount: number
}

export interface MatchingRecord {
  id: string; seekerName: string; candidateName: string; type: string; matchScore: number
  status: string; reasons: string[]; createdAt: string
}

export interface CollectionRecord {
  id: string; reference: string; debtorName: string; originalAmount: number
  outstandingAmount: number; currency: string; aging: string; priority: string
  status: string; reminderCount: number; aiStrategy: string; createdAt: string
}

export interface ComplianceRule {
  id: string; name: string; type: string; action: string; severity: string; triggerCount: number
}

export interface Screening {
  id: string; type: string; result: string; riskLevel: string; status: string; createdAt: string; businessName?: string
}

export interface DashboardStats {
  totalVerifiedBusinesses: number; activeEscrows: number; totalEscrowVolume: number; avgTrustScore: number
  escrowsByStatus: Record<string, number>; trustScoreDistribution: { range: string; count: number }[]
  businessesByCountry: { country: string; count: number }[]; recentDeals: EscrowTransaction[]
  totalPaymentMethods: number; totalCountries: number; totalUsers: number
}

// ─── Navigation Constants ──────────────────────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'trust-graph', label: 'Trust Graph', icon: Network },
  { id: 'escrow', label: 'Escrow', icon: Shield },
  { id: 'payments', label: 'Payments', icon: ArrowLeftRight },
  { id: 'passport', label: 'Passport', icon: PassportIcon },
  { id: 'digital-twin', label: 'Digital Twin', icon: Brain },
  { id: 'payment-links', label: 'Payment Links', icon: Link2 },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'fraud', label: 'Fraud', icon: ShieldAlert },
  { id: 'matching', label: 'Matching', icon: UserCheck },
  { id: 'collections', label: 'Collections', icon: BellRing },
  { id: 'compliance', label: 'Compliance', icon: Scale },
]

export const ROLE_TABS: Record<Role, string[]> = {
  admin: ['overview', 'trust-graph', 'escrow', 'payments', 'passport', 'digital-twin', 'payment-links', 'wallet', 'fraud', 'matching', 'collections', 'compliance'],
  buyer: ['overview', 'payments', 'payment-links', 'wallet'],
  seller: ['overview', 'trust-graph', 'escrow', 'payment-links', 'wallet'],
  auditor: ['overview', 'trust-graph', 'fraud', 'compliance', 'collections'],
  viewer: ['overview', 'trust-graph', 'payments'],
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin', buyer: 'Buyer', seller: 'Seller', auditor: 'Auditor', viewer: 'Viewer',
}

// ─── Helper Functions ──────────────────────────────────────────────────────

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

export function formatNumber(num: number): string {
  return num.toLocaleString()
}

export function abbreviateNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}

export function getStatusColor(status: string): string {
  const s = status?.toLowerCase()?.replace(/[\s_-]/g, '') || ''
  if (['completed', 'active', 'clear', 'resolved', 'engaged'].includes(s)) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (['funded', 'inescrow', 'investigating', 'interested', 'potential_match'].includes(s)) return 'bg-amber-100 text-amber-700 border-amber-200'
  if (['disputed', 'critical', 'alert', 'confirmed', 'declined'].includes(s)) return 'bg-red-100 text-red-700 border-red-200'
  if (['created', 'pending', 'open', 'suggested'].includes(s)) return 'bg-slate-100 text-slate-600 border-slate-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const s = status?.toLowerCase()?.replace(/[\s_-]/g, '') || ''
  if (['completed', 'active', 'clear', 'resolved', 'engaged'].includes(s)) return 'default'
  if (['disputed', 'critical', 'alert', 'confirmed', 'declined'].includes(s)) return 'destructive'
  return 'secondary'
}

export function getTrustScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}

export function getTrustScoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-500'
  if (score >= 40) return 'bg-orange-500'
  return 'bg-red-500'
}

export function getRiskColor(score: number): string {
  if (score >= 80) return 'text-red-600'
  if (score >= 60) return 'text-orange-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-emerald-600'
}

export function getRiskBg(score: number): string {
  if (score >= 80) return 'bg-red-500'
  if (score >= 60) return 'bg-orange-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-emerald-500'
}

export function getCountryFlag(country: string): string {
  if (!country) return '🌍'
  const flags: Record<string, string> = {
    'Nigeria': '🇳🇬', 'Kenya': '🇰🇪', 'Ghana': '🇬🇭', 'Uganda': '🇺🇬',
    'Tanzania': '🇹🇿', 'Rwanda': '🇷🇼', 'South Africa': '🇿🇦',
    'United States': '🇺🇸', 'United Kingdom': '🇬🇧', 'Germany': '🇩🇪',
    'Brazil': '🇧🇷', 'Mexico': '🇲🇽', 'Japan': '🇯🇵', 'China': '🇨🇳',
    'India': '🇮🇳', 'Canada': '🇨🇦', 'Australia': '🇦🇺', 'UAE': '🇦🇪',
    'Singapore': '🇸🇬', 'France': '🇫🇷', 'Netherlands': '🇳🇱',
  }
  return flags[country] || '🌍'
}

export function formatDate(dateStr: string): string {
  try { return format(new Date(dateStr), 'MMM dd, yyyy') } catch { return dateStr }
}

export function formatDateTime(dateStr: string): string {
  try { return format(new Date(dateStr), 'MMM dd, yyyy HH:mm') } catch { return dateStr }
}

export function truncate(str: string, len: number): string {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}

// ─── Custom Hook ──────────────────────────────────────────────────────

export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!url) return
    let cancelled = false
    fetch(url)
      .then(r => r.json())
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [url])

  return { data, loading }
}

// ─── Shared Sub-Components ─────────────────────────────────────────────────────

export function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
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
            <p className="text-xs sm:text-sm font-medium text-slate-500">{title}</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">{value}</p>
            {subtitle && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
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

export function PipelineCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex-1 min-w-0">
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-3 sm:p-4 text-center">
          <p className="text-2xl sm:text-3xl font-bold" style={{ color }}>{count}</p>
          <p className="text-xs text-slate-500 mt-1 truncate">{label}</p>
        </CardContent>
      </Card>
    </div>
  )
}

export function ScoreBar({ score, maxScore = 100, label }: { score: number; maxScore?: number; label?: string }) {
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100))
  return (
    <div className="space-y-1">
      {label && <div className="flex justify-between text-xs"><span className="text-slate-600">{label}</span><span className="font-medium">{score}/{maxScore}</span></div>}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export function CircularScore({ score, size = 100, strokeWidth = 6 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          strokeDasharray={circumference}
        />
      </svg>
      <span className="absolute text-lg font-bold" style={{ color }}>{score}</span>
    </div>
  )
}

export function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 50, x: '-50%' }}
          className="fixed bottom-6 left-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm"
        >
          <Zap className="h-4 w-4 text-emerald-400" />
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
