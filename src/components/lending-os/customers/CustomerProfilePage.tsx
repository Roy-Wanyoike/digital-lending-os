'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { CustomerOverviewTab } from './CustomerOverviewTab'
import { KYCIdentityTab } from './KYCIdentityTab'
import { LoanHistoryTab } from './LoanHistoryTab'
import { PaymentHistoryTab } from './PaymentHistoryTab'
import { DocumentsTab } from './DocumentsTab'
import { CustomerNotesTab } from './CustomerNotesTab'
import { mockCustomer, mockCustomerStats } from './mock-data'
import type { CustomerProfile } from './types'
import {
  User,
  Phone,
  Calendar,
  CreditCard,
  Wallet,
  TrendingUp,
  Edit,
  FileText,
  MessageSquare,
  Eye,
  ArrowLeft,
  Shield,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'

interface CustomerProfilePageProps {
  customer?: CustomerProfile
  onBack?: () => void
}

export function CustomerProfilePage({ customer = mockCustomer, onBack }: CustomerProfilePageProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`
  
  const getInitials = (firstName: string, lastName: string) => 
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

  const getCreditScoreColor = (score: number) => {
    if (score >= 700) return 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/40'
    if (score >= 600) return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/40'
    if (score >= 500) return 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/40'
    return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/40'
  }

  const getCreditScoreLabel = (score: number) => {
    if (score >= 750) return 'Excellent'
    if (score >= 680) return 'Good'
    if (score >= 600) return 'Fair'
    if (score >= 500) return 'Poor'
    return 'Very Poor'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-0 dark:bg-emerald-900/40 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </Badge>
        )
      case 'INACTIVE':
        return <Badge variant="secondary">Inactive</Badge>
      case 'BLACKLISTED':
        return (
          <Badge className="bg-slate-200 text-slate-800 border-0 dark:bg-slate-700 dark:text-slate-300 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Blacklisted
          </Badge>
        )
      case 'FROZEN':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-0 dark:bg-blue-900/40 dark:text-blue-400">
            Frozen
          </Badge>
        )
      case 'SUSPENDED':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-0 dark:bg-orange-900/40 dark:text-orange-400">
            Suspended
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'LOW':
        return <Badge className="bg-emerald-100 text-emerald-800 border-0 dark:bg-emerald-900/40 dark:text-emerald-400">Low Risk</Badge>
      case 'MEDIUM':
        return <Badge className="bg-amber-100 text-amber-800 border-0 dark:bg-amber-900/40 dark:text-amber-400">Medium Risk</Badge>
      case 'HIGH':
        return <Badge className="bg-orange-100 text-orange-800 border-0 dark:bg-orange-900/40 dark:text-orange-400">High Risk</Badge>
      case 'VERY_HIGH':
        return <Badge className="bg-red-100 text-red-800 border-0 dark:bg-red-900/40 dark:text-red-400">Very High</Badge>
      default:
        return <Badge variant="secondary">{level}</Badge>
    }
  }

  const handleAction = (action: string) => {
    toast.success(`${action} action triggered for ${customer.firstName} ${customer.lastName}`)
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          {/* Avatar */}
          <Avatar className="h-16 w-16 bg-emerald-600 ring-4 ring-emerald-100 dark:ring-emerald-900/30">
            <AvatarFallback className="text-white text-xl font-semibold">
              {getInitials(customer.firstName, customer.lastName)}
            </AvatarFallback>
          </Avatar>

          {/* Name and Basic Info */}
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {customer.firstName} {customer.lastName}
              </h1>
              {getStatusBadge(customer.status)}
              {getRiskBadge(customer.riskLevel)}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                {customer.phone}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                ID: {customer.customerId}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Member since {new Date(customer.memberSince).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('Edit Profile')}
            className="dark:border-slate-700"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
            onClick={() => handleAction('New Loan Application')}
          >
            <Wallet className="w-4 h-4 mr-2" />
            New Loan Application
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('Send SMS')}
            className="dark:border-slate-700"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Send SMS
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('View Documents')}
            className="dark:border-slate-700"
          >
            <FileText className="w-4 h-4 mr-2" />
            View Documents
          </Button>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <Card className="border-emerald-200 dark:border-emerald-800/30 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Active Loans */}
            <div className="text-center p-3 bg-white/60 dark:bg-slate-800/40 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                <CreditCard className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Active Loans</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{mockCustomerStats.activeLoans}</p>
            </div>

            {/* Total Borrowed */}
            <div className="text-center p-3 bg-white/60 dark:bg-slate-800/40 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Total Borrowed</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(mockCustomerStats.totalBorrowed)}</p>
            </div>

            {/* Total Repaid */}
            <div className="text-center p-3 bg-white/60 dark:bg-slate-800/40 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                <Wallet className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Total Repaid</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(mockCustomerStats.totalRepaid)}</p>
            </div>

            {/* Credit Score */}
            <div className="text-center p-3 bg-white/60 dark:bg-slate-800/40 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                <Shield className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Credit Score</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{mockCustomerStats.creditScore}</p>
                <Badge className={`text-xs ${getCreditScoreColor(mockCustomerStats.creditScore)}`}>
                  {getCreditScoreLabel(mockCustomerStats.creditScore)}
                </Badge>
              </div>
            </div>

            {/* Status */}
            <div className="text-center p-3 bg-white/60 dark:bg-slate-800/40 rounded-lg col-span-2 md:col-span-1">
              <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Status</span>
              </div>
              <div className="flex items-center justify-center">
                {getStatusBadge(mockCustomerStats.status)}
              </div>
            </div>
          </div>

          {/* Utilization Bar */}
          <div className="mt-4 pt-4 border-t border-emerald-200/50 dark:border-emerald-800/30">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-600 dark:text-slate-300">Credit Utilization</span>
              <span className="font-medium text-slate-900 dark:text-white">{mockCustomerStats.utilizationRatio}%</span>
            </div>
            <Progress 
              value={mockCustomerStats.utilizationRatio} 
              className="h-2.5 bg-emerald-100 dark:bg-emerald-900/30"
            />
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>Used: {formatCurrency(mockCustomerStats.totalBorrowed - mockCustomerStats.availableCredit)}</span>
              <span>Available: {formatCurrency(mockCustomerStats.availableCredit)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800 w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900">
            Overview
          </TabsTrigger>
          <TabsTrigger value="kyc" className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900">
            KYC & Identity
          </TabsTrigger>
          <TabsTrigger value="loans" className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900">
            Loan History
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900">
            Payment History
          </TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900">
            Documents
          </TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900">
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <CustomerOverviewTab customer={customer} />
        </TabsContent>

        <TabsContent value="kyc">
          <KYCIdentityTab customer={customer} />
        </TabsContent>

        <TabsContent value="loans">
          <LoanHistoryTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentHistoryTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="notes">
          <CustomerNotesTab customerId={customer.id} customerName={`${customer.firstName} ${customer.lastName}`} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CustomerProfilePage
