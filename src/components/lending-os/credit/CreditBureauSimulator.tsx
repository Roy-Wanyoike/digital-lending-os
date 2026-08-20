'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Database,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  Building2,
  CreditCard,
  Search,
  RefreshCw
} from 'lucide-react'

// Types for CRB data
interface CrbEntry {
  id: string
  lender: string
  type: 'LOAN' | 'OVERDRAFT' | 'CREDIT_CARD' | 'MOBILE_LOAN'
  status: 'ACTIVE' | 'CLOSED' | 'DEFAULTED' | 'IN_ARREARS'
  amount: number
  outstandingBalance: number
  daysPastDue?: number
  openedDate: string
  lastPaymentDate?: string
  closedDate?: string
}

interface CrbReport {
  reportNumber: string
  generatedAt: Date
  validUntil: Date
  crbStatus: 'CLEAN' | 'LISTED' | 'PENDING_CHECK' | 'UNKNOWN'
  overallScore: number
  scoreFactors: Array<{
    factor: string
    impact: 'positive' | 'negative' | 'neutral'
    description: string
  }>
  entries: CrbEntry[]
  totalExposure: number
  totalOutstanding: number
  numberOfActiveAccounts: number
  numberOfDefaultedAccounts: number
  inquiriesLast6Months: number
  lastUpdateDate: string
}

interface CreditBureauSimulatorProps {
  customerName?: string
  nationalId?: string
  initialData?: Partial<CrbReport>
  onRefresh?: () => void
  compact?: boolean
  className?: string
}

// Generate mock CRB data based on profile type
function generateMockCrbReport(profileType: 'clean' | 'listed' | 'mixed' = 'clean'): CrbReport {
  const now = new Date()
  
  const baseEntries: Record<string, CrbEntry[]> = {
    clean: [
      {
        id: 'CRB-001',
        lender: 'Equity Bank Kenya',
        type: 'LOAN',
        status: 'CLOSED',
        amount: 150000,
        outstandingBalance: 0,
        openedDate: '2024-03-15',
        lastPaymentDate: '2025-09-15',
        closedDate: '2025-09-15'
      },
      {
        id: 'CRB-002',
        lender: 'Co-operative Bank',
        type: 'OVERDRAFT',
        status: 'ACTIVE',
        amount: 50000,
        outstandingBalance: 12000,
        openedDate: '2025-06-01',
        lastPaymentDate: '2026-08-01'
      },
      {
        id: 'CRB-003',
        lender: 'Safaricom M-Shwari',
        type: 'MOBILE_LOAN',
        status: 'CLOSED',
        amount: 10000,
        outstandingBalance: 0,
        openedDate: '2025-08-10',
        lastPaymentDate: '2025-11-10',
        closedDate: '2025-11-10'
      },
      {
        id: 'CRB-004',
        lender: 'KCB Bank',
        type: 'CREDIT_CARD',
        status: 'ACTIVE',
        amount: 200000,
        outstandingBalance: 45000,
        openedDate: '2024-12-01',
        lastPaymentDate: '2026-07-25'
      }
    ],
    listed: [
      {
        id: 'CRB-005',
        lender: 'Branch International',
        type: 'MOBILE_LOAN',
        status: 'DEFAULTED',
        amount: 25000,
        outstandingBalance: 28000,
        daysPastDue: 127,
        openedDate: '2025-04-15',
        lastPaymentDate: '2026-02-15'
      },
      {
        id: 'CRB-006',
        lender: 'Tala Kenya',
        type: 'MOBILE_LOAN',
        status: 'IN_ARREARS',
        amount: 15000,
        outstandingBalance: 16500,
        daysPastDue: 45,
        openedDate: '2025-06-20',
        lastPaymentDate: '2026-06-20'
      },
      {
        id: 'CRB-007',
        lender: 'Zenka Finance',
        type: 'MOBILE_LOAN',
        status: 'DEFAULTED',
        amount: 8000,
        outstandingBalance: 9200,
        daysPastDue: 89,
        openedDate: '2025-05-10'
      }
    ],
    mixed: [
      {
        id: 'CRB-008',
        lender: 'Standard Chartered',
        type: 'LOAN',
        status: 'ACTIVE',
        amount: 300000,
        outstandingBalance: 185000,
        openedDate: '2025-02-01',
        lastPaymentDate: '2026-07-01'
      },
      {
        id: 'CRB-009',
        lender: 'NCBA Bank',
        type: 'CREDIT_CARD',
        status: 'CLOSED',
        amount: 100000,
        outstandingBalance: 0,
        openedDate: '2023-08-15',
        closedDate: '2025-12-15'
      },
      {
        id: 'CRB-010',
        lender: 'Fuliza M-Pesa',
        type: 'OVERDRAFT',
        status: 'IN_ARREARS',
        amount: 50000,
        outstandingBalance: 3500,
        daysPastDue: 14,
        openedDate: '2026-07-20'
      },
      {
        id: 'CRB-011',
        lender: 'Kashify',
        type: 'MOBILE_LOAN',
        status: 'DEFAULTED',
        amount: 5000,
        outstandingBalance: 5500,
        daysPastDue: 62,
        openedDate: '2025-09-01'
      }
    ]
  }

  const entries = baseEntries[profileType]
  const totalExposure = entries.reduce((sum, e) => sum + e.amount, 0)
  const totalOutstanding = entries.reduce((sum, e) => sum + e.outstandingBalance, 0)
  const defaultedCount = entries.filter(e => e.status === 'DEFAULTED').length

  const isListed = profileType === 'listed' || defaultedCount > 0
  
  return {
    reportNumber: `CRB-${Date.now().toString(36).toUpperCase()}`,
    generatedAt: now,
    validUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // Valid for 30 days
    crbStatus: isListed ? 'LISTED' : 'CLEAN',
    overallScore: profileType === 'clean' ? 780 : profileType === 'listed' ? 320 : 520,
    scoreFactors: [
      {
        factor: 'Payment History',
        impact: profileType === 'clean' ? 'positive' : 'negative',
        description: profileType === 'clean' 
          ? 'Consistent on-time payments across all accounts'
          : `${defaultedCount} account(s) with payment defaults`
      },
      {
        factor: 'Credit Utilization',
        impact: totalOutstanding / totalExposure > 0.5 ? 'negative' : 'positive',
        description: `Utilization at ${Math.round(totalOutstanding / totalExposure * 100)}% of available credit`
      },
      {
        factor: 'Account Age',
        impact: 'neutral',
        description: 'Average account age: 18 months'
      },
      {
        factor: 'Credit Mix',
        impact: 'positive',
        description: 'Good variety of credit types (loans, cards, overdrafts)'
      },
      {
        factor: 'Recent Inquiries',
        impact: 'neutral',
        description: '3 inquiries in the last 6 months'
      }
    ],
    entries,
    totalExposure,
    totalOutstanding,
    numberOfActiveAccounts: entries.filter(e => e.status === 'ACTIVE').length,
    numberOfDefaultedAccounts: defaultedCount,
    inquiriesLast6Months: 3,
    lastUpdateDate: now.toISOString().split('T')[0]
  }
}

export function CreditBureauSimulator({
  customerName = 'Demo Customer',
  nationalId,
  initialData,
  onRefresh,
  compact = false,
  className = ''
}: CreditBureauSimulatorProps) {
  const [report, setReport] = useState<CrbReport>(() => 
    generateMockCrbReport(initialData?.crbStatus === 'LISTED' ? 'listed' : 'clean')
  )
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<'clean' | 'listed' | 'mixed'>(
    initialData?.crbStatus === 'LISTED' ? 'listed' : initialData?.overallScore && initialData.overallScore < 600 ? 'mixed' : 'clean'
  )

  const handleRefresh = async () => {
    setIsLoading(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const newReport = generateMockCrbReport(selectedProfile)
    setReport(newReport)
    setIsLoading(false)
    
    onRefresh?.()
  }

  const formatCurrency = (amount: number): string => {
    return `KSh ${amount.toLocaleString('en-KE')}`
  }

  const getStatusIcon = (status: CrbEntry['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />
      case 'CLOSED':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case 'DEFAULTED':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'IN_ARREARS':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />
    }
  }

  const getTypeIcon = (type: CrbEntry['type']) => {
    switch (type) {
      case 'LOAN':
        return <Building2 className="w-4 h-4" />
      case 'CREDIT_CARD':
        return <CreditCard className="w-4 h-4" />
      case 'OVERDRAFT':
      case 'MOBILE_LOAN':
        return <FileText className="w-4 h-4" />
    }
  }

  // Compact view for embedding
  if (compact) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              <div>
                <p className="font-semibold text-sm">CRB Status</p>
                <p className="text-xs text-muted-foreground">
                  Report #{report.reportNumber.slice(-8)}
                </p>
              </div>
            </div>
            <Badge 
              variant="outline" 
              className={
                report.crbStatus === 'CLEAN' 
                  ? 'border-green-500 text-green-600' 
                  : 'border-red-500 text-red-600'
              }
            >
              {report.crbStatus}
            </Badge>
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Score:</span>{' '}
              <span className="font-bold">{report.overallScore}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Exposure:</span>{' '}
              <span className="font-bold">{formatCurrency(report.totalOutstanding)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Credit Bureau Report (CRB)
            </CardTitle>
            <CardDescription>
              Simulated Metropol/TransUnion CRB check for Kenyan market
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Profile selector for demo */}
            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value as typeof selectedProfile)}
              className="text-sm border rounded px-2 py-1 bg-background"
            >
              <option value="clean">Clean Profile</option>
              <option value="listed">Listed Profile</option>
              <option value="mixed">Mixed Profile</option>
            </select>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Fetching...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Customer Info & Status Banner */}
        <div className={`rounded-lg p-4 ${
          report.crbStatus === 'CLEAN' 
            ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {report.crbStatus === 'CLEAN' ? (
                <Shield className="w-10 h-10 text-green-600" />
              ) : (
                <AlertTriangle className="w-10 h-10 text-red-600" />
              )}
              <div>
                <p className="font-semibold text-lg">{customerName}</p>
                {nationalId && (
                  <p className="text-sm text-muted-foreground">ID: {nationalId}</p>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <Badge 
                variant="outline" 
                className={`text-lg px-4 py-1.5 ${
                  report.crbStatus === 'CLEAN' 
                    ? 'border-green-500 text-green-600 bg-white' 
                    : 'border-red-500 text-red-600 bg-white'
                }`}
              >
                {report.crbStatus === 'CLEAN' ? '✓ CLEAN' : '✗ LISTED'}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                Valid until {report.validUntil.toLocaleDateString('en-KE')}
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{report.overallScore}</p>
            <p className="text-xs text-muted-foreground">CRB Score</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{formatCurrency(report.totalExposure)}</p>
            <p className="text-xs text-muted-foreground">Total Exposure</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(report.totalOutstanding)}</p>
            <p className="text-xs text-muted-foreground">Outstanding</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{report.numberOfActiveAccounts}</p>
            <p className="text-xs text-muted-foreground">Active Accounts</p>
          </div>
        </div>

        {/* Score Factors */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Search className="w-4 h-4" />
            Score Factors
          </h4>
          <div className="space-y-2">
            {report.scoreFactors.map((factor, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
              >
                <Badge 
                  variant="outline" 
                  className={`mt-0.5 shrink-0 ${
                    factor.impact === 'positive' ? 'border-green-500 text-green-600' :
                    factor.impact === 'negative' ? 'border-red-500 text-red-600' :
                    'border-gray-400 text-gray-600'
                  }`}
                >
                  {factor.impact}
                </Badge>
                <div>
                  <p className="font-medium text-sm">{factor.factor}</p>
                  <p className="text-xs text-muted-foreground">{factor.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Credit Entries Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Credit Accounts</h4>
            {report.numberOfDefaultedAccounts > 0 && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="w-3 h-3" />
                {report.numberOfDefaultedAccounts} Defaulted
              </Badge>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Lender</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                  <th className="text-right p-3 font-medium">Balance</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Arrears</th>
                </tr>
              </thead>
              <tbody>
                {report.entries.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(entry.type)}
                        <span className="font-medium">{entry.lender}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground capitalize text-xs">
                      {entry.type.replace('_', ' ')}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {formatCurrency(entry.amount)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {formatCurrency(entry.outstandingBalance)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        {getStatusIcon(entry.status)}
                        <span className="capitalize text-xs">{entry.status.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {entry.daysPastDue ? (
                        <Badge variant="destructive" className="text-xs">
                          {entry.daysPastDue}d
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Info */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last updated: {new Date(report.lastUpdateDate).toLocaleDateString('en-KE')}
          </div>
          <div className="flex items-center gap-1">
            <Search className="w-3 h-3" />
            Inquiries (6mo): {report.inquiriesLast6Months}
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Report #: {report.reportNumber}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              <strong>Disclaimer:</strong> This is a simulated CRB report for demonstration purposes only. 
              Actual CRB checks should be performed through authorized credit reference bureaus 
              (Metropol CRB, TransUnion Kenya, or CreditInfo Kenya).
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default CreditBureauSimulator
