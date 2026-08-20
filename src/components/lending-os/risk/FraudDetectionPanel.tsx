'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Shield,
  AlertTriangle,
  Search,
  Eye,
  Ban,
  CheckCircle2,
  ArrowUpRight,
  Clock,
  MapPin,
  Smartphone,
  UserCheck,
  Zap,
  Users,
  Activity,
  TrendingDown,
  XCircle,
  FileText,
  Info
} from 'lucide-react'

// TypeScript interfaces
export interface FraudAlert {
  id: string
  alertType: 'multiple_applications' | 'id_mismatch' | 'unusual_location' | 'velocity_check' | 'device_risk' | 'synthetic_identity'
  severity: 'critical' | 'high' | 'medium' | 'low'
  fraudScore: number // 0-100
  status: 'new' | 'investigating' | 'blocked' | 'allowed' | 'escalated'
  applicantInfo: {
    name: string
    phone: string
    nationalId?: string
    email?: string
    ip?: string
    deviceFingerprint?: string
  }
  riskIndicators: string[]
  recommendedAction: 'block' | 'investigate' | 'allow' | 'escalate'
  timestamp: Date
  assignedTo?: string
  caseNotes?: string
}

// Mock fraud alerts data
const mockFraudAlerts: FraudAlert[] = [
  {
    id: 'FR-001',
    alertType: 'multiple_applications',
    severity: 'critical',
    fraudScore: 95,
    status: 'new',
    applicantInfo: {
      name: 'John Kamau (alias)',
      phone: '+254711234567',
      nationalId: '12345678',
      ip: '196.202.xxx.xxx',
      deviceFingerprint: 'DEV-ABC-12345'
    },
    riskIndicators: [
      '8 loan applications in last 24 hours across 5 DCPs',
      '3 different National IDs used with same phone',
      'IP address flagged on multiple fraud databases',
      'Device fingerprint linked to 15+ previous applications'
    ],
    recommendedAction: 'block',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    caseNotes: 'High probability of organized fraud ring activity'
  },
  {
    id: 'FR-002',
    alertType: 'id_mismatch',
    severity: 'high',
    fraudScore: 78,
    status: 'investigating',
    applicantInfo: {
      name: 'Grace Wanjiku Mwangi',
      phone: '+254722345678',
      nationalId: '28456789',
      ip: '41.212.xxx.xxx',
      deviceFingerprint: 'DEV-XYZ-67890'
    },
    riskIndicators: [
      'Name spelling variation detected vs CRB record',
      'Date of birth differs by 2 years from CRB data',
      'Photo ID shows signs of possible alteration'
    ],
    recommendedAction: 'investigate',
    timestamp: new Date(Date.now() - 1000 * 60 * 23),
    assignedTo: 'Fraud Analyst - Peter K.',
    caseNotes: 'Awaiting manual document verification'
  },
  {
    id: 'FR-003',
    alertType: 'unusual_location',
    severity: 'medium',
    fraudScore: 55,
    status: 'new',
    applicantInfo: {
      name: 'Peter Ochieng Odhiambo',
      phone: '+254733456789',
      nationalId: '34567890',
      ip: '197.234.xxx.xxx',
      deviceFingerprint: 'DEV-LMN-11111'
    },
    riskIndicators: [
      'Application submitted from IP geolocated outside Kenya (Nigeria)',
      'Previous applications always from Nairobi area',
      'VPN/proxy usage detected'
    ],
    recommendedAction: 'investigate',
    timestamp: new Date(Date.now() - 1000 * 60 * 45)
  },
  {
    id: 'FR-004',
    alertType: 'velocity_check',
    severity: 'high',
    fraudScore: 82,
    status: 'blocked',
    applicantInfo: {
      name: 'Mary Atieno Oloo',
      phone: '+254744567890',
      nationalId: '45678901',
      ip: '196.201.xxx.xxx',
      deviceFingerprint: 'DEV-PQR-22222'
    },
    riskIndicators: [
      '12 form submissions in 30 minutes',
      'Rapid field changes between submissions',
      'Pattern consistent with bot/automated activity'
    ],
    recommendedAction: 'block',
    timestamp: new Date(Date.now() - 1000 * 60 * 67),
    assignedTo: 'System (Auto-blocked)',
    caseNotes: 'Auto-blocked by velocity rules. Rate limit exceeded.'
  },
  {
    id: 'FR-005',
    alertType: 'synthetic_identity',
    severity: 'critical',
    fraudScore: 92,
    status: 'escalated',
    applicantInfo: {
      name: 'James Mwangi Njoroge',
      phone: '+254755678901',
      nationalId: '56789012',
      ip: '105.112.xxx.xxx',
      deviceFingerprint: 'DEV-STU-33333'
    },
    riskIndicators: [
      'National ID passes checksum but not found in government database',
      'Credit history appears fabricated (too perfect)',
      'Phone number activated less than 7 days ago',
      'Multiple synthetic identity markers present'
    ],
    recommendedAction: 'escalate',
    timestamp: new Date(Date.now() - 1000 * 60 * 89),
    assignedTo: 'Senior Fraud Analyst - Jane W.',
    caseNotes: 'Escalated to DCI liaison. Possible synthetic identity ring.'
  },
  {
    id: 'FR-006',
    alertType: 'device_risk',
    severity: 'medium',
    fraudScore: 48,
    status: 'allowed',
    applicantInfo: {
      name: 'Faith Nyokabi Kimani',
      phone: '+254766789012',
      nationalId: '67890123',
      ip: '41.215.xxx.xxx',
      deviceFingerprint: 'DEV-VWX-44444'
    },
    riskIndicators: [
      'Device previously used for 3 declined applications',
      'Emulator/virtual environment detected',
      'Screen size inconsistent with typical mobile devices'
    ],
    recommendedAction: 'allow',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    assignedTo: 'Risk Analyst - Daniel M.',
    caseNotes: 'Cleared after additional verification. Legitimate user using work phone.'
  }
]

// Alert type configurations
const alertTypeConfig = {
  multiple_applications: {
    label: 'Multiple Applications',
    icon: <Users className="w-4 h-4" />,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',
    description: 'Excessive applications in short timeframe'
  },
  id_mismatch: {
    label: 'ID Mismatch',
    icon: <UserCheck className="w-4 h-4" />,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400',
    description: 'Identity information inconsistencies detected'
  },
  unusual_location: {
    label: 'Unusual Location',
    icon: <MapPin className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400',
    description: 'Application from unexpected geographic location'
  },
  velocity_check: {
    label: 'Velocity Check',
    icon: <Zap className="w-4 h-4" />,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400',
    description: 'Abnormal submission speed or frequency'
  },
  device_risk: {
    label: 'Device Risk',
    icon: <Smartphone className="w-4 h-4" />,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400',
    description: 'Suspicious device characteristics'
  },
  synthetic_identity: {
    label: 'Synthetic Identity',
    icon: <Shield className="w-4 h-4" />,
    color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400',
    description: 'Potential fabricated identity indicators'
  }
}

// Severity configurations
const severityConfig = {
  critical: { 
    label: 'Critical', 
    color: 'bg-red-500', 
    textColor: 'text-red-600 dark:text-red-400',
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border-0'
  },
  high: { 
    label: 'High', 
    color: 'bg-orange-500', 
    textColor: 'text-orange-600 dark:text-orange-400',
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400 border-0'
  },
  medium: { 
    label: 'Medium', 
    color: 'bg-amber-500', 
    textColor: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border-0'
  },
  low: { 
    label: 'Low', 
    color: 'bg-green-500', 
    textColor: 'text-green-600 dark:text-green-400',
    badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 border-0'
  }
}

// Status configurations
const statusConfig = {
  new: { label: 'New', icon: <Clock className="w-3 h-3" />, class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400' },
  investigating: { label: 'Investigating', icon: <Search className="w-3 h-3" />, class: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' },
  blocked: { label: 'Blocked', icon: <Ban className="w-3 h-3" />, class: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' },
  allowed: { label: 'Allowed', icon: <CheckCircle2 className="w-3 h-3" />, class: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400' },
  escalated: { label: 'Escalated', icon: <ArrowUpRight className="w-3 h-3" />, class: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400' }
}

export function FraudDetectionPanel() {
  const [alerts] = useState<FraudAlert[]>(mockFraudAlerts)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  
  // Selected alert for detail view
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matches = 
          alert.applicantInfo.name.toLowerCase().includes(q) ||
          alert.applicantInfo.phone.includes(q) ||
          alert.id.toLowerCase().includes(q)
        if (!matches) return false
      }
      if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false
      if (filterStatus !== 'all' && alert.status !== filterStatus) return false
      if (filterType !== 'all' && alert.alertType !== filterType) return false
      return true
    })
  }, [alerts, searchQuery, filterSeverity, filterStatus, filterType])

  // Statistics
  const stats = useMemo(() => ({
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    blockedThisMonth: alerts.filter(a => a.status === 'blocked').length,
    avgFraudScore: Math.round(alerts.reduce((sum, a) => sum + a.fraudScore, 0) / alerts.length),
    newToday: alerts.filter(a => {
      const diff = Date.now() - a.timestamp.getTime()
      return diff < 24 * 60 * 60 * 1000 && a.status === 'new'
    }).length
  }), [alerts])

  // Handle action
  const handleAction = (alertId: string, action: string) => {
    console.log(`Action ${action} on alert ${alertId}`)
    // In real app, would call API
  }

  // Format time ago
  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600 dark:text-red-400'
    if (score >= 60) return 'text-orange-600 dark:text-orange-400'
    if (score >= 40) return 'text-amber-600 dark:text-amber-400'
    return 'text-emerald-600 dark:text-emerald-400'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-red-100 dark:bg-red-900/40'
    if (score >= 60) return 'bg-orange-100 dark:bg-orange-900/40'
    if (score >= 40) return 'bg-amber-100 dark:bg-amber-900/40'
    return 'bg-emerald-100 dark:bg-emerald-900/40'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-emerald-600" />
            Fraud Detection Panel
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Real-time fraud monitoring and case management system
          </p>
        </div>
        <Button variant="outline" size="sm" className="dark:border-slate-700 dark:hover:bg-slate-800">
          <Activity className="w-4 h-4 mr-2" />
          Live Feed Active
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-4 text-center">
            <Shield className="w-5 h-5 mx-auto mb-1 text-slate-500" />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            <p className="text-xs text-slate-500">Total Alerts</p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-4 text-center">
            <XCircle className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</p>
            <p className="text-xs text-slate-500">Critical</p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-orange-500" />
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.high}</p>
            <p className="text-xs text-slate-500">High Priority</p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-4 text-center">
            <Ban className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.blockedThisMonth}</p>
            <p className="text-xs text-slate-500">Blocked</p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.avgFraudScore}</p>
            <p className="text-xs text-slate-500">Avg Score</p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-4 text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.newToday}</p>
            <p className="text-xs text-slate-500">New Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Fraud Scoring Matrix */}
      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            Fraud Scoring Matrix
          </CardTitle>
          <CardDescription>Risk assessment criteria and thresholds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-slate-700">
                  <TableHead>Score Range</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Auto Action</TableHead>
                  <TableHead>Review Required</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Escalation Path</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="dark:border-slate-700 bg-red-50 dark:bg-red-950/20">
                  <TableCell><Badge className="bg-red-500 text-white">80-100</Badge></TableCell>
                  <TableCell className="font-semibold text-red-700 dark:text-red-400">Critical</TableCell>
                  <TableCell><Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400">Auto Block</Badge></TableCell>
                  <TableCell>No - Immediate block</TableCell>
                  <TableCell>&lt; 5 minutes</TableCell>
                  <TableCell>DCI Liaison / Legal</TableCell>
                </TableRow>
                <TableRow className="dark:border-slate-700 bg-orange-50 dark:bg-orange-950/20">
                  <TableCell><Badge className="bg-orange-500 text-white">60-79</Badge></TableCell>
                  <TableCell className="font-semibold text-orange-700 dark:text-orange-400">High</TableCell>
                  <TableCell><Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400">Flag & Hold</Badge></TableCell>
                  <TableCell>Mandatory - Senior Analyst</TableCell>
                  <TableCell>&lt; 30 minutes</TableCell>
                  <TableCell>Fraud Team Lead</TableCell>
                </TableRow>
                <TableRow className="dark:border-slate-700 bg-amber-50 dark:bg-amber-950/20">
                  <TableCell><Badge className="bg-amber-500 text-white">40-59</Badge></TableCell>
                  <TableCell className="font-semibold text-amber-700 dark:text-amber-400">Medium</TableCell>
                  <TableCell><Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">Flag Only</Badge></TableCell>
                  <TableCell>Recommended - Any Analyst</TableCell>
                  <TableCell>&lt; 2 hours</TableCell>
                  <TableCell>Team Lead (if unresolved)</TableCell>
                </TableRow>
                <TableRow className="dark:border-slate-700 bg-green-50 dark:bg-green-950/20">
                  <TableCell><Badge className="bg-green-500 text-white">0-39</Badge></TableCell>
                  <TableCell className="font-semibold text-green-700 dark:text-green-400">Low</TableCell>
                  <TableCell><Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400">Allow</Badge></TableCell>
                  <TableCell>Optional - Spot check</TableCell>
                  <TableCell>24 hours</TableCell>
                  <TableCell>N/A</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, phone, or alert ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 dark:bg-slate-800 dark:border-slate-600"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-[130px] dark:bg-slate-800 dark:border-slate-600">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-600">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="allowed">Allowed</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[170px] dark:bg-slate-800 dark:border-slate-600">
                  <SelectValue placeholder="Alert Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="multiple_applications">Multiple Apps</SelectItem>
                  <SelectItem value="id_mismatch">ID Mismatch</SelectItem>
                  <SelectItem value="unusual_location">Unusual Location</SelectItem>
                  <SelectItem value="velocity_check">Velocity Check</SelectItem>
                  <SelectItem value="device_risk">Device Risk</SelectItem>
                  <SelectItem value="synthetic_identity">Synthetic ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Fraud Alerts Feed</CardTitle>
              <CardDescription>
                Showing {filteredAlerts.length} of {stats.total} alerts • Real-time updates enabled
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-slate-700 hover:dark:bg-slate-800/80">
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.map((alert) => (
                  <TableRow 
                    key={alert.id} 
                    className={`dark:border-slate-700 hover:dark:bg-slate-800/50 cursor-pointer ${
                      alert.severity === 'critical' ? 'bg-red-50/50 dark:bg-red-950/10' : ''
                    }`}
                    onClick={() => {
                      setSelectedAlert(alert)
                      setIsDetailOpen(true)
                    }}
                  >
                    <TableCell>
                      <code className="font-mono text-xs">{alert.id}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`${alertTypeConfig[alert.alertType].color} border-0`}>
                        {alertTypeConfig[alert.alertType].icon}
                        <span className="ml-1 hidden sm:inline">{alertTypeConfig[alert.alertType].label.split(' ')[0]}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[150px] truncate">
                      {alert.applicantInfo.name}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-slate-600 dark:text-slate-400">
                      {alert.applicantInfo.phone.replace('+254', '0')}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${getScoreBgColor(alert.fraudScore)} ${getScoreColor(alert.fraudScore)}`}>
                        {alert.fraudScore}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={severityConfig[alert.severity].badgeClass}>
                        {severityConfig[alert.severity].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusConfig[alert.status].class} border-0`}>
                        {statusConfig[alert.status].icon}
                        <span className="ml-1">{statusConfig[alert.status].label}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                      {getTimeAgo(alert.timestamp)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {alert.status === 'new' || alert.status === 'investigating' ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                              onClick={() => handleAction(alert.id, 'investigate')}
                              title="Investigate"
                            >
                              <Search className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                              onClick={() => handleAction(alert.id, 'block')}
                              title="Block"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              onClick={() => handleAction(alert.id, 'allow')}
                              title="Allow"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <Eye className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="dark:hover:bg-slate-800"
                        onClick={() => {
                          setSelectedAlert(alert)
                          setIsDetailOpen(true)
                        }}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredAlerts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                      No fraud alerts match your current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Historical Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Blocked This Month</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">147</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">↑ 12% vs last month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                <ArrowUpRight className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Escalated to DCI</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">23</p>
                <p className="text-xs text-slate-500">3 pending response</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">False Positive Rate</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">3.2%</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Below 5% target ✓</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Avg Response Time</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">8 min</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Target: &lt;15 min ✓</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[700px] dark:bg-slate-900 dark:border-slate-700 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-500" />
              Fraud Alert Details - {selectedAlert?.id}
            </DialogTitle>
            <DialogDescription>
              Complete analysis and case management options
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4 py-2">
              {/* Alert Header */}
              <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <Badge className={`${severityConfig[selectedAlert.severity].badgeClass}`}>
                  {severityConfig[selectedAlert.severity].label}
                </Badge>
                <Badge variant="secondary" className={`${alertTypeConfig[selectedAlert.alertType].color} border-0`}>
                  {alertTypeConfig[selectedAlert.alertType].icon}
                  <span className="ml-1">{alertTypeConfig[selectedAlert.alertType].label}</span>
                </Badge>
                <Badge className={`${statusConfig[selectedAlert.status].class} border-0`}>
                  {statusConfig[selectedAlert.status].icon}
                  <span className="ml-1">{statusConfig[selectedAlert.status].label}</span>
                </Badge>
                
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-sm text-slate-500">Fraud Score:</span>
                  <span className={`text-2xl font-bold ${getScoreColor(selectedAlert.fraudScore)}`}>
                    {selectedAlert.fraudScore}
                  </span>
                </div>
              </div>

              {/* Applicant Information */}
              <div>
                <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" /> Applicant Information
                </h4>
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Full Name</p>
                    <p className="font-medium">{selectedAlert.applicantInfo.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="font-mono">{selectedAlert.applicantInfo.phone}</p>
                  </div>
                  {selectedAlert.applicantInfo.nationalId && (
                    <div>
                      <p className="text-xs text-slate-500">National ID</p>
                      <p className="font-mono">{selectedAlert.applicantInfo.nationalId}</p>
                    </div>
                  )}
                  {selectedAlert.applicantInfo.ip && (
                    <div>
                      <p className="text-xs text-slate-500">IP Address</p>
                      <p className="font-mono">{selectedAlert.applicantInfo.ip}</p>
                    </div>
                  )}
                  {selectedAlert.applicantInfo.deviceFingerprint && (
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500">Device Fingerprint</p>
                      <p className="font-mono text-xs">{selectedAlert.applicantInfo.deviceFingerprint}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="dark:bg-slate-700" />

              {/* Risk Indicators */}
              <div>
                <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Risk Indicators
                </h4>
                <ul className="space-y-2">
                  {selectedAlert.riskIndicators.map((indicator, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>{indicator}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Separator className="dark:bg-slate-700" />

              {/* Recommended Action & Case Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" /> Recommended Action
                  </h4>
                  <div className={`p-3 rounded-lg border-2 ${
                    selectedAlert.recommendedAction === 'block' ? 'border-red-300 bg-red-50 dark:bg-red-950/20' :
                    selectedAlert.recommendedAction === 'investigate' ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' :
                    selectedAlert.recommendedAction === 'escalate' ? 'border-purple-300 bg-purple-50 dark:bg-purple-950/20' :
                    'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20'
                  }`}>
                    <p className="font-semibold capitalize">{selectedAlert.recommendedAction.replace('_', ' ')}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Based on fraud score of {selectedAlert.fraudScore} and {selectedAlert.riskIndicators.length} risk indicators
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Case Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Detected</span>
                      <span>{selectedAlert.timestamp.toLocaleString()}</span>
                    </div>
                    {selectedAlert.assignedTo && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Assigned To</span>
                        <span>{selectedAlert.assignedTo}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedAlert.caseNotes && (
                <>
                  <Separator className="dark:bg-slate-700" />
                  <div>
                    <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Case Notes
                    </h4>
                    <p className="text-sm p-3 bg-slate-50 dark:bg-slate-800 rounded-lg italic">
                      {selectedAlert.caseNotes}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="dark:border-slate-600">
              Close
            </Button>
            {(selectedAlert?.status === 'new' || selectedAlert?.status === 'investigating') && (
              <>
                <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20">
                  <Search className="w-4 h-4 mr-2" />
                  Investigate
                </Button>
                <Button variant="outline" className="border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/20">
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Escalate
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Allow Application
                </Button>
                <Button className="bg-red-600 hover:bg-red-700">
                  <Ban className="w-4 h-4 mr-2" />
                  Block Applicant
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export type { FraudAlert }
