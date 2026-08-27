'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  MessageSquare,
  Send,
  Clock,
  Users,
  DollarSign,
  Calendar,
  Search,
  Filter,
  Plus,
  Trash2,
  Eye,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Info,
  Variable,
  FileText,
  Save,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

// SMS Campaign Types
export type RecipientType = 
  | 'all_overdue' 
  | 'by_bucket' 
  | 'manual' 
  | 'saved_segment'

export type ScheduleType = 'now' | 'scheduled'

// SMS Template Variable
export interface TemplateVariable {
  key: string
  label: string
  description: string
  example: string
}

// Available template variables
const templateVariables: TemplateVariable[] = [
  { key: '{name}', label: 'Customer Name', description: "Customer's full name", example: 'John Kamau Mwangi' },
  { key: '{amount}', label: 'Outstanding Amount', description: 'Total amount due', example: 'KSh 42,000' },
  { key: '{days_overdue}', label: 'Days Overdue', description: 'Number of days past due date', example: '12' },
  { key: '{due_date}', label: 'Due Date', description: 'Next payment due date', example: '15 Feb 2026' },
  { key: '{loan_number}', label: 'Loan Number', description: 'Customer loan reference number', example: 'LN-2026-000042' },
  { key: '{company}', label: 'Company Name', description: 'Your company name', example: 'Abepot Credit Ltd' }
]

// Saved segments mock data
const savedSegments = [
  { id: 'seg-1', name: 'High Risk (>60 days)', count: 42, criteria: 'days_overdue > 60' },
  { id: 'seg-2', name: 'First Time Defaulters', count: 28, criteria: 'first_default AND days_overdue > 30' },
  { id: 'seg-3', name: 'Small Balance (<KSh 20k)', count: 65, criteria: 'balance < 20000' }
]

// Message templates
const messageTemplates = [
  {
    id: 'tpl-1',
    name: 'Payment Reminder',
    content: 'Dear {name}, your loan {loan_number} has an outstanding balance of KSh {amount}. This is now {days_overdue} days overdue. Please pay by {due_date} to avoid additional charges. Contact us for assistance.'
  },
  {
    id: 'tpl-2',
    name: 'Urgent Notice',
    name: 'Urgent - Final Notice',
    content: 'URGENT: Dear {name}, your account is {days_overdue} days overdue with balance KSh {amount}. Immediate payment required to avoid being listed with CRBs. Pay via M-Pesa to XXXXXX. Call us on 07XX XXX XXX.'
  },
  {
    id: 'tpl-3',
    name: 'Friendly Reminder',
    content: 'Hi {name}, just a friendly reminder about your loan balance of KSh {amount}. Your next payment was due on {due_date}. We understand things happen - reach out if you need help arranging a payment plan!'
  },
  {
    id: 'tpl-4',
    name: 'Promise Follow-up',
    content: 'Dear {name}, following up on your promise to pay KSh {amount} by today. If you have already paid, please ignore this message. Otherwise, kindly make payment or contact us to update your promise. Thank you!'
  }
]

// Mock recipients for preview
const mockRecipients = [
  { id: '1', name: 'John Kamau Mwangi', phone: '+254712345678', amount: 42000, daysOverdue: 12, dueDate: '15 Feb 2026', loanNumber: 'LN-2026-000042' },
  { id: '2', name: 'Faith Achieng Oloo', phone: '+254723456789', amount: 68500, daysOverdue: 45, dueDate: '10 Jan 2026', loanNumber: 'LN-2025-000089' },
  { id: '3', name: 'Peter Njoroge Kimani', phone: '+254734567890', amount: 28000, daysOverdue: 78, dueDate: '20 Dec 2025', loanNumber: 'LN-2025-000078' },
  { id: '4', name: 'Mary Wanjiru Ndungu', phone: '+254745678901', amount: 95000, daysOverdue: 95, dueDate: '05 Nov 2025', loanNumber: 'LN-2025-000067' },
  { id: '5', name: 'Daniel Otieno Awuor', phone: '+254756789012', amount: 18000, daysOverdue: 5, dueDate: '28 Jan 2026', loanNumber: 'LN-2026-000015' }
]

interface SMSCampaignBuilderProps {
  onCampaignCreated?: (campaign: SMSCampaignData) => void
}

export interface SMSCampaignData {
  name: string
  recipientType: RecipientType
  selectedBucket?: string
  selectedSegment?: string
  manualRecipients: string[]
  message: string
  scheduleType: ScheduleType
  scheduledAt?: string
  estimatedCost: number
  recipientCount: number
}

// SMS Cost per message (Kenyan market rate)
const SMS_COST_PER_MESSAGE = 1.2 // KSh

export function SMSCampaignBuilder({ onCampaignCreated }: SMSCampaignBuilderProps) {
  const [activeTab, setActiveTab] = useState('compose')
  
  // Campaign details
  const [campaignName, setCampaignName] = useState('')
  const [recipientType, setRecipientType] = useState<RecipientType>('all_overdue')
  const [selectedBucket, setSelectedBucket] = useState<string>('31-60')
  const [selectedSegment, setSelectedSegment] = useState<string>('')
  const [manualRecipients, setManualRecipients] = useState<string[]>([])
  const [newManualPhone, setNewManualPhone] = useState('')
  
  // Message
  const [message, setMessage] = useState(messageTemplates[0].content)
  const [selectedTemplate, setSelectedTemplate] = useState('tpl-1')
  
  // Scheduling
  const [scheduleType, setScheduleType] = useState<ScheduleType>('now')
  const [scheduledDateTime, setScheduledDateTime] = useState('')
  
  // UI state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [searchRecipients, setSearchRecipients] = useState('')

  // Calculate estimated cost and recipient count
  const campaignStats = useMemo(() => {
    let recipientCount = 0
    
    switch (recipientType) {
      case 'all_overdue':
        recipientCount = 183 // Total overdue loans
        break
      case 'by_bucket':
        const bucketCounts: Record<string, number> = {
          '1-30': 123,
          '31-60': 45,
          '61-90': 28,
          '91-120': 18,
          '120+': 14
        }
        recipientCount = bucketCounts[selectedBucket] || 45
        break
      case 'manual':
        recipientCount = manualRecipients.length
        break
      case 'saved_segment':
        const segment = savedSegments.find(s => s.id === selectedSegment)
        recipientCount = segment?.count || 0
        break
    }

    const messageCount = Math.ceil(message.length / 160) || 1
    const estimatedCost = recipientCount * messageCount * SMS_COST_PER_MESSAGE

    return {
      recipientCount,
      messageLength: message.length,
      messageCount,
      estimatedCost
    }
  }, [recipientType, selectedBucket, manualRecipients.length, selectedSegment, message])

  // Personalize message for preview
  const personalizeMessage = useCallback((msg: string, recipient: typeof mockRecipients[0]) => {
    return msg
      .replace(/{name}/g, recipient.name)
      .replace(/{amount}/g, `KSh ${recipient.amount.toLocaleString()}`)
      .replace(/{days_overdue}/g, String(recipient.daysOverdue))
      .replace(/{due_date}/g, recipient.dueDate)
      .replace(/{loan_number}/g, recipient.loanNumber)
      .replace(/{company}/g, 'Abepot Credit Ltd')
  }, [])

  // Preview recipients
  const previewRecipients = useMemo(() => {
    let recipients = [...mockRecipients]
    
    if (searchRecipients) {
      const query = searchRecipients.toLowerCase()
      recipients = recipients.filter(r => 
        r.name.toLowerCase().includes(query) || r.phone.includes(query)
      )
    }
    
    return recipients.slice(0, 5).map(r => ({
      ...r,
      personalizedMessage: personalizeMessage(message, r)
    }))
  }, [message, searchRecipients, personalizeMessage])

  // Add variable to message at cursor position
  const insertVariable = (variable: string) => {
    // In a real app, we'd use a ref to get cursor position
    setMessage(prev => prev + variable)
  }

  // Add manual recipient
  const addManualRecipient = () => {
    if (!newManualPhone.trim()) return
    
    // Basic phone validation (Kenyan format)
    const phoneRegex = /^(\+254|0)?[7]\d{8}$/
    const cleanPhone = newManualPhone.replace(/\s/g, '')
    
    if (!phoneRegex.test(cleanPhone.replace('+', ''))) {
      toast.error('Invalid phone number format. Use +2547XXXXXXXX or 07XXXXXXXX')
      return
    }
    
    if (manualRecipients.includes(cleanPhone)) {
      toast.error('Phone number already added')
      return
    }
    
    setManualRecipients(prev => [...prev, cleanPhone])
    setNewManualPhone('')
    toast.success('Recipient added')
  }

  // Remove manual recipient
  const removeManualRecipient = (phone: string) => {
    setManualRecipients(prev => prev.filter(p => p !== phone))
  }

  // Load template
  const loadTemplate = (templateId: string) => {
    const template = messageTemplates.find(t => t.id === templateId)
    if (template) {
      setMessage(template.content)
      setSelectedTemplate(templateId)
    }
  }

  // Handle send/schedule campaign
  const handleSendCampaign = async () => {
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name')
      return
    }
    
    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }
    
    if (campaignStats.recipientCount === 0) {
      toast.error('No recipients selected')
      return
    }

    setIsConfirmDialogOpen(true)
  }

  // Confirm and execute campaign
  const confirmCampaign = async () => {
    setIsSending(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const campaignData: SMSCampaignData = {
        name: campaignName,
        recipientType,
        selectedBucket: recipientType === 'by_bucket' ? selectedBucket : undefined,
        selectedSegment: recipientType === 'saved_segment' ? selectedSegment : undefined,
        manualRecipients,
        message,
        scheduleType,
        scheduledAt: scheduleType === 'scheduled' ? scheduledDateTime : undefined,
        estimatedCost: campaignStats.estimatedCost,
        recipientCount: campaignStats.recipientCount
      }

      onCampaignCreated?.(campaignData)

      toast.success(
        scheduleType === 'now' 
          ? `Campaign "${campaignName}" sent successfully!` 
          : `Campaign "${campaignName}" scheduled successfully!`,
        {
          description: `${campaignStats.recipientCount} messages • Est. cost: KSh ${campaignStats.estimatedCost.toLocaleString()}`
        }
      )

      // Reset form
      setCampaignName('')
      setMessage(messageTemplates[0].content)
      setManualRecipients([])
      setIsConfirmDialogOpen(false)
      
    } catch (error) {
      toast.error('Failed to create campaign')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-green-600" />
          SMS Campaign Builder
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Create and send bulk SMS campaigns to overdue customers
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 dark:bg-slate-800 w-full sm:w-auto">
          <TabsTrigger value="compose" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <FileText className="w-4 h-4 mr-2" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="recipients" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <Users className="w-4 h-4 mr-2" />
            Recipients ({campaignStats.recipientCount})
          </TabsTrigger>
          <TabsTrigger value="preview" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* COMPOSE TAB */}
        <TabsContent value="compose" className="mt-4 space-y-4">
          {/* Campaign Name */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <Label>Campaign Name *</Label>
                <Input
                  placeholder="e.g., January Payment Reminder"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="dark:border-slate-700"
                />
              </div>
            </CardContent>
          </Card>

          {/* Message Template */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Message Content
              </CardTitle>
              <CardDescription>
                Write your message or use a template. Available variables will be replaced for each recipient.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template Selection */}
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-slate-500 self-center">Templates:</span>
                {messageTemplates.map(tpl => (
                  <Button
                    key={tpl.id}
                    variant={selectedTemplate === tpl.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => loadTemplate(tpl.id)}
                    className={cn(
                      "text-xs",
                      selectedTemplate !== tpl.id && "dark:border-slate-700"
                    )}
                  >
                    {tpl.name}
                  </Button>
                ))}
              </div>

              {/* Message Editor */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Message *</Label>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{message.length} characters</span>
                    <span>•</span>
                    <span className={cn(
                      Math.ceil(message.length / 160) > 1 ? "text-amber-600" : "text-emerald-600"
                    )}>
                      {Math.ceil(message.length / 160)} SMS(s)
                    </span>
                  </div>
                </div>
                
                <Textarea
                  placeholder="Enter your message here... Use {name}, {amount}, etc. for personalization."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="dark:border-slate-700 resize-none"
                />

                {/* Character limit warning */}
                {message.length > 800 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Long messages may be split into multiple SMS
                  </p>
                )}
              </div>

              {/* Variables Reference */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                  <Variable className="w-4 h-4" />
                  Available Variables
                </p>
                <div className="flex flex-wrap gap-2">
                  {templateVariables.map(variable => (
                    <button
                      key={variable.key}
                      onClick={() => insertVariable(variable.key)}
                      className="px-2 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:border-emerald-300 transition-colors"
                      title={variable.description}
                    >
                      <code className="text-emerald-600 dark:text-emerald-400">{variable.key}</code>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>When to Send</Label>
                  <div className="flex gap-3">
                    <label className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all",
                      scheduleType === 'now' 
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" 
                        : "border-slate-200 dark:border-slate-700"
                    )}>
                      <input
                        type="radio"
                        checked={scheduleType === 'now'}
                        onChange={() => setScheduleType('now')}
                        className="sr-only"
                      />
                      <Send className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium text-sm">Send Now</span>
                    </label>
                    
                    <label className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all",
                      scheduleType === 'scheduled' 
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" 
                        : "border-slate-200 dark:border-slate-700"
                    )}>
                      <input
                        type="radio"
                        checked={scheduleType === 'scheduled'}
                        onChange={() => setScheduleType('scheduled')}
                        className="sr-only"
                      />
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-sm">Schedule</span>
                    </label>
                  </div>
                </div>

                {scheduleType === 'scheduled' && (
                  <div className="space-y-2">
                    <Label>Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={scheduledDateTime}
                      onChange={(e) => setScheduledDateTime(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="dark:border-slate-700"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSendCampaign}
              size="lg"
              className="bg-green-600 hover:bg-green-700 px-8"
            >
              <Send className="w-4 h-4 mr-2" />
              {scheduleType === 'now' ? 'Send Campaign Now' : 'Schedule Campaign'}
            </Button>
          </div>
        </TabsContent>

        {/* RECIPIENTS TAB */}
        <TabsContent value="recipients" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Recipients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recipient Type Selection */}
              <div className="space-y-3">
                <Label>Who should receive this message?</Label>
                
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'all_overdue' as RecipientType, label: 'All Overdue Customers', desc: `${183} customers`, icon: Users },
                    { value: 'by_bucket' as RecipientType, label: 'By PAR Bucket', desc: 'Filter by aging bucket', icon: Filter },
                    { value: 'saved_segment' as RecipientType, label: 'Saved Segment', desc: 'Use predefined segment', icon: Save },
                    { value: 'manual' as RecipientType, label: 'Manual Selection', desc: 'Add phone numbers', icon: Plus }
                  ].map(option => {
                    const Icon = option.icon
                    return (
                      <button
                        key={option.value}
                        onClick={() => setRecipientType(option.value)}
                        className={cn(
                          "p-4 rounded-lg border-2 text-left transition-all",
                          recipientType === option.value
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        )}
                      >
                        <Icon className={cn(
                          "w-5 h-5 mb-2",
                          recipientType === option.value ? "text-emerald-600" : "text-slate-400"
                        )} />
                        <p className={cn(
                          "font-medium text-sm",
                          recipientType === option.value ? "text-emerald-700 dark:text-emerald-400" : ""
                        )}>{option.label}</p>
                        <p className="text-xs text-slate-500">{option.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Bucket Selection */}
              {recipientType === 'by_bucket' && (
                <div className="space-y-2">
                  <Label>Select PAR Bucket</Label>
                  <Select value={selectedBucket} onValueChange={setSelectedBucket}>
                    <SelectTrigger className="dark:border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-30">1-30 Days Overdue (123 customers)</SelectItem>
                      <SelectItem value="31-60">31-60 Days Overdue (45 customers)</SelectItem>
                      <SelectItem value="61-90">61-90 Days Overdue (28 customers)</SelectItem>
                      <SelectItem value="91-120">91-120 Days Overdue (18 customers)</SelectItem>
                      <SelectItem value="120+">120+ Days Overdue (14 customers)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Saved Segment Selection */}
              {recipientType === 'saved_segment' && (
                <div className="space-y-2">
                  <Label>Select Segment</Label>
                  <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                    <SelectTrigger className="dark:border-slate-700">
                      <SelectValue placeholder="Choose a segment..." />
                    </SelectTrigger>
                    <SelectContent>
                      {savedSegments.map(segment => (
                        <SelectItem key={segment.id} value={segment.id}>
                          {segment.name} ({segment.count} contacts)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs text-slate-500">
                      <Info className="w-3 h-3 inline mr-1" />
                      Segments are updated in real-time based on current portfolio status.
                    </p>
                  </div>
                </div>
              )}

              {/* Manual Entry */}
              {recipientType === 'manual' && (
                <div className="space-y-3">
                  <Label>Add Phone Numbers</Label>
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="+2547XXXXXXXX or 07XXXXXXXX"
                      value={newManualPhone}
                      onChange={(e) => setNewManualPhone(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addManualRecipient()}
                      className="dark:border-slate-700"
                    />
                    <Button onClick={addManualRecipient} variant="outline" className="dark:border-slate-700">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {manualRecipients.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{manualRecipients.length} recipient(s) added:</p>
                      <div className="flex flex-wrap gap-2">
                        {manualRecipients.map((phone, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="py-1.5 pr-1 gap-1"
                          >
                            {phone}
                            <button
                              onClick={() => removeManualRecipient(phone)}
                              className="ml-1 p-0.5 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-slate-500">
                    Enter Kenyan phone numbers in format +2547XXXXXXXX or 07XXXXXXXX
                  </p>
                </div>
              )}

              {/* Summary */}
              <Separator />
              
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="font-semibold text-lg">{campaignStats.recipientCount}</p>
                    <p className="text-xs text-slate-500">Total Recipients</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-bold text-lg text-emerald-600">
                    KSh {campaignStats.estimatedCost.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">Estimated Cost</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PREVIEW TAB */}
        <TabsContent value="preview" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="w-5 h-5 text-purple-600" />
                    Message Preview
                  </CardTitle>
                  <CardDescription>
                    See how your message will appear to recipients
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Search className="w-4 h-4" />
                  <Input
                    placeholder="Search recipients..."
                    value={searchRecipients}
                    onChange={(e) => setSearchRecipients(e.target.value)}
                    className="w-[180px] h-8 text-xs dark:border-slate-700"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[450px] pr-4">
                <div className="space-y-4">
                  {previewRecipients.map((recipient) => (
                    <div
                      key={recipient.id}
                      className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3"
                    >
                      {/* Recipient Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-medium">
                            {recipient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium">{recipient.name}</p>
                            <p className="text-xs text-slate-500">{recipient.phone}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {recipient.daysOverdue} days overdue
                        </Badge>
                      </div>

                      {/* Message Bubble */}
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 ml-12">
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                          {recipient.personalizedMessage}
                        </p>
                      </div>

                      {/* Message Info */}
                      <div className="flex items-center gap-4 text-xs text-slate-500 ml-12">
                        <span>{recipient.personalizedMessage.length} chars</span>
                        <span>•</span>
                        <span>{Math.ceil(recipient.personalizedMessage.length / 160)} SMS(s)</span>
                        <span>•</span>
                        <span>KSh {(Math.ceil(recipient.personalizedMessage.length / 160) * SMS_COST_PER_MESSAGE).toFixed(1)}</span>
                      </div>
                    </div>
                  ))}

                  {campaignStats.recipientCount > 5 && (
                    <div className="text-center py-4 text-sm text-slate-500">
                      Showing 5 of {campaignStats.recipientCount} recipients...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm Send Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-green-600" />
              {scheduleType === 'now' ? 'Confirm Send' : 'Confirm Schedule'}
            </DialogTitle>
            <DialogDescription>
              Please review your campaign before confirming
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Summary */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Campaign Name</span>
                <span className="font-medium">{campaignName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Recipients</span>
                <span className="font-medium">{campaignStats.recipientCount} contacts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Messages</span>
                <span className="font-medium">{campaignStats.recipientCount * campaignStats.messageCount} SMS</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm font-medium">Estimated Cost</span>
                <span className="font-bold text-lg text-emerald-600">
                  KSh {campaignStats.estimatedCost.toLocaleString()}
                </span>
              </div>
              
              {scheduleType === 'scheduled' && scheduledDateTime && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Scheduled For</span>
                    <span className="font-medium text-blue-600">
                      {new Date(scheduledDateTime).toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                This action cannot be undone. Messages will be sent immediately upon confirmation.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmCampaign}
              disabled={isSending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {scheduleType === 'now' ? 'Send Now' : 'Schedule Campaign'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
