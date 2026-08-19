'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
// import { io, Socket } from 'socket.io-client'
import { format } from 'date-fns'
import {
  LayoutDashboard, Network, Shield, ArrowLeftRight, IdCard as PassportIcon,
  Brain, Link2, Wallet, ShieldAlert, UserCheck, BellRing, Scale,
  Menu, TrendingUp, Users, Activity, Search, Building2, Globe, Clock,
  AlertTriangle, CheckCircle, XCircle, Wifi, WifiOff, ArrowUpRight,
  ArrowDownRight, ArrowRight, ChevronRight, Zap, Target, CreditCard, Lock,
  Star, Award, TrendingDown, Eye
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription,
} from '@/components/ui/sheet'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip as RTooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, Legend,
} from 'recharts'

// ─── Helper Functions ─────────────────────────────────────────────────────────

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', NGN: '🇳🇬', KES: '🇰🇪',
  GHS: '🇬🇭', UGX: '🇺🇬', TZS: '🇹🇿', RWF: '🇷🇼', BRL: '🇧🇷',
  MXN: '🇲🇽', ZAR: '🇿🇦', JPY: '🇯🇵', CNY: '🇨🇳', INR: '🇮🇳',
  CAD: '🇨🇦', AUD: '🇦🇺', CHF: '🇨🇭', AED: '🇦🇪', SGD: '🇸🇬',
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

function abbreviateNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

function getStatusColor(status: string): string {
  const s = status?.toLowerCase()?.replace(/[\s_-]/g, '') || ''
  if (['completed', 'active', 'clear', 'resolved', 'engaged'].includes(s)) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (['funded', 'inescrow', 'investigating', 'interested', 'potential_match'].includes(s)) return 'bg-amber-100 text-amber-700 border-amber-200'
  if (['disputed', 'critical', 'alert', 'confirmed', 'declined'].includes(s)) return 'bg-red-100 text-red-700 border-red-200'
  if (['created', 'pending', 'open', 'suggested'].includes(s)) return 'bg-slate-100 text-slate-600 border-slate-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const s = status?.toLowerCase()?.replace(/[\s_-]/g, '') || ''
  if (['completed', 'active', 'clear', 'resolved', 'engaged'].includes(s)) return 'default'
  if (['disputed', 'critical', 'alert', 'confirmed', 'declined'].includes(s)) return 'destructive'
  return 'secondary'
}

function getTrustScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}

function getTrustScoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-500'
  if (score >= 40) return 'bg-orange-500'
  return 'bg-red-500'
}

function getRiskColor(score: number): string {
  if (score >= 80) return 'text-red-600'
  if (score >= 60) return 'text-orange-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-emerald-600'
}

function getRiskBg(score: number): string {
  if (score >= 80) return 'bg-red-500'
  if (score >= 60) return 'bg-orange-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function getCountryFlag(country: string): string {
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

function formatDate(dateStr: string): string {
  try { return format(new Date(dateStr), 'MMM dd, yyyy') } catch { return dateStr }
}

function formatDateTime(dateStr: string): string {
  try { return format(new Date(dateStr), 'MMM dd, yyyy HH:mm') } catch { return dateStr }
}

function truncate(str: string, len: number): string {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}

// ─── Type Definitions ────────────────────────────────────────────────────────

type Role = 'admin' | 'buyer' | 'seller' | 'auditor' | 'viewer'

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface EscrowTransaction {
  id: string
  reference: string
  buyerBusinessId: string
  buyerBusinessName: string
  sellerBusinessId: string
  sellerBusinessName: string
  amount: number
  currency: string
  status: string
  aiRiskScore: number
  aiRiskLevel: string
  currentMilestone: number
  totalMilestones: number
  createdAt: string
  updatedAt: string
}

interface Business {
  id: string
  name: string
  country: string
  industry: string
  status: string
  trustScore: number
  passportLevel: string
  kycStatus: string
  amlStatus: string
  credentialLevel: string
  riskRating: string
}

interface TrustScoreBreakdown {
  identity: number
  financial: number
  compliance: number
  reputation: number
  network: number
}

interface PaymentIntent {
  id: string
  reference: string
  fromCurrency: string
  toCurrency: string
  fromAmount: number
  toAmount: number
  provider: string
  routingScore: number
  status: string
  fee: number
  createdAt: string
}

interface ExchangeRate {
  id: string
  fromCurrency: string
  toCurrency: string
  rate: number
  provider: string
  updatedAt: string
}

interface PaymentMethod {
  id: string
  methodName: string
  provider: string
  type: string
  feePercentage: number
  fixedFee: number
  settlementTime: string
  countries: string[]
  icon: string
}

interface Verification {
  id: string
  reference: string
  businessId: string
  businessName: string
  type: string
  status: string
  result: string
  createdAt: string
}

interface TwinProfile {
  id: string
  businessId: string
  businessName: string
  healthScore: number
  cashFlow: string
  creditScore: number
  growthTrajectory: string
  riskAppetite: string
  metrics: { month: string; revenue: number; expenses: number; netIncome: number }[]
  predictions: { metric: string; current: number; predicted: number; confidence: number }[]
}

interface PaymentLink {
  id: string
  reference: string
  title: string
  amount: number | null
  currency: string
  status: string
  paymentCount: number
  maxPayments: number | null
  totalCollected: number
  createdAt: string
  payments?: PaymentIntent[]
}

interface WalletData {
  id: string
  businessId: string
  currency: string
  balance: number
  availableBalance: number
  pendingBalance: number
  transactions: WalletTransaction[]
}

interface WalletTransaction {
  id: string
  reference: string
  type: string
  amount: number
  currency: string
  description: string
  createdAt: string
}

interface FraudAlert {
  id: string
  reference: string
  severity: string
  type: string
  score: number
  businessName: string
  businessId: string
  status: string
  description: string
  createdAt: string
}

interface FraudRule {
  id: string
  name: string
  type: string
  action: string
  severity: string
  triggerCount: number
}

interface MatchingRecord {
  id: string
  seekerName: string
  candidateName: string
  type: string
  matchScore: number
  status: string
  reasons: string[]
  createdAt: string
}

interface CollectionRecord {
  id: string
  reference: string
  debtorName: string
  originalAmount: number
  outstandingAmount: number
  currency: string
  aging: string
  priority: string
  status: string
  reminderCount: number
  aiStrategy: string
  createdAt: string
}

interface ComplianceRule {
  id: string
  name: string
  type: string
  action: string
  severity: string
  triggerCount: number
}

interface Screening {
  id: string
  type: string
  result: string
  riskLevel: string
  status: string
  createdAt: string
  businessName?: string
}

interface DashboardStats {
  totalVerifiedBusinesses: number
  activeEscrows: number
  totalEscrowVolume: number
  avgTrustScore: number
  escrowsByStatus: Record<string, number>
  trustScoreDistribution: { range: string; count: number }[]
  businessesByCountry: { country: string; count: number }[]
  recentDeals: EscrowTransaction[]
  totalPaymentMethods: number
  totalCountries: number
  totalUsers: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
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

const ROLE_TABS: Record<Role, string[]> = [
  'overview', 'trust-graph', 'escrow', 'payments', 'passport', 'digital-twin',
  'payment-links', 'wallet', 'fraud', 'matching', 'collections', 'compliance',
] as unknown as Record<Role, string[]>

ROLE_TABS.admin = ['overview', 'trust-graph', 'escrow', 'payments', 'passport', 'digital-twin', 'payment-links', 'wallet', 'fraud', 'matching', 'collections', 'compliance']
ROLE_TABS.buyer = ['overview', 'payments', 'payment-links', 'wallet']
ROLE_TABS.seller = ['overview', 'trust-graph', 'escrow', 'payment-links', 'wallet']
ROLE_TABS.auditor = ['overview', 'trust-graph', 'fraud', 'compliance', 'collections']
ROLE_TABS.viewer = ['overview', 'trust-graph', 'payments']

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  buyer: 'Buyer',
  seller: 'Seller',
  auditor: 'Auditor',
  viewer: 'Viewer',
}

const ESCROW_STATUSES = ['Created', 'Funded', 'In Escrow', 'Completed', 'Disputed']
const FRAUD_SEVERITIES = ['Critical', 'High', 'Medium', 'Low']
const FRAUD_STATUSES = ['Open', 'Investigating', 'Confirmed', 'Resolved']
const MATCHING_STATUSES = ['Suggested', 'Contacted', 'Interested', 'Engaged', 'Declined']
const AGING_BUCKETS = ['Current', '1-30', '31-60', '61-90', '90+']
const PRIORITY_LEVELS = ['Urgent', 'High', 'Normal', 'Low']

const PAYMENT_METHOD_TYPES = ['All', 'Mobile Money', 'Digital Wallet', 'Real-Time', 'Bank', 'Card', 'Crypto']

const CHART_COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#6366f1', '#8b5cf6', '#06b6d4', '#84cc16']

// ─── Custom Hook ─────────────────────────────────────────────────────────────

function useApi<T>(url: string) {
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

// ─── Sub-Components ──────────────────────────────────────────────────────────

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
      ))}
    </div>
    <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
  </div>
)

const KPICard = ({ title, value, subtitle, icon: Icon, trend }: {
  title: string; value: string; subtitle?: string; icon?: React.ComponentType<{ className?: string }>; trend?: 'up' | 'down'
}) => (
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

const PipelineCard = ({ label, count, color }: { label: string; count: number; color: string }) => (
  <div className="flex-1 min-w-0">
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3 sm:p-4 text-center">
        <p className="text-2xl sm:text-3xl font-bold" style={{ color }}>{count}</p>
        <p className="text-xs text-slate-500 mt-1 truncate">{label}</p>
      </CardContent>
    </Card>
  </div>
)

const ScoreBar = ({ score, maxScore = 100, label }: { score: number; maxScore?: number; label?: string }) => {
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

const CircularScore = ({ score, size = 100, strokeWidth = 6 }: { score: number; size?: number; strokeWidth?: number }) => {
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

const Toast = ({ message, visible }: { message: string; visible: boolean }) => (
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

// ─── Tab Content Components ──────────────────────────────────────────────────

function OverviewTab() {
  const { data: stats, loading } = useApi<DashboardStats>('/api/dashboard/stats')

  if (loading || !stats) return <LoadingSkeleton />

  const pipelineData = ESCROW_STATUSES.map(s => ({
    status: s,
    count: stats.escrowsByStatus?.[s.toLowerCase().replace(/\s/g, '_')] || stats.escrowsByStatus?.[s] || 0,
  }))
  const pipelineColors = ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981', '#ef4444']

  const trustDist = stats.trustScoreDistribution?.map(d => ({ ...d, range: d.range || 'Unknown' })) || []

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Hero VCV Metric */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">Live</Badge>
            <span className="text-xs text-slate-500">Verified Commerce Volume</span>
          </div>
          <p className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(stats.totalEscrowVolume)}
          </p>
          <p className="text-sm text-slate-500 mt-2">Total value secured through the Youngsend Trust Network</p>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Verified Businesses" value={abbreviateNumber(stats.totalVerifiedBusinesses)} icon={Building2} trend="up" subtitle="+12% this month" />
        <KPICard title="Active Deals" value={abbreviateNumber(stats.activeEscrows)} icon={Shield} trend="up" subtitle="+8% this week" />
        <KPICard title="VCV" value={formatCurrency(stats.totalEscrowVolume)} icon={TrendingUp} trend="up" subtitle="+23% this quarter" />
        <KPICard title="Avg Trust Score" value={stats.avgTrustScore?.toFixed(1) || '0'} icon={Star} subtitle="across network" />
      </div>

      {/* Escrow Status Pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Escrow Status Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
            {pipelineData.map((p, i) => (
              <PipelineCard key={p.status} label={p.status} count={p.count} color={pipelineColors[i]} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Deals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Deals</CardTitle>
          <CardDescription>Latest escrow transactions across the network</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stats.recentDeals || []).slice(0, 5).map(deal => (
                  <TableRow key={deal.id} className="even:bg-muted/50">
                    <TableCell className="font-mono text-xs">{deal.reference}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{deal.buyerBusinessName}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{deal.sellerBusinessName}</TableCell>
                    <TableCell className="font-medium">{CURRENCY_FLAGS[deal.currency]} {formatCurrency(deal.amount, deal.currency)}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(deal.status)} className={getStatusColor(deal.status)}>{deal.status}</Badge></TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(deal.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trust Score Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Trust Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trustDist} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RTooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {trustDist.map((_, i) => (
                      <Cell key={i} fill={['#10b981', '#f59e0b', '#f97316', '#ef4444'][i % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Businesses by Country */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Businesses by Country</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(stats.businessesByCountry || []).slice(0, 8)} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="country" tick={{ fontSize: 11 }} width={75} />
                  <RTooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ecosystem Health */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Ecosystem Health</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats.totalPaymentMethods || 48}</p>
              <p className="text-xs text-slate-500">Payment Methods</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats.totalCountries || 12}</p>
              <p className="text-xs text-slate-500">Countries</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats.totalUsers || 10}</p>
              <p className="text-xs text-slate-500">Users</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function TrustGraphTab() {
  const { data: businesses, loading: bLoading } = useApi<Business[]>('/api/businesses?limit=50')
  const { data: trustData, loading: tLoading } = useApi('/api/trust/scores')
  const [search, setSearch] = useState('')
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null)

  if (bLoading || tLoading) return <LoadingSkeleton />

  const allBusinesses = businesses || []
  const filtered = allBusinesses.filter(b =>
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.country?.toLowerCase().includes(search.toLowerCase()) ||
    b.industry?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Trust Network</h2>
          <p className="text-sm text-slate-500">{filtered.length} businesses in the trust graph</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search businesses..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trust Score</TableHead>
                  <TableHead>Passport</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 20).map(biz => (
                  <TableRow key={biz.id} className="even:bg-muted/50 cursor-pointer hover:bg-muted" onClick={() => setSelectedBiz(biz)}>
                    <TableCell className="font-medium">{biz.name}</TableCell>
                    <TableCell>{getCountryFlag(biz.country)} {biz.country}</TableCell>
                    <TableCell>{biz.industry}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(biz.status)} className={getStatusColor(biz.status)}>{biz.status}</Badge></TableCell>
                    <TableCell>
                      <span className={`font-bold ${getTrustScoreColor(biz.trustScore)}`}>{biz.trustScore}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{biz.passportLevel || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-slate-400" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Business Detail Dialog */}
      <Dialog open={!!selectedBiz} onOpenChange={() => setSelectedBiz(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedBiz?.name}</DialogTitle>
            <DialogDescription>{selectedBiz?.country} · {selectedBiz?.industry}</DialogDescription>
          </DialogHeader>
          {selectedBiz && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CircularScore score={selectedBiz.trustScore} size={80} />
                <div>
                  <p className="text-2xl font-bold">{selectedBiz.trustScore}<span className="text-sm text-slate-500 font-normal">/100</span></p>
                  <p className="text-sm text-slate-500">Overall Trust Score</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <ScoreBar score={Math.min(100, selectedBiz.trustScore * 1.05)} maxScore={100} label="Identity Verification" />
                <ScoreBar score={Math.min(100, selectedBiz.trustScore * 0.95)} maxScore={100} label="Financial Health" />
                <ScoreBar score={Math.min(100, selectedBiz.trustScore * 1.0)} maxScore={100} label="Compliance" />
                <ScoreBar score={Math.min(100, selectedBiz.trustScore * 0.9)} maxScore={100} label="Reputation" />
                <ScoreBar score={Math.min(100, selectedBiz.trustScore * 0.85)} maxScore={100} label="Network Strength" />
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">KYC: {selectedBiz.kycStatus || 'Pending'}</Badge>
                <Badge variant="outline">AML: {selectedBiz.amlStatus || 'Pending'}</Badge>
                <Badge variant="outline">Level: {selectedBiz.credentialLevel || 'Basic'}</Badge>
                <Badge variant="outline">Risk: {selectedBiz.riskRating || 'Low'}</Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

function EscrowTab() {
  const { data: transactions, loading } = useApi<EscrowTransaction[]>('/api/escrow/transactions?limit=20')
  const [statusFilter, setStatusFilter] = useState('all')

  if (loading) return <LoadingSkeleton />

  const allTxns = transactions || []
  const filtered = statusFilter === 'all' ? allTxns : allTxns.filter(t => t.status?.toLowerCase() === statusFilter.toLowerCase())

  const pipelineCounts = ESCROW_STATUSES.map(s => ({
    status: s,
    count: allTxns.filter(t => t.status?.toLowerCase() === s.toLowerCase().replace(/\s/g, '_') || t.status?.toLowerCase().replace(/\s/g, '') === s.toLowerCase().replace(/\s/g, '')).length,
  }))
  const pipelineColors = ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981', '#ef4444']

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Pipeline */}
      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
        {pipelineCounts.map((p, i) => (
          <PipelineCard key={p.status} label={p.status} count={p.count} color={pipelineColors[i]} />
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">Filter by status:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ESCROW_STATUSES.map(s => <SelectItem key={s} value={s.toLowerCase().replace(/\s/g, '_')}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>AI Risk</TableHead>
                  <TableHead>Milestones</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 15).map(txn => (
                  <TableRow key={txn.id} className="even:bg-muted/50">
                    <TableCell className="font-mono text-xs">{txn.reference}</TableCell>
                    <TableCell className="max-w-[100px] truncate">{txn.buyerBusinessName}</TableCell>
                    <TableCell className="max-w-[100px] truncate">{txn.sellerBusinessName}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(txn.amount, txn.currency)}</TableCell>
                    <TableCell>{CURRENCY_FLAGS[txn.currency]} {txn.currency}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(txn.status)} className={getStatusColor(txn.status)}>{txn.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getRiskBg(txn.aiRiskScore)}`} style={{ width: `${txn.aiRiskScore}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{txn.aiRiskLevel} ({txn.aiRiskScore})</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{txn.currentMilestone}/{txn.totalMilestones}</TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(txn.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function PaymentsTab() {
  const { data: intents, loading: iLoading } = useApi<PaymentIntent[]>('/api/payments/intents?limit=15')
  const { data: rates, loading: rLoading } = useApi<ExchangeRate[]>('/api/payments/rates')
  const { data: methods, loading: mLoading } = useApi<PaymentMethod[]>('/api/payment-methods/global')
  const [methodFilter, setMethodFilter] = useState('All')

  if (iLoading || rLoading || mLoading) return <LoadingSkeleton />

  const allIntents = intents || []
  const allRates = rates || []
  const allMethods = methods || []
  const filteredMethods = methodFilter === 'All' ? allMethods : allMethods.filter(m => m.type === methodFilter)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Exchange Rate Cards */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Live Exchange Rates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {allRates.slice(0, 5).map(rate => (
            <Card key={rate.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span>{CURRENCY_FLAGS[rate.fromCurrency]}</span>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                  <span>{CURRENCY_FLAGS[rate.toCurrency]}</span>
                </div>
                <p className="text-lg font-bold">{rate.fromCurrency}/{rate.toCurrency}</p>
                <p className="text-2xl font-bold text-emerald-600">{rate.rate?.toFixed(4)}</p>
                <p className="text-xs text-slate-500 mt-1">{rate.provider}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment Intents Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment Intents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Routing Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allIntents.slice(0, 15).map(pi => (
                  <TableRow key={pi.id} className="even:bg-muted/50">
                    <TableCell className="font-mono text-xs">{pi.reference}</TableCell>
                    <TableCell className="text-xs">
                      <span className="flex items-center gap-1">
                        {CURRENCY_FLAGS[pi.fromCurrency]} {pi.fromCurrency}
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        {CURRENCY_FLAGS[pi.toCurrency]} {pi.toCurrency}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(pi.fromAmount, pi.fromCurrency)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{pi.provider}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getTrustScoreBg(pi.routingScore)}`} style={{ width: `${pi.routingScore}%` }} />
                        </div>
                        <span className={`text-xs font-medium ${getTrustScoreColor(pi.routingScore)}`}>{pi.routingScore}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(pi.status)} className={getStatusColor(pi.status)}>{pi.status}</Badge></TableCell>
                    <TableCell className="text-xs">{formatCurrency(pi.fee)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Global Payment Methods */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Global Payment Methods</CardTitle>
          <CardDescription>{allMethods.length} methods available across the network</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHOD_TYPES.map(t => (
              <Button key={t} variant={methodFilter === t ? 'default' : 'outline'} size="sm"
                onClick={() => setMethodFilter(t)} className={methodFilter === t ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
                {t}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {filteredMethods.map(m => (
              <Card key={m.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{m.icon || '💳'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{m.methodName}</p>
                      <p className="text-xs text-slate-500">{m.provider}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="secondary" className="text-[10px]">{m.type}</Badge>
                        <span className="text-[10px] text-slate-500">{m.countries?.length || 0} countries</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                        <span>Fee: {m.feePercentage}% + {formatCurrency(m.fixedFee)}</span>
                        <span>·</span>
                        <span>{m.settlementTime}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function PassportTab() {
  const { data: businesses, loading: bLoading } = useApi<Business[]>('/api/businesses?limit=20')
  const { data: verifications, loading: vLoading } = useApi<Verification[]>('/api/passport/verifications?limit=15')

  if (bLoading || vLoading) return <LoadingSkeleton />

  const allBiz = businesses || []
  const allVerif = verifications || []

  const kycCounts = { verified: 0, pending: 0, failed: 0 }
  const amlCounts = { clear: 0, pending: 0, flagged: 0 }
  allBiz.forEach(b => {
    const ks = b.kycStatus?.toLowerCase() || 'pending'
    if (ks === 'verified' || ks === 'approved' || ks === 'complete') kycCounts.verified++
    else if (ks === 'failed' || ks === 'rejected') kycCounts.failed++
    else kycCounts.pending++
    const as = b.amlStatus?.toLowerCase() || 'pending'
    if (as === 'clear' || as === 'passed') amlCounts.clear++
    else if (as === 'flagged' || as === 'alert') amlCounts.flagged++
    else amlCounts.pending++
  })

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Verification Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <KPICard title="KYC Verified" value={kycCounts.verified.toString()} icon={CheckCircle} />
        <KPICard title="KYC Pending" value={kycCounts.pending.toString()} icon={Clock} />
        <KPICard title="KYC Failed" value={kycCounts.failed.toString()} icon={XCircle} />
        <KPICard title="AML Clear" value={amlCounts.clear.toString()} icon={Shield} />
        <KPICard title="AML Pending" value={amlCounts.pending.toString()} icon={Clock} />
        <KPICard title="AML Flagged" value={amlCounts.flagged.toString()} icon={AlertTriangle} />
      </div>

      {/* Compliance Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Compliance Grid</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {allBiz.map(biz => (
              <Card key={biz.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Avatar className="h-8 w-8"><AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">{biz.name?.charAt(0)}</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{biz.name}</p>
                      <p className="text-xs text-slate-500">{getCountryFlag(biz.country)} {biz.country}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={`text-[10px] ${biz.kycStatus?.toLowerCase() === 'verified' || biz.kycStatus?.toLowerCase() === 'approved' ? 'border-emerald-300 text-emerald-700' : 'border-amber-300 text-amber-700'}`}>KYC: {biz.kycStatus || 'Pending'}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={`text-[10px] ${biz.amlStatus?.toLowerCase() === 'clear' || biz.amlStatus?.toLowerCase() === 'passed' ? 'border-emerald-300 text-emerald-700' : 'border-red-300 text-red-700'}`}>AML: {biz.amlStatus || 'Pending'}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px]">{biz.credentialLevel || 'Basic'}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px]">Risk: {biz.riskRating || 'Low'}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Verifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Verifications</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allVerif.map(v => (
                  <TableRow key={v.id} className="even:bg-muted/50">
                    <TableCell className="font-mono text-xs">{v.reference}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{v.businessName}</TableCell>
                    <TableCell>{v.type}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(v.result)} className={getStatusColor(v.result)}>{v.result}</Badge></TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(v.status)} className={getStatusColor(v.status)}>{v.status}</Badge></TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(v.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function DigitalTwinTab() {
  const { data: twins, loading } = useApi<TwinProfile[]>('/api/twin/profiles?limit=20')
  const [selectedTwin, setSelectedTwin] = useState<TwinProfile | null>(null)

  if (loading) return <LoadingSkeleton />

  const allTwins = twins || []

  const trajectoryColor = (t: string) => {
    if (t?.toLowerCase()?.includes('strong') || t?.toLowerCase()?.includes('high')) return 'bg-emerald-100 text-emerald-700'
    if (t?.toLowerCase()?.includes('moderate') || t?.toLowerCase()?.includes('stable')) return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-700'
  }

  const riskAppetiteColor = (r: string) => {
    if (r?.toLowerCase()?.includes('conservative') || r?.toLowerCase()?.includes('low')) return 'bg-emerald-100 text-emerald-700'
    if (r?.toLowerCase()?.includes('moderate') || r?.toLowerCase()?.includes('balanced')) return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-700'
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Digital Twin Profiles</h2>
        <p className="text-sm text-slate-500">AI-powered business health assessments</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allTwins.map(twin => (
          <Card key={twin.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedTwin(twin)}>
            <CardContent className="p-4 sm:p-6 text-center">
              <CircularScore score={twin.healthScore} size={90} />
              <p className="font-medium mt-3 truncate">{twin.businessName}</p>
              <p className="text-xs text-slate-500">Cash Flow: {twin.cashFlow || 'Positive'}</p>
              <p className="text-xs text-slate-500">Credit: <span className="font-medium">{twin.creditScore}</span></p>
              <div className="flex justify-center gap-2 mt-2">
                <Badge variant="secondary" className={`text-[10px] ${trajectoryColor(twin.growthTrajectory)}`}>{twin.growthTrajectory || 'Stable'}</Badge>
                <Badge variant="secondary" className={`text-[10px] ${riskAppetiteColor(twin.riskAppetite)}`}>{twin.riskAppetite || 'Moderate'}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Twin Detail Dialog */}
      <Dialog open={!!selectedTwin} onOpenChange={() => setSelectedTwin(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Digital Twin — {selectedTwin?.businessName}</DialogTitle>
            <DialogDescription>AI-generated business profile and predictions</DialogDescription>
          </DialogHeader>
          {selectedTwin && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <CircularScore score={selectedTwin.healthScore} size={80} />
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{selectedTwin.healthScore}<span className="text-sm text-slate-500 font-normal">/100</span></p>
                  <p className="text-sm text-slate-500">Health Score</p>
                  <p className="text-sm">Cash Flow: {selectedTwin.cashFlow} · Credit: {selectedTwin.creditScore}</p>
                </div>
              </div>

              {/* Area Chart */}
              {selectedTwin.metrics && selectedTwin.metrics.length > 0 && (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={selectedTwin.metrics} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RTooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" name="Revenue" stackId="1" stroke="#10b981" fill="#10b98133" />
                      <Area type="monotone" dataKey="expenses" name="Expenses" stackId="2" stroke="#ef4444" fill="#ef444433" />
                      <Area type="monotone" dataKey="netIncome" name="Net Income" stroke="#f59e0b" fill="#f59e0b22" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Predictions */}
              {selectedTwin.predictions && selectedTwin.predictions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Predictions</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>Predicted</TableHead>
                        <TableHead>Confidence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTwin.predictions.map((p, i) => (
                        <TableRow key={i} className="even:bg-muted/50">
                          <TableCell className="font-medium">{p.metric}</TableCell>
                          <TableCell>{p.current}</TableCell>
                          <TableCell className="font-medium text-emerald-600">{p.predicted}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={p.confidence} className="h-1.5 w-16" />
                              <span className="text-xs">{p.confidence}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

function PaymentLinksTab() {
  const { data: links, loading } = useApi<PaymentLink[]>('/api/payment-links?limit=20')
  const [selectedLink, setSelectedLink] = useState<PaymentLink | null>(null)

  if (loading) return <LoadingSkeleton />

  const allLinks = links || []
  const totalLinks = allLinks.length
  const activeLinks = allLinks.filter(l => l.status?.toLowerCase() === 'active').length
  const totalCollected = allLinks.reduce((sum, l) => sum + (l.totalCollected || 0), 0)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Total Links" value={totalLinks.toString()} icon={Link2} />
        <KPICard title="Active" value={activeLinks.toString()} icon={Zap} />
        <KPICard title="Total Collected" value={formatCurrency(totalCollected)} icon={TrendingUp} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payments</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allLinks.map(link => (
                  <TableRow key={link.id} className="even:bg-muted/50 cursor-pointer hover:bg-muted" onClick={() => setSelectedLink(link)}>
                    <TableCell className="font-mono text-xs">{link.reference}</TableCell>
                    <TableCell className="font-medium max-w-[150px] truncate">{link.title}</TableCell>
                    <TableCell>{link.amount ? formatCurrency(link.amount, link.currency) : <Badge variant="outline">Open</Badge>}</TableCell>
                    <TableCell>{CURRENCY_FLAGS[link.currency]} {link.currency}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(link.status)} className={getStatusColor(link.status)}>{link.status}</Badge></TableCell>
                    <TableCell className="text-xs">{link.paymentCount}{link.maxPayments ? `/${link.maxPayments}` : ''}</TableCell>
                    <TableCell className="font-medium text-emerald-600">{formatCurrency(link.totalCollected, link.currency)}</TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(link.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Link Detail Dialog */}
      <Dialog open={!!selectedLink} onOpenChange={() => setSelectedLink(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedLink?.title}</DialogTitle>
            <DialogDescription>{selectedLink?.reference}</DialogDescription>
          </DialogHeader>
          {selectedLink && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Amount</p>
                  <p className="font-medium">{selectedLink.amount ? formatCurrency(selectedLink.amount, selectedLink.currency) : 'Open'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Collected</p>
                  <p className="font-medium text-emerald-600">{formatCurrency(selectedLink.totalCollected, selectedLink.currency)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Status</p>
                  <Badge variant={getStatusBadgeVariant(selectedLink.status)} className={getStatusColor(selectedLink.status)}>{selectedLink.status}</Badge>
                </div>
                <div>
                  <p className="text-slate-500">Payments</p>
                  <p className="font-medium">{selectedLink.paymentCount}{selectedLink.maxPayments ? ` / ${selectedLink.maxPayments}` : ''}</p>
                </div>
              </div>
              <Separator />
              <h4 className="text-sm font-semibold">Payments Received</h4>
              <div className="max-h-48 overflow-y-auto">
                {(selectedLink.payments || []).map((p, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                    <span className="font-mono text-xs">{p.reference}</span>
                    <span className="font-medium text-emerald-600">{formatCurrency(p.toAmount || p.fromAmount, p.toCurrency || p.fromCurrency)}</span>
                  </div>
                ))}
                {(!selectedLink.payments || selectedLink.payments.length === 0) && (
                  <p className="text-sm text-slate-400 text-center py-4">No payments yet</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

function WalletTab() {
  const { data: businesses, loading: bLoading } = useApi<Business[]>('/api/businesses?limit=1')
  const [selectedBizId, setSelectedBizId] = useState<string>('')
  const bizId = selectedBizId || businesses?.[0]?.id || ''
  const { data: wallets, loading: wLoading } = useApi<WalletData[]>(bizId ? `/api/wallets?businessId=${bizId}` : '')

  if (bLoading || (bizId && wLoading)) return <LoadingSkeleton />

  const allWallets = wallets || []
  const totalPortfolio = allWallets.reduce((sum, w) => {
    try { return sum + w.balance * (w.currency === 'NGN' ? 0.00065 : w.currency === 'KES' ? 0.0077 : w.currency === 'GHS' ? 0.088 : w.currency === 'EUR' ? 1.08 : w.currency === 'GBP' ? 1.26 : 1) } catch { return sum }
  }, 0)

  const firstWallet = allWallets[0]

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Business Selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">Business:</span>
        <Select value={selectedBizId || businesses?.[0]?.id} onValueChange={setSelectedBizId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select business" /></SelectTrigger>
          <SelectContent>
            {(businesses || []).map(b => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Total Portfolio */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-slate-500 mb-1">Total Portfolio Value (USD)</p>
          <p className="text-3xl sm:text-4xl font-bold">{formatCurrency(totalPortfolio)}</p>
        </CardContent>
      </Card>

      {/* Wallet Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allWallets.map(w => (
          <Card key={w.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{CURRENCY_FLAGS[w.currency] || '💰'}</span>
                <span className="font-semibold">{w.currency}</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(w.balance, w.currency)}</p>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <div className="flex justify-between"><span>Available</span><span className="text-emerald-600 font-medium">{formatCurrency(w.availableBalance, w.currency)}</span></div>
                <div className="flex justify-between"><span>Pending</span><span className="text-amber-600 font-medium">{formatCurrency(w.pendingBalance, w.currency)}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Transactions */}
      {firstWallet && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <CardDescription>{CURRENCY_FLAGS[firstWallet.currency]} {firstWallet.currency} wallet</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(firstWallet.transactions || []).slice(0, 10).map(tx => (
                    <TableRow key={tx.id} className="even:bg-muted/50">
                      <TableCell className="font-mono text-xs">{tx.reference}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{tx.type}</Badge></TableCell>
                      <TableCell className={`font-medium ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {tx.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount), tx.currency)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">{tx.description}</TableCell>
                      <TableCell className="text-xs text-slate-500">{formatDate(tx.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}

function FraudTab() {
  const { data: alerts, loading: aLoading } = useApi<FraudAlert[]>('/api/fraud/alerts?limit=20')
  const { data: rules, loading: rLoading } = useApi<FraudRule[]>('/api/fraud/rules')

  if (aLoading || rLoading) return <LoadingSkeleton />

  const allAlerts = alerts || []
  const allRules = rules || []

  const severityCounts = FRAUD_SEVERITIES.map(s => ({
    severity: s,
    count: allAlerts.filter(a => a.severity?.toLowerCase() === s.toLowerCase()).length,
  }))
  const severityColors: Record<string, string> = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#10b981' }

  const statusCounts = FRAUD_STATUSES.map(s => ({
    status: s,
    count: allAlerts.filter(a => a.status?.toLowerCase() === s.toLowerCase()).length,
  }))

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Severity Pipeline */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Alerts by Severity</h3>
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
          {severityCounts.map(p => (
            <PipelineCard key={p.severity} label={p.severity} count={p.count} color={severityColors[p.severity]} />
          ))}
        </div>
      </div>

      {/* Status Pipeline */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Alerts by Status</h3>
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
          {statusCounts.map((p, i) => (
            <PipelineCard key={p.status} label={p.status} count={p.count} color={['#94a3b8', '#f59e0b', '#ef4444', '#10b981'][i]} />
          ))}
        </div>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Fraud Alerts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allAlerts.map(a => (
                  <TableRow key={a.id} className="even:bg-muted/50">
                    <TableCell className="font-mono text-xs">{a.reference}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(a.severity)} className={getStatusColor(a.severity)}>{a.severity}</Badge></TableCell>
                    <TableCell className="text-sm">{a.type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getRiskBg(a.score)}`} style={{ width: `${a.score}%` }} />
                        </div>
                        <span className={`text-xs font-medium ${getRiskColor(a.score)}`}>{a.score}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[100px] truncate">{a.businessName}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(a.status)} className={getStatusColor(a.status)}>{a.status}</Badge></TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs">{truncate(a.description, 40)}</TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(a.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Fraud Rules</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Trigger Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allRules.map(r => (
                  <TableRow key={r.id} className="even:bg-muted/50">
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm">{r.type}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{r.action}</Badge></TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(r.severity)} className={getStatusColor(r.severity)}>{r.severity}</Badge></TableCell>
                    <TableCell className="font-medium">{r.triggerCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function MatchingTab() {
  const { data: matches, loading } = useApi<MatchingRecord[]>('/api/matching?limit=20')

  if (loading) return <LoadingSkeleton />

  const allMatches = matches || []

  const pipelineCounts = MATCHING_STATUSES.map(s => ({
    status: s,
    count: allMatches.filter(m => m.status?.toLowerCase() === s.toLowerCase()).length,
  }))
  const pipelineColors = ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981', '#ef4444']

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Pipeline */}
      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
        {pipelineCounts.map((p, i) => (
          <PipelineCard key={p.status} label={p.status} count={p.count} color={pipelineColors[i]} />
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seeker</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Match Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reasons</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allMatches.map(m => (
                  <TableRow key={m.id} className={`even:bg-muted/50 ${m.matchScore > 85 ? 'bg-emerald-50/50' : ''}`}>
                    <TableCell className="font-medium max-w-[120px] truncate">{m.seekerName}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{m.candidateName}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{m.type}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={m.matchScore} className="h-2 w-16" />
                        <span className={`text-xs font-bold ${m.matchScore > 85 ? 'text-emerald-600' : m.matchScore > 60 ? 'text-amber-600' : 'text-slate-500'}`}>{m.matchScore}%</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(m.status)} className={getStatusColor(m.status)}>{m.status}</Badge></TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{(m.reasons || []).slice(0, 2).join(', ')}</TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(m.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function CollectionsTab() {
  const { data: collections, loading } = useApi<CollectionRecord[]>('/api/collections?limit=20')

  if (loading) return <LoadingSkeleton />

  const allCollections = collections || []

  const agingCounts = AGING_BUCKETS.map(a => ({
    bucket: a,
    count: allCollections.filter(c => c.aging === a).length,
    total: allCollections.filter(c => c.aging === a).reduce((sum, c) => sum + c.outstandingAmount, 0),
  }))
  const agingColors = ['#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444']

  const priorityCounts = PRIORITY_LEVELS.map(p => ({
    priority: p,
    count: allCollections.filter(c => c.priority === p).length,
  }))
  const priorityColors: Record<string, string> = { Urgent: '#ef4444', High: '#f97316', Normal: '#f59e0b', Low: '#10b981' }

  const agingBadgeColor = (aging: string) => {
    if (aging === 'Current') return 'bg-emerald-100 text-emerald-700'
    if (aging === '1-30') return 'bg-lime-100 text-lime-700'
    if (aging === '31-60') return 'bg-amber-100 text-amber-700'
    if (aging === '61-90') return 'bg-orange-100 text-orange-700'
    return 'bg-red-100 text-red-700'
  }

  const priorityBadgeColor = (p: string) => {
    if (p === 'Urgent') return 'bg-red-100 text-red-700'
    if (p === 'High') return 'bg-orange-100 text-orange-700'
    if (p === 'Normal') return 'bg-amber-100 text-amber-700'
    return 'bg-emerald-100 text-emerald-700'
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Aging Cards */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Aging Summary</h3>
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
          {agingCounts.map((a, i) => (
            <div key={a.bucket} className="flex-1 min-w-0">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-2xl sm:text-3xl font-bold" style={{ color: agingColors[i] }}>{a.count}</p>
                  <p className="text-xs text-slate-500">{a.bucket} days</p>
                  <p className="text-[10px] text-slate-400 mt-1">{formatCurrency(a.total)}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Priority Cards */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Priority Distribution</h3>
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
          {priorityCounts.map(p => (
            <PipelineCard key={p.priority} label={p.priority} count={p.count} color={priorityColors[p.priority]} />
          ))}
        </div>
      </div>

      {/* Collections Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Debtor</TableHead>
                  <TableHead>Original</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Aging</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reminders</TableHead>
                  <TableHead>AI Strategy</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allCollections.map(c => (
                  <TableRow key={c.id} className="even:bg-muted/50">
                    <TableCell className="font-mono text-xs">{c.reference}</TableCell>
                    <TableCell className="max-w-[100px] truncate">{c.debtorName}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(c.originalAmount, c.currency)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(c.outstandingAmount, c.currency)}</TableCell>
                    <TableCell><Badge variant="secondary" className={`text-[10px] ${agingBadgeColor(c.aging)}`}>{c.aging}</Badge></TableCell>
                    <TableCell><Badge variant="secondary" className={`text-[10px] ${priorityBadgeColor(c.priority)}`}>{c.priority}</Badge></TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(c.status)} className={getStatusColor(c.status)}>{c.status}</Badge></TableCell>
                    <TableCell className="text-center">{c.reminderCount}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs text-slate-500">{truncate(c.aiStrategy, 35)}</TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(c.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function ComplianceTab() {
  const { data: rules, loading: rLoading } = useApi<ComplianceRule[]>('/api/compliance/rules')
  const { data: screenings, loading: sLoading } = useApi<Screening[]>('/api/compliance/screenings?limit=20')

  if (rLoading || sLoading) return <LoadingSkeleton />

  const allRules = rules || []
  const allScreenings = screenings || []

  const highRiskCount = allScreenings.filter(s => s.riskLevel?.toLowerCase() === 'high' || s.result?.toLowerCase() === 'alert').length
  const alertCount = allScreenings.filter(s => s.result?.toLowerCase() === 'alert' || s.result?.toLowerCase() === 'potential_match').length
  const activeScreenings = allScreenings.filter(s => s.status?.toLowerCase() === 'active' || s.status?.toLowerCase() === 'pending').length

  const screeningResultColor = (r: string) => {
    if (r?.toLowerCase() === 'clear' || r?.toLowerCase() === 'passed') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    if (r?.toLowerCase() === 'potential_match') return 'bg-amber-100 text-amber-700 border-amber-200'
    return 'bg-red-100 text-red-700 border-red-200'
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Rules" value={allRules.length.toString()} icon={Scale} />
        <KPICard title="Active Screenings" value={activeScreenings.toString()} icon={Search} />
        <KPICard title="Alerts" value={alertCount.toString()} icon={AlertTriangle} />
        <KPICard title="High Risk" value={highRiskCount.toString()} icon={ShieldAlert} />
      </div>

      {/* Rules Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Compliance Rules</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Trigger Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allRules.map(r => (
                  <TableRow key={r.id} className="even:bg-muted/50">
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{r.type}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{r.action}</Badge></TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(r.severity)} className={getStatusColor(r.severity)}>{r.severity}</Badge></TableCell>
                    <TableCell className="font-medium">{r.triggerCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Screenings Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Screenings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allScreenings.map(s => (
                  <TableRow key={s.id} className="even:bg-muted/50">
                    <TableCell className="max-w-[120px] truncate">{s.businessName || '—'}</TableCell>
                    <TableCell className="text-sm">{s.type}</TableCell>
                    <TableCell><Badge variant="secondary" className={`text-xs ${screeningResultColor(s.result)}`}>{s.result}</Badge></TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(s.riskLevel)} className={getStatusColor(s.riskLevel)}>{s.riskLevel}</Badge></TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(s.status)} className={getStatusColor(s.status)}>{s.status}</Badge></TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(s.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Tab Render Map ──────────────────────────────────────────────────────────

const TAB_COMPONENTS: Record<string, () => React.JSX.Element> = {
  'overview': OverviewTab,
  'trust-graph': TrustGraphTab,
  'escrow': EscrowTab,
  'payments': PaymentsTab,
  'passport': PassportTab,
  'digital-twin': DigitalTwinTab,
  'payment-links': PaymentLinksTab,
  'wallet': WalletTab,
  'fraud': FraudTab,
  'matching': MatchingTab,
  'collections': CollectionsTab,
  'compliance': ComplianceTab,
}

// ─── Sidebar Nav Component (must be outside render) ────────────────────

function SidebarNav({ visibleTabs, activeTab, onTabChange }: { visibleTabs: string[], activeTab: string, onTabChange: (id: string) => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 sm:p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-emerald-400">Youngsend</h1>
        <p className="text-xs text-slate-400 mt-0.5">Trust Network</p>
      </div>
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {NAV_ITEMS.map(item => {
            if (!visibleTabs.includes(item.id)) return null
            const isActive = activeTab === item.id
            const Icon = item.icon
            return (
              <button key={item.id} onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </ScrollArea>
      <div className="p-4 border-t border-slate-800">
        <p className="text-[10px] text-slate-500 text-center">The Financial Operating System</p>
        <p className="text-[10px] text-slate-500 text-center">for Global Commerce</p>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function YoungsendDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [currentRole, setCurrentRole] = useState<Role>('admin')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  const visibleTabs = ROLE_TABS[currentRole] || []
  const activeNav = NAV_ITEMS.find(n => n.id === activeTab)

  // Ensure activeTab is visible for current role
  const safeTab = visibleTabs.includes(activeTab) ? activeTab : (visibleTabs[0] || 'overview')
  if (safeTab !== activeTab) setActiveTab(safeTab)

  // WebSocket
  useEffect(() => {
    const socket: Socket = io('/?XTransformPort=3003', { transports: ['websocket', 'polling'] })

    socket.on('connect', () => {
      setSocketConnected(true)
      socket.emit('subscribe:dashboard')
    })

    socket.on('disconnect', () => setSocketConnected(false))

    socket.on('trust:score_updated', (data: { businessName: string; newScore: number }) => {
      setToastMessage(`Trust score updated: ${data.businessName} → ${data.newScore}`)
      setToastVisible(true)
      setTimeout(() => setToastVisible(false), 4000)
    })

    socket.on('connect_error', () => setSocketConnected(false))

    return () => { socket.disconnect() }
  }, [])

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId)
    setSidebarOpen(false)
  }, [])

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="p-4 sm:p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-emerald-400">Youngsend</h1>
        <p className="text-xs text-slate-400 mt-0.5">Trust Network</p>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {NAV_ITEMS.map(item => {
            if (!visibleTabs.includes(item.id)) return null
            const isActive = activeTab === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Bottom */}
      <div className="p-4 border-t border-slate-800">
        <p className="text-[10px] text-slate-500 text-center">The Financial Operating System</p>
        <p className="text-[10px] text-slate-500 text-center">for Global Commerce</p>
      </div>
    </div>
  )

  const ActiveTabComponent = TAB_COMPONENTS[activeTab]

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-white">
        <div className="flex flex-1">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex w-60 bg-slate-900 flex-col flex-shrink-0 sticky top-0 h-screen">
            <SidebarNav visibleTabs={visibleTabs} activeTab={safeTab} onTabChange={handleTabChange} />
          </aside>

          {/* Mobile Sidebar Sheet */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-60 p-0 bg-slate-900 border-slate-800">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
                <SheetDescription>Main navigation menu</SheetDescription>
              </SheetHeader>
              <SidebarNav visibleTabs={visibleTabs} activeTab={safeTab} onTabChange={handleTabChange} />
            </SheetContent>
          </Sheet>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b px-4 sm:px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Mobile hamburger */}
                  <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                    <Menu className="h-5 w-5" />
                  </Button>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{activeNav?.label || 'Dashboard'}</h2>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Role Switcher */}
                  <Select value={currentRole} onValueChange={(v) => setCurrentRole(v as Role)}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABELS) as Role[]).map(r => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* WebSocket Indicator */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100">
                        <div className={`h-2 w-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-[10px] text-slate-500 hidden sm:inline">
                          {socketConnected ? 'Live' : 'Offline'}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>WebSocket {socketConnected ? 'connected' : 'disconnected'}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </header>

            {/* Page Content */}
            <main className="flex-1 p-4 sm:p-6">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                {Object.keys(TAB_COMPONENTS).map(tabId => {
                  if (!visibleTabs.includes(tabId)) return null
                  return (
                    <TabsContent key={tabId} value={tabId} className="mt-0">
                      {ActiveTabComponent && tabId === activeTab ? <ActiveTabComponent /> : null}
                    </TabsContent>
                  )
                })}
              </Tabs>
            </main>

            {/* Footer */}
            <footer className="border-t px-4 sm:px-6 py-4 mt-auto bg-white">
              <p className="text-xs text-slate-400 text-center">
                Youngsend Trust Network — The Financial Operating System for Global Commerce
              </p>
            </footer>
          </div>
        </div>

        {/* Toast */}
        <Toast message={toastMessage} visible={toastVisible} />
      </div>
    </TooltipProvider>
  )
}