'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  Filter
} from 'lucide-react'

interface Application {
  id: string
  applicantName: string
  phone: string
  amount: number
  product: string
  purpose: string
  submittedAt: string
  status: 'pending_review' | 'under_review' | 'approved' | 'rejected' | 'kyc_pending'
  riskScore?: number
}

export function ApplicationsTable() {
  const [statusFilter, setStatusFilter] = useState('all')
  
  const applications: Application[] = [
    {
      id: 'APP-2026-0842',
      applicantName: 'John Kamau Mwangi',
      phone: '0712 345 678',
      amount: 50000,
      product: 'Personal Loan',
      purpose: 'School fees payment',
      submittedAt: '2026-01-20T09:30:00Z',
      status: 'pending_review',
      riskScore: 72
    },
    {
      id: 'APP-2026-0841',
      applicantName: 'Grace Wanjiku Njeri',
      phone: '0723 456 789',
      amount: 100000,
      product: 'Business Loan',
      purpose: 'Inventory purchase',
      submittedAt: '2026-01-20T08:15:00Z',
      status: 'under_review',
      riskScore: 68
    },
    {
      id: 'APP-2026-0840',
      applicantName: 'Peter Ochieng Odhiambo',
      phone: '0734 567 890',
      amount: 25000,
      product: 'Salary Advance',
      purpose: 'Emergency medical',
      submittedAt: '2026-01-19T16:45:00Z',
      status: 'kyc_pending'
    },
    {
      id: 'APP-2026-0839',
      applicantName: 'Mary Atieno Ouma',
      phone: '0745 678 901',
      amount: 75000,
      product: 'Personal Loan',
      purpose: 'Home renovation',
      submittedAt: '2026-01-19T14:20:00Z',
      status: 'approved',
      riskScore: 81
    },
    {
      id: 'APP-2026-0838',
      applicantName: 'James Mwangi Kariuki',
      phone: '0756 789 012',
      amount: 150000,
      product: 'Business Loan',
      purpose: 'Equipment purchase',
      submittedAt: '2026-01-18T11:00:00Z',
      status: 'rejected',
      riskScore: 35
    },
    {
      id: 'APP-2026-0837',
      applicantName: 'Faith Nyokabi Githinji',
      phone: '0767 890 123',
      amount: 30000,
      product: 'Emergency Loan',
      purpose: 'Rent payment',
      submittedAt: '2026-01-18T09:30:00Z',
      status: 'pending_review',
      riskScore: 65
    }
  ]

  const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: Application['status']) => {
    switch (status) {
      case 'pending_review':
        return <Badge className="bg-amber-100 text-amber-800 border-0">Pending Review</Badge>
      case 'under_review':
        return <Badge className="bg-blue-100 text-blue-800 border-0">Under Review</Badge>
      case 'approved':
        return <Badge className="bg-emerald-100 text-emerald-800 border-0">Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-0">Rejected</Badge>
      case 'kyc_pending':
        return <Badge className="bg-slate-100 text-slate-700 border-0">KYC Pending</Badge>
    }
  }

  const getRiskColor = (score?: number) => {
    if (!score) return 'text-slate-400'
    if (score >= 70) return 'text-emerald-600'
    if (score >= 50) return 'text-amber-600'
    return 'text-red-600'
  }

  const filteredApplications = statusFilter === 'all' 
    ? applications 
    : applications.filter(app => app.status === statusFilter)

  const pendingCount = applications.filter(a => a.status === 'pending_review').length

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5 text-emerald-600" />
              Applications Queue
              {pendingCount > 0 && (
                <Badge className="bg-red-500 text-white border-0 ml-2">
                  {pendingCount} pending
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Review and process loan applications</CardDescription>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="kyc_pending">KYC Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Application ID</TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Risk Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApplications.map((app) => (
              <TableRow key={app.id} className={
                app.status === 'pending_review' ? 'bg-amber-50/50' : ''
              }>
                <TableCell className="font-mono text-sm">{app.id}</TableCell>
                <TableCell className="font-medium">{app.applicantName}</TableCell>
                <TableCell className="font-mono text-sm text-slate-600">{app.phone}</TableCell>
                <TableCell>{app.product}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(app.amount)}</TableCell>
                <TableCell>
                  <span className={`font-semibold ${getRiskColor(app.riskScore)}`}>
                    {app.riskScore || '-'}
                  </span>
                </TableCell>
                <TableCell>{getStatusBadge(app.status)}</TableCell>
                <TableCell className="text-sm text-slate-500">
                  {formatDate(app.submittedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" title="View details">
                      <Eye className="w-4 h-4" />
                    </Button>
                    {(app.status === 'pending_review' || app.status === 'under_review') && (
                      <>
                        <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" title="Approve">
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" title="Reject">
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Summary Footer */}
        <div className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="flex gap-4 text-slate-600">
            <span>Total: <strong>{applications.length}</strong></span>
            <span>Pending: <strong className="text-amber-600">{pendingCount}</strong></span>
            <span>Approved today: <strong className="text-emerald-600">12</strong></span>
          </div>
          <Button variant="outline" size="sm">
            View All Applications
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
