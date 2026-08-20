'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Download
} from 'lucide-react'

interface RepaymentInstallment {
  installmentNo: number
  dueDate: string
  principal: number
  interest: number
  fees: number
  total: number
  status: 'paid' | 'pending' | 'overdue' | 'upcoming'
  paymentDate?: string
  reference?: string
}

export function RepaymentSchedule() {
  // Mock repayment schedule data
  const loanDetails = {
    loanNumber: 'LN-2026-00042',
    principal: 50000,
    totalInterest: 7500,
    processingFee: 1500,
    totalRepayable: 59000,
    disbursementDate: '2026-01-10',
    nextPaymentDue: '2026-02-10',
    outstandingBalance: 39333
  }

  const installments: RepaymentInstallment[] = [
    {
      installmentNo: 1,
      dueDate: '2026-02-10',
      principal: 16667,
      interest: 2500,
      fees: 500,
      total: 19667,
      status: 'paid',
      paymentDate: '2026-02-09',
      reference: 'MPESA123456'
    },
    {
      installmentNo: 2,
      dueDate: '2026-03-10',
      principal: 16666,
      interest: 2500,
      fees: 500,
      total: 19666,
      status: 'paid',
      paymentDate: '2026-03-08',
      reference: 'MPESA789012'
    },
    {
      installmentNo: 3,
      dueDate: '2026-04-10',
      principal: 16667,
      interest: 2500,
      fees: 500,
      total: 19667,
      status: 'current',
      paymentDate: undefined
    },
    {
      installmentNo: 4,
      dueDate: '2026-05-10',
      principal: 16666,
      interest: 2500,
      fees: 500,
      total: 19666,
      status: 'upcoming'
    }
  ]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getStatusBadge = (status: RepaymentInstallment['status']) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border-0"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</Badge>
      case 'current':
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border-0"><Clock className="w-3 h-3 mr-1" /> Due Now</Badge>
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border-0"><AlertTriangle className="w-3 h-3 mr-1" /> Overdue</Badge>
      case 'upcoming':
        return <Badge variant="secondary" className="text-slate-600 dark:text-slate-400 dark:bg-slate-700">Upcoming</Badge>
    }
  }

  const paidTotal = installments.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0)
  const remainingTotal = installments.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.total, 0)

  return (
    <div className="space-y-6">
      {/* Loan Summary Header */}
      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Repayment Schedule
              </CardTitle>
              <CardDescription className="mt-1">
                Loan #{loanDetails.loanNumber} - Installment breakdown and payment history
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="dark:border-slate-600 dark:hover:bg-slate-800">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Original Principal</p>
              <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(loanDetails.principal)}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Outstanding Balance</p>
              <p className="font-bold text-amber-700 dark:text-amber-400">{formatCurrency(loanDetails.outstandingBalance)}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Next Payment Due</p>
              <p className="font-bold text-slate-900 dark:text-white">Apr 10, 2026</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3">
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Amount Repaid</p>
              <p className="font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(paidTotal)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Progress */}
      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Repayment Progress</span>
              <span className="font-semibold text-slate-900 dark:text-white">{Math.round((paidTotal / loanDetails.totalRepayable) * 100)}%</span>
            </div>
            <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                style={{ width: `${(paidTotal / loanDetails.totalRepayable) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{formatCurrency(paidTotal)} repaid</span>
              <span>{formatCurrency(remainingTotal)} remaining</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Installment Table */}
      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-base">Payment Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-slate-700 hover:dark:bg-slate-800/80">
                  <TableHead>#</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right font-semibold">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.map((installment) => (
                  <TableRow 
                    key={installment.installmentNo}
                    className={`
                      ${installment.status === 'current' ? 'bg-amber-50 dark:bg-amber-950/20' : ''}
                      ${installment.status === 'overdue' ? 'bg-red-50 dark:bg-red-950/20' : ''}
                      dark:border-slate-700 hover:dark:bg-slate-800/50
                    `}
                  >
                    <TableCell className="font-medium">{installment.installmentNo}</TableCell>
                    <TableCell>{installment.dueDate}</TableCell>
                    <TableCell className="text-right">{formatCurrency(installment.principal)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(installment.interest)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(installment.fees)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(installment.total)}</TableCell>
                    <TableCell>{getStatusBadge(installment.status)}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      {installment.reference || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Table Footer */}
          <div className="mt-4 pt-4 border-t flex flex-col md:flex-row justify-between items-start md:items-center gap-4 dark:border-slate-700">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <strong className="text-slate-900 dark:text-white">Total Repayable:</strong> {formatCurrency(loanDetails.totalRepayable)}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
                Make Payment
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="sm" className="dark:border-slate-600 dark:hover:bg-slate-800">
                Set Up Auto-Pay
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods Info */}
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">Payment Options</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                <li>• M-Pesa Paybill: <strong>123456</strong> Account: <strong>{loanDetails.loanNumber}</strong></li>
                <li>• Bank Transfer available for amounts over KSh 100,000</li>
                <li>• Payments are reflected within 30 minutes during business hours</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
