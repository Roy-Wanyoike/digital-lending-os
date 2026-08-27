'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Phone,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  User,
  Filter,
  PhoneCall,
  MessageCircle,
  Send,
  Play,
  Pause,
  RotateCcw,
  FileText,
  Target
} from 'lucide-react'

// Types
interface OverdueAccount {
  id: string
  customerName: string
  phone: string
  daysOverdue: number
  amountDue: number
  originalLoanAmount: number
  lastContact: string
  contactAttempts: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'active' | 'promise' | 'disputed' | 'skip_trace'
}

interface PromiseToPay {
  id: string
  customerName: string
  amount: number
  promiseDate: string
  status: 'pending' | 'kept' | 'broken' | 'extended'
  notes?: string
}

interface ContactLogEntry {
  id: string
  time: string
  type: 'call' | 'sms' | 'whatsapp' | 'visit'
  customerName: string
  outcome: string
  followUpRequired: boolean
}

interface DailyGoal {
  label: string
  current: number
  target: number
  unit: string
}

// Demo Data
const OVERDUE_ACCOUNTS: OverdueAccount[] = [
  { id: 'LN-2026-0234', customerName: 'Peter Mwangi', phone: '+254711***123', daysOverdue: 45, amountDue: 8500, originalLoanAmount: 15000, lastContact: '3 days ago', contactAttempts: 8, priority: 'critical', status: 'active' },
  { id: 'LN-2026-0198', customerName: 'Sarah Kamau', phone: '+254722***456', daysOverdue: 12, amountDue: 3200, originalLoanAmount: 10000, lastContact: 'Today', contactAttempts: 3, priority: 'high', status: 'active' },
  { id: 'LN-2026-0212', customerName: 'John Otieno', phone: '+254733***789', daysOverdue: 8, amountDue: 2100, originalLoanAmount: 8000, lastContact: 'Yesterday', contactAttempts: 2, priority: 'medium', status: 'active' },
  { id: 'LN-2026-0189', customerName: 'Grace Wanjiku', phone: '+254744***321', daysOverdue: 23, amountDue: 5600, originalLoanAmount: 20000, lastContact: '2 days ago', contactAttempts: 5, priority: 'high', status: 'promise' },
  { id: 'LN-2026-0201', customerName: 'James Kiplagat', phone: '+254755***654', daysOverdue: 31, amountDue: 12000, originalLoanAmount: 25000, lastContact: '5 days ago', contactAttempts: 10, priority: 'critical', status: 'active' },
  { id: 'LN-2026-0223', customerName: 'Alice Mumbi', phone: '+254766***987', daysOverdue: 5, amountDue: 1500, originalLoanAmount: 5000, lastContact: 'Today', contactAttempts: 1, priority: 'low', status: 'active' },
]

const PROMISES_TO_PAY: PromiseToPay[] = [
  { id: 'PTP-001', customerName: 'Alice Wanjiku', amount: 4000, promiseDate: 'Tomorrow', status: 'pending' },
  { id: 'PTP-002', customerName: 'Bob Maina', amount: 6000, promiseDate: 'Aug 28', status: 'pending' },
  { id: 'PTP-003', customerName: 'Catherine Atieno', amount: 3500, promiseDate: 'Aug 29', status: 'pending' },
  { id: 'PTP-004', customerName: 'David Njoroge', amount: 8000, promiseDate: 'Aug 26', status: 'kept' },
  { id: 'PTP-005', customerName: 'Esther Chebet', amount: 2500, promiseDate: 'Aug 27', status: 'broken' },
]

const CONTACT_LOG: ContactLogEntry[] = [
  { id: '1', time: '10:30 AM', type: 'call', customerName: 'Peter M.', outcome: 'No answer, left voicemail', followUpRequired: true },
  { id: '2', time: '11:15 AM', type: 'sms', customerName: 'Sarah K.', outcome: 'Promise to pay tomorrow - KSh 3,200', followUpRequired: true },
  { id: '3', time: '12:00 PM', type: 'call', customerName: 'John O.', outcome: 'Will call back after 2PM', followUpRequired: true },
  { id: '4', time: '02:15 PM', type: 'whatsapp', customerName: 'John O.', outcome: 'Confirmed payment by EOD', followUpRequired: false },
  { id: '5', time: '03:30 PM', type: 'call', customerName: 'Grace W.', outcome: 'Discussed repayment plan', followUpRequired: true },
  { id: '6', time: '04:00 PM', type: 'sms', customerName: 'Alice M.', outcome: 'Payment reminder sent', followUpRequired: false },
  { id: '7', time: '04:30 PM', type: 'call', customerName: 'James K.', outcome: 'No answer (2nd attempt)', followUpRequired: true },
]

const DAILY_GOALS: DailyGoal[] = [
  { label: 'Calls to Make', current: 18, target: 25, unit: '' },
  { label: 'Promises Received', current: 8, target: 12, unit: '' },
  { label: 'Amount Recovered', current: 45000, target: 60000, unit: 'KSh' },
]

interface CollectionsAgentWorkspaceProps {
  tenantId: string
  userId: string
  userName?: string
}

export function CollectionsAgentWorkspace({ 
  tenantId, 
  userId, 
  userName = 'Grace Mwangi' 
}: CollectionsAgentWorkspaceProps) {
  const [selectedAccount, setSelectedAccount] = useState<OverdueAccount | null>(null)
  const [callDialogOpen, setCallDialogOpen] = useState(false)
  const [smsDialogOpen, setSmsDialogOpen] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [isCalling, setIsCalling] = useState(false)
  const [filterPriority, setFilterPriority] = useState<string>('all')

  const getPriorityBadge = (priority: OverdueAccount['priority']) => {
    const variants = {
      critical: { label: 'Critical', className: 'bg-red-100 text-red-700 border-red-200' },
      high: { label: 'High', className: 'bg-orange-100 text-orange-700 border-orange-200' },
      medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      low: { label: 'Low', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    }
    const config = variants[priority]
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>
  }

  const getStatusBadge = (status: OverdueAccount['status']) => {
    const variants = {
      active: { label: 'Active', variant: 'default' as const },
      promise: { label: 'Promise', variant: 'secondary' as const },
      disputed: { label: 'Disputed', variant: 'destructive' as const },
      skip_trace: { label: 'Skip Trace', variant: 'outline' as const },
    }
    const config = variants[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getPromiseStatusBadge = (status: PromiseToPay['status']) => {
    const variants = {
      pending: { label: '⏰ Pending', className: 'text-yellow-600 bg-yellow-50' },
      kept: { label: '✅ Kept', className: 'text-emerald-600 bg-emerald-50' },
      broken: { label: '❌ Broken', className: 'text-red-600 bg-red-50' },
      extended: { label: '📅 Extended', className: 'text-blue-600 bg-blue-50' },
    }
    const config = variants[status]
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>{config.label}</span>
  }

  const getContactIcon = (type: ContactLogEntry['type']) => {
    switch (type) {
      case 'call': return <PhoneCall className="w-4 h-4 text-blue-500" />
      case 'sms': return <MessageSquare className="w-4 h-4 text-green-500" />
      case 'whatsapp': return <MessageCircle className="w-4 h-4 text-emerald-500" />
      case 'visit': return <User className="w-4 h-4 text-purple-500" />
    }
  }

  const filteredAccounts = filterPriority === 'all' 
    ? OVERDUE_ACCOUNTS 
    : OVERDUE_ACCOUNTS.filter(acc => acc.priority === filterPriority)

  const handleStartCall = () => {
    setIsCalling(true)
    // Simulate call duration
    setTimeout(() => {
      setIsCalling(false)
      setCallDialogOpen(false)
    }, 3000)
  }

  const handleSendSMS = () => {
    console.log('Sending SMS:', messageText)
    setSmsDialogOpen(false)
    setMessageText('')
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Phone className="w-8 h-8 text-purple-600" />
            Collections Agent Workspace
          </h1>
          <p className="text-muted-foreground mt-1">Welcome back, {userName}</p>
        </div>
        <Button className="gap-2 bg-purple-600 hover:bg-purple-700">
          <Play className="w-4 h-4" />
          Start Calling Queue
        </Button>
      </div>

      {/* Today's Goals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            Today's Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {DAILY_GOALS.map((goal) => (
              <div key={goal.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{goal.label}</span>
                  <span className="font-medium">
                    {goal.unit}{goal.current.toLocaleString()} / {goal.unit}{goal.target.toLocaleString()}
                  </span>
                </div>
                <Progress value={(goal.current / goal.target) * 100} className="h-3" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assigned Accounts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg">My Assigned Accounts</CardTitle>
                <CardDescription>{filteredAccounts.length} overdue accounts</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-[130px]">
                    <Filter className="w-3 h-3 mr-1" />
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Days OD</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Last Contact</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{account.customerName}</p>
                          <p className="text-xs text-muted-foreground">{account.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${account.daysOverdue > 30 ? 'text-red-600' : account.daysOverdue > 14 ? 'text-orange-600' : 'text-yellow-600'}`}>
                          {account.daysOverdue} days
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">KSh {account.amountDue.toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground">{account.lastContact}</TableCell>
                      <TableCell>{getPriorityBadge(account.priority)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedAccount(account)
                              setCallDialogOpen(true)
                            }}
                          >
                            <PhoneCall className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedAccount(account)
                              setSmsDialogOpen(true)
                            }}
                          >
                            <MessageSquare className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MessageCircle className="w-4 h-4 text-emerald-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Active Promises & Quick Stats */}
        <div className="space-y-6">
          {/* Active Promises */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Promises to Pay</CardTitle>
                <Badge variant="outline">{PROMISES_TO_PAY.filter(p => p.status === 'pending').length} pending</Badge>
              </div>
              <CardDescription>This week's commitments</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[250px]">
                <div className="space-y-3">
                  {PROMISES_TO_PAY.slice(0, 4).map((promise) => (
                    <div key={promise.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{promise.customerName}</span>
                        {getPromiseStatusBadge(promise.status)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">KSh {promise.amount.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {promise.promiseDate}
                        </span>
                      </div>
                      {promise.status === 'pending' && (
                        <Button variant="outline" size="sm" className="w-full gap-1">
                          <Send className="w-3 h-3" />
                          Remind
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Recovery Summary */}
          <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
            <CardContent className="p-4 md:p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                Today's Recovery
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Collected</span>
                  <span className="text-xl font-bold text-emerald-600">KSh 45,000</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Promised</span>
                  <span className="text-lg font-semibold text-blue-600">KSh 32,000</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Potential</span>
                  <span className="text-xl font-bold text-purple-600">KSh 77,000</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contact Log & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Contact Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Today's Contact Log
            </CardTitle>
            <CardDescription>{CONTACT_LOG.length} activities today</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[350px]">
              <div className="space-y-3">
                {CONTACT_LOG.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors">
                    <div className="mt-0.5">
                      {getContactIcon(entry.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{entry.time}</span>
                        <span className="font-medium text-sm">{entry.customerName}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{entry.outcome}</p>
                      {entry.followUpRequired && (
                        <Badge variant="outline" className="mt-1 text-xs gap-1">
                          <Clock className="w-3 h-3" />
                          Follow-up Required
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Quick Actions & Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start gap-3 h-auto py-4 bg-purple-600 hover:bg-purple-700">
              <PhoneCall className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium">Start Calling Queue</p>
                <p className="text-xs opacity-80">Begin automated calling sequence</p>
              </div>
            </Button>

            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" className="flex-col gap-1 h-auto py-3">
                <PhoneCall className="w-4 h-4 text-blue-600" />
                <span className="text-xs">Call</span>
              </Button>
              <Button variant="outline" className="flex-col gap-1 h-auto py-3">
                <MessageSquare className="w-4 h-4 text-green-600" />
                <span className="text-xs">SMS</span>
              </Button>
              <Button variant="outline" className="flex-col gap-1 h-auto py-3">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-xs">WhatsApp</span>
              </Button>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium mb-2">Quick Templates</p>
              <div className="space-y-2">
                {[
                  { name: 'First Reminder', color: 'blue' },
                  { name: 'Payment Due Today', color: 'orange' },
                  { name: 'Overdue Notice', color: 'red' },
                  { name: 'Repayment Plan Offer', color: 'green' },
                ].map((template) => (
                  <Button 
                    key={template.name}
                    variant="outline" 
                    size="sm"
                    className="w-full justify-start text-sm"
                  >
                    <FileText className={`w-4 h-4 mr-2 text-${template.color}-500`} />
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Dialog */}
      <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-blue-600" />
              Call Customer
            </DialogTitle>
            <DialogDescription>
              {selectedAccount && (
                <>Calling {selectedAccount.customerName} ({selectedAccount.phone})</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedAccount && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount Due</span>
                  <span className="font-bold">KSh {selectedAccount.amountDue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Days Overdue</span>
                  <span className="font-semibold text-red-600">{selectedAccount.daysOverdue} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Contact Attempts</span>
                  <span>{selectedAccount.contactAttempts}</span>
                </div>
              </div>

              {isCalling ? (
                <div className="text-center py-8 space-y-4">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 rounded-full bg-green-100 animate-ping"></div>
                    <div className="relative w-20 h-20 rounded-full bg-green-500 flex items-center justify-center">
                      <Phone className="w-8 h-8 text-white animate-pulse" />
                    </div>
                  </div>
                  <p className="text-lg font-medium">Calling...</p>
                  <p className="text-sm text-muted-foreground">{selectedAccount.phone}</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button className="flex-1 gap-2" onClick={handleStartCall}>
                    <Play className="w-4 h-4" />
                    Start Call
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Pause className="w-4 h-4" />
                    Skip
                  </Button>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Call Outcome</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contacted_promise">Contacted - Promise to Pay</SelectItem>
                    <SelectItem value="contacted_paid">Contacted - Paid</SelectItem>
                    <SelectItem value="no_answer">No Answer</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="wrong_number">Wrong Number</SelectItem>
                    <SelectItem value="requested_callback">Requested Callback</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Notes</label>
                <Textarea placeholder="Add call notes..." rows={3} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCallDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => setCallDialogOpen(false)}>
              Save & Next
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SMS Dialog */}
      <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              Send SMS
            </DialogTitle>
            <DialogDescription>
              {selectedAccount && (
                <>Send message to {selectedAccount.customerName}</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedAccount && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p><strong>To:</strong> {selectedAccount.phone}</p>
                <p><strong>Amount Due:</strong> KSh {selectedAccount.amountDue.toLocaleString()}</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Template (Optional)</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reminder">Payment Reminder</SelectItem>
                    <SelectItem value="overdue">Overdue Notice</SelectItem>
                    <SelectItem value="promise_followup">Promise Follow-up</SelectItem>
                    <SelectItem value="plan_offer">Repayment Plan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea 
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {messageText.length}/160 characters
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSmsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 gap-2"
              onClick={handleSendSMS}
              disabled={!messageText.trim()}
            >
              <Send className="w-4 h-4" />
              Send SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
