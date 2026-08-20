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
import { toast } from 'sonner'
import { 
  KPICards
} from './KPICards'
import { ApplicationsTable } from './ApplicationsTable'
import { LoansTable } from './LoansTable'
import { CustomerDetailsDialog, type CustomerDetail } from './CustomerDetailsDialog'
import { LoanDetailsDialog, type LoanDetail } from './LoanDetailsDialog'
import {
  PortfolioDistributionChart,
  MonthlyDisbursementsChart,
  CollectionsTrendChart
} from './DashboardCharts'
import { exportCustomers, exportLoans } from '@/lib/export'
import { 
  Building2, 
  Search,
  Users,
  TrendingUp,
  Filter,
  Download,
  Plus,
  Eye
} from 'lucide-react'

export function LenderDashboard() {
  const [searchQuery, setSearchQuery] = useState('')
  
  // Dialog states
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null)
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<LoanDetail | null>(null)
  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false)

  // Handle customer view
  const handleViewCustomer = (customer: any) => {
    // Convert to CustomerDetail format
    const customerDetail: CustomerDetail = {
      id: customer.id,
      firstName: customer.name.split(' ')[0] || '',
      lastName: customer.name.split(' ').slice(1).join(' ') || '',
      phone: customer.phone,
      email: customer.email || `${customer.name.toLowerCase().replace(' ', '.')}@example.com`,
      nationalId: `ID${customer.id.padStart(7, '0')}`,
      alternativePhone: `+254${customer.phone.slice(1)}`,
      county: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'][Math.floor(Math.random() * 5)],
      city: 'Nairobi',
      physicalAddress: `P.O. Box ${Math.floor(Math.random() * 99999)}, Nairobi`,
      employmentStatus: 'EMPLOYED',
      employerName: ['Safaricom PLC', 'Equity Bank', 'Kenya Power', 'Telkom Kenya'][Math.floor(Math.random() * 4)],
      incomeAmount: Math.floor(Math.random() * 150000) + 30000,
      businessName: undefined,
      bankName: 'Equity Bank',
      bankAccount: `0${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      mpesaPhone: customer.phone,
      creditScore: Math.floor(Math.random() * 300) + 500,
      crbStatus: customer.riskLevel === 'Very High' ? 'LISTED' : 'CLEAN',
      totalBorrowed: customer.outstandingBalance + (customer.totalLoans * 25000),
      totalRepaid: customer.totalLoans * 20000,
      outstandingBalance: customer.outstandingBalance,
      status: customer.status.toUpperCase().replace(' ', '_'),
      riskLevel: customer.riskLevel.toUpperCase(),
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      lastLoanDate: customer.lastLoanDate !== '-' ? customer.lastLoanDate : undefined
    }
    
    setSelectedCustomer(customerDetail)
    setIsCustomerDialogOpen(true)
  }

  // Handle loan view
  const handleViewLoan = (loan: any) => {
    const loanDetail: LoanDetail = {
      id: loan.id,
      loanNumber: loan.loanNumber,
      customerName: loan.customerName,
      customerId: `cust-${loan.id}`,
      phone: loan.phone.replace(/\s/g, ''),
      principal: loan.principal,
      approvedAmount: loan.principal,
      interestRate: loan.interestRate,
      interestType: 'FLAT_RATE',
      processingFee: loan.principal * 0.02,
      insuranceFee: loan.principal * 0.01,
      totalInterest: loan.principal * (loan.interestRate / 100),
      totalFees: loan.principal * 0.03,
      totalRepayable: loan.principal * (1 + loan.interestRate / 100) * 1.03,
      termDays: 90,
      disbursementDate: loan.disbursementDate,
      maturityDate: new Date(new Date(loan.disbursementDate).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      repaidPrincipal: loan.principal - loan.outstandingBalance,
      repaidInterest: (loan.principal - loan.outstandingBalance) * (loan.interestRate / 100) * 0.8,
      repaidFees: (loan.principal - loan.outstandingBalance) * 0.03 * 0.9,
      totalRepaid: loan.principal - loan.outstandingBalance + ((loan.principal - loan.outstandingBalance) * (loan.interestRate / 100)),
      outstandingBalance: loan.outstandingBalance,
      nextPaymentDue: loan.nextPaymentDue !== '-' ? loan.nextPaymentDue : undefined,
      daysInArrears: loan.daysInArrears || 0,
      status: loan.status.toUpperCase(),
      arrearsStatus: loan.daysInArrears > 90 ? 'DAYS_91_PLUS' : loan.daysInArrears > 60 ? 'DAYS_61_90' : loan.daysInArrears > 30 ? 'DAYS_31_60' : loan.daysInArrears > 7 ? 'DAYS_8_30' : loan.daysInArrears > 0 ? 'DAYS_1_7' : 'CURRENT',
      disbursementMethod: 'MPESA',
      disbursementReference: `MPESA${Math.floor(Math.random() * 90000) + 10000}`,
      product: 'Personal Loan'
    }
    
    setSelectedLoan(loanDetail)
    setIsLoanDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Building2 className="w-7 h-7 text-emerald-600" />
            Lender Admin Dashboard
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Abepot Credit - Operations Overview
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="dark:border-slate-700 dark:hover:bg-slate-800">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
            <Plus className="w-4 h-4 mr-2" />
            New Application
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards />

      {/* Data Visualization Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PortfolioDistributionChart />
        <MonthlyDisbursementsChart />
        <CollectionsTrendChart />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="applications" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList className="bg-slate-100 dark:bg-slate-800 overflow-x-auto w-full sm:w-auto">
            <TabsTrigger value="applications" className="data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:border data-[state=active]:dark:border-slate-700">Applications Queue</TabsTrigger>
            <TabsTrigger value="loans" className="data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:border data-[state=active]:dark:border-slate-700">Active Loans</TabsTrigger>
            <TabsTrigger value="customers" className="data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:border data-[state=active]:dark:border-slate-700">Customers</TabsTrigger>
            <TabsTrigger value="portfolio" className="data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:border data-[state=active]:dark:border-slate-700">Portfolio</TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search customers, loans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-64 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>

        <TabsContent value="applications">
          <ApplicationsTable />
        </TabsContent>

        <TabsContent value="loans">
          <LoansTable onViewLoan={handleViewLoan} />
        </TabsContent>

        <TabsContent value="customers">
          <CustomerListView searchQuery={searchQuery} onViewCustomer={handleViewCustomer} />
        </TabsContent>

        <TabsContent value="portfolio">
          <PortfolioView />
        </TabsContent>
      </Tabs>

      {/* Customer Details Dialog */}
      <CustomerDetailsDialog
        customer={selectedCustomer}
        open={isCustomerDialogOpen}
        onOpenChange={setIsCustomerDialogOpen}
        onNewLoan={(customerId) => {
          toast.success(`Creating new loan for customer ${customerId}`)
          setIsCustomerDialogOpen(false)
        }}
        onSendSms={(phone) => {
          toast.success(`Opening SMS composer for ${phone}`)
        }}
        onViewDocuments={(customerId) => {
          toast.info(`Viewing documents for customer ${customerId}`)
        }}
      />

      {/* Loan Details Dialog */}
      <LoanDetailsDialog
        loan={selectedLoan}
        open={isLoanDialogOpen}
        onOpenChange={setIsLoanDialogOpen}
        onRecordPayment={(loanId) => {
          toast.success(`Recording payment for loan ${loanId}`)
        }}
        onSendReminder={(customerId, phone) => {
          toast.success(`Sending reminder to ${phone}`)
        }}
        onViewCustomer={(customerId) => {
          setIsLoanDialogOpen(false)
          // Could find and show customer details
          toast.info(`Viewing customer ${customerId}`)
        }}
      />
    </div>
  )
}

// Customer List View Component with enhanced features
function CustomerListView({ searchQuery, onViewCustomer }: { searchQuery: string; onViewCustomer?: (customer: any) => void }) {
  const mockCustomers = [
    { id: '1', name: 'John Kamau', phone: '0712345678', email: 'john.kamau@email.com', totalLoans: 3, outstandingBalance: 45000, status: 'Active', riskLevel: 'Low', lastLoanDate: '2026-01-15' },
    { id: '2', name: 'Grace Wanjiku', phone: '0723456789', email: 'grace.wanjiku@email.com', totalLoans: 5, outstandingBalance: 120000, status: 'Active', riskLevel: 'Medium', lastLoanDate: '2026-01-20' },
    { id: '3', name: 'Peter Ochieng', phone: '0734567890', email: 'peter.o@email.com', totalLoans: 2, outstandingBalance: 25000, status: 'Active', riskLevel: 'Low', lastLoanDate: '2025-12-10' },
    { id: '4', name: 'Mary Atieno', phone: '0745678901', email: 'mary.atieno@email.com', totalLoans: 1, outstandingBalance: 75000, status: 'In Arrears', riskLevel: 'High', lastLoanDate: '2025-11-05' },
    { id: '5', name: 'James Mwangi', phone: '0756789012', email: 'james.mwangi@email.com', totalLoans: 4, outstandingBalance: 95000, status: 'Active', riskLevel: 'Medium', lastLoanDate: '2026-01-18' },
    { id: '6', name: 'Faith Nyokabi', phone: '0767890123', email: 'faith.nyokabi@email.com', totalLoans: 0, outstandingBalance: 0, status: 'Pending', riskLevel: 'New', lastLoanDate: '-' },
    { id: '7', name: 'Daniel Kipchoge', phone: '0778901234', email: 'daniel.kipchoge@email.com', totalLoans: 7, outstandingBalance: 180000, status: 'Active', riskLevel: 'Low', lastLoanDate: '2026-01-22' },
    { id: '8', name: 'Sarah Muthoni', phone: '0789012345', email: 'sarah.muthoni@email.com', totalLoans: 2, outstandingBalance: 35000, status: 'Blacklisted', riskLevel: 'Very High', lastLoanDate: '2025-08-15' },
  ]

  const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`

  const getRiskBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low':
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border-0">{level}</Badge>
      case 'medium':
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border-0">{level}</Badge>
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400 border-0">{level}</Badge>
      case 'very high':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border-0">{level}</Badge>
      default:
        return <Badge variant="secondary" className="dark:bg-slate-700 dark:text-slate-300">{level}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border-0">{status}</Badge>
      case 'in arrears':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border-0">{status}</Badge>
      case 'blacklisted':
        return <Badge className="bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300 border-0">{status}</Badge>
      default:
        return <Badge variant="outline" className="dark:border-slate-600 dark:text-slate-400">{status}</Badge>
    }
  }

  // Handle export
  const handleExport = () => {
    exportCustomers(mockCustomers, 'customer-directory')
    toast.success('Customer list exported successfully!')
  }

  // Filter customers based on search query
  const filteredCustomers = mockCustomers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  )

  return (
    <Card className="dark:bg-slate-800/50 dark:border-slate-700">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-emerald-600" />
              Customer Directory
            </CardTitle>
            <CardDescription>{filteredCustomers.length} registered customers</CardDescription>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExport}
            className="dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow className="dark:border-slate-700 hover:dark:bg-slate-800/80">
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
              {filteredCustomers.map((customer) => (
                <TableRow 
                  key={customer.id} 
                  className="dark:border-slate-700 hover:dark:bg-slate-800/50 cursor-pointer"
                  onClick={() => onViewCustomer?.(customer)}
                >
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="font-mono text-sm">{customer.phone}</TableCell>
                  <TableCell className="text-center">{customer.totalLoans}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(customer.outstandingBalance)}</TableCell>
                  <TableCell>{getRiskBadge(customer.riskLevel)}</TableCell>
                  <TableCell>{getStatusBadge(customer.status)}</TableCell>
                  <TableCell className="text-sm text-slate-500 dark:text-slate-400">{customer.lastLoanDate}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="dark:hover:bg-slate-800"
                      onClick={(e) => {
                        e.stopPropagation()
                        onViewCustomer?.(customer)
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              
              {filteredCustomers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    No customers found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
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
      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-base">Portfolio by Product</CardTitle>
          <CardDescription>Loan distribution across product categories</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {portfolioData.map((item) => (
            <div key={item.category} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{item.category}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {formatNumber(item.count)} loans • {formatCurrency(item.amount)}
                </span>
              </div>
              <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${item.color} rounded-full transition-all`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
          
          <div className="pt-4 border-t mt-4 dark:border-slate-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Total Portfolio Value</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">KSh 840M</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Average Loan Size</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">KSh 4,605</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Distribution */}
      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-base">Risk Distribution</CardTitle>
          <CardDescription>Credit risk profile of active loan book</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {riskDistribution.map((item) => (
            <div key={item.level} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{item.level}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {formatNumber(item.count)} ({item.percentage}%)
                </span>
              </div>
              <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${item.color} rounded-full transition-all`}
                  style={{ width: `${item.percentage * 10}%` }}
                />
              </div>
            </div>
          ))}
          
          <div className="pt-4 border-t mt-4 space-y-3 dark:border-slate-700">
            <div className="flex justify-between text-sm p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
              <span className="text-emerald-700 dark:text-emerald-400">PAR30 Ratio</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">4.2%</span>
            </div>
            <div className="flex justify-between text-sm p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
              <span className="text-amber-700 dark:text-amber-400">PAR90 Ratio</span>
              <span className="font-semibold text-amber-700 dark:text-amber-400">2.1%</span>
            </div>
            <div className="flex justify-between text-sm p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <span className="text-blue-700 dark:text-blue-400">Write-off Rate (YTD)</span>
              <span className="font-semibold text-blue-700 dark:text-blue-400">0.8%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Disbursement Trend */}
      <Card className="lg:col-span-2 dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Monthly Disbursement Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'].map((month, index) => {
              const values = [68, 72, 85, 92, 78, 95]
              const amounts = [112, 124, 145, 158, 132, 168]
              return (
                <div key={month} className="text-center">
                  <div className="h-32 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-end justify-center p-2 mb-2">
                    <div 
                      className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded"
                      style={{ height: `${values[index]}%` }}
                    />
                  </div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{month}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">KSh {amounts[index]}M</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
