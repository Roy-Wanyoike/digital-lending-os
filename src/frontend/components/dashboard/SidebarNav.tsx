'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { NAV_ITEMS } from '@/lib/dashboard-helpers'
import { ThemeToggle } from '@/components/theme-toggle'

export function SidebarNav({ visibleTabs, activeTab, onTabChange }: { visibleTabs: string[], activeTab: string, onTabChange: (id: string) => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 sm:p-6 border-b border-border">
        <h1 className="text-xl font-bold text-emerald-500">Youngsend</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Trust Network</p>
      </div>
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {NAV_ITEMS.map(item => {
            if (!visibleTabs.includes(item.id)) return null
            const isActive = activeTab === item.id
            const Icon = item.icon
            return (
              <button key={item.id} onClick={() => onTabChange(item.id)}
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
