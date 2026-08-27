'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  Phone,
  MessageSquare,
  Mail,
  User,
  Calendar,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  FileText,
  X,
  Handshake,
  TrendingUp,
  ShieldAlert
} from 'lucide-react'
import { toast } from 'sonner'
import { PromiseToPayDialog } from './PromiseToPayDialog'
import { ContactLog } from './ContactLog'
import type { OverdueLoan, CollectionAgent } from './types'

interface CollectionActionsPanelProps {
  loan: OverdueLoan | null
  open: boolean
  onOpenChange: (open: boolean) => void
  agents?: CollectionAgent[]
  onUpdate?: () => void
}

// Mock contact history for demonstration
const mockContactHistory = [
  {
    id: '1',
    type: 'call' as const,
    outcome: 'reached' as const,
    notes: 'Customer promised to pay by Friday',
    date: '2026-01-20T10:30:00',
    agentName: 'Sarah Chen'
  },
  {
    id: '2',
    type: 'sms' as const,
    outcome: 'delivered' as const,
    notes: 'Payment reminder sent',
    date: '2026-01-18T09:15:00',
    agentName: 'System'
  },
  {
    id: '3',
    type: 'whatsapp' as const,
    outcome: 'read' as const,
    notes: 'Customer acknowledged debt, requested extension',
    date: '2026-01-16T14:45:00',
    agentName: 'Sarah Chen'
  }
]

export function CollectionActionsPanel({
  loan,
  open,
  onOpenChange,
  agents = [],
  onUpdate
}: CollectionActionsPanelProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'actions' | 'history'>('details')
  const [isPromiseDialogOpen, setIsPromiseDialogOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string>(loan?.assignedCollectorId || '')
  const [isLoading, setIsLoading] = useState(false)

  // Handle agent assignment
  const handleAssignAgent = async () => {
    if (!loan) return
    
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // In production:
      // await fetch(`/api/collections/loans/${loan.id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     action: 'assignCollector',
      //     assignedCollector: selectedAgent || null
      //   })
      // })
      
      toast.success(`Loan ${loan.loanNumber} ${selectedAgent ? 'assigned to agent' : 'unassigned'}`)
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to assign agent')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle contact action
  const handleContactAction = async (method: string) => {
    if (!loan) return
    
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      
      toast.success(`Initiating ${method.toUpperCase()} to ${loan.customerName}`)
      
      // In production:
      // await fetch('/api/collections/actions', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     action: 'contact_attempt',
      //     loanId: loan.id,
      //     contactMethod: method,
      //     contactOutcome: 'reached'
      //   })
      // })
    } catch (error) {
      toast.error(`Failed to initiate ${method}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Format currency
  const formatCurrency = (amount: number): string => `KSh ${amount.toLocaleString()}`

  // Get severity color based on days in arrears
  const getSeverityColor = (days: number) => {
    if (days > 90) return 'text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400'
    if (days > 60) return 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400'
    if (days > 30) return 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400'
    return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400'
  }

  if (!loan) return null

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm">{loan.loanNumber}</span>
                  <Badge className={cn(
                    "ml-2",
                    getSeverityColor(loan.daysInArrears)
                  )}>
                    {loan.daysInArrears} days overdue
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  Loan details and collection actions
                </SheetDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Customer Info Card */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {loan.customerName.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                  {loan.customerName}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{loan.customerPhone}</p>
                {loan.customerEmail && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{loan.customerEmail}</p>
                )}
                
                {/* Quick Contact Buttons */}
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs dark:border-slate-600"
                    onClick={() => handleContactAction('call')}
                    disabled={isLoading}
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    Call
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs dark:border-slate-600"
                    onClick={() => handleContactAction('sms')}
                    disabled={isLoading}
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    SMS
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs dark:border-slate-600"
                    onClick={() => handleContactAction('whatsapp')}
                    disabled={isLoading}
                  >
                    <MessageSquare className="w-3 h-3 mr-1 text-emerald-600" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs dark:border-slate-600"
                    onClick={() => handleContactAction('email')}
                    disabled={isLoading}
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    Email
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
            {(['details', 'actions', 'history'] as const).map((tab) => (
              <button
                key={tab}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors relative",
                  activeTab === tab
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
                )}
              </button>
            ))}
          </div>

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Loan Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Principal</p>
                  <p className="font-semibold">{formatCurrency(loan.principal)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Outstanding</p>
                  <p className="font-semibold text-red-600">{formatCurrency(loan.outstandingBalance)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Repaid</p>
                  <p className="font-semibold text-emerald-600">{formatCurrency(loan.totalRepaid)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Days in Arrears</p>
                  <p className="font-semibold">{loan.daysInArrears}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Next Payment</p>
                  <p className="font-semibold">{loan.nextPaymentDue || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Maturity Date</p>
                  <p className="font-semibold">{loan.maturityDate || '-'}</p>
                </div>
              </div>

              <Separator />

              {/* Product & Status */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Product</span>
                  <span className="text-sm font-medium">{loan.productName || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Status</span>
                  <Badge 
                    variant="secondary"
                    className={
                      loan.status === 'DEFAULTED' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border-0'
                        : loan.status === 'IN_ARREARS'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border-0'
                        : ''
                    }
                  >
                    {loan.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Risk Level</span>
                  <Badge 
                    variant="secondary"
                    className={
                      loan.riskLevel === 'VERY_HIGH' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border-0'
                        : loan.riskLevel === 'HIGH'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400 border-0'
                        : ''
                    }
                  >
                    {loan.riskLevel || '-'}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Agent Assignment */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Assigned Collector
                </label>
                <div className="flex gap-2">
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select agent..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {agents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAssignAgent}
                    disabled={isLoading || selectedAgent === loan.assignedCollectorId}
                    size="sm"
                  >
                    <User className="w-4 h-4 mr-1" />
                    Assign
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Actions Tab */}
          {activeTab === 'actions' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Select an action to perform on this loan
              </p>

              {/* Primary Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto p-4 flex-col gap-2 dark:border-slate-700"
                  onClick={() => setIsPromiseDialogOpen(true)}
                >
                  <Handshake className="w-6 h-6 text-emerald-600" />
                  <span className="text-sm font-medium">Promise to Pay</span>
                  <span className="text-xs text-slate-500">Record customer promise</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 flex-col gap-2 dark:border-slate-700"
                  onClick={() => toast.info('Payment arrangement dialog coming soon')}
                >
                  <ArrowRightLeft className="w-6 h-6 text-blue-600" />
                  <span className="text-sm font-medium">Arrangement</span>
                  <span className="text-xs text-slate-500">Setup payment plan</span>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto p-4 flex-col gap-2 dark:border-slate-700"
                  onClick={() => toast.info('Recording payment...')}
                >
                  <DollarSign className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-medium">Record Payment</span>
                  <span className="text-xs text-slate-500">Log manual payment</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 flex-col gap-2 dark:border-slate-700"
                  onClick={() => setActiveTab('history')}
                >
                  <FileText className="w-6 h-6 text-purple-600" />
                  <span className="text-sm font-medium">Add Note</span>
                  <span className="text-xs text-slate-500">Add collection note</span>
                </Button>
              </div>

              <Separator />

              {/* Escalation Actions */}
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Escalation Options
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto p-4 flex-col gap-2 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                  onClick={() => toast.warning('Escalating to supervisor...')}
                >
                  <TrendingUp className="w-6 h-6 text-amber-600" />
                  <span className="text-sm font-medium">Escalate</span>
                  <span className="text-xs text-slate-500">To supervisor</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 flex-col gap-2 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={() => {
                    if (confirm('Are you sure you want to write off this loan? This action cannot be undone.')) {
                      toast.error('Write-off initiated for ' + loan.loanNumber)
                    }
                  }}
                >
                  <ShieldAlert className="w-6 h-6 text-red-600" />
                  <span className="text-sm font-medium">Write Off</span>
                  <span className="text-xs text-slate-500">Mark as uncollectible</span>
                </Button>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <ContactLog contacts={mockContactHistory} loanId={loan.id} />
          )}
        </SheetContent>
      </Sheet>

      {/* Promise to Pay Dialog */}
      <PromiseToPayDialog
        open={isPromiseDialogOpen}
        onOpenChange={setIsPromiseDialogOpen}
        loan={loan}
        onSuccess={() => {
          onUpdate?.()
          toast.success('Promise recorded successfully')
        }}
      />
    </>
  )
}
