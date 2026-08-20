'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  Phone,
  PhoneOff,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Handshake,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Timer,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

// Call outcome types
export type CallOutcome = 
  | 'contacted' 
  | 'no_answer' 
  | 'busy' 
  | 'wrong_number' 
  | 'callback_requested' 
  | 'promised_to_pay'
  | 'broken_promise'
  | 'refused_payment'
  | 'payment_arrangement'

// Call record interface
export interface CallRecord {
  id: string
  loanId: string
  customerId: string
  customerName: string
  customerPhone: string
  agentId: string
  agentName: string
  contactMethod: 'call' | 'sms' | 'whatsapp' | 'email'
  callOutcome: CallOutcome
  duration?: number // in seconds
  notes?: string
  promiseAmount?: number
  promiseDate?: string
  contactedAt: Date
  createdAt: Date
}

// Mock call history data
const mockCallHistory: CallRecord[] = [
  {
    id: 'call-001',
    loanId: '1',
    customerId: 'cust-001',
    customerName: 'John Kamau Mwangi',
    customerPhone: '+254712345678',
    agentId: 'agent-001',
    agentName: 'Sarah Chen',
    contactMethod: 'call',
    callOutcome: 'promised_to_pay',
    duration: 245,
    notes: 'Customer confirmed salary payment on 25th. Will pay KSh 25,000 via M-Pesa.',
    promiseAmount: 25000,
    promiseDate: '2026-01-25',
    contactedAt: new Date('2026-01-20T10:30:00'),
    createdAt: new Date('2026-01-20T10:35:00')
  },
  {
    id: 'call-002',
    loanId: '1',
    customerId: 'cust-001',
    customerName: 'John Kamau Mwangi',
    customerPhone: '+254712345678',
    agentId: 'agent-001',
    agentName: 'Sarah Chen',
    contactMethod: 'sms',
    callOutcome: 'callback_requested',
    notes: 'Payment reminder SMS sent. Customer requested callback after 2pm.',
    contactedAt: new Date('2026-01-18T09:15:00'),
    createdAt: new Date('2026-01-18T09:15:00')
  },
  {
    id: 'call-003',
    loanId: '1',
    customerId: 'cust-001',
    customerName: 'John Kamau Mwangi',
    customerPhone: '+254712345678',
    agentId: 'agent-002',
    agentName: 'James Omondi',
    contactMethod: 'whatsapp',
    callOutcome: 'contacted',
    duration: 180,
    notes: 'Customer acknowledged debt. Requested one week extension due to medical emergency.',
    contactedAt: new Date('2026-01-16T14:45:00'),
    createdAt: new Date('2026-01-16T14:50:00')
  },
  {
    id: 'call-004',
    loanId: '1',
    customerId: 'cust-001',
    customerName: 'John Kamau Mwangi',
    customerPhone: '+254712345678',
    agentId: 'agent-001',
    agentName: 'Sarah Chen',
    contactMethod: 'call',
    callOutcome: 'no_answer',
    duration: 30,
    notes: 'Called twice - no answer. Left voicemail.',
    contactedAt: new Date('2026-01-14T11:20:00'),
    createdAt: new Date('2026-01-14T11:22:00')
  },
  {
    id: 'call-005',
    loanId: '1',
    customerId: 'cust-001',
    customerName: 'John Kamau Mwangi',
    customerPhone: '+254712345678',
    agentId: 'system',
    agentName: 'System',
    contactMethod: 'sms',
    callOutcome: 'contacted',
    notes: 'Automated payment reminder sent - 7 days overdue notice.',
    contactedAt: new Date('2026-01-13T08:00:00'),
    createdAt: new Date('2026-01-13T08:00:00')
  },
  {
    id: 'call-006',
    loanId: '1',
    customerId: 'cust-001',
    customerName: 'John Kamau Mwangi',
    customerPhone: '+254712345678',
    agentId: 'agent-001',
    agentName: 'Sarah Chen',
    contactMethod: 'call',
    callOutcome: 'promised_to_pay',
    duration: 320,
    notes: 'Initial contact. Customer committed to pay KSh 15,000 by Jan 10th.',
    promiseAmount: 15000,
    promiseDate: '2026-01-10',
    contactedAt: new Date('2026-01-08T16:00:00'),
    createdAt: new Date('2026-01-08T16:05:00')
  },
  {
    id: 'call-007',
    loanId: '1',
    customerId: 'cust-001',
    customerName: 'John Kamau Mwangi',
    customerPhone: '+254712345678',
    agentId: 'agent-001',
    agentName: 'Sarah Chen',
    contactMethod: 'call',
    callOutcome: 'broken_promise',
    duration: 150,
    notes: 'Follow-up call - customer did not pay as promised. New promise for Jan 25th.',
    contactedAt: new Date('2026-01-12T09:30:00'),
    createdAt: new Date('2026-01-12T09:33:00')
  }
]

// Available agents
const availableAgents = [
  { id: 'agent-001', name: 'Sarah Chen' },
  { id: 'agent-002', name: 'James Omondi' },
  { id: 'agent-003', name: 'Grace Wanjiku' },
  { id: 'agent-004', name: 'Peter Kamau' }
]

interface CallHistoryPanelProps {
  loanId?: string
  customerId?: string
  customerName?: string
  customerPhone?: string
  open?: boolean
  onCallRecordAdded?: (record: CallRecord) => void
}

export function CallHistoryPanel({
  loanId = '1',
  customerId = 'cust-001',
  customerName = 'John Kamau Mwangi',
  customerPhone = '+254712345678',
  open = true,
  onCallRecordAdded
}: CallHistoryPanelProps) {
  const [callRecords, setCallRecords] = useState<CallRecord[]>(mockCallHistory)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // Filters
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // New call form
  const [newCallMethod, setNewCallMethod] = useState<'call' | 'sms' | 'whatsapp' | 'email'>('call')
  const [newCallOutcome, setNewCallOutcome] = useState<CallOutcome>('contacted')
  const [newCallDuration, setNewCallDuration] = useState('')
  const [newCallNotes, setNewCallNotes] = useState('')
  const [newPromiseAmount, setNewPromiseAmount] = useState('')
  const [newPromiseDate, setNewPromiseDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filter records
  const filteredRecords = useMemo(() => {
    return callRecords.filter(record => {
      if (outcomeFilter !== 'all' && record.callOutcome !== outcomeFilter) return false
      if (methodFilter !== 'all' && record.contactMethod !== methodFilter) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!record.notes?.toLowerCase().includes(query) && 
            !record.agentName.toLowerCase().includes(query)) {
          return false
        }
      }
      return true
    }).sort((a, b) => b.contactedAt.getTime() - a.contactedAt.getTime())
  }, [callRecords, outcomeFilter, methodFilter, searchQuery])

  // Get outcome config
  const getOutcomeConfig = (outcome: CallOutcome) => {
    switch (outcome) {
      case 'contacted':
        return { label: 'Contacted', icon: Phone, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400' }
      case 'no_answer':
        return { label: 'No Answer', icon: PhoneOff, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400' }
      case 'busy':
        return { label: 'Busy', icon: Clock, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400' }
      case 'wrong_number':
        return { label: 'Wrong Number', icon: XCircle, color: 'text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-400' }
      case 'callback_requested':
        return { label: 'Callback Req.', icon: Phone, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-400' }
      case 'promised_to_pay':
        return { label: 'Promised to Pay', icon: Handshake, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400' }
      case 'broken_promise':
        return { label: 'Broken Promise', icon: XCircle, color: 'text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-400' }
      case 'refused_payment':
        return { label: 'Refused Payment', icon: AlertCircle, color: 'text-red-700 bg-red-200 dark:bg-red-900/50 dark:text-red-300' }
      case 'payment_arrangement':
        return { label: 'Arrangement Made', icon: CheckCircle2, color: 'text-teal-600 bg-teal-100 dark:bg-teal-900/40 dark:text-teal-400' }
      default:
        return { label: outcome, icon: Phone, color: 'text-slate-600 bg-slate-100' }
    }
  }

  // Get method icon and color
  const getMethodConfig = (method: string) => {
    switch (method) {
      case 'call': return { icon: Phone, color: 'text-blue-500', label: 'Phone Call' }
      case 'sms': return { icon: MessageSquare, color: 'text-green-500', label: 'SMS' }
      case 'whatsapp': return { icon: MessageSquare, color: 'text-emerald-500', label: 'WhatsApp' }
      case 'email': return { icon: MessageSquare, color: 'text-purple-500', label: 'Email' }
      default: return { icon: Phone, color: 'text-slate-500', label: method }
    }
  }

  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Handle add new call record
  const handleAddCallRecord = async () => {
    if (!newCallNotes.trim()) {
      toast.error('Please add notes about this contact')
      return
    }

    setIsSubmitting(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500))

      const newRecord: CallRecord = {
        id: `call-${Date.now()}`,
        loanId,
        customerId,
        customerName,
        customerPhone,
        agentId: 'agent-001',
        agentName: 'Sarah Chen',
        contactMethod: newCallMethod,
        callOutcome: newCallOutcome,
        duration: newCallDuration ? parseInt(newCallDuration) : undefined,
        notes: newCallNotes,
        promiseAmount: newPromiseAmount ? parseFloat(newPromiseAmount) : undefined,
        promiseDate: newPromiseDate || undefined,
        contactedAt: new Date(),
        createdAt: new Date()
      }

      setCallRecords(prev => [newRecord, ...prev])
      onCallRecordAdded?.(newRecord)
      
      toast.success('Call record added successfully')
      
      // Reset form
      setIsAddingNew(false)
      setNewCallMethod('call')
      setNewCallOutcome('contacted')
      setNewCallDuration('')
      setNewCallNotes('')
      setNewPromiseAmount('')
      setNewPromiseDate('')
    } catch (error) {
      toast.error('Failed to add call record')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Summary stats
  const stats = useMemo(() => {
    const totalCalls = callRecords.filter(r => r.contactMethod === 'call').length
    const connectedCalls = callRecords.filter(r => r.callOutcome === 'contacted' || r.callOutcome === 'promised_to_pay').length
    const promisesMade = callRecords.filter(r => r.callOutcome === 'promised_to_pay').length
    const promisesKept = callRecords.filter(r => r.callOutcome === 'promised_to_pay' && r.promiseAmount).length
    const promisesBroken = callRecords.filter(r => r.callOutcome === 'broken_promise').length
    const totalDuration = callRecords.reduce((sum, r) => sum + (r.duration || 0), 0)
    
    return {
      totalCalls,
      connectedCalls,
      connectionRate: totalCalls > 0 ? ((connectedCalls / totalCalls) * 100).toFixed(0) : '0',
      promisesMade,
      promisesKept,
      promisesBroken,
      avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0
    }
  }, [callRecords])

  if (!open) return null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Phone className="w-5 h-5 text-blue-600" />
            Call History
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {customerName} • {customerPhone}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsAddingNew(!isAddingNew)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Record
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
          <CardContent className="p-3 text-center">
            <Phone className="w-4 h-4 mx-auto mb-1 text-blue-600" />
            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{stats.totalCalls}</p>
            <p className="text-[10px] text-blue-600 dark:text-blue-500">Total Calls</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800">
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{stats.connectionRate}%</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-500">Connect Rate</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800">
          <CardContent className="p-3 text-center">
            <Handshake className="w-4 h-4 mx-auto mb-1 text-purple-600" />
            <p className="text-lg font-bold text-purple-700 dark:text-purple-400">{stats.promisesMade}</p>
            <p className="text-[10px] text-purple-600 dark:text-purple-500">Promises</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800">
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-green-600" />
            <p className="text-lg font-bold text-green-700 dark:text-green-400">{stats.promisesKept}</p>
            <p className="text-[10px] text-green-600 dark:text-green-500">Kept</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800">
          <CardContent className="p-3 text-center">
            <XCircle className="w-4 h-4 mx-auto mb-1 text-red-600" />
            <p className="text-lg font-bold text-red-700 dark:text-red-400">{stats.promisesBroken}</p>
            <p className="text-[10px] text-red-600 dark:text-red-500">Broken</p>
          </CardContent>
        </Card>
      </div>

      {/* Add New Call Form */}
      {isAddingNew && (
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              Log New Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Method</Label>
                <Select value={newCallMethod} onValueChange={(v) => setNewCallMethod(v as typeof newCallMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Phone Call</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Outcome</Label>
                <Select value={newCallOutcome} onValueChange={(v) => setNewCallOutcome(v as CallOutcome)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="no_answer">No Answer</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="wrong_number">Wrong Number</SelectItem>
                    <SelectItem value="callback_requested">Callback Requested</SelectItem>
                    <SelectItem value="promised_to_pay">Promised to Pay</SelectItem>
                    <SelectItem value="broken_promise">Broken Promise</SelectItem>
                    <SelectItem value="payment_arrangement">Arrangement Made</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newCallMethod === 'call' && (
              <div className="space-y-2">
                <Label>Duration (seconds)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 120"
                  value={newCallDuration}
                  onChange={(e) => setNewCallDuration(e.target.value)}
                />
              </div>
            )}

            {(newCallOutcome === 'promised_to_pay' || newCallOutcome === 'payment_arrangement') && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Promise Amount (KSh)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newPromiseAmount}
                    onChange={(e) => setNewPromiseAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Promise Date</Label>
                  <Input
                    type="date"
                    value={newPromiseDate}
                    onChange={(e) => setNewPromiseDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes *</Label>
              <Textarea
                placeholder="Describe the interaction..."
                value={newCallNotes}
                onChange={(e) => setNewCallNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsAddingNew(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleAddCallRecord} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
                {isSubmitting ? 'Saving...' : 'Save Record'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 dark:border-slate-700"
          />
        </div>
        
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-[160px] dark:border-slate-700">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="no_answer">No Answer</SelectItem>
            <SelectItem value="promised_to_pay">Promised to Pay</SelectItem>
            <SelectItem value="broken_promise">Broken Promise</SelectItem>
            <SelectItem value="callback_requested">Callback Requested</SelectItem>
          </SelectContent>
        </Select>

        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-[140px] dark:border-slate-700">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="call">Phone Calls</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      <ScrollArea className="h-[400px] pr-4">
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />

          {filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Phone className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No call records found</p>
            </div>
          ) : (
            filteredRecords.map((record, index) => {
              const outcomeConfig = getOutcomeConfig(record.callOutcome)
              const methodConfig = getMethodConfig(record.contactMethod)
              const OutcomeIcon = outcomeConfig.icon
              const MethodIcon = methodConfig.icon
              const isExpanded = expandedId === record.id

              return (
                <div key={record.id} className="relative pb-6 last:pb-0">
                  {/* Timeline dot */}
                  <div className={cn(
                    "absolute left-4 w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center z-10",
                    outcomeConfig.color
                  )}>
                    <MethodIcon className="w-2.5 h-2.5" />
                  </div>

                  {/* Content */}
                  <div className="ml-14">
                    <Card 
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        isExpanded && "ring-2 ring-emerald-200 dark:ring-emerald-800"
                      )}
                      onClick={() => setExpandedId(isExpanded ? null : record.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              outcomeConfig.color
                            )}>
                              <OutcomeIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{outcomeConfig.label}</span>
                                <Badge variant="secondary" className="text-[10px]">
                                  <MethodIcon className="w-3 h-3 mr-1" />
                                  {methodConfig.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(record.contactedAt, 'dd MMM yyyy')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(record.contactedAt, 'hh:mm a')}
                                </span>
                                {record.duration && (
                                  <span className="flex items-center gap-1">
                                    <Timer className="w-3 h-3" />
                                    {formatDuration(record.duration)}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                by {record.agentName}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Expanded content */}
                        {isExpanded && (
                          <>
                            <Separator className="my-3" />
                            
                            {record.notes && (
                              <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                  {record.notes}
                                </p>
                              </div>
                            )}

                            {(record.promiseAmount || record.promiseDate) && (
                              <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                {record.promiseAmount && (
                                  <div>
                                    <p className="text-[10px] text-emerald-600 uppercase tracking-wide">Promise Amount</p>
                                    <p className="font-bold text-emerald-700 dark:text-emerald-400">
                                      KSh {record.promiseAmount.toLocaleString()}
                                    </p>
                                  </div>
                                )}
                                {record.promiseDate && (
                                  <div>
                                    <p className="text-[10px] text-emerald-600 uppercase tracking-wide">Promise Date</p>
                                    <p className="font-bold text-emerald-700 dark:text-emerald-400">
                                      {format(new Date(record.promiseDate), 'dd MMM yyyy')}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex gap-2 mt-3">
                              <Button variant="outline" size="sm" className="text-xs dark:border-slate-700">
                                <Phone className="w-3 h-3 mr-1" />
                                Call Back
                              </Button>
                              <Button variant="outline" size="sm" className="text-xs dark:border-slate-700">
                                <MessageSquare className="w-3 h-3 mr-1" />
                                Send SMS
                              </Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
