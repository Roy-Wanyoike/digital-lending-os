'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { 
  KPICards
} from './KPICards'
import { ApplicationsTable } from './ApplicationsTable'
import { LoansTable } from './LoansTable'
import { 
  Building2, 
  Search,
  Users,
  TrendingUp,
  Filter,
  Download,
  Plus
} from 'lucide-react'

export function LenderDashboard() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Building2 className="w-7 h-7 text-emerald-600" />
            Lender Admin Dashboard
          </h2>
          <p className="text-slate-500 mt-1">
            Abepot Credit - Operations Overview
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            New Application
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards />

      {/* Main Content Tabs */}
      <Tabs defaultValue="applications" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="applications">Applications Queue</TabsTrigger>
            <TabsTrigger value="loans">Active Loans</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search customers, loans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
        </div>

        <TabsContent value="applications">
          <ApplicationsTable />
        </TabsContent>

        <TabsContent value="loans">
          <LoansTable />
        </TabsContent>

        <TabsContent value="customers">
          <CustomerListView searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="portfolio">
          <PortfolioView />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Customer List View Component
function CustomerListView({ searchQuery }: { searchQuery: string }) {
  const mockCustomers = [
    { id: '1', name: 'John Kamau', phone: '0712345678', totalLoans: 3, outstandingBalance: 45000, status: 'Active', riskLevel: 'Low', lastLoanDate: '2026-01-15' },
    { id: '2', name: 'Grace Wanjiku', phone: '0723456789', totalLoans: 5, outstandingBalance: 120000, status: 'Active', riskLevel: 'Medium', lastLoanDate: '2026-01-20' },
    { id: '3', name: 'Peter Ochieng', phone: '0734567890', totalLoans: 2, outstandingBalance: 25000, status: 'Active', riskLevel: 'Low', lastLoanDate: '2025-12-10' },
    { id: '4', name: 'Mary Atieno', phone: '0745678901', totalLoans: 1, outstandingBalance: 75000, status: 'In Arrears', riskLevel: 'High', lastLoanDate: '2025-11-05' },
    { id: '5', name: 'James Mwangi', phone: '0756789012', totalLoans: 4, outstandingBalance: 95000, status: 'Active', riskLevel: 'Medium', lastLoanDate: '2026-01-18' },
    { id: '6', name: 'Faith Nyokabi', phone: '0767890123', totalLoans: 0, outstandingBalance: 0, status: 'Pending', riskLevel: 'New', lastLoanDate: '-' },
    { id: '7', name: 'Daniel Kipchoge', phone: '0778901234', totalLoans: 7, outstandingBalance: 180000, status: 'Active', riskLevel: 'Low', lastLoanDate: '2026-01-22' },
    { id: '8', name: 'Sarah Muthoni', phone: '0789012345', totalLoans: 2, outstandingBalance: 35000, status: 'Blacklisted', riskLevel: 'Very High', lastLoanDate: '2025-08-15' },
  ]

  const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`

  const getRiskBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low':
        return <Badge className="bg-emerald-100 text-emerald-800 border-0">{level}</Badge>
      case 'medium':
        return <Badge className="bg-amber-100 text-amber-800 border-0">{level}</Badge>
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800 border-0">{level}</Badge>
      case 'very high':
        return <Badge className="bg-red-100 text-red-800 border-0">{level}</Badge>
      default:
        return <Badge variant="secondary">{level}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-800 border-0">{status}</Badge>
      case 'in arrears':
        return <Badge className="bg-red-100 text-red-800 border-0">{status}</Badge>
      case 'blacklisted':
        return <Badge className="bg-slate-200 text-slate-800 border-0">{status}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-5 h-5 text-emerald-600" />
          Customer Directory
        </CardTitle>
        <CardDescription>{mockCustomers.length} registered customers</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-center">Loans</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Risk Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Loan</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell className="font-mono text-sm">{customer.phone}</TableCell>
                <TableCell className="text-center">{customer.totalLoans}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(customer.outstandingBalance)}</TableCell>
                <TableCell>{getRiskBadge(customer.riskLevel)}</TableCell>
                <TableCell>{getStatusBadge(customer.status)}</TableCell>
                <TableCell className="text-sm text-slate-500">{customer.lastLoanDate}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">View</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// Portfolio View Component
function PortfolioView() {
  // Mock data for portfolio distribution
  const portfolioData = [
    { category: 'Personal Loans', count: 125430, amount: 420000000, percentage: 50, color: 'bg-emerald-500' },
    { category: 'Business Loans', count: 35200, amount: 280000000, percentage: 33.3, color: 'bg-blue-500' },
    { category: 'Salary Advance', count: 18802, amount: 94000000, percentage: 11.2, color: 'bg-amber-500' },
    { category: 'Emergency Loans', count: 3000, amount: 46000000, percentage: 5.5, color: 'bg-red-400' },
  ]

  const riskDistribution = [
    { level: 'Low Risk', count: 142000, percentage: 77.8, color: 'bg-emerald-500' },
    { level: 'Medium Risk', count: 28500, percentage: 15.6, color: 'bg-amber-500' },
    { level: 'High Risk', count: 10500, percentage: 5.8, color: 'bg-orange-500' },
    { level: 'Very High Risk', count: 1432, percentage: 0.8, color: 'bg-red-500' },
  ]

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `KSh ${(value / 1000000).toFixed(0)}M`
    }
    return `KSh ${(value / 1000).toFixed(0)}K`
  }

  const formatNumber = (value: number) => value.toLocaleString()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Loan Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Portfolio by Product</CardTitle>
          <CardDescription>Loan distribution across product categories</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {portfolioData.map((item) => (
            <div key={item.category} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{item.category}</span>
                <span className="text-slate-500">
                  {formatNumber(item.count)} loans • {formatCurrency(item.amount)}
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${item.color} rounded-full transition-all`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
          
          <div className="pt-4 border-t mt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Total Portfolio Value</p>
                <p className="text-xl font-bold text-slate-900">KSh 840M</p>
              </div>
              <div>
                <p className="text-slate-500">Average Loan Size</p>
                <p className="text-xl font-bold text-slate-900">KSh 4,605</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risk Distribution</CardTitle>
          <CardDescription>Credit risk profile of active loan book</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {riskDistribution.map((item) => (
            <div key={item.level} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{item.level}</span>
                <span className="text-slate-500">
                  {formatNumber(item.count)} ({item.percentage}%)
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${item.color} rounded-full transition-all`}
                  style={{ width: `${item.percentage * 10}%` }}
                />
              </div>
            </div>
          ))}
          
          <div className="pt-4 border-t mt-4 space-y-3">
            <div className="flex justify-between text-sm p-2 bg-emerald-50 rounded">
              <span>PAR30 Ratio</span>
              <span className="font-semibold text-emerald-700">4.2%</span>
            </div>
            <div className="flex justify-between text-sm p-2 bg-amber-50 rounded">
              <span>PAR90 Ratio</span>
              <span className="font-semibold text-amber-700">2.1%</span>
            </div>
            <div className="flex justify-between text-sm p-2 bg-blue-50 rounded">
              <span>Write-off Rate (YTD)</span>
              <span className="font-semibold text-blue-700">0.8%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Disbursement Trend */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Monthly Disbursement Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2">
            {['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'].map((month, index) => {
              const values = [68, 72, 85, 92, 78, 95]
              const amounts = [112, 124, 145, 158, 132, 168]
              return (
                <div key={month} className="text-center">
                  <div className="h-32 bg-slate-50 rounded-lg flex items-end justify-center p-2 mb-2">
                    <div 
                      className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded"
                      style={{ height: `${values[index]}%` }}
                    />
                  </div>
                  <p className="text-xs font-medium text-slate-600">{month}</p>
                  <p className="text-xs text-slate-500">KSh {amounts[index]}M</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
