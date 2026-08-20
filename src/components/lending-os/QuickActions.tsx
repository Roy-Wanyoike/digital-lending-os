'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Plus,
  Users,
  FileText,
  Settings,
  X,
  ChevronUp,
  ChevronDown,
  HelpCircle
} from 'lucide-react'

interface QuickActionsProps {
  onNewApplication?: () => void
  onNewCustomer?: () => void
  onRunReports?: () => void
  onOpenSettings?: () => void
  onOpenShortcutsHelp?: () => void
}

interface ActionItem {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  color: string
  hoverColor: string
}

export function QuickActions({
  onNewApplication,
  onNewCustomer,
  onRunReports,
  onOpenSettings,
  onOpenShortcutsHelp
}: QuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Keyboard shortcut to toggle (Ctrl+Space or Escape to close)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const actions: ActionItem[] = [
    {
      id: 'new-application',
      label: 'New Application',
      icon: <Plus className="w-4 h-4" />,
      onClick: () => {
        onNewApplication?.()
        setIsOpen(false)
      },
      color: 'bg-emerald-600',
      hoverColor: 'hover:bg-emerald-700'
    },
    {
      id: 'new-customer',
      label: 'New Customer',
      icon: <Users className="w-4 h-4" />,
      onClick: () => {
        onNewCustomer?.()
        setIsOpen(false)
      },
      color: 'bg-blue-600',
      hoverColor: 'hover:bg-blue-700'
    },
    {
      id: 'run-reports',
      label: 'Run Reports',
      icon: <FileText className="w-4 h-4" />,
      onClick: () => {
        onRunReports?.()
        setIsOpen(false)
      },
      color: 'bg-purple-600',
      hoverColor: 'hover:bg-purple-700'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      onClick: () => {
        onOpenSettings?.()
        setIsOpen(false)
      },
      color: 'bg-slate-600',
      hoverColor: 'hover:bg-slate-700'
    },
  ]

  if (isMinimized) {
    return (
      <div 
        ref={panelRef}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          size="sm"
          variant="outline"
          className="rounded-full shadow-lg bg-white border-slate-200 hover:bg-slate-50"
          onClick={() => setIsMinimized(false)}
        >
          <ChevronUp className="w-4 h-4 mr-1" />
          Actions
        </Button>
      </div>
    )
  }

  return (
    <div 
      ref={panelRef}
      className="fixed bottom-6 right-6 z-50"
    >
      {/* Expanded Panel */}
      <div className="relative">
        {/* Action Buttons */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 flex flex-col gap-2 mb-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
            {actions.map((action, index) => (
              <button
                key={action.id}
                onClick={action.onClick}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${action.color} ${action.hoverColor} transition-all transform hover:scale-105 active:scale-95 min-w-[180px]`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {action.icon}
                <span className="font-medium text-sm">{action.label}</span>
              </button>
            ))}
            
            <Separator className="my-1" />
            
            {/* Shortcuts Help Button */}
            <button
              onClick={() => {
                onOpenShortcutsHelp?.()
                setIsOpen(false)
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all min-w-[180px]"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="font-medium text-sm">Keyboard Shortcuts</span>
              <kbd className="ml-auto px-1.5 py-0.5 text-xs font-mono bg-white rounded border">?</kbd>
            </button>
          </div>
        )}

        {/* Main FAB */}
        <div className="flex items-center gap-2">
          {/* Minimize Button */}
          <Button
            size="sm"
            variant="outline"
            className="rounded-full shadow-lg bg-white border-slate-200 h-9 w-9 p-0"
            onClick={() => setIsMinimized(true)}
            title="Minimize"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>

          {/* Main Toggle Button */}
          <Button
            size="lg"
            className={`rounded-full shadow-lg h-14 w-14 p-0 transition-all ${
              isOpen 
                ? 'bg-slate-700 hover:bg-slate-800 rotate-45' 
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
            onClick={() => setIsOpen(!isOpen)}
            title={isOpen ? 'Close' : 'Quick Actions'}
          >
            {isOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Plus className="w-6 h-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Tooltip hint for first-time users */}
      {!isOpen && (
        <div className="absolute bottom-full right-0 mb-2 whitespace-nowrap">
          <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
            Quick Actions (Ctrl+Space)
            <div className="absolute -bottom-1 right-6 w-2 h-2 bg-slate-900 rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  )
}
