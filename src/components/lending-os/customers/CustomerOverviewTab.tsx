'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { mockActivities, mockAccountHealth, mockCustomerStats } from './mock-data'
import type { CustomerProfile, ActivityEvent, AccountHealth } from './types'
import {
  Clock,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Flag,
  StickyNote,
  LogIn,
  FileText,
  Wallet,
  Phone,
  User,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react'

interface CustomerOverviewTabProps {
  customer: CustomerProfile
}

export function CustomerOverviewTab({ customer }: CustomerOverviewTabProps) {
  const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRelativeTime = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateStr)
  }

  const getActivityIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'LOGIN':
        return <LogIn className="w-4 h-4 text-blue-500" />
      case 'APPLICATION_SUBMITTED':
        return <FileText className="w-4 h-4 text-purple-500" />
      case 'LOAN_DISBURSED':
        return <Wallet className="w-4 h-4 text-emerald-500" />
      case 'PAYMENT_RECEIVED':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'PROFILE_UPDATED':
        return <User className="w-4 h-4 text-slate-500" />
      case 'DOCUMENT_UPLOADED':
        return <FileText className="w-4 h-4 text-orange-500" />
      case 'SMS_SENT':
      case 'CALL_LOGGED':
        return <Phone className="w-4 h-4 text-cyan-500" />
      default:
        return <Activity className="w-4 h-4 text-slate-400" />
    }
  }

  const getActivityColor = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'LOGIN':
        return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/30'
      case 'APPLICATION_SUBMITTED':
        return 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/30'
      case 'LOAN_DISBURSED':
        return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/30'
      case 'PAYMENT_RECEIVED':
        return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/30'
      case 'PROFILE_UPDATED':
        return 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/30'
      case 'DOCUMENT_UPLOADED':
        return 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/30'
      case 'SMS_SENT':
      case 'CALL_LOGGED':
        return 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800/30'
      default:
        return 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/30'
    }
  }

  const handleQuickAction = (action: string) => {
    toast.success(`${action} action triggered`)
  }

  // Calculate next payment info from active loans
  const nextPaymentDue = '2026-02-10' // From mock data
  const nextPaymentAmount = 14995

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Summary Cards */}
      <div className="space-y-6">
        {/* Next Payment Due */}
        <Card className="border-amber-200 dark:border-amber-800/30 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <Clock className="w-4 h-4" />
              Next Payment Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(nextPaymentAmount)}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(nextPaymentDue).toLocaleDateString('en-KE', { 
                    weekday: 'short', 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
              <Badge className="bg-amber-100 text-amber-800 border-0 dark:bg-amber-900/40 dark:text-amber-300">
                In 21 days
              </Badge>
            </div>
            <Separator className="my-3 bg-amber-200/50 dark:bg-amber-800/30" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Loan Ref: LN-2026-00042 • Installment 2 of 3
            </p>
          </CardContent>
        </Card>

        {/* Available Credit Limit */}
        <Card className="border-emerald-200 dark:border-emerald-800/30 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <CreditCard className="w-4 h-4" />
              Available Credit Limit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(mockCustomerStats.availableCredit)}
            </p>
            <Progress 
              value={100 - mockCustomerStats.utilizationRatio} 
              className="h-2 mt-3 bg-emerald-100 dark:bg-emerald-900/30"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {100 - mockCustomerStats.utilizationRatio}% of limit available
            </p>
          </CardContent>
        </Card>

        {/* Utilization Ratio */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              Utilization Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {mockCustomerStats.utilizationRatio}%
              </span>
              <Badge 
                variant={mockCustomerStats.utilizationRatio > 70 ? 'destructive' : 'secondary'}
                className={mockCustomerStats.utilizationRatio <= 50 ? 'bg-emerald-100 text-emerald-800 border-0 dark:bg-emerald-900/40 dark:text-emerald-400' : ''}
              >
                {mockCustomerStats.utilizationRatio <= 30 ? 'Healthy' : 
                 mockCustomerStats.utilizationRatio <= 50 ? 'Moderate' :
                 mockCustomerStats.utilizationRatio <= 70 ? 'High' : 'Critical'}
              </Badge>
            </div>
            <Progress value={mockCustomerStats.utilizationRatio} className="h-3" />
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="text-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(mockCustomerStats.totalBorrowed - mockCustomerStats.availableCredit)}</p>
                <p className="text-xs text-slate-500">Used</p>
              </div>
              <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">{formatCurrency(mockCustomerStats.availableCredit)}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Available</p>
              </div>
              <div className="text-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(mockCustomerStats.totalBorrowed)}</p>
                <p className="text-xs text-slate-500">Total Limit</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-slate-50 dark:bg-slate-800/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => handleQuickAction('Approve limit increase')}
            >
              <ArrowUpRight className="w-4 h-4 mr-2 text-emerald-600" />
              Approve Limit Increase
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => handleQuickAction('Flag for review')}
            >
              <Flag className="w-4 h-4 mr-2 text-amber-600" />
              Flag for Review
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => handleQuickAction('Add note')}
            >
              <StickyNote className="w-4 h-4 mr-2 text-slate-600" />
              Add Note
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Middle Column - Account Health */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              Account Health Indicators
            </CardTitle>
            <CardDescription>Customer's account performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Repayment Track Record */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-5 h-5 ${mockAccountHealth.repaymentTrackRecord >= 80 ? 'text-emerald-500' : mockAccountHealth.repaymentTrackRecord >= 60 ? 'text-amber-500' : 'text-red-500'}`} />
                  <span className="font-medium text-sm">Repayment Track Record</span>
                </div>
                <span className={`text-lg font-bold ${mockAccountHealth.repaymentTrackRecord >= 80 ? 'text-emerald-600' : mockAccountHealth.repaymentTrackRecord >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                  {mockAccountHealth.repaymentTrackRecord}%
                </span>
              </div>
              <Progress value={mockAccountHealth.repaymentTrackRecord} className="h-3" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mockAccountHealth.repaymentTrackRecord >= 90 ? 'Excellent - Consistently on-time payments' :
                 mockAccountHealth.repaymentTrackRecord >= 80 ? 'Good - Mostly on-time payments' :
                 mockAccountHealth.repaymentTrackRecord >= 60 ? 'Fair - Some late payments' :
                 'Poor - Frequent late or missed payments'}
              </p>
            </div>

            <Separator />

            {/* Loan Utilization Ratio */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-slate-500" />
                  <span className="font-medium text-sm">Loan Utilization Ratio</span>
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {mockAccountHealth.loanUtilizationRatio}%
                </span>
              </div>
              <Progress value={mockAccountHealth.loanUtilizationRatio} className="h-3" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mockAccountHealth.loanUtilizationRatio <= 30 ? 'Low utilization - Good credit management' :
                 mockAccountHealth.loanUtilizationRatio <= 50 ? 'Moderate utilization' :
                 mockAccountHealth.loanUtilizationRatio <= 70 ? 'High utilization - Monitor closely' :
                 'Very high utilization - Risk indicator'}
              </p>
            </div>

            <Separator />

            {/* Account Age */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-slate-500" />
                  <span className="font-medium text-sm">Account Age</span>
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {mockAccountHealth.accountAgeLabel}
                </span>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-1">
                <div 
                  className="h-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                  style={{ width: `${Math.min((mockAccountHealth.accountAgeDays / 730) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mockAccountHealth.accountAgeDays} days since registration • Established customer
              </p>
            </div>

            <Separator />

            {/* Additional Metrics */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">Last Payment</span>
                </div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {mockAccountHealth.daysSinceLastPayment === 0 ? 'Today' : `${mockAccountHealth.daysSinceLastPayment}d ago`}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs">Avg Delay</span>
                </div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {mockAccountHealth.averagePaymentDelay}d
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Recent Activity Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-slate-500" />
                Recent Activity
              </CardTitle>
              <CardDescription>Last 10 events on this account</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              {mockActivities.length} events
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[520px] pr-4">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />
              
              <div className="space-y-4">
                {mockActivities.map((activity, index) => (
                  <div key={activity.id} className="relative flex gap-4">
                    {/* Icon */}
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    
                    {/* Content */}
                    <div className={`flex-1 pb-4 ${index === mockActivities.length - 1 ? '' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-white leading-tight">
                          {activity.description}
                        </p>
                        <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                          {getRelativeTime(activity.timestamp)}
                        </span>
                      </div>
                      
                      {/* Metadata */}
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {Object.entries(activity.metadata).map(([key, value]) => (
                            <span 
                              key={key}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              {typeof value === 'string' ? value : JSON.stringify(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

export default CustomerOverviewTab
