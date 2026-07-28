'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Menu, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ROLE_TABS, ROLE_LABELS, NAV_ITEMS, type Role } from '@/lib/dashboard-helpers'
import { OverviewTab } from '@/components/dashboard/OverviewTab'
import { TrustGraphTab } from '@/components/dashboard/TrustGraphTab'
import { EscrowTab } from '@/components/dashboard/EscrowTab'
import { PaymentsTab } from '@/components/dashboard/PaymentsTab'
import { PassportTab } from '@/components/dashboard/PassportTab'
import { DigitalTwinTab } from '@/components/dashboard/DigitalTwinTab'
import { PaymentLinksTab } from '@/components/dashboard/PaymentLinksTab'
import { WalletTab } from '@/components/dashboard/WalletTab'
import { FraudTab } from '@/components/dashboard/FraudTab'
import { ReferralTab } from '@/components/dashboard/ReferralTab'
import { MatchingTab } from '@/components/dashboard/MatchingTab'
import { CollectionsTab } from '@/components/dashboard/CollectionsTab'
import { ComplianceTab } from '@/components/dashboard/ComplianceTab'
import { SidebarNav } from '@/components/dashboard/SidebarNav'
import { ThemeToggle } from '@/components/theme-toggle'

const TAB_COMPONENTS: Record<string, () => React.JSX.Element> = {
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

export default function YoungsendDashboard() {
  const { data: session, status } = useSession()
  const [activeTab, setActiveTab] = useState('overview')
  const [currentRole, setCurrentRole] = useState<Role>('admin')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isConnected: sseConnected, subscribe, unsubscribe } = useRealtime({
    enabled: status === 'authenticated',
    tenantId: (session?.user as any)?.tenantId,
  })

  // Subscribe to realtime events and show toast notifications
  useEffect(() => {
    if (!sseConnected) return

    const handleDeposit = (evt: any) => {
      const d = evt.data
      toast.success(`Deposit Confirmed`, {
        description: `${d.amount?.toFixed(2)} ${d.currency} deposited to wallet`,
      })
    }

    const handlePayment = (evt: any) => {
      const d = evt.data
      toast.success(`Payment Completed`, {
        description: `${d.amount?.toFixed(2)} ${d.currency} via ${d.provider}`,
      })
    }

    const handleEscrow = (evt: any) => {
      const d = evt.data
      const actionLabels: Record<string, string> = {
        created: 'Created',
        activated: 'Activated',
        funded: 'Funded',
        cancelled: 'Cancelled',
        milestone_released: 'Milestone Released',
      }
      const label = actionLabels[d.action] || d.status || 'Updated'
 toast.info(`Escrow ${label}`, {
        description: `${d.txRef} — ${d.amount?.toFixed(2)} ${d.currency}`,
      })
    }

    subscribe('wallet.deposit', handleDeposit)
    subscribe('payment.completed', handlePayment)
    subscribe('escrow.updated', handleEscrow)

    return () => {
      unsubscribe('wallet.deposit', handleDeposit)
      unsubscribe('payment.completed', handlePayment)
      unsubscribe('escrow.updated', handleEscrow)
    }
  }, [sseConnected, subscribe, unsubscribe])

  // Set role from session
  useEffect(() => {
    if (session?.user) {
      const userRole = (session.user as any).role as Role
      if (userRole && Object.keys(ROLE_LABELS).includes(userRole)) {
        setCurrentRole(userRole)
      }
    }
  }, [session])

  const visibleTabs = ROLE_TABS[currentRole] || []
  const safeTab = visibleTabs.includes(activeTab) ? activeTab : (visibleTabs[0] || 'overview')
  useEffect(() => {
    if (safeTab !== activeTab) setActiveTab(safeTab)
  }, [safeTab, activeTab, currentRole])
  const activeNav = NAV_ITEMS.find(n => n.id === activeTab)

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId)
    setSidebarOpen(false)
  }, [])

  const ActiveTabComponent = TAB_COMPONENTS[activeTab]
  const userName = (session?.user as any)?.name || 'User'
  const userEmail = session?.user?.email || ''
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-muted border-t-emerald-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* V1+V2: Public header with branding */}
        <header className="border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">YS</div>
              <span className="text-lg font-bold text-foreground">Youngsend</span>
            </div>
            <nav className="flex items-center gap-4">
              <a href="https://youngsend.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</a>
              <a href="https://youngsend.com/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => signIn()}>Sign In</Button>
              <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white" onClick={() => signIn()}>Get Started</Button>
            </nav>
          </div>
        </header>

        {/* Hero section */}
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="text-center max-w-lg space-y-8">
            <div className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white font-bold text-2xl shadow-lg shadow-emerald-600/25">YS</div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                The Financial Operating System<br />for Global Commerce
              </h1>
              <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                Escrow, wallets, payment links, and AI-powered trust — all in one secure platform built for businesses that trade across borders.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" className="bg-emerald-700 hover:bg-emerald-800 text-white px-8 h-11 text-base font-semibold" onClick={() => signIn()}>
                Sign in to Dashboard
              </Button>
              <Button size="lg" variant="outline" className="px-8 h-11 text-base" asChild>
                <a href="/register">Create Account</a>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                Bank-grade encryption
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                SOC 2 Compliant
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                24/7 Support
              </span>
            </div>
          </div>
        </main>

        {/* V2: Footer with legal links */}
        <footer className="border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-600 text-white font-bold text-[10px]">YS</div>
                <span className="text-sm font-medium text-foreground">Youngsend</span>
              </div>
              <nav className="flex items-center gap-6 text-xs text-muted-foreground">
                <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
                <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
                <a href="https://youngsend.com/contact" className="hover:text-foreground transition-colors">Contact</a>
              </nav>
              <p className="text-xs text-muted-foreground">2026 Youngsend. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex flex-1">
          <aside className="hidden lg:flex w-60 bg-card border-r flex-col flex-shrink-0 sticky top-0 h-screen">
            <SidebarNav visibleTabs={visibleTabs} activeTab={safeTab} onTabChange={handleTabChange} />
          </aside>
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-60 p-0 bg-card border-border">
              <SheetHeader className="sr-only"><SheetTitle>Navigation</SheetTitle><SheetDescription>Menu</SheetDescription></SheetHeader>
              <SidebarNav visibleTabs={visibleTabs} activeTab={safeTab} onTabChange={handleTabChange} />
            </SheetContent>
          </Sheet>
          <div className="flex-1 flex flex-col min-w-0">
            <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 sm:px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
                  <h2 className="text-lg font-semibold text-foreground">{activeNav?.label || 'Dashboard'}</h2>
                </div>
                <div className="flex items-center gap-3">
                  {/* Role Selector (admin only) */}
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

                  {/* User Menu */}
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
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </header>
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
            <footer className="border-t px-4 sm:px-6 py-4 mt-auto">
              <p className="text-xs text-muted-foreground text-center">Youngsend Trust Network — The Financial Operating System for Global Commerce</p>
            </footer>
          </div>
        </div>

      </div>
    </TooltipProvider>
  )
}