'use client'

import { useState, useCallback } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
  'fraud': FraudTab,
  'matching': MatchingTab,
  'collections': CollectionsTab,
  'compliance': ComplianceTab,
}

export default function YoungsendDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [currentRole, setCurrentRole] = useState<Role>('admin')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [socketConnected] = useState(true)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  const visibleTabs = ROLE_TABS[currentRole] || []
  const activeNav = NAV_ITEMS.find(n => n.id === activeTab)
  const safeTab = visibleTabs.includes(activeTab) ? activeTab : (visibleTabs[0] || 'overview')
  if (safeTab !== activeTab) setActiveTab(safeTab)

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId)
    setSidebarOpen(false)
  }, [])

  const ActiveTabComponent = TAB_COMPONENTS[activeTab]

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
                  <Select value={currentRole} onValueChange={(v) => setCurrentRole(v as Role)}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{(Object.keys(ROLE_LABELS) as Role[]).map(r => (<SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>))}</SelectContent>
                  </Select>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100">
                        <div className={`h-2 w-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-[10px] text-slate-500 hidden sm:inline">{socketConnected ? 'Live' : 'Offline'}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>Trust Network {socketConnected ? 'connected' : 'disconnected'}</p></TooltipContent>
                  </Tooltip>
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