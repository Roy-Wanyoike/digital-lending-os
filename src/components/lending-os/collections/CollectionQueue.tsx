'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  Phone,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  GripVertical,
  Search,
  Filter,
  Calendar,
  DollarSign,
  User,
  ArrowRightLeft,
  XCircle,
  RefreshCw,
  MoreVertical
} from 'lucide-react'
import { toast } from 'sonner'
import type { OverdueLoan } from './types'

// Queue item status type
export type QueueItemStatus = 'pending' | 'called' | 'promised' | 'paid' | 'broken_promise'

// Queue item interface
export interface QueueItem {
  id: string
  loanId: string
  loanNumber: string
  customerName: string
  customerPhone: string
  amountDue: number
  originalAmount: number
  promiseDate?: string
  promiseAmount?: number
  notes: string
  status: QueueItemStatus
  lastContactDate?: string
  callAttempts: number
  priority: 'high' | 'medium' | 'low'
}

// Mock queue data with realistic Kenyan customers
const mockQueueItems: QueueItem[] = [
  {
    id: 'q1',
    loanId: '1',
    loanNumber: 'LN-2026-000042',
    customerName: 'John Kamau Mwangi',
    customerPhone: '+254712345678',
    amountDue: 42000,
    originalAmount: 50000,
    promiseDate: '2026-01-25',
    promiseAmount: 25000,
    notes: 'Customer promised partial payment after salary',
    status: 'promised',
    lastContactDate: '2026-01-20',
    callAttempts: 3,
    priority: 'high'
  },
  {
    id: 'q2',
    loanId: '2',
    loanNumber: 'LN-2025-000089',
    customerName: 'Faith Achieng Oloo',
    customerPhone: '+254723456789',
    amountDue: 68500,
    originalAmount: 75000,
    promiseDate: undefined,
    promiseAmount: undefined,
    notes: 'Business slow due to season - needs follow-up',
    status: 'pending',
    lastContactDate: '2026-01-18',
    callAttempts: 2,
    priority: 'high'
  },
  {
    id: 'q3',
    loanId: '5',
    loanNumber: 'LN-2026-000015',
    customerName: 'Daniel Otieno Awuor',
    customerPhone: '+254756789012',
    amountDue: 18000,
    originalAmount: 25000,
    promiseDate: '2026-01-28',
    promiseAmount: 18000,
    notes: 'Will pay full amount on payday',
    status: 'promised',
    lastContactDate: '2026-01-19',
    callAttempts: 1,
    priority: 'low'
  },
  {
    id: 'q4',
    loanId: '6',
    loanNumber: 'LN-2026-000052',
    customerName: 'Sarah Muthoni Githinji',
    customerPhone: '+254767890123',
    amountDue: 35000,
    originalAmount: 40000,
    promiseDate: undefined,
    promiseAmount: undefined,
    notes: '',
    status: 'called',
    lastContactDate: '2026-01-20',
    callAttempts: 1,
    priority: 'medium'
  },
  {
    id: 'q5',
    loanId: '10',
    loanNumber: 'LN-2026-000061',
    customerName: 'David Kimani Njogu',
    customerPhone: '+254701234567',
    amountDue: 32000,
    originalAmount: 35000,
    promiseDate: '2026-01-22',
    promiseAmount: 15000,
    notes: 'Broken promise from last week - call again today',
    status: 'broken_promise',
    lastContactDate: '2026-01-17',
    callAttempts: 5,
    priority: 'high'
  },
  {
    id: 'q6',
    loanId: '8',
    loanNumber: 'LN-2026-000034',
    customerName: 'Esther Nyashomba Musyoka',
    customerPhone: '+254789012345',
    amountDue: 0,
    originalAmount: 20000,
    promiseDate: '2026-01-20',
    promiseAmount: 15000,
    notes: 'Paid via M-Pesa',
    status: 'paid',
    lastContactDate: '2026-01-20',
    callAttempts: 2,
    priority: 'low'
  },
  {
    id: 'q7',
    loanId: '14',
    loanNumber: 'LN-2026-000048',
    customerName: 'Brian Kiptoo Langat',
    customerPhone: '+254745678902',
    amountDue: 22000,
    originalAmount: 28000,
    promiseDate: undefined,
    promiseAmount: undefined,
    notes: 'First contact - no answer',
    status: 'pending',
    lastContactDate: undefined,
    callAttempts: 0,
    priority: 'medium'
  },
  {
    id: 'q8',
    loanId: '16',
    loanNumber: 'LN-2026-000056',
    customerName: 'Samuel Maina Gikonyo',
    customerPhone: '+254767890124',
    amountDue: 19000,
    originalAmount: 22000,
    promiseDate: '2026-01-26',
    promiseAmount: 10000,
    notes: 'Requested payment arrangement',
    status: 'promised',
    lastContactDate: '2026-01-19',
    callAttempts: 2,
    priority: 'medium'
  },
  {
    id: 'q9',
    loanId: '12',
    loanNumber: 'LN-2026-000023',
    customerName: 'Michael Mutua Kioko',
    customerPhone: '+254723456780',
    amountDue: 12000,
    originalAmount: 18000,
    promiseDate: undefined,
    promiseAmount: undefined,
    notes: 'Newly overdue - gentle reminder needed',
    status: 'pending',
    lastContactDate: undefined,
    callAttempts: 0,
    priority: 'low'
  },
  {
    id: 'q10',
    loanId: '18',
    loanNumber: 'LN-2026-000029',
    customerName: 'Kevin Nganga Mbugua',
    customerPhone: '+254789012346',
    amountDue: 8000,
    originalAmount: 15000,
    promiseDate: '2026-01-25',
    promiseAmount: 8000,
    notes: '',
    status: 'called',
    lastContactDate: '2026-01-20',
    callAttempts: 1,
    priority: 'low'
  }
]

interface CollectionQueueProps {
  agentId?: string
  agentName?: string
  onLoanSelect?: (loanId: string) => void
}

export function CollectionQueue({ 
  agentId = 'agent-001', 
  agentName = 'Sarah Chen',
  onLoanSelect 
}: CollectionQueueProps) {
  const [queueItems, setQueueItems] = useState<QueueItem[]>(mockQueueItems)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null)
  const [isPromiseDialogOpen, setIsPromiseDialogOpen] = useState(false)
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [promiseAmount, setPromiseAmount] = useState('')
  const [promiseDate, setPromiseDate] = useState('')

  // Filter items
  const filteredItems = useMemo(() => {
    return queueItems.filter(item => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!item.customerName.toLowerCase().includes(query) && 
            !item.customerPhone.includes(query) &&
            !item.loanNumber.toLowerCase().includes(query)) {
          return false
        }
      }

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false
      }

      // Priority filter
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) {
        return false
      }

      return true
    })
  }, [queueItems, searchQuery, statusFilter, priorityFilter])

  // Group by status for kanban view
  const groupedItems = useMemo(() => {
    return {
      pending: filteredItems.filter(i => i.status === 'pending'),
      called: filteredItems.filter(i => i.status === 'called'),
      promised: filteredItems.filter(i => i.status === 'promised'),
      paid: filteredItems.filter(i => i.status === 'paid'),
      broken_promise: filteredItems.filter(i => i.status === 'broken_promise')
    }
  }, [filteredItems])

  // Update item status
  const updateItemStatus = (itemId: string, newStatus: QueueItemStatus) => {
    setQueueItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, status: newStatus, lastContactDate: new Date().toISOString(), callAttempts: item.callAttempts + 1 }
        : item
    ))
    toast.success(`Status updated to ${newStatus.replace('_', ' ')}`)
  }

  // Handle call action
  const handleCall = (item: QueueItem) => {
    toast.info(`Calling ${item.customerName} at ${item.customerPhone}...`)
    setTimeout(() => {
      updateItemStatus(item.id, 'called')
    }, 2000)
  }

  // Handle SMS action
  const handleSMS = (item: QueueItem) => {
    toast.success(`SMS sent to ${item.customerPhone}`)
  }

  // Handle mark as collected
  const handleMarkCollected = (item: QueueItem) => {
    updateItemStatus(item.id, 'paid')
    setQueueItems(prev => prev.map(i => 
      i.id === item.id ? { ...i, amountDue: 0 } : i
    ))
  }

  // Handle update promise
  const handleUpdatePromise = () => {
    if (!selectedItem || !promiseAmount || !promiseDate) {
      toast.error('Please fill in all fields')
      return
    }
    
    setQueueItems(prev => prev.map(item => 
      item.id === selectedItem.id 
        ? { 
            ...item, 
            promiseAmount: parseFloat(promiseAmount),
            promiseDate,
            status: 'promised' as QueueItemStatus,
            notes: newNote || item.notes
          }
        : item
    ))
    
    toast.success(`Promise updated for ${selectedItem.customerName}`)
    setIsPromiseDialogOpen(false)
    setPromiseAmount('')
    setPromiseDate('')
    setNewNote('')
    setSelectedItem(null)
  }

  // Handle add note
  const handleAddNote = () => {
    if (!selectedItem || !newNote.trim()) {
      toast.error('Please enter a note')
      return
    }
    
    setQueueItems(prev => prev.map(item => 
      item.id === selectedItem.id 
        ? { ...item, notes: item.notes ? `${item.notes}\n${newNote}` : newNote }
        : item
    ))
    
    toast.success('Note added')
    setIsNoteDialogOpen(false)
    setNewNote('')
    setSelectedItem(null)
  }

  // Format currency
  const formatCurrency = (amount: number): string => `KSh ${amount.toLocaleString()}`

  // Get status badge config
  const getStatusConfig = (status: QueueItemStatus) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: Clock }
      case 'called':
        return { label: 'Called', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400', icon: Phone }
      case 'promised':
        return { label: 'Promised', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400', icon: CheckCircle2 }
      case 'paid':
        return { label: 'Paid', className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400', icon: CheckCircle2 }
      case 'broken_promise':
        return { label: 'Broken Promise', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400', icon: XCircle }
      default:
        return { label: status, className: '', icon: Clock }
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20'
      case 'medium': return 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
      case 'low': return 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
      default: return ''
    }
  }

  // Kanban columns config
  const kanbanColumns: { key: QueueItemStatus | 'all'; title: string; color: string }[] = [
    { key: 'pending', title: 'Pending', color: 'bg-slate-500' },
    { key: 'called', title: 'Called', color: 'bg-blue-500' },
    { key: 'promised', title: 'Promised', color: 'bg-emerald-500' },
    { key: 'paid', title: 'Paid', color: 'bg-green-500' },
    { key: 'broken_promise', title: 'Broken Promise', color: 'bg-red-500' }
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600" />
            {agentName}'s Collection Queue
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {filteredItems.length} loans • {queueItems.filter(i => i.status === 'pending').length} pending • {queueItems.filter(i => i.status === 'promised').length} promises
          </p>
        </div>
        <Button variant="outline" size="sm" className="dark:border-slate-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Queue
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 dark:border-slate-700"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] dark:border-slate-700">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="called">Called</SelectItem>
            <SelectItem value="promised">Promised</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="broken_promise">Broken Promise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px] dark:border-slate-700">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {kanbanColumns.map(column => {
          const items = column.key === 'all' ? filteredItems : groupedItems[column.key]
          const statusConfig = getStatusConfig(column.key)

          return (
            <div key={column.key} className="flex flex-col min-w-[240px]">
              {/* Column Header */}
              <div className={cn(
                "flex items-center justify-between p-3 rounded-t-lg",
                column.key === 'pending' && "bg-slate-100 dark:bg-slate-800",
                column.key === 'called' && "bg-blue-100 dark:bg-blue-900/30",
                column.key === 'promised' && "bg-emerald-100 dark:bg-emerald-900/30",
                column.key === 'paid' && "bg-green-100 dark:bg-green-900/30",
                column.key === 'broken_promise' && "bg-red-100 dark:bg-red-900/30"
              )}>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full", column.color)} />
                  <span className="font-medium text-sm">{column.title}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {items.length}
                </Badge>
              </div>

              {/* Column Items */}
              <div className={cn(
                "flex-1 p-2 space-y-2 rounded-b-lg bg-slate-50 dark:bg-slate-900/50 min-h-[200px]",
                column.key === 'pending' && "bg-slate-50/80 dark:bg-slate-900/70",
                column.key === 'called' && "bg-blue-50/30 dark:bg-blue-950/20",
                column.key === 'promised' && "bg-emerald-50/30 dark:bg-emerald-950/20",
                column.key === 'paid' && "bg-green-50/30 dark:bg-green-950/20",
                column.key === 'broken_promise' && "bg-red-50/30 dark:bg-red-950/20"
              )}>
                {items.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No items</p>
                ) : (
                  items.map(item => {
                    const Icon = getStatusConfig(item.status).icon
                    return (
                      <Card 
                        key={item.id}
                        className={cn(
                          "cursor-pointer hover:shadow-md transition-shadow border-l-4",
                          getPriorityColor(item.priority),
                          item.amountDue === 0 && "opacity-60"
                        )}
                        onClick={() => onLoanSelect?.(item.loanId)}
                      >
                        <CardContent className="p-3">
                          {/* Drag Handle & Priority */}
                          <div className="flex items-start justify-between mb-2">
                            <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                            <Badge variant="secondary" className={cn("text-[10px]", getStatusConfig(item.status).className)}>
                              {statusConfig.label}
                            </Badge>
                          </div>

                          {/* Customer Info */}
                          <div className="mb-2">
                            <p className="font-medium text-sm truncate">{item.customerName}</p>
                            <p className="text-xs text-slate-500 font-mono">{item.customerPhone}</p>
                          </div>

                          {/* Amount Due */}
                          <div className="flex items-center justify-between mb-2">
                            <span className={cn(
                              "text-sm font-bold",
                              item.amountDue > 0 ? "text-red-600" : "text-emerald-600"
                            )}>
                              {item.amountDue > 0 ? formatCurrency(item.amountDue) : 'Paid'}
                            </span>
                            {item.callAttempts > 0 && (
                              <span className="text-[10px] text-slate-400">
                                {item.callAttempts} calls
                              </span>
                            )}
                          </div>

                          {/* Promise Info */}
                          {item.promiseDate && item.status === 'promised' && (
                            <div className="flex items-center gap-1 text-xs text-emerald-600 mb-2">
                              <Calendar className="w-3 h-3" />
                              <span>Promised {new Date(item.promiseDate).toLocaleDateString()}</span>
                              {item.promiseAmount && <span>• KSh {item.promiseAmount.toLocaleString()}</span>}
                            </div>
                          )}

                          {/* Quick Actions */}
                          <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-slate-700">
                            {item.status !== 'paid' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={(e) => { e.stopPropagation(); handleCall(item); }}
                              >
                                <Phone className="w-3 h-3 mr-1" />
                                Call
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={(e) => { e.stopPropagation(); handleSMS(item); }}
                            >
                              <MessageSquare className="w-3 h-3 mr-1" />
                              SMS
                            </Button>
                            {item.status !== 'paid' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setSelectedItem(item); 
                                  setIsPromiseDialogOpen(true); 
                                  setPromiseAmount(item.promiseAmount?.toString() || '');
                                  setPromiseDate(item.promiseDate || '');
                                }}
                              >
                                <ArrowRightLeft className="w-3 h-3 mr-1" />
                                Promise
                              </Button>
                            )}
                            {(item.status === 'promised' || item.status === 'called') && item.amountDue > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-emerald-600"
                                onClick={(e) => { e.stopPropagation(); handleMarkCollected(item); }}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Paid
                              </Button>
                            )}
                          </div>

                          {/* Notes Preview */}
                          {item.notes && (
                            <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 italic">
                              "{item.notes}"
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-slate-50 dark:bg-slate-800/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{groupedItems.pending.length}</p>
            <p className="text-xs text-slate-500">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{groupedItems.called.length}</p>
            <p className="text-xs text-blue-500">Called</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 dark:bg-emerald-900/20">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{groupedItems.promised.length}</p>
            <p className="text-xs text-emerald-500">Promised</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{groupedItems.paid.length}</p>
            <p className="text-xs text-green-500">Paid</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{groupedItems.broken_promise.length}</p>
            <p className="text-xs text-red-500">Broken</p>
          </CardContent>
        </Card>
      </div>

      {/* Update Promise Dialog */}
      <Dialog open={isPromiseDialogOpen} onOpenChange={setIsPromiseDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Update Payment Promise</DialogTitle>
            <DialogDescription>
              Update payment promise for {selectedItem?.customerName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Promise Amount (KSh)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={promiseAmount}
                onChange={(e) => setPromiseAmount(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Promise Date</label>
              <Input
                type="date"
                value={promiseDate}
                onChange={(e) => setPromiseDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                placeholder="Add any notes about this promise..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPromiseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePromise} className="bg-emerald-600 hover:bg-emerald-700">
              Update Promise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Add Collection Note</DialogTitle>
            <DialogDescription>
              Add a note for {selectedItem?.customerName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              placeholder="Enter your collection note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
