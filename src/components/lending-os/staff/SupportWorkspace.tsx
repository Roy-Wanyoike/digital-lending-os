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
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Headphones,
  Search,
  MessageSquare,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  FileText,
  BookOpen,
  Send,
  ArrowUpRight,
  Tag,
  Filter
} from 'lucide-react'

// Types
interface SupportTicket {
  id: string
  customerName: string
  customerId: string
  subject: string
  category: 'loan_application' | 'repayment' | 'account' | 'technical' | 'complaint' | 'general'
  priority: 'urgent' | 'high' | 'normal' | 'low'
  status: 'open' | 'in_progress' | 'pending_customer' | 'resolved' | 'escalated'
  createdAt: string
  lastUpdate: string
  assignedTo?: string
}

interface CustomerQuickView {
  id: string
  name: string
  phone: string
  email?: string
  activeLoans: number
  totalBorrowed: number
  currentBalance: number
  lastContact: string
  status: 'active' | 'inactive' | 'delinquent'
}

interface FAQItem {
  question: string
  category: string
  usageCount: number
}

interface SupportMetric {
  label: string
  value: number
  change: number
  icon: React.ReactNode
}

// Demo Data
const SUPPORT_TICKETS: SupportTicket[] = [
  { id: 'TKT-1001', customerName: 'Mary Wanjiku', customerId: 'CUS-12345', subject: 'Loan application stuck in review', category: 'loan_application', priority: 'high', status: 'open', createdAt: '10 min ago', lastUpdate: '10 min ago' },
  { id: 'TKT-1002', customerName: 'John Otieno', customerId: 'CUS-12346', subject: 'Cannot make repayment via M-Pesa', category: 'repayment', priority: 'urgent', status: 'in_progress', createdAt: '30 min ago', lastUpdate: '5 min ago' },
  { id: 'TKT-1003', customerName: 'Grace Kamau', customerId: 'CUS-12347', subject: 'Wrong amount deducted from account', category: 'account', priority: 'high', status: 'pending_customer', createdAt: '1 hr ago', lastUpdate: '30 min ago' },
  { id: 'TKT-1004', customerName: 'Peter Mwangi', customerId: 'CUS-12348', subject: 'App not loading on my phone', category: 'technical', priority: 'normal', status: 'open', createdAt: '2 hrs ago', lastUpdate: '2 hrs ago' },
  { id: 'TKT-1005', customerName: 'Sarah Achieng', customerId: 'CUS-12349', subject: 'Complaint about collection calls', category: 'complaint', priority: 'high', status: 'escalated', createdAt: '3 hrs ago', lastUpdate: '1 hr ago' },
]

const CUSTOMER_SEARCH_RESULTS: CustomerQuickView[] = [
  { id: '1', name: 'James Kiplagat', phone: '+254712345678', email: 'james@email.com', activeLoans: 2, totalBorrowed: 45000, currentBalance: 18000, lastContact: '2 days ago', status: 'active' },
  { id: '2', name: 'Alice Mumbi', phone: '+254723456789', email: null, activeLoans: 1, totalBorrowed: 25000, currentBalance: 8500, lastContact: '1 week ago', status: 'active' },
  { id: '3', name: 'David Njoroge', phone: '+254734567890', email: 'david@email.com', activeLoans: 0, totalBorrowed: 60000, currentBalance: 0, lastContact: '1 month ago', status: 'inactive' },
]

const FAQ_ITEMS: FAQItem[] = [
  { question: 'How do I apply for a loan?', category: 'Loan Application', usageCount: 245 },
  { question: 'Why was my loan rejected?', category: 'Credit Assessment', usageCount: 189 },
  { question: 'How to update my phone number?', category: 'Account Settings', usageCount: 156 },
  { question: 'M-Pesa repayment not reflecting?', category: 'Payments', usageCount: 134 },
  { question: 'How to check my loan balance?', category: 'Account Info', usageCount: 112 },
  { question: 'What are the interest rates?', category: 'Pricing', usageCount: 98 },
]

const SUPPORT_METRICS: SupportMetric[] = [
  { label: 'Open Tickets', value: 12, change: -3, icon: <MessageSquare className="w-5 h-5 text-blue-600" /> },
  { label: 'Resolved Today', value: 8, change: 2, icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" /> },
  { label: 'Avg Response Time', value: 12, change: -5, icon: <Clock className="w-5 h-5 text-orange-600" /> },
  { label: 'Customer Satisfaction', value: 94, change: 2, icon: <Headphones className="w-5 h-5 text-purple-600" /> },
]

interface SupportWorkspaceProps {
  tenantId: string
  userId: string
  userName?: string
}

export function SupportWorkspace({ 
  tenantId, 
  userId, 
  userName = 'David Kimani' 
}: SupportWorkspaceProps) {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [showCustomerResults, setShowCustomerResults] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [activeTab, setActiveTab] = useState('tickets')

  const getCategoryBadge = (category: SupportTicket['category']) => {
    const variants = {
      loan_application: { label: 'Loan App', className: 'bg-blue-100 text-blue-700' },
      repayment: { label: 'Repayment', className: 'bg-green-100 text-green-700' },
      account: { label: 'Account', className: 'bg-purple-100 text-purple-700' },
      technical: { label: 'Technical', className: 'bg-orange-100 text-orange-700' },
      complaint: { label: 'Complaint', className: 'bg-red-100 text-red-700' },
      general: { label: 'General', className: 'bg-gray-100 text-gray-700' },
    }
    const config = variants[category]
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>
  }

  const getPriorityBadge = (priority: SupportTicket['priority']) => {
    const variants = {
      urgent: { label: '🔴 Urgent', className: 'bg-red-100 text-red-800 border-red-300' },
      high: { label: '🟠 High', className: 'bg-orange-100 text-orange-800 border-orange-300' },
      normal: { label: '🟡 Normal', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      low: { label: '🟢 Low', className: 'bg-green-100 text-green-800 border-green-300' },
    }
    const config = variants[priority]
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>
  }

  const getStatusBadge = (status: SupportTicket['status']) => {
    const variants = {
      open: { label: 'Open', variant: 'default' as const, className: '' },
      in_progress: { label: 'In Progress', variant: 'secondary' as const, className: 'bg-blue-100 text-blue-700' },
      pending_customer: { label: 'Pending Customer', variant: 'outline' as const, className: 'text-yellow-700' },
      resolved: { label: 'Resolved', variant: 'default' as const, className: 'bg-emerald-100 text-emerald-700' },
      escalated: { label: 'Escalated', variant: 'destructive' as const, className: '' },
    }
    const config = variants[status]
    return <Badge variant={config.variant} className={config.className || ''}>{config.label}</Badge>
  }

  const handleCustomerSearch = () => {
    if (customerSearchQuery.trim()) {
      setShowCustomerResults(true)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Headphones className="w-8 h-8 text-cyan-600" />
            Support Workspace
          </h1>
          <p className="text-muted-foreground mt-1">Welcome back, {userName}</p>
        </div>
        <Button className="gap-2 bg-cyan-600 hover:bg-cyan-700">
          <MessageSquare className="w-4 h-4" />
          New Ticket
        </Button>
      </div>

      {/* Support Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SUPPORT_METRICS.map((metric) => (
          <Card key={metric.label} className="bg-gradient-to-br from-slate-50 to-white border-slate-100">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                {metric.icon}
                <span className={`text-xs font-medium flex items-center gap-1 ${
                  metric.change > 0 ? 'text-emerald-600' : metric.change < 0 ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {metric.change > 0 ? '+' : ''}{metric.change}
                  {metric.change > 0 ? '↑' : metric.change < 0 ? '↓' : ''}
                </span>
              </div>
              <p className="text-2xl font-bold">{metric.value}{metric.label.includes('Time') ? 'min' : metric.label.includes('Satisfaction') ? '%' : ''}</p>
              <p className="text-sm text-muted-foreground">{metric.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Customer Search */}
      <Card className="border-cyan-200 bg-gradient-to-r from-cyan-50 to-white">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or customer ID..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomerSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleCustomerSearch} className="gap-2 bg-cyan-600 hover:bg-cyan-700">
              <User className="w-4 h-4" />
              Find Customer
            </Button>
          </div>

          {showCustomerResults && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Search Results</p>
              {CUSTOMER_SEARCH_RESULTS.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between p-3 bg-white rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white font-medium">
                      {customer.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                      {customer.activeLoans} Active Loan{customer.activeLoans !== 1 ? 's' : ''}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">KSh {customer.currentBalance.toLocaleString()} due</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={activeTab === 'tickets' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('tickets')}
            className="gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            My Tickets
            <Badge variant="secondary" className="ml-1">
              {SUPPORT_TICKETS.filter(t => t.status !== 'resolved').length}
            </Badge>
          </Button>
          <Button 
            variant={activeTab === 'faq' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('faq')}
            className="gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Knowledge Base
          </Button>
          <Button 
            variant={activeTab === 'templates' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('templates')}
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            Response Templates
          </Button>
        </div>

        {/* Tickets Content */}
        {activeTab === 'tickets' && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Support Tickets</CardTitle>
                  <CardDescription>Manage customer inquiries and issues</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[130px]">
                      <Filter className="w-3 h-3 mr-1" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="pending_customer">Pending</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
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
                      <TableHead>ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SUPPORT_TICKETS.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-sm">{ticket.id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{ticket.customerName}</p>
                            <p className="text-xs text-muted-foreground">{ticket.customerId}</p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{ticket.subject}</TableCell>
                        <TableCell>{getCategoryBadge(ticket.category)}</TableCell>
                        <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                        <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                        <TableCell className="text-muted-foreground">{ticket.createdAt}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedTicket(ticket)
                              setTicketDialogOpen(true)
                            }}
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* FAQ Content */}
        {activeTab === 'faq' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-cyan-600" />
                  Frequently Asked Questions
                </CardTitle>
                <CardDescription>Most common customer questions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {FAQ_ITEMS.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{item.question}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{item.category}</Badge>
                        <span className="text-xs text-muted-foreground">{item.usageCount} uses</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-50 to-white border-cyan-100">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                  <Phone className="w-5 h-5 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">Initiate Call</p>
                    <p className="text-xs text-muted-foreground">Call customer directly</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <p className="font-medium">Send Email</p>
                    <p className="text-xs text-muted-foreground">Email response template</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  <div className="text-left">
                    <p className="font-medium">SMS Response</p>
                    <p className="text-xs text-muted-foreground">Quick SMS reply</p>
                  </div>
                </Button>

                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <div className="text-left">
                    <p className="font-medium">Escalate Issue</p>
                    <p className="text-xs text-muted-foreground">Forward to specialist</p>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Templates Content */}
        {activeTab === 'templates' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Response Templates
              </CardTitle>
              <CardDescription>Pre-written responses for common issues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: 'Loan Application Status', category: 'Loan', preview: 'Thank you for your inquiry about your loan application...' },
                  { title: 'Repayment Confirmation', category: 'Payments', preview: 'We confirm that your payment of KSh ... has been received...' },
                  { title: 'Account Update Request', category: 'Account', preview: 'To update your account information, please provide...' },
                  { title: 'Technical Issue Acknowledgment', category: 'Technical', preview: 'We apologize for the technical difficulty you are experiencing...' },
                  { title: 'Complaint Response', category: 'Complaints', preview: 'We take your complaint seriously and are investigating...' },
                  { title: 'General Greeting', category: 'General', preview: 'Hello! Thank you for contacting Abepot Credit support...' },
                ].map((template, index) => (
                  <div key={index} className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{template.title}</h4>
                      <Badge variant="outline">{template.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{template.preview}</p>
                    <Button size="sm" variant="ghost" className="mt-2 gap-1">
                      Use Template
                      <ArrowUpRight className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-600" />
              Ticket Details
            </DialogTitle>
            <DialogDescription>
              {selectedTicket && `${selectedTicket.id} - ${selectedTicket.subject}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTicket && (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 py-4">
                {/* Ticket Meta */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-medium text-sm">{selectedTicket.customerName}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Priority</p>
                    {getPriorityBadge(selectedTicket.priority)}
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Status</p>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="font-medium text-sm">{selectedTicket.createdAt}</p>
                  </div>
                </div>

                <Separator />

                {/* Conversation Thread */}
                <div>
                  <p className="text-sm font-medium mb-3">Conversation Thread</p>
                  <div className="space-y-4">
                    {/* Customer Message */}
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{selectedTicket.customerName}</span>
                          <span className="text-xs text-muted-foreground">{selectedTicket.createdAt}</span>
                        </div>
                        <p className="text-sm">
                          Hi, I need help with {selectedTicket.subject.toLowerCase()}. I've been trying to resolve this issue but nothing seems to work. Can you please assist me?
                        </p>
                      </div>
                    </div>

                    {/* System Note */}
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">System</span>
                          <span className="text-xs text-muted-foreground">{selectedTicket.lastUpdate}</span>
                        </div>
                        <p className="text-sm text-blue-800">
                          Ticket automatically categorized as "{selectedTicket.category.replace('_', ' ')}" with {selectedTicket.priority} priority.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Reply Section */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Your Response</label>
                  <Textarea
                    placeholder="Type your response..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                    className="mb-2"
                  />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-1">
                        <FileText className="w-3 h-3" />
                        Use Template
                      </Button>
                      <Select>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue placeholder="Update Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="pending_customer">Pending Customer</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="escalated">Escalate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-1">
                        <Mail className="w-3 h-3" />
                        Email Only
                      </Button>
                      <Button size="sm" className="gap-1 bg-cyan-600 hover:bg-cyan-700">
                        <Send className="w-3 h-3" />
                        Send Reply
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTicketDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
