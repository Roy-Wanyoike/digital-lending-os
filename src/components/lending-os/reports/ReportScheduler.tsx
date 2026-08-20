'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  Clock,
  Plus,
  Pause,
  Play,
  Trash2,
  Edit,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Mail,
  FileText,
  RefreshCw,
  Filter,
  Search,
  Settings,
  Bell,
  Users
} from 'lucide-react'

// Types
interface ReportSchedulerProps {
  onClose?: () => void
}

interface Schedule {
  id: string
  name: string
  reportType: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  deliveryTime: string
  format: 'pdf' | 'excel' | 'csv'
  recipients: string[]
  nextRun: Date
  lastRun?: Date
  lastSent?: Date
  status: 'active' | 'paused' | 'error'
  filters?: Record<string, any>
}

interface DeliveryLog {
  id: string
  scheduleId: string
  scheduleName: string
  sentAt: Date
  recipients: number
  status: 'delivered' | 'failed' | 'bounced'
  error?: string
  size?: string
}

// Mock Data
const schedules: Schedule[] = [
  {
    id: '1',
    name: 'Daily Disbursement Summary',
    reportType: 'Disbursement Analytics',
    frequency: 'daily',
    deliveryTime: '07:00',
    format: 'pdf',
    recipients: ['ops@company.com', 'finance@company.com'],
    nextRun: new Date(Date.now() + 8 * 3600000),
    lastRun: new Date(Date.now() - 16 * 3600000),
    lastSent: new Date(Date.now() - 16 * 3600000),
    status: 'active'
  },
  {
    id: '2',
    name: 'Weekly Portfolio Report',
    reportType: 'Portfolio Quality',
    frequency: 'weekly',
    deliveryTime: '08:00',
    format: 'excel',
    recipients: ['management@company.com', 'risk@company.com'],
    nextRun: new Date(Date.now() + 2 * 24 * 3600000),
    lastRun: new Date(Date.now() - 5 * 24 * 3600000),
    lastSent: new Date(Date.now() - 5 * 24 * 3600000),
    status: 'active'
  },
  {
    id: '3',
    name: 'Monthly PAR Analysis',
    reportType: 'Portfolio Quality',
    frequency: 'monthly',
    deliveryTime: '09:00',
    format: 'pdf',
    recipients: ['cfo@company.com', 'board@company.com'],
    nextRun: new Date(Date.now() + 15 * 24 * 3600000),
    lastRun: new Date(Date.now() - 15 * 24 * 3600000),
    lastSent: new Date(Date.now() - 15 * 24 * 3600000),
    status: 'active'
  },
  {
    id: '4',
    name: 'CBK Monthly Returns',
    reportType: 'Regulatory (CBK)',
    frequency: 'monthly',
    deliveryTime: '10:00',
    format: 'excel',
    recipients: ['compliance@company.com', 'cfo@company.com'],
    nextRun: new Date(Date.now() + 18 * 24 * 3600000),
    lastRun: new Date(Date.now() - 12 * 24 * 3600000),
    lastSent: new Date(Date.now() - 12 * 24 * 3600000),
    status: 'active'
  },
  {
    id: '5',
    name: 'Customer Segmentation Overview',
    reportType: 'Customer Analytics',
    frequency: 'weekly',
    deliveryTime: '14:00',
    format: 'pdf',
    recipients: ['marketing@company.com', 'product@company.com'],
    nextRun: new Date(Date.now() + 3 * 24 * 3600000),
    lastRun: new Date(Date.now() - 4 * 24 * 3600000),
    status: 'paused'
  },
  {
    id: '6',
    name: 'Financial Performance Summary',
    reportType: 'Financial Performance',
    frequency: 'weekly',
    deliveryTime: '08:30',
    format: 'pdf',
    recipients: ['finance@company.com', 'ceo@company.com'],
    nextRun: new Date(Date.now() + 2 * 24 * 3600000),
    lastRun: new Date(Date.now() - 5 * 24 * 3600000),
    status: 'error'
  },
  {
    id: '7',
    name: 'Operational Metrics Dashboard',
    reportType: 'Operations',
    frequency: 'daily',
    deliveryTime: '18:00',
    format: 'pdf',
    recipients: ['ops@company.com'],
    nextRun: new Date(Date.now() + 6 * 3600000),
    lastRun: new Date(Date.now() - 18 * 3600000),
    status: 'active'
  },
  {
    id: '8',
    name: 'Quarterly Business Review',
    reportType: 'Executive Summary',
    frequency: 'quarterly',
    deliveryTime: '09:00',
    format: 'pdf',
    recipients: ['executive@company.com', 'board@company.com'],
    nextRun: new Date(Date.now() + 45 * 24 * 3600000),
    lastRun: new Date(Date.now() - 45 * 24 * 3600000),
    status: 'active'
  }
]

const deliveryLogs: DeliveryLog[] = [
  {
    id: '1',
    scheduleId: '1',
    scheduleName: 'Daily Disbursement Summary',
    sentAt: new Date(Date.now() - 16 * 3600000),
    recipients: 2,
    status: 'delivered',
    size: '1.2 MB'
  },
  {
    id: '2',
    scheduleId: '7',
    scheduleName: 'Operational Metrics Dashboard',
    sentAt: new Date(Date.now() - 18 * 3600000),
    recipients: 1,
    status: 'delivered',
    size: '856 KB'
  },
  {
    id: '3',
    scheduleId: '2',
    scheduleName: 'Weekly Portfolio Report',
    sentAt: new Date(Date.now() - 5 * 24 * 3600000),
    recipients: 2,
    status: 'delivered',
    size: '2.4 MB'
  },
  {
    id: '4',
    scheduleId: '6',
    scheduleName: 'Financial Performance Summary',
    sentAt: new Date(Date.now() - 5 * 24 * 3600000),
    recipients: 2,
    status: 'failed',
    error: 'Connection timeout to data source'
  },
  {
    id: '5',
    scheduleId: '3',
    scheduleName: 'Monthly PAR Analysis',
    sentAt: new Date(Date.now() - 15 * 24 * 3600000),
    recipients: 2,
    status: 'delivered',
    size: '3.8 MB'
  },
  {
    id: '6',
    scheduleId: '5',
    scheduleName: 'Customer Segmentation Overview',
    sentAt: new Date(Date.now() - 11 * 24 * 3600000),
    recipients: 2,
    status: 'bounced',
    error: 'Invalid email address: marketing@compny.com'
  }
]

const reportTypes = [
  'Portfolio Quality',
  'Disbursement Analytics',
  'Customer Analytics',
  'Financial Performance',
  'Operations Metrics',
  'Regulatory (CBK)',
  'Executive Summary',
  'Custom Report'
]

export function ReportScheduler({ onClose }: ReportSchedulerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    reportType: '',
    frequency: 'weekly' as Schedule['frequency'],
    deliveryTime: '09:00',
    format: 'pdf' as Schedule['format'],
    recipients: ''
  })

  // Filter schedules
  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = schedule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         schedule.reportType.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || schedule.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const activeCount = schedules.filter(s => s.status === 'active').length
  const pausedCount = schedules.filter(s => s.status === 'paused').length
  const errorCount = schedules.filter(s => s.status === 'error').length

  const getStatusBadge = (status: Schedule['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="border-green-500 text-green-600"><Play className="w-3 h-3 mr-1" />Active</Badge>
      case 'paused':
        return <Badge variant="secondary"><Pause className="w-3 h-3 mr-1" />Paused</Badge>
      case 'error':
        return <Badge variant="outline" className="border-red-500 text-red-600"><AlertTriangle className="w-3 h-3 mr-1" />Error</Badge>
    }
  }

  const getDeliveryStatusBadge = (status: DeliveryLog['status']) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="outline" className="border-green-500 text-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Delivered</Badge>
      case 'failed':
        return <Badge variant="outline" className="border-red-500 text-red-600"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
      case 'bounced':
        return <Badge variant="outline" className="border-amber-500 text-amber-600"><AlertTriangle className="w-3 h-3 mr-1" />Bounced</Badge>
    }
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const handleCreateSchedule = () => {
    // In real app, this would call an API
    console.log('Creating schedule:', newSchedule)
    setShowCreateDialog(false)
    setNewSchedule({
      name: '',
      reportType: '',
      frequency: 'weekly',
      deliveryTime: '09:00',
      format: 'pdf',
      recipients: ''
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Scheduled Reports Management
          </h3>
          <p className="text-sm text-slate-500 mt-1">Automate report generation and delivery</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          New Schedule
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
              <Play className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">Active Schedules</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{activeCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700">
              <Pause className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Paused</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{pausedCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">With Errors</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">{errorCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="schedules">
        <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-800 p-1">
          <TabsTrigger value="schedules">Active Schedules ({filteredSchedules.length})</TabsTrigger>
          <TabsTrigger value="history">Delivery History ({deliveryLogs.length})</TabsTrigger>
        </TabsList>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="mt-4 space-y-4">
          {/* Search and Filter */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search schedules..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Schedules Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Delivery Time</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Next Run</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">{schedule.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{schedule.reportType}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{schedule.frequency}</TableCell>
                        <TableCell className="font-mono">{schedule.deliveryTime}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs uppercase">
                            {schedule.format}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{schedule.recipients.length}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={schedule.nextRun.getTime() < Date.now() + 24 * 60 * 60 * 1000 ? 'text-red-600 font-medium' : ''}>
                            {formatDate(schedule.nextRun)}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedSchedule(schedule)
                                setShowEditDialog(true)
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                            >
                              {schedule.status === 'active' ? (
                                <Pause className="w-4 h-4 text-amber-600" />
                              ) : (
                                <Play className="w-4 h-4 text-green-600" />
                              )}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Error Details</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveryLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.scheduleName}</TableCell>
                        <TableCell>{formatDate(log.sentAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            {log.recipients}
                          </div>
                        </TableCell>
                        <TableCell>{getDeliveryStatusBadge(log.status)}</TableCell>
                        <TableCell className="font-mono text-sm">{log.size || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-red-600">
                          {log.error || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <FileText className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Schedule Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Schedule</DialogTitle>
            <DialogDescription>
              Set up automated report generation and email delivery
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Schedule Name *</label>
              <Input 
                placeholder="e.g., Weekly Portfolio Report"
                value={newSchedule.name}
                onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type *</label>
              <Select 
                value={newSchedule.reportType} 
                onValueChange={(value) => setNewSchedule({ ...newSchedule, reportType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Frequency *</label>
                <Select 
                  value={newSchedule.frequency} 
                  onValueChange={(value) => setNewSchedule({ ...newSchedule, frequency: value as Schedule['frequency'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Delivery Time *</label>
                <Input 
                  type="time"
                  value={newSchedule.deliveryTime}
                  onChange={(e) => setNewSchedule({ ...newSchedule, deliveryTime: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Format *</label>
                <Select 
                  value={newSchedule.format} 
                  onValueChange={(value) => setNewSchedule({ ...newSchedule, format: value as Schedule['format'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Recipients *</label>
                <Input 
                  placeholder="email@example.com"
                  value={newSchedule.recipients}
                  onChange={(e) => setNewSchedule({ ...newSchedule, recipients: e.target.value })}
                />
                <p className="text-xs text-slate-500">Separate multiple emails with comma</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateSchedule}
              disabled={!newSchedule.name || !newSchedule.reportType || !newSchedule.recipients}
            >
              <Clock className="w-4 h-4 mr-2" />
              Create Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>
              Modify settings for: {selectedSchedule?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSchedule && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Schedule Name</label>
                <Input defaultValue={selectedSchedule.name} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Frequency</label>
                  <Select defaultValue={selectedSchedule.frequency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Delivery Time</label>
                  <Input type="time" defaultValue={selectedSchedule.deliveryTime} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Recipients</label>
                <Input defaultValue={selectedSchedule.recipients.join(', ')} />
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded">
                <Settings className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-600">Advanced options: Filters, Custom parameters</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowEditDialog(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ReportScheduler
