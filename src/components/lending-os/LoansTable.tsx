'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  CreditCard,
  Eye,
  MoreVertical,
  Phone,
  AlertCircle
} from 'lucide-react'

interface Loan {
  id: string
  loanNumber: string
  customerName: string
  phone: string
  principal: number
  outstandingBalance: number
  interestRate: number
  disbursementDate: string
  nextPaymentDue: string
  status: 'active' | 'in_arrears' | 'defaulted' | 'fully_paid' | 'pending_disbursement'
  daysInArrears?: number
}

export function LoansTable() {
  const loans: Loan[] = [
    {
      id: '1',
      loanNumber: 'LN-2026-00042',
      customerName: 'John Kamau Mwangi',
      phone: '0712 345 678',
      principal: 50000,
      outstandingBalance: 39333,
      interestRate: 15,
      disbursementDate: '2026-01-10',
      nextPaymentDue: '2026-02-10',
      status: 'active'
    },
    {
      id: '2',
      loanNumber: 'LN-2026-00041',
      customerName: 'Grace Wanjiku Njeri',
      phone: '0723 456 789',
      principal: 100000,
      outstandingBalance: 85000,
      interestRate: 12,
      disbursementDate: '2025-12-15',
      nextPaymentDue: '2026-01-25',
      status: 'in_arrears',
      daysInArrears: 8
    },
    {
      id: '3',
      loanNumber: 'LN-2026-00040',
      customerName: 'Peter Ochieng Odhiambo',
      phone: '0734 567 890',
      principal: 25000,
      outstandingBalance: 0,
      interestRate: 18,
      disbursementDate: '2025-11-20',
      nextPaymentDue: '-',
      status: 'fully_paid'
    },
    {
      id: '4',
      loanNumber: 'LN-2026-00039',
      customerName: 'Mary Atieno Ouma',
      phone: '0745 678 901',
      principal: 75000,
      outstandingBalance: 72000,
      interestRate: 14,
      disbursementDate: '2025-11-05',
      nextPaymentDue: '2026-01-05',
      status: 'in_arrears',
      daysInArrears: 28
    },
    {
      id: '5',
      loanNumber: 'LN-2026-00038',
      customerName: 'James Mwangi Kariuki',
      phone: '0756 789 012',
      principal: 150000,
      outstandingBalance: 148500,
      interestRate: 13,
      disbursementDate: '2026-01-18',
      nextPaymentDue: '2026-02-18',
      status: 'active'
    },
    {
      id: '6',
      loanNumber: 'LN-2026-00037',
      customerName: 'Daniel Kipchoge Kosgei',
      phone: '0778 901 234',
      principal: 80000,
      outstandingBalance: 80000,
      interestRate: 16,
      disbursementDate: '2026-01-22',
      nextPaymentDue: '2026-02-22',
      status: 'pending_disbursement'
    }
  ]

  const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`
  
  const formatDate = (dateString: string) => {
    if (dateString === '-') return '-'
    return new Date(dateString).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short'
    })
  }

  const getStatusBadge = (status: Loan['status'], daysInArrears?: number) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-800 border-0">Active</Badge>
      case 'in_arrears':
        return (
          <Badge className="bg-red-100 text-red-800 border-0 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            In Arrears ({daysInArrears}d)
          </Badge>
        )
      case 'defaulted':
        return <Badge className="bg-slate-200 text-slate-800 border-0">Defaulted</Badge>
      case 'fully_paid':
        return <Badge className="bg-blue-100 text-blue-800 border-0">Fully Paid</Badge>
      case 'pending_disbursement':
        return <Badge className="bg-amber-100 text-amber-800 border-0">Pending Disbursement</Badge>
    }
  }

  const totalOutstanding = loans.reduce((sum, loan) => sum + loan.outstandingBalance, 0)
  const arrearsCount = loans.filter(l => l.status === 'in_arrears').length

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Recent Loans
              {arrearsCount > 0 && (
                <Badge className="bg-red-500 text-white border-0 ml-2">
                  {arrearsCount} in arrears
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Active and recent loan portfolio</CardDescription>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm">Export CSV</Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              + New Loan
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Total Outstanding</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(totalOutstanding)}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Active Loans</p>
            <p className="text-lg font-bold text-emerald-700">{loans.filter(l => l.status === 'active').length}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs text-red-600">In Arrears</p>
            <p className="text-lg font-bold text-red-700">{arrearsCount}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600">Fully Paid (MTD)</p>
            <p className="text-lg font-bold text-blue-700">{loans.filter(l => l.status === 'fully_paid').length}</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loan #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Principal</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Disbursed</TableHead>
              <TableHead>Next Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.map((loan) => (
              <TableRow 
                key={loan.id}
                className={loan.status === 'in_arrears' ? 'bg-red-50/30' : ''}
              >
                <TableCell className="font-mono text-sm font-medium">{loan.loanNumber}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{loan.customerName}</p>
                    <p className="text-xs text-slate-500 font-mono">{loan.phone}</p>
                  </div>
                </TableCell>
                <TableCell>{formatCurrency(loan.principal)}</TableCell>
                <TableCell className={`text-right font-semibold ${
                  loan.outstandingBalance > 0 ? 'text-slate-900' : 'text-emerald-600'
                }`}>
                  {formatCurrency(loan.outstandingBalance)}
                </TableCell>
                <TableCell>{loan.interestRate}%</TableCell>
                <TableCell className="text-sm text-slate-500">
                  {formatDate(loan.disbursementDate)}
                </TableCell>
                <TableCell className={`text-sm ${
                  loan.nextPaymentDue !== '-' && new Date(loan.nextPaymentDue) < new Date('2026-01-25')
                    ? 'text-red-600 font-medium'
                    : 'text-slate-600'
                }`}>
                  {formatDate(loan.nextPaymentDue)}
                </TableCell>
                <TableCell>{getStatusBadge(loan.status, loan.daysInArrears)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" title="View details">
                      <Eye className="w-4 h-4" />
                    </Button>
                    {(loan.status === 'in_arrears') && (
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700" title="Contact customer">
                        <Phone className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" title="More options">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        <div className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="text-slate-600">
            Showing <strong>1-6</strong> of <strong>182,432</strong> active loans
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <Button variant="outline" size="sm">Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
