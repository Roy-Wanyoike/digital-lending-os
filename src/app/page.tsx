'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Menu, LogOut, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ROLE_TABS, ROLE_LABELS, NAV_ITEMS, Toast, type Role } from '@/lib/dashboard-helpers'
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
  const [socketConnected] = useState(true)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

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
  const prevSafeTab = useRef(safeTab)
  useEffect(() => {
    if (safeTab !== activeTab) setActiveTab(safeTab)
  }, [currentRole]) // only re-evaluate when role changes
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-8 w-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-white">
        <div className="flex flex-1">
          <aside className="hidden lg:flex w-60 bg-slate-900 flex-col flex-shrink-0 sticky top-0 h-screen">
            <SidebarNav visibleTabs={visibleTabs} activeTab={safeTab} onTabChange={handleTabChange} />
          </aside>
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-60 p-0 bg-slate-900 border-slate-800">
              <SheetHeader className="sr-only"><SheetTitle>Navigation</SheetTitle><SheetDescription>Menu</SheetDescription></SheetHeader>
              <SidebarNav visibleTabs={visibleTabs} activeTab={safeTab} onTabChange={handleTabChange} />
            </SheetContent>
          </Sheet>
          <div className="flex-1 flex flex-col min-w-0">
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b px-4 sm:px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
                  <h2 className="text-lg font-semibold text-slate-900">{activeNav?.label || 'Dashboard'}</h2>
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
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100">
                        <div className={`h-2 w-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-[10px] text-slate-500 hidden sm:inline">{socketConnected ? 'Live' : 'Offline'}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>Trust Network {socketConnected ? 'connected' : 'disconnected'}</p></TooltipContent>
                  </Tooltip>

                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-slate-900 text-white text-xs font-medium">{userInitials}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium">{userName}</p>
                        <p className="text-xs text-slate-500">{userEmail}</p>
                        <p className="text-xs text-emerald-600 mt-0.5 capitalize">{currentRole}</p>
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
              <p className="text-xs text-slate-400 text-center">Youngsend Trust Network — The Financial Operating System for Global Commerce</p>
            </footer>
          </div>
        </div>
        <Toast message={toastMessage} visible={toastVisible} />
      </div>
    </TooltipProvider>
  )
}