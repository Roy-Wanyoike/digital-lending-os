'use client'

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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Landmark,
  CreditCard,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  MessageSquare,
  Plus,
  ExternalLink,
  Calendar,
  Briefcase,
  Wallet
} from 'lucide-react'

export interface CustomerDetail {
  id: string
  firstName: string
  lastName: string
  phone: string
  email?: string
  nationalId?: string
  alternativePhone?: string
  county?: string
  city?: string
  physicalAddress?: string
  employmentStatus?: string
  employerName?: string
  incomeAmount?: number
  businessName?: string
  bankName?: string
  bankAccount?: string
  mpesaPhone?: string
  creditScore?: number
  crbStatus: 'CLEAN' | 'LISTED' | 'PENDING_CHECK' | 'UNKNOWN'
  totalBorrowed: number
  totalRepaid: number
  outstandingBalance: number
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED' | 'FROZEN' | 'PENDING_VERIFICATION'
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
  createdAt: string
  lastLoanDate?: string
}

export interface LoanSummary {
  id: string
  loanNumber: string
  principal: number
  outstandingBalance: number
  status: string
  disbursementDate: string
  product: string
}

interface CustomerDetailsDialogProps {
  customer: CustomerDetail | null
  loans?: LoanSummary[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onNewLoan?: (customerId: string) => void
  onSendSms?: (phone: string) => void
  onViewDocuments?: (customerId: string) => void
}

export function CustomerDetailsDialog({
  customer,
  loans = [],
  open,
  onOpenChange,
  onNewLoan,
  onSendSms,
  onViewDocuments
}: CustomerDetailsDialogProps) {
  if (!customer) return null

  const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`
  
  const getInitials = (firstName: string, lastName: string) => 
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

  const getCreditScoreColor = (score: number) => {
    if (score >= 700) return 'text-emerald-600 bg-emerald-100'
    if (score >= 600) return 'text-blue-600 bg-blue-100'
    if (score >= 500) return 'text-amber-600 bg-amber-100'
    return 'text-red-600 bg-red-100'
  }

  const getCreditScoreLabel = (score: number) => {
    if (score >= 750) return 'Excellent'
    if (score >= 680) return 'Good'
    if (score >= 600) return 'Fair'
    if (score >= 500) return 'Poor'
    return 'Very Poor'
  }

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'LOW':
        return <Badge className="bg-emerald-100 text-emerald-800 border-0">Low Risk</Badge>
      case 'MEDIUM':
        return <Badge className="bg-amber-100 text-amber-800 border-0">Medium Risk</Badge>
      case 'HIGH':
        return <Badge className="bg-orange-100 text-orange-800 border-0">High Risk</Badge>
      case 'VERY_HIGH':
        return <Badge className="bg-red-100 text-red-800 border-0">Very High Risk</Badge>
      default:
        return <Badge variant="secondary">{level}</Badge>
    }
  }

  const getCrbBadge = (status: string) => {
    switch (status) {
      case 'CLEAN':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-0 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Clean
          </Badge>
        )
      case 'LISTED':
        return (
          <Badge className="bg-red-100 text-red-800 border-0 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Listed
          </Badge>
        )
      case 'PENDING_CHECK':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-0 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Pending Check
          </Badge>
        )
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-emerald-100 text-emerald-800 border-0">Active</Badge>
      case 'INACTIVE':
        return <Badge variant="secondary">Inactive</Badge>
      case 'BLACKLISTED':
        return <Badge className="bg-slate-200 text-slate-800 border-0">Blacklisted</Badge>
      case 'FROZEN':
        return <Badge className="bg-blue-100 text-blue-800 border-0">Frozen</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  const getLoanStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-800 border-0">Active</Badge>
      case 'in_arrears':
        return <Badge className="bg-red-100 text-red-800 border-0">In Arrears</Badge>
      case 'fully_paid':
        return <Badge className="bg-blue-100 text-blue-800 border-0">Fully Paid</Badge>
      case 'defaulted':
        return <Badge className="bg-slate-200 text-slate-800 border-0">Defaulted</Badge>
      case 'pending_disbursement':
        return <Badge className="bg-amber-100 text-amber-800 border-0">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const repaymentRate = customer.totalBorrowed > 0 
    ? Math.round((customer.totalRepaid / customer.totalBorrowed) * 100)
    : 0

  // Generate mock loan history if not provided
  const loanHistory = loans.length > 0 ? loans : [
    { id: '1', loanNumber: 'LN-2026-00042', principal: 50000, outstandingBalance: 39333, status: 'active', disbursementDate: '2026-01-10', product: 'Personal Loan' },
    { id: '2', loanNumber: 'LN-2025-00115', principal: 30000, outstandingBalance: 0, status: 'fully_paid', disbursementDate: '2025-09-20', product: 'Salary Advance' },
    { id: '3', loanNumber: 'LN-2025-00089', principal: 25000, outstandingBalance: 0, status: 'fully_paid', disbursementDate: '2025-06-15', product: 'Emergency Loan' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12 bg-emerald-600">
              <AvatarFallback className="text-white font-semibold">
                {getInitials(customer.firstName, customer.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <span>{customer.firstName} {customer.lastName}</span>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge(customer.status)}
                {getRiskBadge(customer.riskLevel)}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Customer profile and lending history
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          {/* Left Column - Profile & Contact */}
          <div className="space-y-4">
            {/* Profile Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Full Name</span>
                  <span className="text-sm font-medium">{customer.firstName} {customer.lastName}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Phone
                  </span>
                  <span className="text-sm font-mono font-medium">{customer.phone}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email
                  </span>
                  <span className="text-sm font-medium">{customer.email || '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> ID Number
                  </span>
                  <span className="text-sm font-mono">{customer.nationalId || '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Customer Since
                  </span>
                  <span className="text-sm">{new Date(customer.createdAt).toLocaleDateString('en-KE')}</span>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  Contact Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-slate-500">Address</span>
                  <span className="text-sm font-medium text-right max-w-[60%]">
                    {customer.physicalAddress || '-'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">County</span>
                  <span className="text-sm font-medium">{customer.county || '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Alt. Phone</span>
                  <span className="text-sm font-mono">{customer.alternativePhone || '-'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Employment/Business */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-500" />
                  Employment / Business
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Status</span>
                  <span className="text-sm font-medium capitalize">{customer.employmentStatus?.replace('_', ' ') || '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Employer</span>
                  <span className="text-sm font-medium">{customer.employerName || '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Income</span>
                  <span className="text-sm font-medium">
                    {customer.incomeAmount ? formatCurrency(customer.incomeAmount) : '-'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Business</span>
                  <span className="text-sm font-medium">{customer.businessName || '-'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Banking & Credit */}
          <div className="space-y-4">
            {/* Banking Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-slate-500" />
                  Banking Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Bank Name</span>
                  <span className="text-sm font-medium">{customer.bankName || '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Account No.</span>
                  <span className="text-sm font-mono">{customer.bankAccount || '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Wallet className="w-3 h-3" /> M-Pesa Phone
                  </span>
                  <span className="text-sm font-mono">{customer.mpesaPhone || customer.phone}</span>
                </div>
              </CardContent>
            </Card>

            {/* Credit Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-500" />
                  Credit Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Credit Score */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Credit Score</span>
                    {customer.creditScore !== undefined && customer.creditScore > 0 ? (
                      <Badge className={getCreditScoreColor(customer.creditScore)}>
                        {customer.creditScore} - {getCreditScoreLabel(customer.creditScore)}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Not Available</Badge>
                    )}
                  </div>
                  {customer.creditScore !== undefined && customer.creditScore > 0 && (
                    <Progress value={(customer.creditScore / 850) * 100} className="h-2" />
                  )}
                </div>

                <Separator />

                {/* CRB Status */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> CRB Status
                  </span>
                  {getCrbBadge(customer.crbStatus)}
                </div>

                <Separator />

                {/* Totals */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500">Total Borrowed</p>
                    <p className="text-base font-bold text-slate-900">{formatCurrency(customer.totalBorrowed)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-emerald-600">Total Repaid</p>
                    <p className="text-base font-bold text-emerald-700">{formatCurrency(customer.totalRepaid)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Outstanding Balance</span>
                    <span className="font-semibold text-red-600">{formatCurrency(customer.outstandingBalance)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Repayment Rate</span>
                    <span className={`font-semibold ${repaymentRate >= 80 ? 'text-emerald-600' : repaymentRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {repaymentRate}%
                    </span>
                  </div>
                  <Progress value={repaymentRate} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            <Card className={`
              ${customer.riskLevel === 'LOW' ? 'border-emerald-200 bg-emerald-50/30' : ''}
              ${customer.riskLevel === 'MEDIUM' ? 'border-amber-200 bg-amber-50/30' : ''}
              ${customer.riskLevel === 'HIGH' ? 'border-orange-200 bg-orange-50/30' : ''}
              ${customer.riskLevel === 'VERY_HIGH' ? 'border-red-200 bg-red-50/30' : ''}
            `}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${
                    customer.riskLevel === 'LOW' ? 'text-emerald-600' :
                    customer.riskLevel === 'MEDIUM' ? 'text-amber-600' :
                    customer.riskLevel === 'HIGH' ? 'text-orange-600' : 'text-red-600'
                  }`} />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Overall Risk Level</span>
                  {getRiskBadge(customer.riskLevel)}
                </div>
                
                <div className="text-xs text-slate-500 space-y-1 mt-3">
                  {customer.riskLevel === 'LOW' && (
                    <p>✓ Low risk customer with good repayment history.</p>
                  )}
                  {customer.riskLevel === 'MEDIUM' && (
                    <p>⚠ Moderate risk. Monitor payment behavior closely.</p>
                  )}
                  {customer.riskLevel === 'HIGH' && (
                    <p>🔴 High risk. Enhanced monitoring required.</p>
                  )}
                  {customer.riskLevel === 'VERY_HIGH' && (
                    <p>🚨 Very high risk. Consider declining new applications.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Loan History & Actions */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-emerald-800">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  size="sm" 
                  className="w-full justify-start bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => onNewLoan?.(customer.id)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Loan Application
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => onSendSms?.(customer.phone)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send SMS
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => onViewDocuments?.(customer.id)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Documents
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Full Profile
                </Button>
              </CardContent>
            </Card>

            {/* Loan History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-500" />
                  Loan History ({loanHistory.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {loanHistory.map((loan) => (
                    <div key={loan.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-sm font-medium">{loan.loanNumber}</p>
                          <p className="text-xs text-slate-500">{loan.product}</p>
                        </div>
                        {getLoanStatusBadge(loan.status)}
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Principal: {formatCurrency(loan.principal)}</span>
                        <span>Outstanding: <span className={loan.outstandingBalance > 0 ? 'text-red-600 font-medium' : 'text-emerald-600'}>{formatCurrency(loan.outstandingBalance)}</span></span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Disbursed: {new Date(loan.disbursementDate).toLocaleDateString('en-KE')}
                      </div>
                    </div>
                  ))}
                  
                  {loanHistory.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">
                      No loan history available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
