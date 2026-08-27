'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Building2,
  Users,
  HandCoins,
  TrendingUp,
  Plus,
  Settings,
  FileText,
  Shield,
  Activity,
  Database,
  Wifi,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  MoreVertical,
  Edit,
  UserPlus,
  UserCheck,
  UserX,
  Mail,
  RefreshCw,
  Download,
  Upload,
  CreditCard,
  Key,
  Bell,
  Globe
} from 'lucide-react'

// Types
interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  department: string
  status: 'active' | 'inactive' | 'away' | 'suspended'
  lastLogin: string
  avatar?: string
}

interface AuditLogEntry {
  id: string
  user: string
  action: string
  details: string
  timestamp: string
  type: 'create' | 'update' | 'delete' | 'login' | 'security' | 'config'
}

interface SystemHealth {
  status: 'operational' | 'degraded' | 'down'
  apiLatency: number
  databaseStatus: 'healthy' | 'slow' | 'error'
  securityAlerts: number
  activeConnections: number
}

// Demo Data
const DEMO_STAFF: StaffMember[] = [
  { id: '1', name: 'Rachel Njoroge', email: 'rachel@abepot.co.ke', role: 'TENANT_ADMIN', department: 'Management', status: 'active', lastLogin: '2 min ago' },
  { id: '2', name: 'Samuel Otieno', email: 'samuel@abepot.co.ke', role: 'MANAGER', department: 'Credit', status: 'active', lastLogin: '1 hr ago' },
  { id: '3', name: 'Faith Chebet', email: 'faith@abepot.co.ke', role: 'TENANT_STAFF', department: 'Loans', status: 'away', lastLogin: 'Yesterday' },
  { id: '4', name: 'Grace Mwangi', email: 'grace@abepot.co.ke', role: 'TENANT_AGENT', department: 'Collections', status: 'active', lastLogin: '30 min ago' },
  { id: '5', name: 'Michael Kamau', email: 'michael@abepot.co.ke', role: 'TENANT_STAFF', department: 'Finance', status: 'active', lastLogin: '15 min ago' },
  { id: '6', name: 'David Kimani', email: 'david@abepot.co.ke', role: 'TENANT_STAFF', department: 'Loans', status: 'active', lastLogin: '45 min ago' },
  { id: '7', name: 'Sarah Achieng', email: 'sarah@abepot.co.ke', role: 'TENANT_STAFF', department: 'Compliance', status: 'active', lastLogin: '2 hrs ago' },
  { id: '8', name: 'Joseph Mutua', email: 'joseph@abepot.co.ke', role: 'TENANT_AGENT', department: 'Collections', status: 'inactive', lastLogin: '3 days ago' },
]

const DEMO_AUDIT_LOG: AuditLogEntry[] = [
  { id: '1', user: 'Rachel N.', action: 'Credit Policy Updated', details: 'Changed minimum credit score from 600 to 580', timestamp: '10 min ago', type: 'config' },
  { id: '2', user: 'System', action: 'User Created', details: 'New staff account for James Mwangi (LOAN_OFFICER)', timestamp: '1 hour ago', type: 'create' },
  { id: '3', user: 'Samuel O.', action: 'Loan Limit Increased', details: 'Customer John M. limit increased to KSh 100,000', timestamp: '2 hours ago', type: 'update' },
  { id: '4', user: 'Rachel N.', action: 'Integration Configured', details: 'M-Pesa API keys updated for production', timestamp: '3 hours ago', type: 'config' },
  { id: '5', user: 'Faith C.', action: 'Application Approved', details: 'Loan APP-2026-0842 approved (KSh 30,000)', timestamp: '4 hours ago', type: 'update' },
  { id: '6', user: 'System', action: 'Security Alert', details: 'Failed login attempt from unknown IP', timestamp: '5 hours ago', type: 'security' },
  { id: '7', user: 'Michael K.', action: 'Disbursement Processed', details: 'Batch of 12 loans disbursed (KSh 450,000)', timestamp: '6 hours ago', type: 'create' },
  { id: '8', user: 'Grace M.', action: 'Promise Recorded', details: 'Peter M. promised to pay KSh 8,500 by Aug 25', timestamp: '7 hours ago', type: 'create' },
]

const SYSTEM_HEALTH: SystemHealth = {
  status: 'operational',
  apiLatency: 120,
  databaseStatus: 'healthy',
  securityAlerts: 0,
  activeConnections: 47,
}

interface TenantAdminWorkspaceProps {
  tenantId: string
  userId: string
  userName?: string
  tenantName?: string
}

export function TenantAdminWorkspace({ 
  tenantId, 
  userId, 
  userName = 'Rachel Njoroge',
  tenantName = 'Abepot Credit Ltd' 
}: TenantAdminWorkspaceProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState('overview')

  const filteredStaff = DEMO_STAFF.filter(staff =>
    staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: StaffMember['status']) => {
    const variants = {
      active: { label: 'Active', variant: 'default' as const, icon: <UserCheck className="w-3 h-3" /> },
      inactive: { label: 'Inactive', variant: 'secondary' as const, icon: <UserX className="w-3 h-3" /> },
      away: { label: 'Away', variant: 'outline' as const, icon: <Clock className="w-3 h-3" /> },
      suspended: { label: 'Suspended', variant: 'destructive' as const, icon: <AlertCircle className="w-3 h-3" /> },
    }
    const config = variants[status]
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {config.label}
      </Badge>
    )
  }

  const getAuditTypeColor = (type: AuditLogEntry['type']) => {
    const colors = {
      create: 'text-emerald-600 bg-emerald-50',
      update: 'text-blue-600 bg-blue-50',
      delete: 'text-red-600 bg-red-50',
      login: 'text-gray-600 bg-gray-50',
      security: 'text-orange-600 bg-orange-50',
      config: 'text-purple-600 bg-purple-50',
    }
    return colors[type]
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Building2 className="w-8 h-8 text-emerald-600" />
            Admin Workspace
          </h1>
          <p className="text-muted-foreground mt-1">{tenantName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 px-3 py-1">
            <Activity className="w-3 h-3 text-green-500" />
            All Systems Operational
          </Badge>
        </div>
      </div>

      {/* Organization Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Customers</p>
                <p className="text-2xl font-bold">8,231</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" /> +12%
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Loans</p>
                <p className="text-2xl font-bold">842</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" /> +5%
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-full">
                <HandCoins className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Loan Book</p>
                <p className="text-2xl font-bold">KSh 2.4B</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" /> +8%
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue/Mo</p>
                <p className="text-2xl font-bold">KSh 14M</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" /> +15%
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Add User
            </Button>
            <Button variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              Reports
            </Button>
            <Button variant="outline" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </Button>
            <Button variant="outline" className="gap-2">
              <Shield className="w-4 h-4" />
              Audit Log
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export Data
            </Button>
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Import Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>Today's operations at a glance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                    <span className="text-sm font-medium">New Applications</span>
                    <span className="text-xl font-bold text-emerald-600">24</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Loans Approved</span>
                    <span className="text-xl font-bold text-blue-600">18</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium">Disbursements</span>
                    <span className="text-xl font-bold text-purple-600">KSh 520K</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm font-medium">Collections Today</span>
                    <span className="text-xl font-bold text-orange-600">KSh 89K</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription & Billing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Subscription & Billing</CardTitle>
                <CardDescription>Current plan and usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                    <div>
                      <p className="font-semibold text-emerald-800">Professional Plan</p>
                      <p className="text-sm text-emerald-600">Renews on Sep 15, 2026</p>
                    </div>
                    <Badge className="bg-emerald-600">Active</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Staff Seats Used</span>
                      <span className="font-medium">8 / 15</span>
                    </div>
                    <Progress value={53} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">API Calls This Month</span>
                      <span className="font-medium">124K / 200K</span>
                    </div>
                    <Progress value={62} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Storage Used</span>
                      <span className="font-medium">2.4 GB / 10 GB</span>
                    </div>
                    <Progress value={24} className="h-2" />
                  </div>

                  <Button variant="outline" className="w-full gap-2">
                    <Settings className="w-4 h-4" />
                    Manage Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Team Management Tab */}
        <TabsContent value="team" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Team Members</CardTitle>
                  <CardDescription>Manage your organization's staff</CardDescription>
                </div>
                <Button className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Invite Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search staff members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Staff Table */}
              <ScrollArea className="max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-medium">
                              {staff.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-medium">{staff.name}</p>
                              <p className="text-xs text-muted-foreground">{staff.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{staff.role.replace('TENANT_', '')}</Badge>
                        </TableCell>
                        <TableCell>{staff.department}</TableCell>
                        <TableCell>{getStatusBadge(staff.status)}</TableCell>
                        <TableCell className="text-muted-foreground">{staff.lastLogin}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Edit className="w-3 h-3" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="system" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium">Overall Status</span>
                  </div>
                  <Badge className="bg-emerald-600">Operational</Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">API Latency</span>
                    </div>
                    <span className="text-sm font-mono font-medium">{SYSTEM_HEALTH.apiLatency}ms</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Database</span>
                    </div>
                    <Badge variant="outline" className="text-emerald-600">
                      {SYSTEM_HEALTH.databaseStatus === 'healthy' ? 'Healthy' : SYSTEM_HEALTH.databaseStatus}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Security Alerts</span>
                    </div>
                    <span className={`font-medium ${SYSTEM_HEALTH.securityAlerts > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                      {SYSTEM_HEALTH.securityAlerts > 0 ? `${SYSTEM_HEALTH.securityAlerts} alerts` : 'No alerts'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Active Connections</span>
                    </div>
                    <span className="font-medium">{SYSTEM_HEALTH.activeConnections}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  Integrations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                      <Globe className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">M-Pesa API</p>
                      <p className="text-xs text-muted-foreground">Payment processing</p>
                    </div>
                  </div>
                  <Badge className="bg-green-600">Connected</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">SMS Gateway</p>
                      <p className="text-xs text-muted-foreground">AfricasTalking</p>
                    </div>
                  </div>
                  <Badge className="bg-green-600">Connected</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Credit Bureau</p>
                      <p className="text-xs text-muted-foreground">Metropol CRB</p>
                    </div>
                  </div>
                  <Badge className="bg-green-600">Connected</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                      <Bell className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Notifications</p>
                      <p className="text-xs text-muted-foreground">Push & Email</p>
                    </div>
                  </div>
                  <Badge variant="outline">Configured</Badge>
                </div>

                <Button variant="outline" className="w-full gap-2">
                  <Key className="w-4 h-4" />
                  Manage Integrations
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Audit Log</CardTitle>
                  <CardDescription>Track all system changes and actions</CardDescription>
                </div>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-3">
                  {DEMO_AUDIT_LOG.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-4 p-3 hover:bg-muted/50 rounded-lg transition-colors">
                      <div className={`p-2 rounded-full ${getAuditTypeColor(entry.type)}`}>
                        {entry.type === 'create' && <UserPlus className="w-4 h-4" />}
                        {entry.type === 'update' && <RefreshCw className="w-4 h-4" />}
                        {entry.type === 'delete' && <UserX className="w-4 h-4" />}
                        {entry.type === 'login' && <Shield className="w-4 h-4" />}
                        {entry.type === 'security' && <AlertCircle className="w-4 h-4" />}
                        {entry.type === 'config' && <Settings className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{entry.user}</span>
                          <span className="text-muted-foreground text-sm">•</span>
                          <span className="text-sm text-muted-foreground">{entry.action}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{entry.details}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{entry.timestamp}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper component for card descriptions - using CardDescription directly
