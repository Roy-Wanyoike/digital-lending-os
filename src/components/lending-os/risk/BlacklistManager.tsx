'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Ban,
  Plus,
  Search,
  Filter,
  Upload,
  Download,
  Eye,
  Unlock,
  FileText,
  AlertTriangle,
  UserX,
  Shield,
  Phone,
  CreditCard,
  Gavel,
  Users,
  Calendar,
  Clock,
  CheckCircle2
} from 'lucide-react'

// TypeScript interfaces
export interface BlacklistedEntity {
  id: string
  entityType: 'customer' | 'phone' | 'nationalId' | 'device'
  identifier: string // phone number, ID, device ID, etc.
  customerName?: string
  blacklistType: 'fraud_suspect' | 'identity_theft' | 'chronic_defaulter' | 'court_judgment' | 'suspicious_activity'
  reason: string
  evidence?: string
  addedBy: string
  addedDate: Date
  duration: 'permanent' | 'temporary'
  expiryDate?: Date
  status: 'active' | 'under_review' | 'expired' | 'removed'
  lastUpdated: Date
  updatedBy?: string
  notes?: string
}

// Mock blacklist data
const initialBlacklistData: BlacklistedEntity[] = [
  {
    id: 'BL-001',
    entityType: 'customer',
    identifier: '0712345678',
    customerName: 'Samuel Omondi Otieno',
    blacklistType: 'chronic_defaulter',
    reason: 'Multiple loan defaults across 5 DCPs. Total outstanding debt KSh 245,000 with no repayment for 180+ days.',
    evidence: 'CRB report dated 2026-01-10, Collection agency report',
    addedBy: 'Risk Manager - Jane Wanjiku',
    addedDate: new Date('2026-01-15'),
    duration: 'permanent',
    status: 'active',
    lastUpdated: new Date('2026-01-15'),
    notes: 'Flagged by automated monitoring system'
  },
  {
    id: 'BL-002',
    entityType: 'phone',
    identifier: '+254722987654',
    customerName: 'Unknown (Phone only)',
    blacklistType: 'fraud_suspect',
    reason: 'Detected using multiple identities to apply for loans. Linked to 3 different National IDs in our system.',
    evidence: 'Application logs, IP address correlation',
    addedBy: 'Fraud Analyst - Peter Kamau',
    addedDate: new Date('2026-01-12'),
    duration: 'permanent',
    status: 'active',
    lastUpdated: new Date('2026-01-14'),
    notes: 'Referred to DCI for investigation'
  },
  {
    id: 'BL-003',
    entityType: 'nationalId',
    identifier: '28456789',
    customerName: 'Faith Achieng Nyamongo',
    blacklistType: 'identity_theft',
    reason: 'Reported identity theft victim. Original owner filed complaint that someone is using their ID to obtain loans.',
    evidence: 'Police abstract OB No. 12345/2026, Victim affidavit',
    addedBy: 'Compliance Officer - Mary Muthoni',
    addedDate: new Date('2026-01-08'),
    duration: 'temporary',
    expiryDate: new Date('2026-07-08'),
    status: 'active',
    lastUpdated: new Date('2026-01-10'),
    notes: 'Pending police investigation outcome'
  },
  {
    id: 'BL-004',
    entityType: 'customer',
    identifier: '0734567890',
    customerName: 'James Mwangi Kariuki',
    blacklistType: 'court_judgment',
    reason: 'Civil court judgment for debt recovery. Case No. ELC 456/2025 Nairobi. Judgment amount KSh 150,000.',
    evidence: 'Court decree, Certificate of costs',
    addedBy: 'Legal Team - Advocate Ochieng',
    addedDate: new Date('2025-12-20'),
    duration: 'permanent',
    status: 'active',
    lastUpdated: new Date('2026-01-05'),
    notes: 'Judgment entered December 2025'
  },
  {
    id: 'BL-005',
    entityType: 'device',
    identifier: 'DEVICE-ABC123XYZ',
    customerName: 'Multiple Applicants',
    blacklistType: 'suspicious_activity',
    reason: 'Device associated with 15+ loan applications in 24 hours using different identities. High fraud probability.',
    evidence: 'Device fingerprint analysis, Application velocity report',
    addedBy: 'System (Automated)',
    addedDate: new Date('2026-01-18'),
    duration: 'temporary',
    expiryDate: new Date('2026-04-18'),
    status: 'under_review',
    lastUpdated: new Date('2026-01-18'),
    notes: 'Auto-flagged by fraud detection system'
  },
  {
    id: 'BL-006',
    entityType: 'phone',
    identifier: '+254744556677',
    customerName: 'Grace Wambui Njoroge',
    blacklistType: 'chronic_defaulter',
    reason: 'Pattern of defaulting on maturity date consistently across 7 loans from various lenders.',
    evidence: 'CRB full report, Payment history from CRB',
    addedBy: 'Credit Analyst - Daniel Kiprop',
    addedDate: new Date('2026-01-03'),
    duration: 'permanent',
    status: 'active',
    lastUpdated: new Date('2026-01-06'),
    notes: 'Known serial defaulter in DCP ecosystem'
  },
  {
    id: 'BL-007',
    entityType: 'customer',
    identifier: '0755677889',
    customerName: 'Peter Njoroge Kamau',
    blacklistType: 'fraud_suspect',
    reason: 'Submitted falsified payslip and employment letter. Employer confirmed applicant never worked there.',
    evidence: 'Employer verification email, Fake document comparison',
    addedBy: 'Verification Team - Lucy Akinyi',
    addedDate: new Date('2026-01-16'),
    duration: 'permanent',
    status: 'active',
    lastUpdated: new Date('2026-01-16'),
    notes: 'Employer reported to authorities'
  },
  {
    id: 'BL-008',
    entityType: 'nationalId',
    identifier: '15678901',
    customerName: 'Sarah Atieno Odhiambo',
    blacklistType: 'court_judgment',
    reason: 'Bankruptcy proceedings initiated. Insolvency notice published in Kenya Gazette Vol. CXXV-No. 234.',
    evidence: 'Kenya Gazette notice, Court filing documents',
    addedBy: 'Legal Team - Advocate Wanjiru',
    addedDate: new Date('2025-11-15'),
    duration: 'permanent',
    status: 'removed',
    lastUpdated: new Date('2026-01-10'),
    updatedBy: 'Chief Risk Officer',
    notes: 'Discharged from bankruptcy Jan 2026 - removed pending review'
  }
]

// Blacklist type configurations
const blacklistTypeConfig = {
  fraud_suspect: {
    label: 'Fraud Suspect',
    icon: <Shield className="w-4 h-4" />,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border-red-500',
    description: 'Suspected fraudulent activity or documentation'
  },
  identity_theft: {
    label: 'Identity Theft',
    icon: <UserX className="w-4 h-4" />,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400 border-purple-500',
    description: 'Stolen or impersonated identity'
  },
  chronic_defaulter: {
    label: 'Chronic Defaulter',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400 border-orange-500',
    description: 'Pattern of repeated loan defaults'
  },
  court_judgment: {
    label: 'Court Judgment',
    icon: <Gavel className="w-4 h-4" />,
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300 border-slate-500',
    description: 'Legal court order or judgment'
  },
  suspicious_activity: {
    label: 'Suspicious Activity',
    icon: <Ban className="w-4 h-4" />,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border-amber-500',
    description: 'Unusual patterns requiring investigation'
  }
}

// Entity type icons
const entityIcons = {
  customer: <Users className="w-4 h-4" />,
  phone: <Phone className="w-4 h-4" />,
  nationalId: <CreditCard className="w-4 h-4" />,
  device: <Shield className="w-4 h-4" />
}

export function BlacklistManager() {
  const [blacklistData] = useState<BlacklistedEntity[]>(initialBlacklistData)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterEntityType, setFilterEntityType] = useState<string>('all')
  
  // Add to blacklist dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newEntry, setNewEntry] = useState({
    entityType: 'phone' as BlacklistedEntity['entityType'],
    identifier: '',
    customerName: '',
    blacklistType: 'fraud_suspect' as BlacklistedEntity['blacklistType'],
    reason: '',
    duration: 'permanent' as 'permanent' | 'temporary',
    evidence: ''
  })

  // Selected entry for detail view
  const [selectedEntry, setSelectedEntry] = useState<BlacklistedEntity | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  // Filtered data
  const filteredData = useMemo(() => {
    return blacklistData.filter(entry => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          entry.identifier.toLowerCase().includes(query) ||
          (entry.customerName?.toLowerCase().includes(query)) ||
          entry.reason.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      // Type filter
      if (filterType !== 'all' && entry.blacklistType !== filterType) return false

      // Status filter
      if (filterStatus !== 'all' && entry.status !== filterStatus) return false

      // Entity type filter
      if (filterEntityType !== 'all' && entry.entityType !== filterEntityType) return false

      return true
    })
  }, [blacklistData, searchQuery, filterType, filterStatus, filterEntityType])

  // Stats
  const stats = useMemo(() => ({
    total: blacklistData.length,
    active: blacklistData.filter(e => e.status === 'active').length,
    underReview: blacklistData.filter(e => e.status === 'under_review').length,
    permanent: blacklistData.filter(e => e.duration === 'permanent').length,
    temporary: blacklistData.filter(e => e.duration === 'temporary').length
  }), [blacklistData])

  // Handle add to blacklist
  const handleAddToBlacklist = () => {
    // In a real app, this would call an API
    console.log('Adding to blacklist:', newEntry)
    setIsAddDialogOpen(false)
    setNewEntry({
      entityType: 'phone',
      identifier: '',
      customerName: '',
      blacklistType: 'fraud_suspect',
      reason: '',
      duration: 'permanent',
      evidence: ''
    })
  }

  // Format date
  const formatDate = (date: Date) => date.toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })

  // Get status badge
  const getStatusBadge = (status: BlacklistedEntity['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border-0">Active</Badge>
      case 'under_review':
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border-0">Under Review</Badge>
      case 'expired':
        return <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 border-0">Expired</Badge>
      case 'removed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 border-0">Removed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Ban className="w-7 h-7 text-emerald-600" />
            Blacklist Manager
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage blacklisted entities and prevent high-risk applications
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="dark:border-slate-700 dark:hover:bg-slate-800">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm" className="dark:border-slate-700 dark:hover:bg-slate-800">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
                <Plus className="w-4 h-4 mr-2" />
                Add to Blacklist
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] dark:bg-slate-900 dark:border-slate-700">
              <DialogHeader>
                <DialogTitle>Add Entity to Blacklist</DialogTitle>
                <DialogDescription>
                  Add a customer, phone number, ID, or device to the blacklist.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Entity Type *</Label>
                    <Select
                      value={newEntry.entityType}
                      onValueChange={(v) => setNewEntry(prev => ({ ...prev, entityType: v as any }))}
                    >
                      <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phone">Phone Number</SelectItem>
                        <SelectItem value="nationalId">National ID</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="device">Device ID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Identifier *</Label>
                    <Input
                      placeholder={newEntry.entityType === 'phone' ? '07XX XXX XXX' : 'Enter identifier'}
                      value={newEntry.identifier}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, identifier: e.target.value }))}
                      className="dark:bg-slate-800 dark:border-slate-600"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Customer Name (if known)</Label>
                  <Input
                    placeholder="Full name of person"
                    value={newEntry.customerName}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, customerName: e.target.value }))}
                    className="dark:bg-slate-800 dark:border-slate-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Blacklist Type *</Label>
                    <Select
                      value={newEntry.blacklistType}
                      onValueChange={(v) => setNewEntry(prev => ({ ...prev, blacklistType: v as any }))}
                    >
                      <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fraud_suspect">Fraud Suspect</SelectItem>
                        <SelectItem value="identity_theft">Identity Theft</SelectItem>
                        <SelectItem value="chronic_defaulter">Chronic Defaulter</SelectItem>
                        <SelectItem value="court_judgment">Court Judgment</SelectItem>
                        <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration *</Label>
                    <Select
                      value={newEntry.duration}
                      onValueChange={(v) => setNewEntry(prev => ({ ...prev, duration: v as any }))}
                    >
                      <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="permanent">Permanent</SelectItem>
                        <SelectItem value="temporary">Temporary (6 months)</SelectItem>
                        <SelectItem value="temporary">Temporary (1 year)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Reason *</Label>
                  <Textarea
                    placeholder="Detailed reason for blacklisting..."
                    rows={3}
                    value={newEntry.reason}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, reason: e.target.value }))}
                    className="dark:bg-slate-800 dark:border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Evidence / Supporting Documents</Label>
                  <div className="border-2 border-dashed dark:border-slate-600 rounded-lg p-4 text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Click to upload or drag and drop files here
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      PDF, Images, Documents (Max 10MB each)
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="dark:border-slate-600">
                  Cancel
                </Button>
                <Button onClick={handleAddToBlacklist} className="bg-red-600 hover:bg-red-700">
                  <Ban className="w-4 h-4 mr-2" />
                  Add to Blacklist
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Blacklisted</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
              <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Active</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Under Review</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.underReview}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
              <Gavel className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Permanent</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{stats.permanent}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Temporary</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.temporary}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, ID, phone, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 dark:bg-slate-800 dark:border-slate-600"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[160px] dark:bg-slate-800 dark:border-slate-600">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="fraud_suspect">Fraud Suspect</SelectItem>
                  <SelectItem value="identity_theft">Identity Theft</SelectItem>
                  <SelectItem value="chronic_defaulter">Chronic Defaulter</SelectItem>
                  <SelectItem value="court_judgment">Court Judgment</SelectItem>
                  <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-600">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="removed">Removed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterEntityType} onValueChange={setFilterEntityType}>
                <SelectTrigger className="w-[150px] dark:bg-slate-800 dark:border-slate-600">
                  <SelectValue placeholder="Entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="nationalId">National ID</SelectItem>
                  <SelectItem value="device">Device</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blacklist Table */}
      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Blacklisted Entities</CardTitle>
              <CardDescription>
                Showing {filteredData.length} of {stats.total} entries
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-slate-700 hover:dark:bg-slate-800/80">
                  <TableHead>Type</TableHead>
                  <TableHead>Identifier</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Reason Summary</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((entry) => (
                  <TableRow 
                    key={entry.id} 
                    className={`dark:border-slate-700 hover:dark:bg-slate-800/50 cursor-pointer ${entry.status === 'active' ? '' : 'opacity-70'}`}
                    onClick={() => {
                      setSelectedEntry(entry)
                      setIsDetailDialogOpen(true)
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        {entityIcons[entry.entityType]}
                        <span className="hidden sm:inline capitalize text-xs">
                          {entry.entityType.replace('_', ' ')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="font-mono text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                        {entry.identifier}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium max-w-[150px] truncate">
                      {entry.customerName || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`${blacklistTypeConfig[entry.blacklistType].color} border`}>
                        {blacklistTypeConfig[entry.blacklistType].icon}
                        <span className="ml-1 hidden lg:inline">{blacklistTypeConfig[entry.blacklistType].label.split(' ')[0]}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-slate-600 dark:text-slate-400 hidden md:table-cell">
                      {entry.reason}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.duration === 'permanent' ? 'default' : 'secondary'} 
                             className={entry.duration === 'permanent' ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-800' : 'dark:bg-slate-700'}>
                        {entry.duration === 'permanent' ? 'Permanent' : `Until ${formatDate(entry.expiryDate!)}`}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(entry.addedDate)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 dark:text-slate-400 max-w-[120px] truncate">
                      {entry.addedBy.split(' - ')[1] || entry.addedBy}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {entry.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                            title="Request removal"
                          >
                            <Unlock className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                      No blacklist entries match your current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[650px] dark:bg-slate-900 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" />
              Blacklist Entry Details
            </DialogTitle>
            <DialogDescription>
              Full details and management options for this blacklist entry
            </DialogDescription>
          </DialogHeader>
          
          {selectedEntry && (
            <div className="space-y-4 py-4">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Entry ID</p>
                  <p className="font-mono font-medium">{selectedEntry.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Status</p>
                  {getStatusBadge(selectedEntry.status)}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Entity Type</p>
                  <p className="capitalize flex items-center gap-1">
                    {entityIcons[selectedEntry.entityType]}
                    {selectedEntry.entityType.replace('_', ' ')}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Identifier</p>
                  <code className="font-mono text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                    {selectedEntry.identifier}
                  </code>
                </div>
              </div>

              <Separator className="dark:bg-slate-700" />

              {/* Customer Info */}
              {selectedEntry.customerName && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Associated Customer</p>
                  <p className="font-medium">{selectedEntry.customerName}</p>
                </div>
              )}

              {/* Blacklist Type & Reason */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Blacklist Category</p>
                  <Badge variant="secondary" className={`${blacklistTypeConfig[selectedEntry.blacklistType].color} border`}>
                    {blacklistTypeConfig[selectedEntry.blacklistType].icon}
                    <span className="ml-2">{blacklistTypeConfig[selectedEntry.blacklistType].label}</span>
                  </Badge>
                  <p className="text-xs text-slate-400 mt-1">{blacklistTypeConfig[selectedEntry.blacklistType].description}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Reason</p>
                  <p className="text-sm bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                    {selectedEntry.reason}
                  </p>
                </div>

                {selectedEntry.evidence && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Evidence / Documentation</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{selectedEntry.evidence}</p>
                  </div>
                )}
              </div>

              <Separator className="dark:bg-slate-700" />

              {/* Timeline */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Added On</p>
                  <p>{formatDate(selectedEntry.addedDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Added By</p>
                  <p>{selectedEntry.addedBy}</p>
                </div>
                {selectedEntry.expiryDate && (
                  <div>
                    <p className="text-xs text-slate-500">Expiry Date</p>
                    <p>{formatDate(selectedEntry.expiryDate)}</p>
                  </div>
                )}
                {selectedEntry.updatedBy && (
                  <div>
                    <p className="text-xs text-slate-500">Last Updated By</p>
                    <p>{selectedEntry.updatedBy}</p>
                  </div>
                )}
              </div>

              {selectedEntry.notes && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Notes</p>
                  <p className="text-sm italic text-slate-600 dark:text-slate-400">{selectedEntry.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)} className="dark:border-slate-600">
              Close
            </Button>
            {selectedEntry?.status === 'active' && (
              <>
                <Button variant="outline" className="text-amber-600 border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20">
                  <Clock className="w-4 h-4 mr-2" />
                  Request Review
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve Removal
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export type { BlacklistedEntity }
