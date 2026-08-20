'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TenantList } from './TenantList'
import { 
  Shield,
  Building2,
  Users,
  Activity,
  Server,
  Plus,
  Search,
  TrendingUp,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'

export function SuperAdminView() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Shield className="w-7 h-7 text-slate-700" />
            Super Admin Console
          </h2>
          <p className="text-slate-500 mt-1">
            Platform-wide administration and tenant management
          </p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Add New Tenant
        </Button>
      </div>

      {/* Platform Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Tenants</p>
                <p className="text-2xl font-bold text-slate-900">252</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Active</p>
                <p className="text-2xl font-bold text-slate-900">238</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Trial</p>
                <p className="text-2xl font-bold text-slate-900">14</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Enterprise</p>
                <p className="text-2xl font-bold text-slate-900">42</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="overview">Tenant Overview</TabsTrigger>
          <TabsTrigger value="tenants">All Tenants</TabsTrigger>
          <TabsTrigger value="health">Platform Health</TabsTrigger>
          <TabsTrigger value="new">Add Tenant</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <TenantOverview />
        </TabsContent>

        <TabsContent value="tenants" className="mt-6">
          <TenantList />
        </TabsContent>

        <TabsContent value="health" className="mt-6">
          <PlatformHealth />
        </TabsContent>

        <TabsContent value="new" className="mt-6">
          <AddTenantForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Tenant Overview Component
function TenantOverview() {
  const recentTenants = [
    { name: 'Abepot Credit', slug: 'abepot', status: 'ACTIVE', plan: 'STARTER', joinedDate: '2026-01-15' },
    { name: 'Fabilo Credit', slug: 'fabilo', status: 'ACTIVE', plan: 'PROFESSIONAL', joinedDate: '2026-01-12' },
    { name: 'Signature Capital', slug: 'signaturecapital', status: 'ACTIVE', plan: 'ENTERPRISE', joinedDate: '2026-01-10' },
    { name: 'Karibu Credit', slug: 'karibucredit', status: 'TRIAL', plan: 'STARTER', joinedDate: '2026-01-08' },
    { name: 'ED Partners Africa', slug: 'edpartners', status: 'ACTIVE', plan: 'ENTERPRISE', joinedDate: '2026-01-05' }
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Recently Added Tenants</CardTitle>
          <CardDescription>Latest DCPs onboarded to the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTenants.map((tenant) => (
                <TableRow key={tenant.slug}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell className="font-mono text-sm text-slate-500">{tenant.slug}</TableCell>
                  <TableCell>
                    <Badge variant={tenant.plan === 'ENTERPRISE' ? 'default' : 'secondary'}>
                      {tenant.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      tenant.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 border-0' :
                      tenant.status === 'TRIAL' ? 'bg-amber-100 text-amber-800 border-0' : ''
                    }>
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">{tenant.joinedDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { plan: 'Enterprise', count: 42, percentage: 16.7, color: 'bg-purple-500' },
              { plan: 'Professional', count: 98, percentage: 38.9, color: 'bg-blue-500' },
              { plan: 'Starter', count: 98, percentage: 38.9, color: 'bg-emerald-500' },
              { plan: 'Custom', count: 14, percentage: 5.5, color: 'bg-amber-500' }
            ].map((item) => (
              <div key={item.plan} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{item.plan}</span>
                  <span className="text-slate-500">{item.count} ({item.percentage}%)</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full`}
                    style={{ width: `${item.percentage * 4}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardHeader>
            <CardTitle className="text-base text-emerald-800">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-emerald-700">Onboarded this month</span>
              <span className="font-semibold text-emerald-900">8</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-emerald-700">Pending onboarding</span>
              <span className="font-semibold text-emerald-900">5</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-emerald-700">Trial conversions (MTD)</span>
              <span className="font-semibold text-emerald-900">12</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-emerald-700">Avg. activation time</span>
              <span className="font-semibold text-emerald-900">2.3 days</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Platform Health Component
function PlatformHealth() {
  const healthMetrics = [
    { metric: 'API Response Time', value: '45ms', status: 'healthy', threshold: '< 200ms' },
    { metric: 'Database Connections', value: '127/200', status: 'healthy', threshold: '< 80%' },
    { metric: 'Redis Cache Hit Rate', value: '94.2%', status: 'healthy', threshold: '> 90%' },
    { metric: 'Error Rate (24h)', value: '0.02%', status: 'healthy', threshold: '< 1%' },
    { metric: 'Active WebSockets', value: '1,247', status: 'healthy', threshold: '< 5000' },
    { metric: 'Queue Depth', value: '23', status: 'warning', threshold: '< 100' },
    { metric: 'Storage Usage', value: '78%', status: 'warning', threshold: '< 80%' },
    { metric: 'Uptime (30d)', value: '99.97%', status: 'healthy', threshold: '> 99.9%' }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-emerald-50 border-emerald-200'
      case 'warning':
        return 'bg-amber-50 border-amber-200'
      default:
        return 'bg-red-50 border-red-200'
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {healthMetrics.map((metric) => (
        <Card key={metric.metric} className={`${getStatusBg(metric.status)}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm font-medium text-slate-700">{metric.metric}</p>
              {getStatusIcon(metric.status)}
            </div>
            <p className="text-2xl font-bold text-slate-900">{metric.value}</p>
            <p className="text-xs text-slate-500 mt-1">Target: {metric.threshold}</p>
          </CardContent>
        </Card>
      ))}

      {/* System Status Banner */}
      <Card className="md:col-span-2 lg:col-span-4 bg-emerald-50 border-emerald-200">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-800">All Systems Operational</p>
              <p className="text-sm text-emerald-600">Last incident: 14 days ago (resolved in 23 min)</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100">
            View Status Page
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Add Tenant Form Component
function AddTenantForm() {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    companyName: '',
    licenseNumber: '',
    phone: '',
    email: '',
    website: '',
    plan: 'STARTER',
    status: 'PENDING_ONBOARDING'
  })

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Auto-generate slug from name
    if (field === 'name') {
      setFormData(prev => ({ ...prev, slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '') }))
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Register New Tenant (DCP)</CardTitle>
        <CardDescription>
          Onboard a new Digital Credit Provider to the platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tenantName">Business Name *</Label>
            <Input
              id="tenantName"
              placeholder="e.g., Abepot Credit"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug *</Label>
            <Input
              id="slug"
              placeholder="e.g., abepot"
              value={formData.slug}
              onChange={(e) => updateField('slug', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Legal Company Name *</Label>
            <Input
              id="companyName"
              placeholder="Registered company name"
              value={formData.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">CBK License Number</Label>
            <Input
              id="licenseNumber"
              placeholder="DCP license number"
              value={formData.licenseNumber}
              onChange={(e) => updateField('licenseNumber', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              placeholder="+254 XXX XXX XXX"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@company.com"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="website">Website URL</Label>
            <Input
              id="website"
              placeholder="https://www.example.com"
              value={formData.website}
              onChange={(e) => updateField('website', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Subscription Plan *</Label>
            <Select value={formData.plan} onValueChange={(v) => updateField('plan', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STARTER">Starter</SelectItem>
                <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                <SelectItem value="CUSTOM">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Initial Status</Label>
            <Select value={formData.status} onValueChange={(v) => updateField('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING_ONBOARDING">Pending Onboarding</SelectItem>
                <SelectItem value="TRIAL">Trial</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline">Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            Create Tenant
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
