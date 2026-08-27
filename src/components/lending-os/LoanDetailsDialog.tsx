'use client'

import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CreditCard,
  User,
  Phone,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  FileText,
  Plus,
  Send,
  Eye
} from 'lucide-react'

export interface LoanDetail {
  id: string
  loanNumber: string
  customerName: string
  customerId: string
  phone: string
  principal: number
  approvedAmount: number
  interestRate: number
  interestType: 'FLAT_RATE' | 'REDUCING_BALANCE' | 'AMORTIZED'
  processingFee: number
  insuranceFee: number
  totalInterest: number
  totalFees: number
  totalRepayable: number
  termDays: number
  disbursementDate: string
  maturityDate?: string
  repaidPrincipal: number
  repaidInterest: number
  repaidFees: number
  totalRepaid: number
  outstandingBalance: number
  nextPaymentDue?: string
  daysInArrears: number
  status: 'APPROVED' | 'ACTIVE' | 'IN_ARREARS' | 'DEFAULTED' | 'FULLY_PAID' | 'WRITTEN_OFF' | 'PENDING_DISBURSEMENT' | 'DISBURSED'
  arrearsStatus: 'CURRENT' | 'DAYS_1_7' | 'DAYS_8_30' | 'DAYS_31_60' | 'DAYS_61_90' | 'DAYS_91_PLUS'
  disbursementMethod?: string
  disbursementReference?: string
  product: string
}

export interface RepaymentScheduleItem {
  installmentNo: number
  dueDate: string
  principal: number
  interest: number
  fees: number
  total: number
  status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED'
  paidDate?: string
  paidAmount?: number
}

export interface TransactionRecord {
  id: string
  type: 'DISBURSEMENT' | 'REPAYMENT' | 'FEE' | 'PENALTY' | 'ADJUSTMENT'
  amount: number
  description: string
  reference?: string
  date: string
  balanceAfter: number
}

interface LoanDetailsDialogProps {
  loan: LoanDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule?: RepaymentScheduleItem[]
  transactions?: TransactionRecord[]
  onRecordPayment?: (loanId: string) => void
  onSendReminder?: (customerId: string, phone: string) => void
  onViewCustomer?: (customerId: string) => void
}

export function LoanDetailsDialog({
  loan,
  open,
  onOpenChange,
  schedule = [],
  transactions = [],
  onRecordPayment,
  onSendReminder,
  onViewCustomer
}: LoanDetailsDialogProps) {
  const [collectionNotes, setCollectionNotes] = useState('')
  
  if (!loan) return null

  const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'DISBURSED':
        return <Badge className="bg-emerald-100 text-emerald-800 border-0">Active</Badge>
      case 'IN_ARREARS':
        return (
          <Badge className="bg-red-100 text-red-800 border-0 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            In Arrears ({loan.daysInArrears}d)
          </Badge>
        )
      case 'DEFAULTED':
        return <Badge className="bg-slate-200 text-slate-800 border-0">Defaulted</Badge>
      case 'FULLY_PAID':
        return <Badge className="bg-blue-100 text-blue-800 border-0">Fully Paid</Badge>
      case 'PENDING_DISBURSEMENT':
        return <Badge className="bg-amber-100 text-amber-800 border-0">Pending Disbursement</Badge>
      case 'APPROVED':
        return <Badge className="bg-purple-100 text-purple-800 border-0">Approved</Badge>
      case 'WRITTEN_OFF':
        return <Badge className="bg-slate-100 text-slate-600 border-0">Written Off</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getInstallmentStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-emerald-100 text-emerald-800 border-0 text-xs">Paid</Badge>
      case 'PENDING':
        return <Badge variant="secondary" className="text-xs">Pending</Badge>
      case 'OVERDUE':
        return <Badge className="bg-red-100 text-red-800 border-0 text-xs">Overdue</Badge>
      case 'PARTIAL':
        return <Badge className="bg-amber-100 text-amber-800 border-0 text-xs">Partial</Badge>
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>
    }
  }

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'DISBURSEMENT':
        return <TrendingDown className="w-4 h-4 text-emerald-600" />
      case 'REPAYMENT':
        return <TrendingUp className="w-4 h-4 text-blue-600" />
      case 'FEE':
      case 'PENALTY':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <DollarSign className="w-4 h-4 text-slate-500" />
    }
  }

  // Calculate repayment progress
  const repaymentProgress = loan.totalRepayable > 0 
    ? Math.round((loan.totalRepaid / loan.totalRepayable) * 100)
    : 0

  // Generate mock repayment schedule if not provided
  const repaymentSchedule = schedule.length > 0 ? schedule : generateMockSchedule(loan)

  // Generate mock transactions if not provided
  const transactionHistory = transactions.length > 0 ? transactions : generateMockTransactions(loan)

  function generateMockSchedule(l: LoanDetail): RepaymentScheduleItem[] {
    const installments: RepaymentScheduleItem[] = []
    const numInstallments = Math.ceil(l.termDays / 30)
    const principalPerInstallment = l.principal / numInstallments
    const interestPerInstallment = l.totalInterest / numInstallments
    
    for (let i = 1; i <= numInstallments; i++) {
      const dueDate = new Date(l.disbursementDate)
      dueDate.setMonth(dueDate.getMonth() + i)
      
      let status: RepaymentScheduleItem['status'] = 'PENDING'
      if (i <= Math.floor(numInstallments * (l.totalRepaid / l.totalRepayable))) {
        status = 'PAID'
      } else if (new Date(dueDate) < new Date()) {
        status = 'OVERDUE'
      }
      
      installments.push({
        installmentNo: i,
        dueDate: dueDate.toISOString().split('T')[0],
        principal: Math.round(principalPerInstallment),
        interest: Math.round(interestPerInstallment),
        fees: Math.round(l.processingFee / numInstallments),
        total: Math.round(principalPerInstallment + interestPerInstallment + (l.processingFee / numInstallments)),
        status,
        paidDate: status === 'PAID' ? dueDate.toISOString().split('T')[0] : undefined,
        paidAmount: status === 'PAID' ? Math.round(principalPerInstallment + interestPerInstallment) : undefined
      })
    }
    
    return installments
  }

  function generateMockTransactions(l: LoanDetail): TransactionRecord[] {
    const txns: TransactionRecord[] = []
    
    // Disbursement
    txns.push({
      id: 'txn-1',
      type: 'DISBURSEMENT',
      amount: l.approvedAmount,
      description: `Loan disbursement via ${l.disbursementMethod || 'M-Pesa'}`,
      reference: l.disbursementReference || 'MPESA12345',
      date: l.disbursementDate,
      balanceAfter: l.approvedAmount
    })
    
    // Some repayments if any
    if (l.totalRepaid > 0) {
      const numPayments = Math.min(Math.floor(l.totalRepaid / (l.principal / 6)), 5)
      for (let i = 1; i <= numPayments; i++) {
        const payDate = new Date(l.disbursementDate)
        payDate.setMonth(payDate.getMonth() + i)
        const paymentAmount = Math.min(
          l.principal / 6 + (l.totalInterest / 6),
          l.totalRepaid - txns.filter(t => t.type === 'REPAYMENT').reduce((sum, t) => sum + t.amount, 0)
        )
        
        txns.push({
          id: `txn-${i + 1}`,
          type: 'REPAYMENT',
          amount: Math.round(paymentAmount),
          description: `Loan repayment - Installment #${i}`,
          reference: `MPESA${10000 + i}`,
          date: payDate.toISOString().split('T')[0],
          balanceAfter: l.approvedAmount - (txns.filter(t => t.type === 'REPAYMENT').reduce((sum, t) => sum + t.amount, 0) + paymentAmount)
        })
      }
    }
    
    return txns
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <span>{loan.loanNumber}</span>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge(loan.status)}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            {loan.product} • {loan.customerName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          {/* Left Column - Summary & Progress */}
          <div className="space-y-4">
            {/* Loan Summary Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-500" />
                  Loan Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Product</span>
                  <span className="text-sm font-medium">{loan.product}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Principal</span>
                  <span className="text-sm font-semibold">{formatCurrency(loan.principal)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Approved Amount</span>
                  <span className="text-sm font-semibold">{formatCurrency(loan.approvedAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Interest Rate</span>
                  <span className="text-sm font-medium">{loan.interestRate}% {loan.interestType.replace('_', ' ')}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Term
                  </span>
                  <span className="text-sm font-medium">{loan.termDays} days</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Disbursed</span>
                  <span className="text-sm font-medium">{formatDate(loan.disbursementDate)}</span>
                </div>
                {loan.maturityDate && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Maturity</span>
                      <span className="text-sm font-medium">{formatDate(loan.maturityDate)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Repayment Progress */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-500" />
                  Repayment Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative pt-2">
                  <div className="flex justify-between mb-2">
                    <span className="text-2xl font-bold text-slate-900">{repaymentProgress}%</span>
                    <span className="text-sm text-slate-500">Complete</span>
                  </div>
                  <Progress value={repaymentProgress} className="h-3" />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Total Repayable</p>
                    <p className="text-base font-bold text-slate-900">{formatCurrency(loan.totalRepayable)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <p className="text-xs text-emerald-600">Total Repaid</p>
                    <p className="text-base font-bold text-emerald-700">{formatCurrency(loan.totalRepaid)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Outstanding Balance</span>
                    <span className={`font-semibold ${loan.outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatCurrency(loan.outstandingBalance)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Principal Repaid</span>
                    <span>{formatCurrency(loan.repaidPrincipal)} / {formatCurrency(loan.principal)}</span>
                  </div>
                  <Progress value={(loan.repaidPrincipal / loan.principal) * 100} className="h-1.5" />
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Interest Repaid</span>
                    <span>{formatCurrency(loan.repaidInterest)} / {formatCurrency(loan.totalInterest)}</span>
                  </div>
                  <Progress value={loan.totalInterest > 0 ? (loan.repaidInterest / loan.totalInterest) * 100 : 0} className="h-1.5" />
                </div>

                {loan.nextPaymentDue && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between bg-amber-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <div>
                          <p className="text-xs text-amber-700">Next Payment Due</p>
                          <p className="font-semibold text-amber-800">{formatDate(loan.nextPaymentDue)}</p>
                        </div>
                      </div>
                      {loan.daysInArrears > 0 && (
                        <Badge className="bg-red-100 text-red-800 border-0">
                          {loan.daysInArrears} days overdue
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-blue-800">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  size="sm" 
                  className="w-full justify-start bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => onRecordPayment?.(loan.id)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => onSendReminder?.(loan.customerId, loan.phone)}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Reminder
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => onViewCustomer?.(loan.customerId)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Customer
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Middle & Right Columns */}
          <div className="lg:col-span-2 space-y-4">
            {/* Customer Info Bar */}
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{loan.customerName}</p>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {loan.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onViewCustomer?.(loan.customerId)}
                  >
                    View Full Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Repayment Schedule */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  Repayment Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Principal</TableHead>
                        <TableHead className="text-right">Interest</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repaymentSchedule.map((installment) => (
                        <TableRow key={installment.installmentNo} className={
                          installment.status === 'OVERDUE' ? 'bg-red-50/30' : ''
                        }>
                          <TableCell className="font-mono text-sm">{installment.installmentNo}</TableCell>
                          <TableCell className="text-sm">
                            {formatDate(installment.dueDate)}
                            {installment.paidDate && (
                              <p className="text-xs text-emerald-600">Paid: {formatDate(installment.paidDate)}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(installment.principal)}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(installment.interest)}</TableCell>
                          <TableCell className="text-right font-medium text-sm">{formatCurrency(installment.total)}</TableCell>
                          <TableCell>{getInstallmentStatusBadge(installment.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Transaction History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-slate-500" />
                  Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[250px] overflow-y-auto space-y-3">
                  {transactionHistory.map((txn) => (
                    <div key={txn.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="mt-0.5">
                        {getTransactionTypeIcon(txn.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-medium truncate">{txn.description}</p>
                          <span className={`font-semibold ml-2 ${
                            txn.type === 'DISBURSEMENT' ? 'text-emerald-600' :
                            txn.type === 'REPAYMENT' ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            {txn.type === 'DISBURSEMENT' ? '+' : '-'}{formatCurrency(txn.amount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>{formatDate(txn.date)}</span>
                            {txn.reference && (
                              <span className="font-mono">• {txn.reference}</span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">
                            Bal: {formatCurrency(txn.balanceAfter)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Collection Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-500" />
                  Collection Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Add collection notes, follow-up details, or customer communication records..."
                  value={collectionNotes}
                  onChange={(e) => setCollectionNotes(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCollectionNotes('')}>
                    Clear
                  </Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    Save Notes
                  </Button>
                </div>
                
                {/* Sample existing notes */}
                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Recent Notes</p>
                  <div className="bg-amber-50 p-3 rounded-lg text-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-amber-800">Follow-up Call</span>
                      <span className="text-xs text-amber-600">Jan 20, 2026</span>
                    </div>
                    <p className="text-amber-700">Customer promised to make payment by end of week. Will follow up again on Friday.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
