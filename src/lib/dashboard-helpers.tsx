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
import { Badge } from '@/components/ui/badge'

// ─── Constants ──────────────────────────────────────────────────────────────

export const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', NGN: '🇳🇬', KES: '🇰🇪',
  GHS: '🇬🇭', UGX: '🇺🇬', TZS: '🇹🇿', RWF: '🇷🇼', BRL: '🇧🇷',
  MXN: '🇲🇽', ZAR: '🇿🇿', JPY: '🇯🇵', CNY: '🇨🇳', INR: '🇮🇳',
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
    txRef: string; buyerBusinessName: string; sellerBusinessName: string;
    amount: number; currency: string; status: string; createdAt: string;
    buyerBusinessId: string; sellerBusinessId: string;
    currentMilestone: number; totalMilestones: number;
  }>,
  trustScoreDistribution: Array<{ range: string; count: number }>,
}

export interface Business {
  id: string; name: string; legalName?: string; registrationNo?: string;
  taxId?: string; country: string; city?: string;
  industry?: string; website?: string; employeeCount?: number;
  annualRevenue?: number; description?: string; logoUrl?: string;
  status: string; verifiedAt?: string; createdAt: string; updatedAt: string;
  passportLevel?: string; amlStatus?: string; riskRating?: string;
  kycStatus?: string; trustScore?: number;
}

export interface EscrowData {
  id: string; txRef: string; buyerId: string; sellerId: string;
  amount: number; currency: string; description?: string;
  status: string; currentMilestone: number; totalMilestones: number;
  fundedAmount: number; releasedAmount: number; refundedAmount: number;
  feeAmount: number; feeCurrency: string; aiRiskScore?: number;
  aiRiskLevel?: string; paymentIntentId?: string; expiresAt?: string;
  completedAt?: string; createdAt: string; updatedAt: string;
  buyerBusinessName?: string; sellerBusinessName?: string;
}

export interface TrustScoreData {
  id: string; businessId: string; overallScore: number; paymentScore: number;
  deliveryScore: number; qualityScore: number; communicationScore: number;
  complianceScore: number; totalReviews: number; totalTransactions: number;
  lastCalculated: string;
}

// ─── Helper Functions ──────────────────────────────────────────────────────

export function formatCurrency(value: number, currency = 'USD'): string {
  if (currency === 'JPY' || value >= 1000000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0, notation: 'compact' }).format(value)
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

export function abbreviateNumber(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(value >= 10000 ? 1 : 0)}K`
  return value.toString()
}

export function formatDate(dateStr: string): string {
  try { return format(new Date(dateStr), 'MMM dd, yyyy') } catch { return dateStr }
}

export function getCountryFlag(country: string): string {
  return CURRENCY_FLAGS[country] || '🌐'
}

export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'completed' || status === 'active' || status === 'verified' || status === 'clear') return 'default'
  if (status === 'disputed' || status === 'high_risk' || status === 'alert') return 'destructive'
  if (status === 'pending' || status === 'in_progress' || status === 'in_escrow' || status === 'funded') return 'secondary'
  if (status === 'failed' || status === 'rejected' || status === 'cancelled') return 'outline'
  return 'outline'
}

export function getStatusColor(status: string): string {
  if (status === 'completed' || status === 'verified') return 'text-emerald-700 bg-emerald-50'
  if (status === 'active' || status === 'in_escrow') return 'text-blue-700 bg-blue-50'
  if (status === 'pending' || status === 'created') return 'text-slate-500'
  if (status === 'disputed' || status === 'failed') return 'text-red-700 bg-red-50'
  return 'text-slate-500'
}

export function getTrustScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-700'
  if (score >= 60) return 'text-amber-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}

// ─── useApi Hook ────────────────────────────────────────────────────────────────

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

// ─── Shared Sub-Components ───────────────────────────────────────

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

export function PipelineCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-3 sm:p-4 flex items-center gap-3">
        <div className="text-2xl font-bold" style={{ color }}>{value}</div>
        <p className="text-xs font-medium" style={{ color }}>{title}</p>
      </CardContent>
    </Card>
  )
}

export function ScoreBar({ score, maxScore = 100, label }: { score: number; maxScore?: number; label?: string }) {
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100))
  return (
    <div className="space-y-1">
      {label && <div className="flex justify-between text-xs"><span className="text-slate-600">{label}</span><span className="font-medium">{score}/{maxScore}</span></div>}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
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
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
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
  seller: 'seller',
  auditor: 'Auditor',
  viewer: 'Viewer',
}

export const ROLE_TABS: Record<Role, string[]> = {
  admin: ['overview', 'trust-graph', 'escrow', 'payments', 'passport', 'digital-twin', 'payment-links', 'wallet', 'fraud', 'matching', 'collections', 'compliance'],
  buyer: ['overview', 'payments', 'payment-links', 'wallet'],
  seller: ['overview', 'trust-graph', 'escrow', 'payment-links', 'wallet'],
  auditor: ['overview', 'trust-graph', 'fraud', 'compliance', 'collections'],
  viewer: ['overview', 'trust-graph', 'payments'],
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'trust-graph', label: 'Trust Graph', icon: Network },
  { id: 'escrow', label: 'Escrow', icon: Shield },
  { id: 'payments', label: 'Payments', icon: ArrowLeftRight },
  { id: 'passport', label: 'Passport', icon: IdCard },
  { id: 'digital-twin', label: 'Digital Twin', icon: Brain },
  { id: 'payment-links', label: 'Payment Links', icon: Link2 },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'fraud', label: 'Fraud', icon: ShieldAlert },
  { id: 'matching', label: 'Matching', icon: UserCheck },
  { id: 'collections', label: 'Collections', icon: BellRing },
  { id: 'compliance', label: 'Compliance', icon: Scale },
]