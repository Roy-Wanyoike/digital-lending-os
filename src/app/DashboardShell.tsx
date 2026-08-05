'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { signOut } from 'next-auth/react'
import type { Session } from 'next-auth'
import { Menu, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import { invalidateCache, seedCache } from '@/hooks/use-api'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ROLE_TABS, ROLE_LABELS, NAV_ITEMS, type Role } from '@/lib/dashboard-helpers'
import { SidebarNav } from '@/components/dashboard/SidebarNav'
import { ThemeToggle } from '@/components/theme-toggle'
import dynamic from 'next/dynamic'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// ─── Shared skeleton — inlined to avoid separate module round-trip ─────
const TabSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 rounded-lg bg-muted" />
      ))}
    </div>
    <div className="h-64 rounded-lg bg-muted" />
    <div className="h-48 rounded-lg bg-muted" />
  </div>
)

// ─── Lazy-loaded tabs — zero cost until navigated to ─────────────
// ssr: false + prefetch: false — no JS fetched until user clicks the tab
const D = (importFn: () => Promise<{ default: React.ComponentType }>) =>
  dynamic(importFn, { loading: () => <TabSkeleton />, ssr: false })

const OverviewTab = D(() => import('@/components/dashboard/OverviewTab').then(m => ({ default: m.OverviewTab })))
const TrustGraphTab = D(() => import('@/components/dashboard/TrustGraphTab').then(m => ({ default: m.TrustGraphTab })))
const EscrowTab = D(() => import('@/components/dashboard/EscrowTab').then(m => ({ default: m.EscrowTab })))
const PaymentsTab = D(() => import('@/components/dashboard/PaymentsTab').then(m => ({ default: m.PaymentsTab })))
const PassportTab = D(() => import('@/components/dashboard/PassportTab').then(m => ({ default: m.PassportTab })))
const DigitalTwinTab = D(() => import('@/components/dashboard/DigitalTwinTab').then(m => ({ default: m.DigitalTwinTab })))
const PaymentLinksTab = D(() => import('@/components/dashboard/PaymentLinksTab').then(m => ({ default: m.PaymentLinksTab })))
const WalletTab = D(() => import('@/components/dashboard/WalletTab').then(m => ({ default: m.WalletTab })))
const FraudTab = D(() => import('@/components/dashboard/FraudTab').then(m => ({ default: m.FraudTab })))
const ReferralTab = D(() => import('@/components/dashboard/ReferralTab').then(m => ({ default: m.ReferralTab })))
const MatchingTab = D(() => import('@/components/dashboard/MatchingTab').then(m => ({ default: m.MatchingTab })))
const CollectionsTab = D(() => import('@/components/dashboard/CollectionsTab').then(m => ({ default: m.CollectionsTab })))
const ComplianceTab = D(() => import('@/components/dashboard/ComplianceTab').then(m => ({ default: m.ComplianceTab })))

// ─── Tab component map ───────────────────────────────────────────
const TAB_COMPONENTS: Record<string, React.ComponentType> = {
  'overview': OverviewTab,
  'trust-graph': TrustGraphTab,
  'escrow': EscrowTab,
  'payments': PaymentsTab,
  'passport': PassportTab,
  'digital-twin': DigitalTwinTab,
  'payment-links': PaymentLinksTab,
  'wallet': WalletTab,
  'referral': ReferralTab,
  'fraud': FraudTab,
  'matching': MatchingTab,
  'collections': CollectionsTab,
  'compliance': ComplianceTab,
}

// ─── Shell component ─────────────────────────────────────────────
export function DashboardShell({ session }: { session: Session }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [currentRole, setCurrentRole] = useState<Role>('admin')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isConnected: sseConnected, subscribe, unsubscribe } = useRealtime({
    enabled: true,
  })

  // ─── Batch prefetch on mount ──────────────────────────────────
  // Fetches stats + businesses in a single request, then seeds the
  // individual URL caches so each tab's useApi hook gets an instant hit.
  useEffect(() => {
    let cancelled = false
    fetch('/api/dashboard/batch', { headers: { 'Content-Type': 'application/json' } })
      .then(r => { if (!r.ok) return null; return r.json() })
      .then(json => {
        if (cancelled || !json?.data) return
        const { stats, businesses } = json.data
        if (stats) seedCache('/api/dashboard/stats', stats)
        if (Array.isArray(businesses)) seedCache('/api/businesses?limit=50', businesses)
      })
      .catch(() => { /* silent — tabs will fall back to individual fetches */ })
    return () => { cancelled = true }
  }, [])

  // Realtime toast notifications + cache invalidation
  useEffect(() => {
    if (!sseConnected) return
    const handleDeposit = (evt: any) => {
      const d = evt.data
      toast.success('Deposit Confirmed', { description: `${d.amount?.toFixed(2)} ${d.currency} deposited to wallet` })
      invalidateCache('/api/wallets')
      invalidateCache('/api/dashboard/stats')
    }
    const handleWithdrawal = (evt: any) => {
      const d = evt.data
      toast.info('Withdrawal Processed', { description: `${d.amount?.toFixed(2)} ${d.currency} withdrawn from wallet` })
      invalidateCache('/api/wallets')
      invalidateCache('/api/dashboard/stats')
    }
    const handlePaymentCompleted = (evt: any) => {
      const d = evt.data
      toast.success('Payment Completed', { description: `${d.amount?.toFixed(2)} ${d.currency} via ${d.provider}` })
      invalidateCache('/api/payments/intents')
      invalidateCache('/api/dashboard/stats')
    }
    const handlePaymentFailed = (evt: any) => {
      const d = evt.data
      toast.error('Payment Failed', { description: `${d.amount?.toFixed(2)} ${d.currency} — ${d.reason || 'Unknown error'}` })
      invalidateCache('/api/payments/intents')
      invalidateCache('/api/dashboard/stats')
    }
    const handleEscrow = (evt: any) => {
      const d = evt.data
      const actionLabels: Record<string, string> = { created: 'Created', activated: 'Activated', funded: 'Funded', cancelled: 'Cancelled', milestone_released: 'Milestone Released' }
      const label = actionLabels[d.action] || d.status || 'Updated'
      toast.info(`Escrow ${label}`, { description: `${d.txRef} — ${d.amount?.toFixed(2)} ${d.currency}` })
      invalidateCache('/api/escrow/transactions')
      invalidateCache('/api/dashboard/stats')
    }
    subscribe('wallet.deposit', handleDeposit)
    subscribe('wallet.withdrawal', handleWithdrawal)
    subscribe('payment.completed', handlePaymentCompleted)
    subscribe('payment.failed', handlePaymentFailed)
    subscribe('escrow.updated', handleEscrow)
    subscribe('escrow.created', handleEscrow)
    return () => {
      unsubscribe('wallet.deposit', handleDeposit)
      unsubscribe('wallet.withdrawal', handleWithdrawal)
      unsubscribe('payment.completed', handlePaymentCompleted)
      unsubscribe('payment.failed', handlePaymentFailed)
      unsubscribe('escrow.updated', handleEscrow)
      unsubscribe('escrow.created', handleEscrow)
    }
  }, [sseConnected, subscribe, unsubscribe])

  // Set role from session
  useEffect(() => {
    if (session?.user) {
      const userRole = (session.user as any).role as Role
      if (userRole && Object.keys(ROLE_LABELS).includes(userRole)) setCurrentRole(userRole)
    }
  }, [session])

  const visibleTabs = ROLE_TABS[currentRole] || []
  const safeTab = visibleTabs.includes(activeTab) ? activeTab : (visibleTabs[0] || 'overview')
  useEffect(() => { if (safeTab !== activeTab) setActiveTab(safeTab) }, [safeTab, activeTab, currentRole])
  const activeNav = NAV_ITEMS.find(n => n.id === safeTab)

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId)
    setSidebarOpen(false)
  }, [])

  const ActiveTabComponent = TAB_COMPONENTS[safeTab]
  const userName = (session?.user as any)?.name || 'User'
  const userEmail = session?.user?.email || ''
  const userInitials = userName.split(' ').map((n: any) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <TooltipProvider>
      <div className="h-screen overflow-hidden flex bg-background">
        <aside className="hidden lg:flex w-60 bg-card border-r flex-col flex-shrink-0 overflow-y-auto">
          <SidebarNav visibleTabs={visibleTabs} activeTab={safeTab} onTabChange={handleTabChange} />
        </aside>
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-60 p-0 bg-card border-border">
            <SheetHeader className="sr-only"><SheetTitle>Navigation</SheetTitle><SheetDescription>Menu</SheetDescription></SheetHeader>
            <SidebarNav visibleTabs={visibleTabs} activeTab={safeTab} onTabChange={handleTabChange} />
          </SheetContent>
        </Sheet>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex-shrink-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 sm:px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
                  <h2 className="text-lg font-semibold text-foreground">{activeNav?.label || 'Dashboard'}</h2>
                </div>
                <div className="flex items-center gap-3">
                  {(currentRole === 'admin' || (session?.user as any)?.role === 'admin') && (
                    <Select value={currentRole} onValueChange={(v) => setCurrentRole(v as Role)}>
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{(Object.keys(ROLE_LABELS) as Role[]).map(r => (<SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>))}</SelectContent>
                    </Select>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors ${sseConnected ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                        <div className={`h-2 w-2 rounded-full transition-colors ${sseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className={`text-[10px] font-medium hidden sm:inline ${sseConnected ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{sseConnected ? 'Live' : 'Offline'}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>Trust Network {sseConnected ? 'connected' : 'disconnected'}</p></TooltipContent>
                  </Tooltip>
                  <ThemeToggle />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-foreground text-background text-xs font-medium">{userInitials}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium">{userName}</p>
                        <p className="text-xs text-muted-foreground">{userEmail}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 capitalize">{currentRole}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })}>
                        <LogOut className="h-4 w-4 mr-2" /> Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
              <Suspense fallback={<TabSkeleton />}>
                {ActiveTabComponent ? (
                  <ErrorBoundary name={activeNav?.label || safeTab}>
                    <ActiveTabComponent />
                  </ErrorBoundary>
                ) : <TabSkeleton />}
              </Suspense>
            </main>
            <footer className="flex-shrink-0 border-t px-4 sm:px-6 py-4">
              <p className="text-xs text-muted-foreground text-center">Youngsend Trust Network — The Financial Operating System for Global Commerce</p>
            </footer>
          </div>
      </div>
    </TooltipProvider>
  )
}
