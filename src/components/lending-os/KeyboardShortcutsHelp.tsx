'use client'

import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  Plus,
  LayoutGrid,
  Users,
  Building2,
  Shield,
  Network,
  LogOut,
  Keyboard,
  Zap,
  Navigation
} from 'lucide-react'

interface KeyboardShortcutsHelpProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ShortcutItem {
  keys: string[]
  description: string
  category: 'navigation' | 'actions' | 'general' | 'tabs'
  icon?: React.ReactNode
}

const shortcuts: ShortcutItem[] = [
  // Navigation shortcuts
  {
    keys: ['Ctrl', 'K'],
    description: 'Open search / command palette',
    category: 'navigation',
    icon: <Search className="w-4 h-4" />
  },
  
  // Action shortcuts
  {
    keys: ['Ctrl', 'N'],
    description: 'Create new application',
    category: 'actions',
    icon: <Plus className="w-4 h-4" />
  },
  {
    keys: ['Ctrl', 'Shift', 'C'],
    description: 'Add new customer',
    category: 'actions',
    icon: <Users className="w-4 h-4" />
  },
  {
    keys: ['Ctrl', 'Space'],
    description: 'Toggle quick actions menu',
    category: 'actions',
    icon: <Zap className="w-4 h-4" />
  },
  
  // Tab navigation
  {
    keys: ['1'],
    description: 'Switch to Customer Portal tab',
    category: 'tabs',
    icon: <Users className="w-4 h-4" />
  },
  {
    keys: ['2'],
    description: 'Switch to Lender Admin tab',
    category: 'tabs',
    icon: <Building2 className="w-4 h-4" />
  },
  {
    keys: ['3'],
    description: 'Switch to Super Admin tab',
    category: 'tabs',
    icon: <Shield className="w-4 h-4" />
  },
  {
    keys: ['4'],
    description: 'Switch to Architecture tab',
    category: 'tabs',
    icon: <Network className="w-4 h-4" />
  },
  
  // General shortcuts
  {
    keys: ['Esc'],
    description: 'Close modals / dialogs / menus',
    category: 'general',
    icon: <LogOut className="w-4 h-4" />
  },
  {
    keys: ['?'],
    description: 'Show this help dialog',
    category: 'general',
    icon: <Keyboard className="w-4 h-4" />
  },
]

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  // Register global keyboard shortcut for opening help (?)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only trigger when not typing in an input field
      if (
        e.key === '?' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        // Don't prevent default as user might be typing
        onOpenChange(true)
      }
      
      // Close on Escape
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onOpenChange, open])

  const categories = [
    { id: 'navigation' as const, label: 'Navigation', color: 'text-blue-600 bg-blue-100' },
    { id: 'actions' as const, label: 'Actions', color: 'text-emerald-600 bg-emerald-100' },
    { id: 'tabs' as const, label: 'Tab Switching', color: 'text-purple-600 bg-purple-100' },
    { id: 'general' as const, label: 'General', color: 'text-slate-600 bg-slate-100' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Keyboard className="w-5 h-5 text-amber-700" />
            </div>
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Power user keyboard shortcuts for faster navigation and actions.
            Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-slate-100 rounded border">?</kbd> anytime to show this dialog.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Quick Reference */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <span className="font-medium text-amber-800">Pro Tip</span>
            </div>
            <p className="text-sm text-amber-700">
              Use keyboard shortcuts to navigate faster. Most shortcuts work from anywhere in the application.
              Press <kbd className="px-1 py-0.5 text-xs font-mono bg-white rounded border">Esc</kbd> to close any modal or popup.
            </p>
          </div>

          {/* Shortcuts by Category */}
          {categories.map((category) => {
            const categoryShortcuts = shortcuts.filter(s => s.category === category.id)
            
            return (
              <div key={category.id}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className={`${category.color} border-0`}>
                    {category.label}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded ${category.color.replace('text-', 'text/').replace('bg-', 'bg/')}`}>
                          {shortcut.icon}
                        </div>
                        <span className="text-sm font-medium">{shortcut.description}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span key={keyIndex} className="flex items-center">
                            <kbd className="px-2 py-1 text-xs font-mono font-semibold bg-white border border-slate-300 rounded shadow-sm min-w-[28px] text-center">
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="mx-0.5 text-slate-400 text-xs">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {category.id !== categories[categories.length - 1].id && (
                  <Separator className="mt-4" />
                )}
              </div>
            )
          })}

          {/* Additional Info */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Navigation className="w-4 h-4 text-slate-500" />
              Notes
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span><strong>Tab shortcuts</strong> work only when no input field is focused</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span><strong>Ctrl/Cmd</strong> shortcuts work with both Ctrl (Windows/Linux) and Cmd (Mac)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span><strong>Esc</strong> always closes the topmost modal or dropdown</span>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
