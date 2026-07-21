'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { NAV_ITEMS } from '@/lib/dashboard-helpers'

export function SidebarNav({ visibleTabs, activeTab, onTabChange }: { visibleTabs: string[], activeTab: string, onTabChange: (id: string) => void }) {
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
