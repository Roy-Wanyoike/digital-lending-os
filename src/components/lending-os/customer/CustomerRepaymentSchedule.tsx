'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Download,
  CreditCard,
  TrendingUp,
  Info,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

// Types
interface Installment {
  id: number
  installmentNumber: number
  dueDate: string
  principal: number
  interest: number
  fees: number
  totalAmount: number
  balanceAfterPayment: number
  status: 'PAID' | 'CURRENT' | 'UPCOMING' | 'OVERDUE'
  paidDate?: string
  paymentReference?: string
}

interface LoanSummary {
  loanNumber: string
  principal: number
  totalInterest: number
  totalFees: number
  totalRepayable: number
  amountRepaid: number
  outstandingBalance: number
  startDate: string
  maturityDate: string
  interestRate: number
  status: 'ACTIVE' | 'COMPLETED' | 'IN_ARREARS'
}

interface RepaymentScheduleProps {
  loan?: LoanSummary
  installments?: Installment[]
}

// Mock data
const mockLoan: LoanSummary = {
  loanNumber: 'LN-2026-0042',
  principal: 20000,
  totalInterest: 2600,
  totalFees: 1000,
  totalRepayable: 23600,
  amountRepaid: 15000,
  outstandingBalance: 5000,
  startDate: '2026-08-10',
  maturityDate: '2027-02-10',
  interestRate: 13,
  status: 'ACTIVE'
}

const mockInstallments: Installment[] = [
  {
    id: 1,
    installmentNumber: 1,
    dueDate: '2026-09-10',
    principal: 3333.33,
    interest: 433.33,
    fees: 166.67,
    totalAmount: 3933.33,
    balanceAfterPayment: 16666.67,
    status: 'PAID',
    paidDate: '2026-09-08',
    paymentReference: 'MP20260908001'
  },
  {
    id: 2,
    installmentNumber: 2,
    dueDate: '2026-10-10',
    principal: 3333.33,
    interest: 433.33,
    fees: 166.67,
    totalAmount: 3933.33,
    balanceAfterPayment: 13333.34,
    status: 'PAID',
    paidDate: '2026-10-09',
    paymentReference: 'MP20260909001'
  },
  {
    id: 3,
    installmentNumber: 3,
    dueDate: '2026-11-10',
    principal: 3333.34,
    interest: 433.34,
    fees: 166.66,
    totalAmount: 3933.34,
    balanceAfterPayment: 10000,
    status: 'PAID',
    paidDate: '2026-11-10',
    paymentReference: 'BK20261110001'
  },
  {
    id: 4,
    installmentNumber: 4,
    dueDate: '2026-12-10',
    principal: 3333.33,
    interest: 433.33,
    fees: 166.67,
    totalAmount: 3933.33,
    balanceAfterPayment: 6666.67,
    status: 'PAID',
    paidDate: '2026-12-08',
    paymentReference: 'MP20261208001'
  },
  {
    id: 5,
    installmentNumber: 5,
    dueDate: '2027-01-10',
    principal: 3333.33,
    interest: 433.33,
    fees: 166.67,
    totalAmount: 3933.33,
    balanceAfterPayment: 3333.34,
    status: 'CURRENT',
    dueDate: '2027-01-10'
  },
  {
    id: 6,
    installmentNumber: 6,
    dueDate: '2027-02-10',
    principal: 3333.34,
    interest: 433.33,
    fees: 166.66,
    totalAmount: 3933.33,
    balanceAfterPayment: 0,
    status: 'UPCOMING'
  }
]

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-KE', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatDateShort = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-KE', {
    month: 'short',
    day: 'numeric'
  })
}

// Status badge component
function InstallmentStatusBadge({ status }: { status: Installment['status'] }) {
  const config = {
    PAID: {
      icon: <CheckCircle2 className="w-4 h-4" />,
      label: 'Paid',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
    },
    CURRENT: {
      icon: <Clock className="w-4 h-4 animate-pulse" />,
      label: 'Due Now',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
    },
    UPCOMING: {
      icon: <Calendar className="w-4 h-4" />,
      label: 'Upcoming',
      className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
    },
    OVERDUE: {
      icon: <AlertCircle className="w-4 h-4" />,
      label: 'Overdue',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
    }
  }

  const { icon, label, className } = config[status]

  return (
    <Badge variant="secondary" className={`gap-1 ${className}`}>
      {icon}
      {label}
    </Badge>
  )
}

export function RepaymentSchedule({ 
  loan = mockLoan, 
  installments = mockInstallments 
}: RepaymentScheduleProps) {
  const [showDetails, setShowDetails] = useState(true)
  
  // Calculate progress
  const progressPercent = (loan.amountRepaid / loan.totalRepayable) * 100
  
  // Get current/upcoming installment
  const currentInstallment = installments.find(i => i.status === 'CURRENT') || 
                            installments.find(i => i.status === 'UPCOMING')
  
  // Count remaining installments
  const remainingInstallments = installments.filter(
    i => i.status === 'CURRENT' || i.status === 'UPCOMING' || i.status === 'OVERDUE'
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Repayment Schedule</h2>
        <p className="text-muted-foreground mt-1">
          Track your loan repayment progress and upcoming payments
        </p>
      </div>

      {/* Loan Summary Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-emerald-100 text-sm">Loan</p>
              <p className="text-xl font-bold">{loan.loanNumber}</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-emerald-200 text-xs uppercase tracking-wide">Principal</p>
                <p className="text-lg font-bold">{formatCurrency(loan.principal)}</p>
              </div>
              <div>
                <p className="text-emerald-200 text-xs uppercase tracking-wide">Interest Rate</p>
                <p className="text-lg font-bold">{loan.interestRate}%</p>
              </div>
              <div>
                <p className="text-emerald-200 text-xs uppercase tracking-wide">Total Repayable</p>
                <p className="text-lg font-bold">{formatCurrency(loan.totalRepayable)}</p>
              </div>
              <div>
                <p className="text-emerald-200 text-xs uppercase tracking-wide">Remaining</p>
                <p className="text-lg font-bold">{formatCurrency(loan.outstandingBalance)}</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6 pt-6 border-t border-white/20">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Repayment Progress</span>
              <span className="font-semibold">{progressPercent.toFixed(1)}%</span>
            </div>
            <Progress value={progressPercent} className="h-3 bg-white/20 [&>div]:bg-white" />
            <div className="flex justify-between mt-2 text-sm text-emerald-100">
              <span>{formatCurrency(loan.amountRepaid)} repaid</span>
              <span>{installments.length} installments • {remainingInstallments} remaining</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Start Date</p>
            <p className="font-semibold">{formatDateShort(loan.startDate)}</p>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Maturity Date</p>
            <p className="font-semibold">{formatDateShort(loan.maturityDate)}</p>
          </div>
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Next Payment</p>
            <p className="font-semibold">
              {currentInstallment ? formatCurrency(currentInstallment.totalAmount) : '--'}
            </p>
          </div>
          <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge 
              variant={loan.status === 'ACTIVE' ? 'default' : 'secondary'}
              className={loan.status === 'ACTIVE' ? 'bg-emerald-600' : ''}
            >
              {loan.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Payment Breakdown */}
      <Card>
        <CardHeader 
          className="cursor-pointer select-none"
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Payment Breakdown
            </CardTitle>
            {showDetails ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <CardDescription>How your payment is allocated</CardDescription>
        </CardHeader>
        
        {showDetails && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-700 dark:text-blue-300">Principal</span>
                  <Info className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {formatCurrency(loan.principal)}
                </p>
                <div className="mt-2 h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(loan.principal / loan.totalRepayable) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {(loan.principal / loan.totalRepayable * 100).toFixed(1)}% of total
                </p>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-amber-700 dark:text-amber-300">Interest</span>
                  <Info className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {formatCurrency(loan.totalInterest)}
                </p>
                <div className="mt-2 h-2 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${(loan.totalInterest / loan.totalRepayable) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {(loan.totalInterest / loan.totalRepayable * 100).toFixed(1)}% of total
                </p>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-purple-700 dark:text-purple-300">Fees</span>
                  <Info className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {formatCurrency(loan.totalFees)}
                </p>
                <div className="mt-2 h-2 bg-purple-200 dark:bg-purple-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${(loan.totalFees / loan.totalRepayable) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  {(loan.totalFees / loan.totalRepayable * 100).toFixed(1)}% of total
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Installment Schedule Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Installment Schedule
              </CardTitle>
              <CardDescription>
                {installments.length} installments • {remainingInstallments} remaining
              </CardDescription>
            </div>
            
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Download Schedule
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-right">Interest</TableHead>
                <TableHead className="text-right">Fees</TableHead>
                <TableHead className="text-right font-semibold">Total</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installments.map((installment) => (
                <TableRow 
                  key={installment.id}
                  className={`${
                    installment.status === 'CURRENT' ? 'bg-blue-50/50 dark:bg-blue-950/20' :
                    installment.status === 'OVERDUE' ? 'bg-red-50/50 dark:bg-red-950/20' :
                    ''
                  }`}
                >
                  <TableCell className="font-medium">{installment.installmentNumber}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{formatDate(installment.dueDate)}</span>
                    </div>
                    {installment.paidDate && (
                      <div className="text-xs text-emerald-600 dark:text-emerald-400">
                        Paid {formatDateShort(installment.paidDate!)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(installment.principal)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(installment.interest)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(installment.fees)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(installment.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={installment.balanceAfterPayment === 0 ? 'text-emerald-600 font-medium' : ''}>
                      {formatCurrency(installment.balanceAfterPayment)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <InstallmentStatusBadge status={installment.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {(installment.status === 'CURRENT' || installment.status === 'OVERDUE') ? (
                      <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                        <CreditCard className="w-4 h-4" />
                        Pay Now
                      </Button>
                    ) : installment.status === 'UPCOMING' ? (
                      <Button size="sm" variant="outline" className="gap-1">
                        <Zap className="w-4 h-4" />
                        Pay Early
                      </Button>
                    ) : installment.paymentReference ? (
                      <Button size="sm" variant="ghost" className="gap-1">
                        <Download className="w-4 h-4" />
                        Receipt
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Total Row */}
              <TableRow className="font-bold border-t-2 bg-muted/30">
                <TableCell colSpan={5} className="text-right">
                  Total:
                </TableCell>
                <TableCell className="text-right text-emerald-600">
                  {formatCurrency(loan.totalRepayable)}
                </TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Early Payment Option */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 dark:border-emerald-800 dark:from-emerald-950/30 dark:to-teal-950/30">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-200">
                  Pay Off Early & Save on Interest!
                </h4>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                  Settle your loan early and you could save up to{' '}
                  <strong>{formatCurrency(loan.totalInterest * 0.3)}</strong> in future interest charges.
                </p>
              </div>
            </div>
            
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 whitespace-nowrap">
              <CreditCard className="w-4 h-4" />
              Pay Full Balance ({formatCurrency(loan.outstandingBalance)})
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help Note */}
      <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm">
        <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-slate-700 dark:text-slate-300">Need help understanding your schedule?</p>
          <ul className="mt-2 space-y-1 text-slate-600 dark:text-slate-400 list-disc list-inside">
            <li><strong>Principal:</strong> The original loan amount being repaid each month</li>
            <li><strong>Interest:</strong> Cost of borrowing calculated at {loan.interestRate}% per month</li>
            <li><strong>Fees:</strong> Processing and service charges included in each payment</li>
            <li>Late payments may incur additional penalties</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default RepaymentSchedule
