'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { io, Socket } from 'socket.io-client'
import { format } from 'date-fns'
import {
  LayoutDashboard, Network, Shield, ArrowLeftRight, IdCard as PassportIcon,
  Brain, Menu, X, TrendingUp, Users, DollarSign, Activity,
  Search, ChevronRight, Building2, Globe, Clock, AlertTriangle, CheckCircle,
  XCircle, Loader2, Wifi, WifiOff, ArrowUpRight, ArrowDownRight, ArrowRight, BarChart3,
  PieChart as PieChartIcon, LineChart as LineChartIcon, Eye, Zap, Target,
  CreditCard, Lock, FileCheck, Star, Award, TrendingDown
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
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
} from 'recharts'
import { toast, Toaster } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalBusinesses: number; verifiedBusinesses: number; activeEscrows: number
  totalEscrowVolume: number; totalPaymentsProcessed: number; averageTrustScore: number
  recentDisputes: number; activeRelationships: number
  escrowsByStatus: Record<string, number>; businessesByCountry: Record<string, number>
  paymentsByMethod: Record<string, number>; recentTransactions: any[]
  trustScoreDistribution: { excellent: number; good: number; average: number; poor: number }
}

interface Business {
  id: string; name: string; country: string; city?: string; industry?: string
  status: string; createdAt: string; passport?: { credentialLevel: string; kycStatus: string; amlStatus: string; riskRating: string }
  trustScore?: { overallScore: number; paymentScore: number; deliveryScore: number; qualityScore: number; communicationScore: number; complianceScore: number }
  digitalTwin?: { healthScore: number; cashFlowHealth: number; creditWorthiness: number; riskAppetite: string; growthTrajectory: string; liquidityScore: number }
}

interface EscrowTx {
  id: string; txRef: string; amount: number; currency: string; status: string
  buyer: { name: string }; seller: { name: string }; currentMilestone: number
  totalMilestones: number; aiRiskScore: number | null; aiRiskLevel: string | null
  createdAt: string; milestones?: any[]
}

interface PaymentIntent {
  id: string; intentRef: string; sourceAmount: number; sourceCurrency: string
  targetAmount: number; targetCurrency: string; exchangeRate: number | null
  status: string; paymentMethod: string | null; routingProvider: string | null
  routingScore: number | null; estimatedFee: number | null; estimatedTime: number | null
  createdAt: string
}

interface Verification {
  id: string; businessId: string; type: string; method: string; status: string
  submittedAt: string; verifiedAt: string | null; rejectionReason: string | null
  business: { name: string; country: string; status: string }
}

interface TwinProfile {
  id: string; businessId: string; healthScore: number; cashFlowHealth: number
  creditWorthiness: number; liquidityScore: number; riskAppetite: string
  growthTrajectory: string; aiModelVersion: string; lastSyncAt: string
  business: { id: string; name: string; country: string; industry: string }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function formatCurrency(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return currencyFmt.format(n)
}

function formatNumber(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toString()
}

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', GB: '🇬🇧', DE: '🇩🇪', CN: '🇨🇳', JP: '🇯🇵', SG: '🇸🇬',
  AE: '🇦🇪', IN: '🇮🇳', BR: '🇧🇷', NG: '🇳🇬', KE: '🇰🇪', AU: '🇦🇺',
  IT: '🇮🇹', SE: '🇸🇪', CH: '🇨🇭', FR: '🇫🇷', ES: '🇪🇸', NL: '🇳🇱',
  PL: '🇵🇱', CZ: '🇨🇿', HU: '🇭🇺', DK: '🇩🇰', FI: '🇫🇮', NO: '🇳🇴',
  IE: '🇮🇪', AT: '🇦🇹', PT: '🇵🇹', GR: '🇬🇷', TR: '🇹🇷', EG: '🇪🇬',
  SA: '🇸🇦', QA: '🇶🇦', MY: '🇲🇾', ID: '🇮🇩', PH: '🇵🇭', VN: '🇻🇳',
  ZA: '🇿🇦', CA: '🇨🇦',
}

const ESCROW_COLORS: Record<string, string> = {
  created: 'bg-slate-100 text-slate-700', funded: 'bg-sky-100 text-sky-700',
  in_escrow: 'bg-amber-100 text-amber-700', completed: 'bg-emerald-100 text-emerald-700',
  disputed: 'bg-red-100 text-red-700', cancelled: 'bg-slate-100 text-slate-500',
  partial_release: 'bg-violet-100 text-violet-700',
}

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

const TRUST_COLOR = (score: number) => {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  if (score >= 40) return 'text-orange-500'
  return 'text-red-600'
}

const TRUST_BG = (score: number) => {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-500'
  if (score >= 40) return 'bg-orange-500'
  return 'bg-red-500'
}

const RISK_COLOR = (level: string | null) => {
  if (!level) return 'bg-slate-100 text-slate-600'
  if (level === 'low') return 'bg-emerald-100 text-emerald-700'
  if (level === 'medium') return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

const STATUS_COLOR = (status: string) => {
  if (status === 'verified' || status === 'completed' || status === 'cleared' || status === 'approved') return 'bg-emerald-100 text-emerald-700'
  if (status === 'in_progress' || status === 'funded' || status === 'in_escrow' || status === 'processing') return 'bg-amber-100 text-amber-700'
  if (status === 'flagged' || status === 'disputed' || status === 'rejected' || status === 'failed') return 'bg-red-100 text-red-700'
  return 'bg-slate-100 text-slate-600'
}

const CREDENTIAL_COLOR = (level: string) => {
  if (level === 'premium') return 'bg-purple-100 text-purple-700'
  if (level === 'enhanced') return 'bg-emerald-100 text-emerald-700'
  if (level === 'standard') return 'bg-sky-100 text-sky-700'
  return 'bg-slate-100 text-slate-600'
}

const GROWTH_BADGE = (g: string) => {
  if (g === 'rapid_growth') return <Badge className="bg-emerald-100 text-emerald-700 border-0">Rapid Growth</Badge>
  if (g === 'growing') return <Badge className="bg-teal-100 text-teal-700 border-0">Growing</Badge>
  if (g === 'stable') return <Badge className="bg-sky-100 text-sky-700 border-0">Stable</Badge>
  return <Badge className="bg-red-100 text-red-700 border-0">Declining</Badge>
}

const RISK_APPETITE_BADGE = (r: string) => {
  if (r === 'aggressive') return <Badge className="bg-red-100 text-red-700 border-0">Aggressive</Badge>
  if (r === 'moderate') return <Badge className="bg-amber-100 text-amber-700 border-0">Moderate</Badge>
  return <Badge className="bg-emerald-100 text-emerald-700 border-0">Conservative</Badge>
}

const PAY_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer', card: 'Card', crypto: 'Crypto',
  mobile_money: 'Mobile Money', digital_wallet: 'Digital Wallet',
}

const PROVIDER_LABELS: Record<string, string> = {
  wise: 'Wise', stripe: 'Stripe', paypal: 'PayPal',
  local_bank: 'Local Bank', crypto_network: 'Crypto Network',
}

const VER_TYPE_LABELS: Record<string, string> = {
  identity: 'Identity', business_registration: 'Business Reg.', tax: 'Tax', bank_account: 'Bank Account', address: 'Address',
}

// ─── Fallback fetcher ───────────────────────────────────────────────────────

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

// ─── Skeleton Components ────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="border-0 shadow-sm bg-slate-50/80">
          <CardContent className="p-4"><Skeleton className="h-4 w-24 mb-3" /><Skeleton className="h-8 w-20" /><Skeleton className="h-3 w-16 mt-2" /></CardContent>
        </Card>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return <Card className="border-0 shadow-sm"><CardContent className="p-4"><Skeleton className="h-4 w-40 mb-4" /><Skeleton className="h-[280px] w-full" /></CardContent></Card>
}

function TableSkeleton() {
  return (
    <Card className="border-0 shadow-sm"><CardContent className="p-4">
      <Skeleton className="h-4 w-40 mb-4" />
      <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
    </CardContent></Card>
  )
}

// ─── Navigation Items ───────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'trust', label: 'Trust Graph', icon: Network },
  { id: 'escrow', label: 'Escrow', icon: Shield },
  { id: 'payments', label: 'Payments', icon: ArrowLeftRight },
  { id: 'passport', label: 'Passport', icon: PassportIcon },
  { id: 'twin', label: 'Digital Twin', icon: Brain },
]

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)

  // WebSocket
  useEffect(() => {
    const socket: Socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })

    socket.on('connect', () => {
      setWsConnected(true)
      socket.emit('subscribe:dashboard')
    })
    socket.on('disconnect', () => setWsConnected(false))
    socket.on('trust:score_updated', (data: any) => {
      toast(`Trust Score Updated: ${data.businessName}`, {
        description: `Overall: ${data.overallScore.toFixed(1)} | Payment: ${data.paymentScore.toFixed(1)}`,
        duration: 4000,
      })
    })

    return () => { socket.disconnect() }
  }, [])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Toaster position="top-right" richColors />

        {/* ── Desktop Sidebar ────────────────────────────────────────────── */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-slate-900 text-white flex-shrink-0">
          <SidebarContent activeTab={activeTab} setActiveTab={(t) => { setActiveTab(t); setSidebarOpen(false) }} />
        </aside>

        {/* ── Mobile Sidebar (Sheet) ─────────────────────────────────────── */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-slate-900 text-white border-slate-700">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">Dashboard navigation menu</SheetDescription>
            <SidebarContent activeTab={activeTab} setActiveTab={(t) => { setActiveTab(t); setSidebarOpen(false) }} isMobile onClose={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* ── Main Content ───────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar */}
          <header className="h-14 border-b bg-white flex items-center justify-between px-4 flex-shrink-0 z-10">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">{NAV_ITEMS.find(n => n.id === activeTab)?.label}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${wsConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {wsConnected ? 'Live' : 'Offline'}
              </div>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-emerald-600 text-white text-xs font-semibold">YS</AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="p-4 md:p-6"
              >
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'trust' && <TrustGraphTab />}
                {activeTab === 'escrow' && <EscrowTab />}
                {activeTab === 'payments' && <PaymentsTab />}
                {activeTab === 'passport' && <PassportTab />}
                {activeTab === 'twin' && <DigitalTwinTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}

// ─── Sidebar Content ────────────────────────────────────────────────────────

function SidebarContent({ activeTab, setActiveTab, isMobile, onClose }: {
  activeTab: string; setActiveTab: (t: string) => void; isMobile?: boolean; onClose?: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 flex-shrink-0 border-b border-slate-700/50">
        <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
          <Zap className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight">Youngsend</span>
          <p className="text-[10px] text-slate-400 -mt-0.5 leading-none">Trust Network</p>
        </div>
        {isMobile && onClose && (
          <Button variant="ghost" size="icon" className="ml-auto text-slate-400 hover:text-white" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-600/20 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="h-4.5 w-4.5 flex-shrink-0" />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-700/50">
        <p className="text-[10px] text-slate-500">The Financial Operating System</p>
        <p className="text-[10px] text-slate-500">for Global Commerce</p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewTab() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJSON<DashboardStats>('/api/dashboard/stats').then(d => { setStats(d); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="space-y-6">
      <KpiSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><ChartSkeleton /><ChartSkeleton /></div>
      <TableSkeleton />
    </div>
  )
  if (!stats) return <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-slate-500">Failed to load dashboard data.</CardContent></Card>

  // Escrow status pie data
  const escrowPieData = Object.entries(stats.escrowsByStatus)
    .filter(([_, v]) => v > 0)
    .map(([k, v]) => ({ name: k.replace('_', ' '), value: v }))

  // Country bar data (top 8)
  const countryData = Object.entries(stats.businessesByCountry)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([k, v]) => ({ name: `${COUNTRY_FLAGS[k] || ''} ${k}`, count: v }))

  // Payment method pie data
  const paymentPieData = Object.entries(stats.paymentsByMethod)
    .map(([k, v]) => ({ name: PAY_METHOD_LABELS[k] || k, value: v }))

  // Trust distribution bar data
  const trustDistData = [
    { name: 'Excellent (≥80)', value: stats.trustScoreDistribution.excellent, fill: '#10b981' },
    { name: 'Good (60-79)', value: stats.trustScoreDistribution.good, fill: '#f59e0b' },
    { name: 'Average (40-59)', value: stats.trustScoreDistribution.average, fill: '#f97316' },
    { name: 'Poor (<40)', value: stats.trustScoreDistribution.poor, fill: '#ef4444' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Building2} label="Total Businesses" value={stats.totalBusinesses.toString()} sub={`${stats.verifiedBusinesses} verified`} color="emerald" />
        <KPICard icon={Shield} label="Active Escrows" value={stats.activeEscrows.toString()} sub={`${stats.recentDisputes} open disputes`} color="sky" />
        <KPICard icon={DollarSign} label="Total Escrow Volume" value={formatCurrency(stats.totalEscrowVolume)} sub={`Across all transactions`} color="amber" />
        <KPICard icon={Star} label="Avg Trust Score" value={stats.averageTrustScore.toFixed(1)} sub="Platform-wide average" color="violet" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4"><CardTitle className="text-sm font-semibold text-slate-700">Escrow Status Distribution</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={escrowPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value" stroke="none">
                  {escrowPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <RechartsTooltip formatter={(v: number) => [v, 'Count']} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4"><CardTitle className="text-sm font-semibold text-slate-700">Businesses by Country</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={countryData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }} />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4"><CardTitle className="text-sm font-semibold text-slate-700">Recent Escrow Transactions</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="text-xs font-semibold text-slate-500">Reference</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Buyer</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Seller</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 text-right">Amount</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentTransactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="text-xs font-mono text-slate-600">{tx.txRef}</TableCell>
                    <TableCell className="text-xs text-slate-700">{tx.buyerName}</TableCell>
                    <TableCell className="text-xs text-slate-700">{tx.sellerName}</TableCell>
                    <TableCell className="text-xs font-medium text-slate-900 text-right">{currencyFmt.format(tx.amount)} {tx.currency}</TableCell>
                    <TableCell><Badge className={`border-0 text-[11px] ${ESCROW_COLORS[tx.status] || 'bg-slate-100 text-slate-600'}`}>{tx.status.replace('_', ' ')}</Badge></TableCell>
                    <TableCell className="text-xs text-slate-500">{format(new Date(tx.createdAt), 'MMM dd, HH:mm')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4"><CardTitle className="text-sm font-semibold text-slate-700">Payment Methods</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={paymentPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                  {paymentPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <RechartsTooltip formatter={(v: number) => [v, 'Count']} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4"><CardTitle className="text-sm font-semibold text-slate-700">Trust Score Distribution</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trustDistData} margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={36}>
                  {trustDistData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function KPICard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub: string; color: string
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600', sky: 'bg-sky-50 text-sky-600',
    amber: 'bg-amber-50 text-amber-600', violet: 'bg-violet-50 text-violet-600',
  }
  const iconMap: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-600', sky: 'bg-sky-100 text-sky-600',
    amber: 'bg-amber-100 text-amber-600', violet: 'bg-violet-100 text-violet-600',
  }
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${iconMap[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. TRUST GRAPH TAB
// ═══════════════════════════════════════════════════════════════════════════════

function TrustGraphTab() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [trustScores, setTrustScores] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchJSON<any>('/api/businesses?page=1&limit=50'),
      fetchJSON<any>('/api/trust/scores'),
    ]).then(([bizRes, tsRes]) => {
      setBusinesses(bizRes?.data || [])
      setTrustScores(tsRes?.data || [])
      setLoading(false)
    })
  }, [])

  const filtered = search
    ? businesses.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
    : businesses

  const leaderboard = [...trustScores].sort((a, b) => b.overallScore - a.overallScore).slice(0, 5)

  const handleRowClick = (biz: Business) => { setSelectedBiz(biz); setDialogOpen(true) }

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <TableSkeleton /><Card className="border-0 shadow-sm"><CardContent className="p-4"><Skeleton className="h-4 w-48 mb-4" /><Skeleton className="h-[300px] w-full" /></CardContent></Card>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Search businesses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white border-slate-200" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Business Directory Table */}
        <Card className="border-0 shadow-sm xl:col-span-2">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold text-slate-700">Business Directory</CardTitle>
            <CardDescription className="text-xs text-slate-500">{filtered.length} businesses</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="text-xs font-semibold text-slate-500">Business</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Country</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Industry</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 text-right">Trust Score</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Passport</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((biz) => (
                    <TableRow key={biz.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleRowClick(biz)}>
                      <TableCell className="text-xs font-medium text-slate-800">{biz.name}</TableCell>
                      <TableCell className="text-xs">{COUNTRY_FLAGS[biz.country] || ''} {biz.country}</TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-[140px] truncate">{biz.industry}</TableCell>
                      <TableCell><Badge className={`border-0 text-[11px] ${STATUS_COLOR(biz.status)}`}>{biz.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <span className={`text-sm font-bold ${TRUST_COLOR(biz.trustScore?.overallScore || 0)}`}>
                          {biz.trustScore?.overallScore?.toFixed(1) || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {biz.passport && <Badge className={`border-0 text-[11px] ${CREDENTIAL_COLOR(biz.passport.credentialLevel)}`}>{biz.passport.credentialLevel}</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold text-slate-700">Trust Score Leaderboard</CardTitle>
            <CardDescription className="text-xs text-slate-500">Top 5 by overall score</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {leaderboard.map((ts, i) => (
              <div key={ts.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-slate-300'}`}>{i + 1}</span>
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[140px]">{ts.business?.name}</span>
                  </div>
                  <span className={`text-sm font-bold ${TRUST_COLOR(ts.overallScore)}`}>{ts.overallScore.toFixed(1)}</span>
                </div>
                <Progress value={ts.overallScore} className={`h-2 ${TRUST_BG(ts.overallScore)}`} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Business Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedBiz && <>{COUNTRY_FLAGS[selectedBiz.country]} {selectedBiz.name}</>}
            </DialogTitle>
            <DialogDescription>{selectedBiz?.industry} · {selectedBiz?.country}</DialogDescription>
          </DialogHeader>
          {selectedBiz && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] uppercase text-slate-500 font-medium mb-1">Overall Trust</p>
                  <p className={`text-2xl font-bold ${TRUST_COLOR(selectedBiz.trustScore?.overallScore || 0)}`}>{selectedBiz.trustScore?.overallScore?.toFixed(1) || '—'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] uppercase text-slate-500 font-medium mb-1">Status</p>
                  <Badge className={`border-0 text-[11px] mt-1 ${STATUS_COLOR(selectedBiz.status)}`}>{selectedBiz.status}</Badge>
                </div>
              </div>
              {selectedBiz.trustScore && (
                <div className="space-y-2">
                  {[
                    { label: 'Payment', value: selectedBiz.trustScore.paymentScore },
                    { label: 'Delivery', value: selectedBiz.trustScore.deliveryScore },
                    { label: 'Quality', value: selectedBiz.trustScore.qualityScore },
                    { label: 'Communication', value: selectedBiz.trustScore.communicationScore },
                    { label: 'Compliance', value: selectedBiz.trustScore.complianceScore },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-24">{s.label}</span>
                      <Progress value={s.value} className={`h-1.5 flex-1 ${TRUST_BG(s.value)}`} />
                      <span className={`text-xs font-semibold w-8 text-right ${TRUST_COLOR(s.value)}`}>{s.value.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedBiz.passport && (
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Badge className={`border-0 text-[11px] ${CREDENTIAL_COLOR(selectedBiz.passport.credentialLevel)}`}>Passport: {selectedBiz.passport.credentialLevel}</Badge>
                  <Badge className={`border-0 text-[11px] ${STATUS_COLOR(selectedBiz.passport.kycStatus)}`}>KYC: {selectedBiz.passport.kycStatus.replace('_', ' ')}</Badge>
                  <Badge className={`border-0 text-[11px] ${STATUS_COLOR(selectedBiz.passport.amlStatus)}`}>AML: {selectedBiz.passport.amlStatus}</Badge>
                  <Badge className={`border-0 text-[11px] ${RISK_COLOR(selectedBiz.passport.riskRating)}`}>Risk: {selectedBiz.passport.riskRating}</Badge>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ESCROW TAB
// ═══════════════════════════════════════════════════════════════════════════════

function EscrowTab() {
  const [transactions, setTransactions] = useState<EscrowTx[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    const url = statusFilter === 'all'
      ? '/api/escrow/transactions?page=1&limit=20'
      : `/api/escrow/transactions?page=1&limit=20&status=${statusFilter}`
    fetchJSON<any>(url).then(d => { setTransactions(d?.data || []); setLoading(false) })
  }, [statusFilter])

  const pipeline = [
    { status: 'created', label: 'Created', icon: Clock, color: 'bg-slate-500' },
    { status: 'funded', label: 'Funded', icon: DollarSign, color: 'bg-sky-500' },
    { status: 'in_escrow', label: 'In Escrow', icon: Lock, color: 'bg-amber-500' },
    { status: 'completed', label: 'Completed', icon: CheckCircle, color: 'bg-emerald-500' },
    { status: 'disputed', label: 'Disputed', icon: AlertTriangle, color: 'bg-red-500' },
  ]

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => <Card key={i} className="border-0 shadow-sm"><CardContent className="p-4"><Skeleton className="h-4 w-16 mb-2" /><Skeleton className="h-8 w-10" /></CardContent></Card>)}
      </div>
      <TableSkeleton />
    </div>
  )

  // Count by status for pipeline
  const counts: Record<string, number> = {}
  transactions.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1 })

  return (
    <div className="space-y-6">
      {/* Pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {pipeline.map((p) => {
          const Icon = p.icon
          const count = counts[p.status] || 0
          return (
            <Card key={p.status} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${p.color} text-white`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{count}</p>
                  <p className="text-[11px] text-slate-500">{p.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filter + Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-700">Escrow Transactions</CardTitle>
            <CardDescription className="text-xs text-slate-500">{transactions.length} transactions</CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Filter status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {pipeline.map(p => <SelectItem key={p.status} value={p.status}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="text-xs font-semibold text-slate-500">Reference</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Buyer</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Seller</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 text-right">Amount</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Currency</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">AI Risk</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Milestones</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="text-xs font-mono text-slate-600">{tx.txRef}</TableCell>
                    <TableCell className="text-xs text-slate-700 max-w-[120px] truncate">{tx.buyer.name}</TableCell>
                    <TableCell className="text-xs text-slate-700 max-w-[120px] truncate">{tx.seller.name}</TableCell>
                    <TableCell className="text-xs font-medium text-slate-900 text-right">{formatCurrency(tx.amount)}</TableCell>
                    <TableCell className="text-xs font-mono">{tx.currency}</TableCell>
                    <TableCell><Badge className={`border-0 text-[11px] ${ESCROW_COLORS[tx.status] || 'bg-slate-100 text-slate-600'}`}>{tx.status.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {tx.aiRiskScore !== null && <Badge className={`border-0 text-[11px] ${RISK_COLOR(tx.aiRiskLevel)}`}>{tx.aiRiskLevel}</Badge>}
                        {tx.aiRiskScore !== null && <span className="text-[10px] text-slate-400">{tx.aiRiskScore.toFixed(0)}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Progress value={(tx.currentMilestone / tx.totalMilestones) * 100} className="h-1.5 w-12 bg-slate-100" />
                        <span className="text-[10px] text-slate-500">{tx.currentMilestone}/{tx.totalMilestones}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{format(new Date(tx.createdAt), 'MMM dd')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. PAYMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function PaymentsTab() {
  const [intents, setIntents] = useState<PaymentIntent[]>([])
  const [rates, setRates] = useState<{ from: string; to: string; rate: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchJSON<any>('/api/payments/intents?page=1&limit=20'),
      fetchJSON<any>('/api/payments/rates'),
    ]).then(([intRes, rateRes]) => {
      setIntents(intRes?.data || [])
      setRates(rateRes?.data || [])
      setLoading(false)
    })
  }, [])

  const completedIntents = intents.filter(i => i.status === 'completed')
  const avgRoutingScore = completedIntents.length > 0
    ? (completedIntents.reduce((s, i) => s + (i.routingScore || 0), 0) / completedIntents.length)
    : 0
  const uniqueProviders = new Set(completedIntents.map(i => i.routingProvider).filter(Boolean)).size
  const totalProcessed = completedIntents.reduce((s, i) => s + i.sourceAmount, 0)

  if (loading) return (
    <div className="space-y-6">
      <KpiSkeleton />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{[...Array(5)].map((_, i) => <Card key={i} className="border-0 shadow-sm"><CardContent className="p-4"><Skeleton className="h-6 w-24 mb-2" /><Skeleton className="h-8 w-16" /></CardContent></Card>)}</div>
      <TableSkeleton />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard icon={DollarSign} label="Total Processed" value={formatCurrency(totalProcessed)} sub={`${completedIntents.length} payments`} color="emerald" />
        <KPICard icon={Target} label="Avg Routing Score" value={avgRoutingScore.toFixed(2)} sub="AI optimization score" color="sky" />
        <KPICard icon={Globe} label="Unique Providers" value={uniqueProviders.toString()} sub="Payment routing partners" color="amber" />
      </div>

      {/* Exchange Rates */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4"><CardTitle className="text-sm font-semibold text-slate-700">Exchange Rates</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {rates.map((r) => (
              <div key={`${r.from}-${r.to}`} className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-bold text-slate-800">{r.from}</span>
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-800">{r.to}</span>
                </div>
                <p className="text-lg font-bold text-slate-900">{r.rate.toFixed(r.rate < 1 ? 4 : 2)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Intents Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold text-slate-700">Payment Intents</CardTitle>
          <CardDescription className="text-xs text-slate-500">{intents.length} intents</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="text-xs font-semibold text-slate-500">Reference</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Route</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 text-right">Amount</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Currencies</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Provider</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Routing Score</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 text-right">Est. Fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {intents.map((pi) => (
                  <TableRow key={pi.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="text-xs font-mono text-slate-600">{pi.intentRef}</TableCell>
                    <TableCell className="text-xs text-slate-600">Payment</TableCell>
                    <TableCell className="text-xs font-medium text-slate-900 text-right">{formatCurrency(pi.sourceAmount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="font-medium">{pi.sourceCurrency}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <span className="font-medium">{pi.targetCurrency}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {pi.routingProvider && (
                        <Badge variant="outline" className="text-[11px] font-normal">{PROVIDER_LABELS[pi.routingProvider] || pi.routingProvider}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {pi.routingScore !== null && (
                        <div className="flex items-center gap-1.5">
                          <Progress value={pi.routingScore * 100} className={`h-1.5 w-14 ${pi.routingScore >= 0.85 ? 'bg-emerald-500' : pi.routingScore >= 0.7 ? 'bg-amber-500' : 'bg-red-500'}`} />
                          <span className={`text-[11px] font-semibold ${pi.routingScore >= 0.85 ? 'text-emerald-600' : pi.routingScore >= 0.7 ? 'text-amber-600' : 'text-red-600'}`}>
                            {(pi.routingScore * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell><Badge className={`border-0 text-[11px] ${STATUS_COLOR(pi.status)}`}>{pi.status}</Badge></TableCell>
                    <TableCell className="text-xs text-slate-600 text-right">
                      {pi.estimatedFee !== null ? currencyFmt.format(pi.estimatedFee) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. PASSPORT TAB
// ═══════════════════════════════════════════════════════════════════════════════

function PassportTab() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [verifications, setVerifications] = useState<Verification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchJSON<any>('/api/businesses?page=1&limit=20'),
      fetchJSON<any>('/api/passport/verifications'),
    ]).then(([bizRes, verRes]) => {
      setBusinesses(bizRes?.data || [])
      setVerifications(verRes?.data || [])
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => <Card key={i} className="border-0 shadow-sm"><CardContent className="p-4"><Skeleton className="h-4 w-16 mb-2" /><Skeleton className="h-8 w-10" /></CardContent></Card>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><TableSkeleton /><TableSkeleton /></div>
    </div>
  )

  // Verification status counts by type
  const verByType: Record<string, Record<string, number>> = {}
  verifications.forEach(v => {
    if (!verByType[v.type]) verByType[v.type] = {}
    verByType[v.type][v.status] = (verByType[v.type][v.status] || 0) + 1
  })

  const verTypeCards = Object.entries(VER_TYPE_LABELS).map(([type, label]) => {
    const counts = verByType[type] || {}
    const total = Object.values(counts).reduce((s, v) => s + v, 0)
    const approved = counts.approved || 0
    return { type, label, total, approved, pending: counts.pending || 0, rejected: counts.rejected || 0, in_progress: counts.in_progress || 0 }
  })

  return (
    <div className="space-y-6">
      {/* Verification Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {verTypeCards.map(vc => (
          <Card key={vc.type} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <p className="text-[11px] text-slate-500 font-medium mb-1">{vc.label}</p>
              <p className="text-xl font-bold text-slate-900">{vc.total}</p>
              <div className="flex gap-1 mt-2">
                <Badge className="border-0 text-[10px] bg-emerald-100 text-emerald-700">{vc.approved} ok</Badge>
                {vc.pending > 0 && <Badge className="border-0 text-[10px] bg-slate-100 text-slate-600">{vc.pending} pend</Badge>}
                {vc.rejected > 0 && <Badge className="border-0 text-[10px] bg-red-100 text-red-600">{vc.rejected} rej</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Business Compliance Grid + Recent Verifications */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4"><CardTitle className="text-sm font-semibold text-slate-700">Business Compliance</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <ScrollArea className="max-h-[500px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {businesses.filter(b => b.passport).map(biz => (
                  <div key={biz.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-emerald-200 transition-colors">
                    <p className="text-xs font-semibold text-slate-800 mb-2 truncate">{biz.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge className={`border-0 text-[10px] ${STATUS_COLOR(biz.passport!.kycStatus)}`}>KYC: {biz.passport!.kycStatus.replace('_', ' ')}</Badge>
                      <Badge className={`border-0 text-[10px] ${STATUS_COLOR(biz.passport!.amlStatus)}`}>AML: {biz.passport!.amlStatus}</Badge>
                      <Badge className={`border-0 text-[10px] ${CREDENTIAL_COLOR(biz.passport!.credentialLevel)}`}>{biz.passport!.credentialLevel}</Badge>
                      <Badge className={`border-0 text-[10px] ${RISK_COLOR(biz.passport!.riskRating)}`}>Risk: {biz.passport!.riskRating}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4"><CardTitle className="text-sm font-semibold text-slate-700">Recent Verifications</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="text-xs font-semibold text-slate-500">Business</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Type</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Method</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verifications.slice(0, 20).map(v => (
                    <TableRow key={v.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="text-xs text-slate-700 max-w-[120px] truncate">{v.business.name}</TableCell>
                      <TableCell className="text-xs text-slate-600">{VER_TYPE_LABELS[v.type] || v.type}</TableCell>
                      <TableCell className="text-xs text-slate-500 capitalize">{v.method}</TableCell>
                      <TableCell><Badge className={`border-0 text-[11px] ${STATUS_COLOR(v.status)}`}>{v.status}</Badge></TableCell>
                      <TableCell className="text-xs text-slate-500">{format(new Date(v.submittedAt), 'MMM dd')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. DIGITAL TWIN TAB
// ═══════════════════════════════════════════════════════════════════════════════

function DigitalTwinTab() {
  const [twins, setTwins] = useState<TwinProfile[]>([])
  const [selectedTwin, setSelectedTwin] = useState<TwinProfile | null>(null)
  const [metrics, setMetrics] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadedTwinId, setLoadedTwinId] = useState<string | null>(null)
  const metricsLoading = selectedTwin !== null && loadedTwinId !== selectedTwin.id

  useEffect(() => {
    fetchJSON<TwinProfile[]>('/api/twin/profiles').then(d => {
      setTwins(d || [])
      if (d && d.length > 0) setSelectedTwin(d[0])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!selectedTwin || loadedTwinId === selectedTwin.id) return
    Promise.all([
      fetchJSON<any>(`/api/twin/profiles/${selectedTwin.id}/metrics`),
      fetchJSON<any>(`/api/twin/profiles/${selectedTwin.id}/predictions`),
    ]).then(([mRes, pRes]) => {
      setMetrics(mRes || [])
      setPredictions(pRes || [])
      setLoadedTwinId(selectedTwin.id)
    })
  }, [selectedTwin, loadedTwinId])

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <Card key={i} className="border-0 shadow-sm"><CardContent className="p-4"><Skeleton className="h-4 w-24 mb-3" /><Skeleton className="h-10 w-10 rounded-full mx-auto mb-3" /><Skeleton className="h-3 w-20" /></CardContent></Card>)}
      </div>
    </div>
  )

  const chartData = metrics
    .filter(m => m.period === 'monthly')
    .sort((a, b) => a.periodDate.localeCompare(b.periodDate))
    .map(m => ({
      date: m.periodDate,
      revenue: m.revenue || 0,
      expenses: m.expenses || 0,
      netIncome: m.netIncome || 0,
    }))

  const twinPredictions = predictions.filter(p => selectedTwin && p.twinId === selectedTwin.id)

  return (
    <div className="space-y-6">
      {/* Twin Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {twins.slice(0, 12).map(twin => {
          const isSelected = selectedTwin?.id === twin.id
          return (
            <Card
              key={twin.id}
              className={`border-0 shadow-sm hover:shadow-md transition-all cursor-pointer ${isSelected ? 'ring-2 ring-emerald-500' : ''}`}
              onClick={() => { setLoadedTwinId(null); setSelectedTwin(twin) }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{twin.business.name}</p>
                    <p className="text-[11px] text-slate-500">{COUNTRY_FLAGS[twin.business.country]} {twin.business.industry}</p>
                  </div>
                  {/* Health Score Circle */}
                  <div className="relative h-12 w-12 flex-shrink-0">
                    <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15" fill="none" stroke={twin.healthScore >= 70 ? '#10b981' : twin.healthScore >= 40 ? '#f59e0b' : '#ef4444'} strokeWidth="3" strokeDasharray={`${twin.healthScore} ${100 - twin.healthScore}`} strokeLinecap="round" />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${TRUST_COLOR(twin.healthScore)}`}>
                      {twin.healthScore.toFixed(0)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="text-center p-1.5 bg-slate-50 rounded">
                    <p className="text-[10px] text-slate-500">Cash Flow</p>
                    <p className={`text-xs font-semibold ${TRUST_COLOR(twin.cashFlowHealth)}`}>{twin.cashFlowHealth.toFixed(0)}</p>
                  </div>
                  <div className="text-center p-1.5 bg-slate-50 rounded">
                    <p className="text-[10px] text-slate-500">Credit</p>
                    <p className={`text-xs font-semibold ${TRUST_COLOR(twin.creditWorthiness)}`}>{twin.creditWorthiness.toFixed(0)}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {GROWTH_BADGE(twin.growthTrajectory)}
                  {RISK_APPETITE_BADGE(twin.riskAppetite)}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Selected Twin Details */}
      {selectedTwin && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Metrics Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold text-slate-700">Financial Metrics Trend</CardTitle>
              <CardDescription className="text-xs text-slate-500">{selectedTwin.business.name} — Monthly</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {metricsLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                    <RechartsTooltip formatter={(v: number) => [formatCurrency(v), '']} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#revenueGrad)" strokeWidth={2} name="Revenue" />
                    <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} name="Expenses" />
                    <Line type="monotone" dataKey="netIncome" stroke="#f59e0b" strokeWidth={2} dot={false} name="Net Income" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">No metric data available</div>
              )}
            </CardContent>
          </Card>

          {/* AI Predictions Panel */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold text-slate-700">AI Predictions</CardTitle>
              <CardDescription className="text-xs text-slate-500">{selectedTwin.business.name} — Model {selectedTwin.aiModelVersion}</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {metricsLoading ? (
                <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : twinPredictions.length > 0 ? (
                <div className="space-y-3">
                  {['revenue', 'cash_flow', 'risk', 'growth_rate'].map(predType => {
                    const preds = twinPredictions.filter(p => p.predictionType === predType).sort((a, b) => a.timeframe.localeCompare(b.timeframe))
                    if (preds.length === 0) return null
                    const latest = preds[0]
                    const label = predType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                    return (
                      <div key={predType} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-700">{label}</span>
                          <Badge variant="outline" className="text-[10px]">{latest.timeframe}</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-slate-900">{formatCurrency(latest.predictedValue)}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="text-[10px] text-slate-500">Confidence</span>
                              <span className="text-[10px] font-semibold text-emerald-600">{(latest.confidence * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={latest.confidence * 100} className="h-1.5 bg-slate-200 [&>div]:bg-emerald-500" />
                          </div>
                        </div>
                        <div className="flex gap-3 mt-1.5 text-[10px] text-slate-400">
                          {latest.lowerBound !== null && latest.upperBound !== null && (
                            <>Range: {formatCurrency(latest.lowerBound)} — {formatCurrency(latest.upperBound)}</>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">No predictions available</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}