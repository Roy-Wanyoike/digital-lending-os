'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Settings
} from 'lucide-react'

interface Tenant {
  id: string
  name: string
  slug: string
  companyName: string
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM'
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'PENDING_ONBOARDING' | 'TERMINATED'
  licenseDate?: string
  loanBook: number
  activeLoans: number
  users: number
  createdAt: string
}

export function TenantList() {
  const [searchQuery, setSearchQuery] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const tenants: Tenant[] = [
    {
      id: '1',
      name: 'Abepot Credit',
      slug: 'abepot',
      companyName: 'Abepot Credit Limited',
      plan: 'STARTER',
      status: 'ACTIVE',
      licenseDate: '2024-03-15',
      loanBook: 12500000,
      activeLoans: 2840,
      users: 5,
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      name: 'Fabilo Credit',
      slug: 'fabilo',
      companyName: 'Fabilo Financial Services Ltd',
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
      licenseDate: '2023-11-20',
      loanBook: 45000000,
      activeLoans: 8900,
      users: 12,
      createdAt: '2023-09-20'
    },
    {
      id: '3',
      name: 'Signature Capital',
      slug: 'signaturecapital',
      companyName: 'Signature Capital Kenya Ltd',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      licenseDate: '2021-06-10',
      loanBook: 280000000,
      activeLoans: 52000,
      users: 45,
      createdAt: '2021-04-10'
    },
    {
      id: '4',
      name: 'Karibu Credit',
      slug: 'karibucredit',
      companyName: 'Karibu Credit Solutions',
      plan: 'STARTER',
      status: 'TRIAL',
      loanBook: 0,
      activeLoans: 0,
      users: 2,
      createdAt: '2026-01-08'
    },
    {
      id: '5',
      name: 'ED Partners Africa',
      slug: 'edpartners',
      companyName: 'ED Partners Africa Limited',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      licenseDate: '2022-02-28',
      loanBook: 185000000,
      activeLoans: 35000,
      users: 32,
      createdAt: '2022-01-15'
    },
    {
      id: '6',
      name: 'QuickCash DCP',
      slug: 'quickcash',
      companyName: 'QuickCash Digital Lenders',
      plan: 'PROFESSIONAL',
      status: 'SUSPENDED',
      licenseDate: '2023-05-15',
      loanBook: 8500000,
      activeLoans: 1200,
      users: 6,
      createdAt: '2023-04-01'
    },
    {
      id: '7',
      name: 'PesaLink Finance',
      slug: 'pesalink',
      companyName: 'PesaLink Finance Ltd',
      plan: 'CUSTOM',
      status: 'ACTIVE',
      licenseDate: '2022-08-20',
      loanBook: 95000000,
      activeLoans: 18000,
      users: 22,
      createdAt: '2022-07-01'
    },
    {
      id: '8',
      name: 'Mali Mobile Money',
      slug: 'malimobile',
      companyName: 'Mali Mobile Money Ltd',
      plan: 'STARTER',
      status: 'PENDING_ONBOARDING',
      loanBook: 0,
      activeLoans: 0,
      users: 1,
      createdAt: '2026-01-18'
    }
  ]

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `KSh ${(value / 1000000).toFixed(1)}M`
    }
    return `KSh ${(value / 1000).toFixed(0)}K`
  }

  const getPlanBadge = (plan: Tenant['plan']) => {
    switch (plan) {
      case 'ENTERPRISE':
        return <Badge className="bg-purple-100 text-purple-800 border-0">{plan}</Badge>
      case 'PROFESSIONAL':
        return <Badge className="bg-blue-100 text-blue-800 border-0">{plan}</Badge>
      case 'CUSTOM':
        return <Badge className="bg-amber-100 text-amber-800 border-0">{plan}</Badge>
      default:
        return <Badge variant="secondary">{plan}</Badge>
    }
  }

  const getStatusBadge = (status: Tenant['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-emerald-100 text-emerald-800 border-0">{status}</Badge>
      case 'TRIAL':
        return <Badge className="bg-amber-100 text-amber-800 border-0">{status}</Badge>
      case 'SUSPENDED':
        return <Badge className="bg-red-100 text-red-800 border-0">{status}</Badge>
      case 'PENDING_ONBOARDING':
        return <Badge className="bg-slate-100 text-slate-700 border-0">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tenant.slug.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPlan = planFilter === 'all' || tenant.plan === planFilter
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter
    return matchesSearch && matchesPlan && matchesStatus
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">All Tenants</CardTitle>
            <CardDescription>{tenants.length} registered Digital Credit Providers</CardDescription>
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search tenants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full sm:w-56"
              />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="STARTER">Starter</SelectItem>
                <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                <SelectItem value="CUSTOM">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="TRIAL">Trial</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="PENDING_ONBOARDING">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Loan Book</TableHead>
              <TableHead className="text-right">Active Loans</TableHead>
              <TableHead className="text-center">Users</TableHead>
              <TableHead>License Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[200px]">
                      {tenant.companyName}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm text-slate-500">
                  {tenant.slug}
                </TableCell>
                <TableCell>{getPlanBadge(tenant.plan)}</TableCell>
                <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                <TableCell className="text-right font-medium">
                  {tenant.loanBook > 0 ? formatCurrency(tenant.loanBook) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {tenant.activeLoans.toLocaleString()}
                </TableCell>
                <TableCell className="text-center">{tenant.users}</TableCell>
                <TableCell className="text-sm text-slate-500">
                  {tenant.licenseDate || '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" title="View details">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Edit tenant">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Settings">
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="More options">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Summary Footer */}
        <div className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600">
          <span>
            Showing <strong>{filteredTenants.length}</strong> of <strong>{tenants.length}</strong> tenants
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <Button variant="outline" size="sm">Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
