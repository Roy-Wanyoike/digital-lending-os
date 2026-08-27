'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  FileText,
  Phone,
  Calendar,
  Hash,
  CreditCard,
  Building2,
  TrendingDown,
  TrendingUp
} from 'lucide-react'

// Types
interface TransactionDetailData {
  id: string
  referenceNumber: string
  transactionType: string
  entityType: string
  entityId: string
  debitAccount?: string
  creditAccount?: string
  amount: number
  currency: string
  description?: string
  narration?: string
  occurredAt: Date | string
  createdAt: Date | string
  reconciled?: boolean
  reconciledAt?: Date | string | null
  reconciledBy?: string | null
  externalRef?: string | null
  status: string
  direction: 'inflow' | 'outflow'
  
  // Double Entry
  doubleEntry?: {
    entries: Array<{
      account: string
      type: 'DEBIT' | 'CREDIT'
      amount: number
      currency: string
    }>
    description: string
    isBalanced: boolean
    totalDebit: number
    totalCredit: number
  }
  
  // Related Entities
  loan?: {
    id: string
    loanNumber: string
    principal: number
    outstandingBalance: number
    status: string
    disbursementDate?: Date | string
    customer?: {
      id: string
      firstName: string
      lastName: string
      phone: string
    }
    product?: {
      id: string
      name: string
      category: string
    }
  }
  
  repayment?: {
    id: string
    amount: number
    principalPortion: number
    interestPortion: number
    paymentMethod: string
    referenceNumber: string
    paymentDate: Date | string
    status: string
    customer?: {
      id: string
      firstName: string
      lastName: string
      phone: string
    }
  }
  
  // Audit Trail
  auditTrail?: Array<{
    action: string
    description: string
    timestamp: Date | string
    user: string
  }>
  
  // Related Transactions
  relatedTransactions?: Array<{
    id: string
    referenceNumber: string
    transactionType: string
    amount: number
    date: Date | string
    relationType: string
  }>
}

interface TransactionDetailProps {
  transactionId?: string
}

export function TransactionDetail({ transactionId }: TransactionDetailProps) {
  const [data, setData] = useState<TransactionDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransaction = useCallback(async () => {
    if (!transactionId) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/finance/transactions/${transactionId}?tenantId=default-tenant`)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to load transaction details')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [transactionId])

  useEffect(() => {
    fetchTransaction()
  }, [fetchTransaction])

  // Format helpers
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (date: Date | string): string => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-KE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateShort = (date: Date | string): string => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-KE', {
      day: '2-digit',
      month: 'short'
    })
  }

  // Get transaction type badge
  const getTypeBadge = (type: string) => {
    const config: Record<string, { label: string; color: string; bg: string }> = {
      DISBURSEMENT: { label: 'Disbursement', color: 'text-blue-700', bg: 'bg-blue-100' },
      REPAYMENT_PRINCIPAL: { label: 'Principal Repayment', color: 'text-emerald-700', bg: 'bg-emerald-100' },
      REPAYMENT_INTEREST: { label: 'Interest Repayment', color: 'text-teal-700', bg: 'bg-teal-100' },
      FEE_COLLECTED: { label: 'Fee Collected', color: 'text-amber-700', bg: 'bg-amber-100' },
      PENALTY_COLLECTED: { label: 'Penalty Collected', color: 'text-red-700', bg: 'bg-red-100' },
      REFUND: { label: 'Refund', color: 'text-purple-700', bg: 'bg-purple-100' },
      ADJUSTMENT: { label: 'Adjustment', color: 'text-indigo-700', bg: 'bg-indigo-100' }
    }
    
    const c = config[type] || { label: type.replace(/_/g, ' '), color: 'text-gray-700', bg: 'bg-gray-100' }
    return <Badge variant="secondary" className={`${c.bg} ${c.color}`}>{c.label}</Badge>
  }

  // Get status badge
  const getStatusBadge = (status: string, reconciled?: boolean) => {
    if (reconciled || status === 'settled') {
      return <Badge className="bg-emerald-100 text-emerald-800 gap-1"><CheckCircle2 className="w-3 h-3" />Settled</Badge>
    }
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-destructive" />
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold">{data.referenceNumber}</h2>
            {getTypeBadge(data.transactionType)}
            {getStatusBadge(data.status, data.reconciled)}
          </div>
          <p className="text-muted-foreground">{data.description || data.transactionType.replace(/_/g, ' ')}</p>
        </div>
        
        {/* Amount Display */}
        <div className={`text-right p-4 rounded-lg ${
          data.direction === 'inflow' 
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' 
            : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
        }`}>
          <p className="text-sm text-muted-foreground">Amount</p>
          <p className={`text-2xl font-bold font-mono flex items-center justify-end gap-2 ${
            data.direction === 'inflow' ? 'text-emerald-600' : 'text-blue-600'
          }`}>
            {data.direction === 'inflow' ? (
              <ArrowUpRight className="w-6 h-6" />
            ) : (
              <ArrowDownLeft className="w-6 h-6" />
            )}
            {formatCurrency(data.amount)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{data.currency}</p>
        </div>
      </div>

      <Separator />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Transaction Details */}
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-500" />
                Transaction Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow icon={<Hash className="w-4 h-4" />} label="Reference Number" value={data.referenceNumber} mono />
              <InfoRow icon={<Calendar className="w-4 h-4" />} label="Occurred At" value={formatDate(data.occurredAt)} />
              <InfoRow icon={<Calendar className="w-4 h-4" />} label="Created At" value={formatDate(data.createdAt)} />
              <InfoRow icon={<CreditCard className="w-4 h-4" />} label="External Reference" value={data.externalRef || '-'} mono />
              {data.narration && (
                <InfoRow icon={<FileText className="w-4 h-4" />} label="Narration" value={data.narration} />
              )}
            </CardContent>
          </Card>

          {/* Double-Entry Visualization */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-slate-500" />
                Double-Entry Accounting
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.doubleEntry ? (
                <div className="space-y-3">
                  {data.doubleEntry.entries.map((entry, index) => (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                        entry.type === 'DEBIT' 
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-500' 
                          : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500'
                      }`}
                    >
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wide ${
                          entry.type === 'DEBIT' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {entry.type}
                        </p>
                        <p className="font-medium mt-0.5">{entry.account}</p>
                      </div>
                      <p className={`font-mono font-bold text-lg ${
                        entry.type === 'DEBIT' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {formatCurrency(entry.amount)}
                      </p>
                    </div>
                  ))}
                  
                  <div className="flex items-center justify-center gap-2 pt-3 border-t mt-3">
                    {data.doubleEntry.isBalanced ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <span className="text-sm text-muted-foreground">
                          Entries Balanced • Total Debit: {formatCurrency(data.doubleEntry.totalDebit)} = Total Credit: {formatCurrency(data.doubleEntry.totalCredit)}
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <span className="text-sm text-destructive">Entries Not Balanced!</span>
                      </>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                    {data.doubleEntry.description}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No double-entry information available.</p>
              )}
            </CardContent>
          </Card>

          {/* Audit Trail */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-500" />
                Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.auditTrail && data.auditTrail.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
                  <div className="space-y-4">
                    {data.auditTrail.map((event, index) => (
                      <div key={index} className="flex gap-4 relative">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                          event.action === 'RECONCILED' ? 'bg-emerald-100 text-emerald-600' :
                          event.action === 'CREATED' ? 'bg-blue-100 text-blue-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{event.action}</Badge>
                            <span className="text-xs text-muted-foreground">{formatDate(event.timestamp)}</span>
                          </div>
                          <p className="text-sm mt-1">{event.description}</p>
                          <p className="text-xs text-muted-foreground">By: {event.user}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No audit trail available.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Related Entities */}
        <div className="space-y-6">
          {/* Loan Information */}
          {data.loan && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-500" />
                  Related Loan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={<Hash className="w-4 h-4" />} label="Loan Number" value={data.loan.loanNumber} mono />
                <InfoRow icon={<TrendingUp className="w-4 h-4" />} label="Principal" value={formatCurrency(data.loan.principal)} />
                <InfoRow icon={<TrendingDown className="w-4 h-4" />} label="Outstanding Balance" value={formatCurrency(data.loan.outstandingBalance)} />
                <InfoRow icon={<Calendar className="w-4 h-4" />} label="Status" value={
                  <Badge variant="secondary">{data.loan.status}</Badge>
                } />
                
                {data.loan.customer && (
                  <>
                    <Separator />
                    <p className="text-sm font-medium text-muted-foreground">Borrower</p>
                    <InfoRow icon={<User className="w-4 h-4" />} label="Name" value={`${data.loan.customer.firstName} ${data.loan.customer.lastName}`} />
                    <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={data.loan.customer.phone} mono />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Repayment Information */}
          {data.repayment && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-slate-500" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={<CreditCard className="w-4 h-4" />} label="Payment Method" value={data.repayment.paymentMethod} />
                <InfoRow icon={<Hash className="w-4 h-4" />} label="Reference" value={data.repayment.referenceNumber} mono />
                <InfoRow icon={<Calendar className="w-4 h-4" />} label="Payment Date" value={formatDate(data.repayment.paymentDate)} />
                
                <Separator className="my-2" />
                
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Principal</p>
                    <p className="font-mono font-bold text-sm">{formatCurrency(data.repayment.principalPortion)}</p>
                  </div>
                  <div className="p-2 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Interest</p>
                    <p className="font-mono font-bold text-sm">{formatCurrency(data.repayment.interestPortion)}</p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-mono font-bold text-sm text-primary">{formatCurrency(data.repayment.amount)}</p>
                  </div>
                </div>
                
                {data.repayment.customer && (
                  <>
                    <Separator />
                    <p className="text-sm font-medium text-muted-foreground">Payer</p>
                    <InfoRow icon={<User className="w-4 h-4" />} label="Name" value={`${data.repayment.customer.firstName} ${data.repayment.customer.lastName}`} />
                    <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={data.repayment.customer.phone} mono />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reconciliation Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-slate-500" />
                Reconciliation Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg text-center ${
                data.reconciled 
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
              }`}>
                {data.reconciled ? (
                  <>
                    <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300">Reconciled</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      On {formatDate(data.reconciledAt!)}
                    </p>
                    {data.reconciledBy && (
                      <p className="text-xs text-muted-foreground">By: {data.reconciledBy}</p>
                    )}
                  </>
                ) : (
                  <>
                    <Clock className="w-12 h-12 mx-auto text-amber-500 mb-2" />
                    <p className="font-semibold text-amber-800 dark:text-amber-300">Pending Reconciliation</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This transaction has not been reconciled yet.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Related Transactions */}
          {data.relatedTransactions && data.relatedTransactions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-500" />
                  Related Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[250px]">
                  <div className="space-y-2">
                    {data.relatedTransactions.map((txn) => (
                      <div 
                        key={txn.id} 
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <code className="text-sm font-mono">{txn.referenceNumber}</code>
                          <p className="text-xs text-muted-foreground capitalize">{txn.relationType.replace(/_/g, ' ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-medium">{formatCurrency(txn.amount)}</p>
                          <p className="text-xs text-muted-foreground">{formatDateShort(txn.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// Info Row Component
function InfoRow({ 
  icon, 
  label, 
  value, 
  mono = false 
}: { 
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-medium truncate ${mono ? 'font-mono text-sm' : ''}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

export default TransactionDetail
