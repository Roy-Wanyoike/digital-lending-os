'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Wallet,
  CreditCard,
  Calendar,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Phone,
  Bell,
  ChevronRight,
  Sparkles,
  Building2,
  ArrowUpRight,
  Download
} from 'lucide-react'

// Types
interface LoanSummary {
  id: string
  loanNumber: string
  principal: number
  outstandingBalance: number
  totalRepaid: number
  totalRepayable: number
  status: 'ACTIVE' | 'IN_ARREARS' | 'FULLY_PAID' | 'DEFAULTED'
  nextPaymentDue?: string
  nextPaymentAmount?: number
  disbursementDate: string
  maturityDate: string
  daysRemaining?: number
  progressPercent: number
}

interface ActivityItem {
  id: string
  type: 'payment' | 'disbursement' | 'application' | 'reminder' | 'approval'
  title: string
  description: string
  amount?: number
  timestamp: string
  icon: React.ReactNode
}

interface DashboardData {
  customerName: string
  availableCredit: number
  outstandingBalance: number
  nextPaymentAmount: number
  nextPaymentDue: string
  activeLoans: LoanSummary[]
  completedLoans: LoanSummary[]
  recentActivity: ActivityItem[]
  creditScore?: number
}

// Mock data for demonstration
const mockDashboardData: DashboardData = {
  customerName: 'John Mwangi',
  availableCredit: 50000,
  outstandingBalance: 18400,
  nextPaymentAmount: 4200,
  nextPaymentDue: '2026-08-28',
  activeLoans: [
    {
      id: '1',
      loanNumber: 'LN-2026-0042',
      principal: 20000,
      outstandingBalance: 5000,
      totalRepaid: 15000,
      totalRepayable: 22600,
      status: 'ACTIVE',
      nextPaymentDue: '2026-08-28',
      nextPaymentAmount: 4200,
      disbursementDate: '2026-08-10',
      maturityDate: '2026-09-10',
      daysRemaining: 12,
      progressPercent: 75
    }
  ],
  completedLoans: [
    {
      id: '2',
      loanNumber: 'LN-2026-0015',
      principal: 15000,
      outstandingBalance: 0,
      totalRepaid: 16950,
      totalRepayable: 16950,
      status: 'FULLY_PAID',
      disbursementDate: '2026-01-15',
      maturityDate: '2026-03-15',
      progressPercent: 100
    },
    {
      id: '3',
      loanNumber: 'LN-2026-0028',
      principal: 10000,
      outstandingBalance: 0,
      totalRepaid: 11300,
      totalRepayable: 11300,
      status: 'FULLY_PAID',
      disbursementDate: '2026-04-01',
      maturityDate: '2026-05-31',
      progressPercent: 100
    }
  ],
  recentActivity: [
    {
      id: '1',
      type: 'payment',
      title: 'Payment Received',
      description: 'Your payment has been processed successfully',
      amount: 4200,
      timestamp: '2 hours ago',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />
    },
    {
      id: '2',
      type: 'disbursement',
      title: 'Loan Disbursed',
      description: 'KSh 20,000 sent to your M-Pesa',
      amount: 20000,
      timestamp: 'Aug 10, 2026',
      icon: <ArrowUpRight className="w-4 h-4 text-blue-500" />
    },
    {
      id: '3',
      type: 'application',
      title: 'Account Created',
      description: 'Welcome to Digital Lending OS!',
      timestamp: 'Jul 15, 2026',
      icon: <Sparkles className="w-4 h-4 text-purple-500" />
    }
  ],
  creditScore: 720
}

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-KE', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  })
}

const getGreeting = (): string => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

export function CustomerHome() {
  const [data, setData] = useState<DashboardData>(mockDashboardData)
  const [isLoading, setIsLoading] = useState(true)

  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  // Get loan status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default" className="bg-emerald-600">Active</Badge>
      case 'IN_ARREARS':
        return <Badge variant="destructive">In Arrears</Badge>
      case 'FULLY_PAID':
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Completed</Badge>
      case 'DEFAULTED':
        return <Badge variant="destructive">Defaulted</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Get days until due date
  const getDaysUntilDue = (dueDate: string): number => {
    const now = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-muted rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-6 md:p-8 text-white shadow-lg shadow-emerald-500/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14 bg-white/20 border-2 border-white/30">
              <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-white to-emerald-100 text-emerald-700">
                {getInitials(data.customerName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {getGreeting()}, {data.customerName.split(' ')[0]}! 👋
              </h1>
              <p className="text-emerald-100 mt-1">
                Here's your financial overview at a glance
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Button 
              size="lg"
              className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold gap-2 shadow-lg"
              onClick={() => document.getElementById('apply-loan-btn')?.click()}
            >
              <Sparkles className="w-5 h-5" />
              Apply for Loan
            </Button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="mt-6 pt-6 border-t border-white/20 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center md:text-left">
            <p className="text-emerald-200 text-xs uppercase tracking-wide">Credit Score</p>
            <p className="text-2xl font-bold mt-1">{data.creditScore || '--'}</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-emerald-200 text-xs uppercase tracking-wide">Total Borrowed</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(45000)}</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-emerald-200 text-xs uppercase tracking-wide">On-Time Payments</p>
            <p className="text-2xl font-bold mt-1">100%</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-emerald-200 text-xs uppercase tracking-wide">Member Since</p>
            <p className="text-2xl font-bold mt-1">Jul 2026</p>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {/* Available to Borrow */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              Available to Borrow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">
              {formatCurrency(data.availableCredit)}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3 gap-2 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/30"
              id="apply-loan-btn"
            >
              Apply Now
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
        </Card>

        {/* Outstanding Balance */}
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-orange-600" />
              Outstanding Balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">
              {formatCurrency(data.outstandingBalance)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Across {data.activeLoans.length} active loan{data.activeLoans.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Next Payment */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Calendar className="w-4 h-4" />
              Next Payment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(data.nextPaymentAmount)}
            </p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm text-blue-600 dark:text-blue-400">
                Due {formatDate(data.nextPaymentDue)}
              </span>
              <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
                Pay Now
                <Phone className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Days remaining indicator */}
            {(() => {
              const daysLeft = getDaysUntilDue(data.nextPaymentDue)
              return (
                <div className={`mt-3 flex items-center gap-2 text-xs px-2 py-1 rounded ${
                  daysLeft <= 3 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  daysLeft <= 7 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                  <Clock className="w-3 h-3" />
                  {daysLeft > 0 ? `${daysLeft} days remaining` : 'Overdue'}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loans Section - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Loans */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg">My Loans</CardTitle>
                <CardDescription>Track your active and completed loans</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ChevronRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.activeLoans.map((loan) => (
                <div key={loan.id} className="border rounded-xl p-4 space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{loan.loanNumber}</span>
                        {getStatusBadge(loan.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(loan.principal)} • {loan.daysRemaining} days remaining
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {loan.progressPercent === 100 ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                      )}
                      <span className="text-sm font-medium text-emerald-600">
                        On Track ✅
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Repayment Progress</span>
                      <span className="font-medium">{loan.progressPercent}% repaid</span>
                    </div>
                    <Progress value={loan.progressPercent} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Repaid: {formatCurrency(loan.totalRepaid)}</span>
                      <span>Remaining: {formatCurrency(loan.outstandingBalance)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button variant="outline" size="sm" className="gap-1">
                      View Details
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                    <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                      Make Payment
                    </Button>
                  </div>
                </div>
              ))}

              {/* Completed Loans Summary */}
              {data.completedLoans.length > 0 && (
                <>
                  <Separator />
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Completed Loans ({data.completedLoans.length})
                      </h4>
                      <Button variant="ghost" size="sm" className="text-xs gap-1">
                        View History
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {data.completedLoans.slice(0, 2).map((loan) => (
                        <div key={loan.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg text-sm">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>{loan.loanNumber}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span>{formatCurrency(loan.principal)}</span>
                            <span className="text-muted-foreground">
                              Repaid {formatDate(loan.maturityDate)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {data.activeLoans.length === 0 && data.completedLoans.length === 0 && (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No loans yet</p>
                  <Button className="mt-3 gap-2">
                    <Sparkles className="w-4 h-4" />
                    Apply for Your First Loan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <Bell className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 group-hover:bg-background transition-colors">
                      {activity.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {activity.description}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {activity.timestamp}
                        </span>
                      </div>
                      {activity.amount !== undefined && (
                        <p className="text-sm font-medium text-emerald-600 mt-1">
                          {formatCurrency(activity.amount)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Apply for Loan</p>
                  <p className="text-xs text-muted-foreground">Get instant approval</p>
                </div>
              </Button>
              
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Make Payment</p>
                  <p className="text-xs text-muted-foreground">Via M-Pesa or Bank</p>
                </div>
              </Button>
              
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">View Statements</p>
                  <p className="text-xs text-muted-foreground">Download PDF reports</p>
                </div>
              </Button>
              
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <Download className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Documents</p>
                  <p className="text-xs text-muted-foreground">Manage KYC documents</p>
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Reminders */}
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-sm">Payment Due</p>
                    <p className="text-xs text-muted-foreground">{formatDate(data.nextPaymentDue)}</p>
                  </div>
                </div>
                <span className="font-bold text-amber-600">
                  {formatCurrency(data.nextPaymentAmount)}
                </span>
              </div>
              
              <Button variant="outline" size="sm" className="w-full gap-2 border-amber-300 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30">
                Set Reminder
                <Bell className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Need Help? */}
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-3">
                <Phone className="w-6 h-6 text-emerald-600" />
              </div>
              <h4 className="font-medium">Need Help?</h4>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Our support team is here for you
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm">Call Us</Button>
                <Button variant="outline" size="sm">WhatsApp</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default CustomerHome
