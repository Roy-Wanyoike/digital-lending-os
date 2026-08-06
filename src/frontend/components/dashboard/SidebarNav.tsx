'use client'

import { useCallback, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { NAV_ITEMS } from '@/lib/dashboard-helpers'
import { ThemeToggle } from '@/components/theme-toggle'
import { prefetchUrl } from '@/hooks/use-api'

// Map each tab to its primary API endpoint(s) for hover-prefetching.
// Only the most commonly-needed URL per tab — keeps hover lightweight.
const TAB_PREFETCH_URLS: Record<string, string[]> = {
  'overview': ['/api/dashboard/stats'],
  'trust-graph': ['/api/trust/relationships'],
  'escrow': ['/api/escrow/transactions?limit=50'],
  'payments': ['/api/payments/intents?limit=15'],
  'passport': ['/api/businesses?limit=50', '/api/passport/verifications?limit=15'],
  'digital-twin': ['/api/twin/profiles?limit=20'],
  'payment-links': ['/api/payment-links?limit=50'],
  'wallet': ['/api/businesses?limit=50', '/api/wallets/rates'],
  'referral': ['/api/referral'],
  'fraud': ['/api/fraud/alerts?limit=20', '/api/fraud/rules'],
  'matching': ['/api/matching?limit=20'],
  'collections': ['/api/collections?limit=20'],
  'compliance': ['/api/compliance/rules', '/api/compliance/screenings?limit=20'],
}

export function SidebarNav({ visibleTabs, activeTab, onTabChange }: { visibleTabs: string[], activeTab: string, onTabChange: (id: string) => void }) {
  // Track which tabs have already been prefetched to avoid redundant fetches
  const prefetchedRef = useRef<Set<string>>(new Set())

  const handleMouseEnter = useCallback((tabId: string) => {
    if (prefetchedRef.current.has(tabId)) return
    prefetchedRef.current.add(tabId)
    const urls = TAB_PREFETCH_URLS[tabId]
    if (urls) {
      // Fire-and-forget — errors are swallowed by prefetchUrl
      for (const url of urls) prefetchUrl(url)
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 sm:p-6 border-b border-border">
        <h1 className="text-xl font-bold text-emerald-500">Youngsend</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Trust Network</p>
      </div>
      <ScrollArea className="flex-1 py-4">
        <nav aria-label="Dashboard navigation" className="space-y-1 px-3">
          {NAV_ITEMS.map(item => {
            if (!visibleTabs.includes(item.id)) return null
            const isActive = activeTab === item.id
            const Icon = item.icon
            return (
              <button key={item.id} onClick={() => onTabChange(item.id)} onMouseEnter={() => handleMouseEnter(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </ScrollArea>
      <div className="p-4 border-t border-border flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground text-center">The Financial Operating System</p>
          <p className="text-[10px] text-muted-foreground text-center">for Global Commerce</p>
        </div>
        <ThemeToggle />
      </div>
    </div>
  )
}
