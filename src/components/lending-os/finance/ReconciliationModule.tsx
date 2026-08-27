'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Progress
} from '@/components/ui/progress'
import {
  Scale,
  RefreshCw,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  FileText,
  Search,
  Link2,
  Unlink,
  Zap,
  Eye,
  Download,
  Play,
  XCircle,
  ArrowRightLeft,
  Calendar,
  Building2,
  Filter
} from 'lucide-react'

// Types
interface ReconciliationAccount {
  id: string
  name: string
  accountNumber: string
  lastReconciled: Date | string | null
  daysSinceRecon: number
  status: 'current' | 'due' | 'overdue'
  pendingItems: number
  balance: number
}

interface ReconciliationStep {
  id: number
  title: string
  description: string
  status: 'pending' | 'active' | 'completed' | 'error'
}

interface MatchedItem {
  id: string
  internalRef: string
  externalRef: string
  amount: number
  date: Date | string
  matchType: 'auto' | 'manual'
  confidence: number
}

interface UnmatchedInternal {
  id: string
  reference: string
  description: string
  amount: number
  date: Date | string
}

interface UnmatchedExternal {
  id: string
  reference: string
  description: string
  amount: number
  date: Date | string
}

interface ReconciliationHistory {
  id: string
  accountName: string
  periodStart: Date | string
  periodEnd: Date | string
  status: 'completed' | 'variance_found' | 'in_progress'
  matchedCount: number
  unmatchedCount: number
  variance: number
  completedAt?: Date | string
  completedBy: string
}

// Mock Data
const mockAccounts: ReconciliationAccount[] = [
  {
    id: 'acc-1',
    name: 'Collection Account',
    accountNumber: '****3156',
    lastReconciled: new Date(Date.now() - 86400000),
    daysSinceRecon: 1,
    status: 'current',
    pendingItems: 5,
    balance: 4250000
  },
  {
    id: 'acc-2',
    name: 'Disbursement Float',
    accountNumber: '****7823',
    lastReconciled: new Date(Date.now() - 172800000),
    daysSinceRecon: 2,
    status: 'due',
    pendingItems: 12,
    balance: 1500000
  },
  {
    id: 'acc-3',
    name: 'Operating Account',
    accountNumber: '****4589',
    lastReconciled: new Date(Date.now() - 432000000),
    daysSinceRecon: 5,
    status: 'overdue',
    pendingItems: 23,
    balance: 2850000
  },
  {
    id: 'acc-4',
    name: 'Reserve Fund Account',
    accountNumber: '****9012',
    lastReconciled: new Date(Date.now() - 604800000),
    daysSinceRecon: 7,
    status: 'overdue',
    pendingItems: 3,
    balance: 800000
  }
]

const mockMatchedItems: MatchedItem[] = [
  { id: 'm1', internalRef: 'TXN-100001', externalRef: 'BANK-REF-001', amount: 15000, date: new Date(), matchType: 'auto', confidence: 98 },
  { id: 'm2', internalRef: 'TXN-100002', externalRef: 'MPESA-QMJ8X7Y2', amount: 8500, date: new Date(), matchType: 'auto', confidence: 95 },
  { id: 'm3', internalRef: 'TXN-100003', externalRef: 'BANK-REF-002', amount: 25000, date: new Date(Date.now() - 86400000), matchType: 'auto', confidence: 92 },
  { id: 'm4', internalRef: 'TXN-100004', externalRef: 'MPESA-KL9M2N4P', amount: 12000, date: new Date(Date.now() - 86400000), matchType: 'manual', confidence: 85 },
  { id: 'm5', internalRef: 'TXN-100005', externalRef: 'BANK-REF-003', amount: 5000, date: new Date(Date.now() - 172800000), matchType: 'auto', confidence: 99 }
]

const mockUnmatchedInternal: UnmatchedInternal[] = [
  { id: 'ui1', reference: 'TXN-100010', description: 'STK Push collection', amount: 3500, date: new Date() },
  { id: 'ui2', reference: 'TXN-100011', description: 'Paybill deposit', amount: 18000, date: new Date(Date.now() - 86400000) }
]

const mockUnmatchedExternal: UnmatchedExternal[] = [
  { id: 'ue1', reference: 'BANK-DEP-001', description: 'Unknown deposit', amount: 7500, date: new Date() },
  { id: 'ue2', reference: 'MPESA-RX9T3W2Q', description: 'Customer payment', amount: 4200, date: new Date(Date.now() - 86400000) }
]

const mockHistory: ReconciliationHistory[] = [
  {
    id: 'rh-1',
    accountName: 'Collection Account',
    periodStart: new Date(Date.now() - 604800000),
    periodEnd: new Date(Date.now() - 86400000),
    status: 'completed',
    matchedCount: 145,
    unmatchedCount: 2,
    variance: 0,
    completedAt: new Date(Date.now() - 86400000),
    completedBy: 'John Mwangi'
  },
  {
    id: 'rh-2',
    accountName: 'Disbursement Float',
    periodStart: new Date(Date.now() - 604800000),
    periodEnd: new Date(Date.now() - 172800000),
    status: 'variance_found',
    matchedCount: 89,
    unmatchedCount: 5,
    variance: -250,
    completedAt: new Date(Date.now() - 172800000),
    completedBy: 'Sarah Wanjiku'
  },
  {
    id: 'rh-3',
    accountName: 'Operating Account',
    periodStart: new Date(Date.now() - 604800000),
    periodEnd: new Date(),
    status: 'in_progress',
    matchedCount: 67,
    unmatchedCount: 18,
    variance: 0,
    completedBy: 'Peter Ochieng'
  }
]

// Format helpers
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const VARIANCE_THRESHOLD = 100 // KES

export function ReconciliationModule() {
  const [accounts, setAccounts] = useState<ReconciliationAccount[]>([])
  const [history, setHistory] = useState<ReconciliationHistory[]>([])
  const [loading, setLoading] = useState(true)
  
  // Wizard state
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [selectedAccount, setSelectedAccount] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [statementUploaded, setStatementUploaded] = useState(false)
  const [matchingProgress, setMatchingProgress] = useState(0)
  
  // Match results
  const [matchedItems, setMatchedItems] = useState<MatchedItem[]>([])
  const [unmatchedInternal, setUnmatchedInternal] = useState<UnmatchedInternal[]>([])
  const [unmatchedExternal, setUnmatchedExternal] = useState<UnmatchedExternal[]>([])
  const [variance, setVariance] = useState(0)

  const wizardSteps: ReconciliationStep[] = [
    { id: 1, title: 'Select Account & Period', description: 'Choose account and reconciliation period', status: 'pending' },
    { id: 2, title: 'Import Statement', description: 'Upload bank statement file (CSV/Excel)', status: 'pending' },
    { id: 3, title: 'Auto-Match Entries', description: 'System automatically matches transactions', status: 'pending' },
    { id: 4, title: 'Review Matches', description: 'Verify matches and handle unmatched items', status: 'pending' },
    { id: 5, title: 'Calculate Variance', description: 'Check for any discrepancies', status: 'pending' },
    { id: 6, title: 'Confirm & Report', description: 'Generate reconciliation report', status: 'pending' }
  ]

  const [steps, setSteps] = useState(wizardSteps)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAccounts(mockAccounts)
      setHistory(mockHistory)
      setLoading(false)
    }, 600)
    
    return () => clearTimeout(timer)
  }, [])

  const startReconciliation = (accountId: string) => {
    setSelectedAccount(accountId)
    setShowWizard(true)
    setWizardStep(0)
    resetWizard()
  }

  const resetWizard = () => {
    setDateRange({ start: '', end: '' })
    setStatementUploaded(false)
    setMatchingProgress(0)
    setMatchedItems([])
    setUnmatchedInternal([])
    setUnmatchedExternal([])
    setVariance(0)
    setSteps(wizardSteps.map((s, i) => ({ ...s, status: i === 0 ? 'active' : 'pending' })))
  }

  const nextStep = () => {
    if (wizardStep < steps.length - 1) {
      const next = wizardStep + 1
      setWizardStep(next)
      
      if (next === 2 && statementUploaded) {
        simulateMatching()
      }
      
      if (next === 4) {
        calculateVariance()
      }
      
      setSteps(prev => prev.map((s, i) => ({
        ...s,
        status: i < next ? 'completed' : i === next ? 'active' : 'pending'
      })))
    }
  }

  const prevStep = () => {
    if (wizardStep > 0) {
      setWizardStep(wizardStep - 1)
      setSteps(prev => prev.map((s, i) => ({
        ...s,
        status: i < wizardStep ? 'completed' : i === wizardStep - 1 ? 'active' : 'pending'
      })))
    }
  }

  const simulateUpload = () => {
    setStatementUploaded(true)
  }

  const simulateMatching = () => {
    setMatchingProgress(0)
    const interval = setInterval(() => {
      setMatchingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setMatchedItems(mockMatchedItems)
          setUnmatchedInternal(mockUnmatchedInternal)
          setUnmatchedExternal(mockUnmatchedExternal)
          return 100
        }
        return prev + Math.random() * 20
      })
    }, 200)
  }

  const calculateVariance = () => {
    // Simulate small variance
    setVariance(Math.random() > 0.7 ? -Math.round(Math.random() * 500) : 0)
  }

  const completeReconciliation = () => {
    setShowWizard(false)
    // Would normally call API to save reconciliation
  }

  const getStatusBadge = (status: ReconciliationAccount['status']) => {
    switch (status) {
      case 'current':
        return <Badge className="bg-emerald-100 text-emerald-800">Current</Badge>
      case 'due':
        return <Badge className="bg-amber-100 text-amber-800">Due Soon</Badge>
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>
    }
  }

  const getHistoryStatusBadge = (status: ReconciliationHistory['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 gap-1"><CheckCircle2 className="w-3 h-3" />Completed</Badge>
      case 'variance_found':
        return <Badge className="bg-amber-100 text-amber-800 gap-1"><AlertTriangle className="w-3 h-3" />Variance Found</Badge>
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 gap-1"><Clock className="w-3 h-3" />In Progress</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Scale className="w-6 h-6 text-slate-600" />
            Bank Reconciliation Module
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            Automated bank reconciliation with variance detection
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export History
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Accounts Needing Reconciliation */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-600" />
            Accounts Requiring Reconciliation
          </CardTitle>
          <CardDescription>Click on an account to start the reconciliation process</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map(account => (
                <div 
                  key={account.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    account.status === 'overdue' 
                      ? 'border-red-200 bg-red-50/50 dark:bg-red-900/10 hover:border-red-300' 
                      : account.status === 'due'
                      ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 hover:border-amber-300'
                      : 'border-slate-200 bg-slate-50/50 dark:bg-slate-900/10 hover:border-slate-300'
                  }`}
                  onClick={() => startReconciliation(account.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">{account.name}</p>
                      <p className="text-sm text-muted-foreground">{account.accountNumber}</p>
                    </div>
                    {getStatusBadge(account.status)}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Balance</p>
                      <p className="font-mono font-medium">{formatCurrency(account.balance)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Last Recon.</p>
                      <p className="font-medium">{account.daysSinceRecon}d ago</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Pending Items</p>
                      <p className="font-medium">{account.pendingItems}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t flex justify-end">
                    <Button variant="outline" size="sm">
                      Start Reconciliation
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reconciliation History */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-600" />
            Reconciliation History
          </CardTitle>
          <CardDescription>Recent reconciliation sessions and their outcomes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Matched</TableHead>
                <TableHead className="text-right">Unmatched</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Completed By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.accountName}</TableCell>
                  <TableCell className="text-sm">
                    {formatDate(item.periodStart)} - {formatDate(item.periodEnd)}
                  </TableCell>
                  <TableCell>{getHistoryStatusBadge(item.status)}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">{item.matchedCount}</TableCell>
                  <TableCell className="text-right font-mono text-amber-600">{item.unmatchedCount}</TableCell>
                  <TableCell className={`text-right font-mono ${Math.abs(item.variance) > 0 ? 'text-red-600 font-semibold' : ''}`}>
                    {item.variance !== 0 ? formatCurrency(item.variance) : '-'}
                  </TableCell>
                  <TableCell className="text-sm">{item.completedBy}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.completedAt ? formatDate(item.completedAt) : '-'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reconciliation Wizard Dialog */}
      <Dialog open={showWizard} onOpenChange={(open) => !open && setShowWizard(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Bank Reconciliation Wizard</DialogTitle>
            <DialogDescription>
              Follow the steps to reconcile your accounts with bank statements
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center justify-between py-4 px-4 bg-muted/50 rounded-lg">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center gap-2 ${
                  step.status === 'completed' ? 'text-emerald-600' :
                  step.status === 'active' ? 'text-primary' :
                  'text-muted-foreground'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    step.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    step.status === 'active' ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {step.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : step.id}
                  </div>
                  <span className="hidden md:inline text-sm font-medium">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 lg:w-16 h-0.5 mx-2 ${
                    step.status === 'completed' ? 'bg-emerald-300' : 'bg-border'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="py-4 min-h-[300px]">
            {/* Step 1: Select Account & Period */}
            {wizardStep === 0 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Select Account</Label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose account to reconcile" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.accountNumber})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Period Start</Label>
                    <Input 
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Period End</Label>
                    <Input 
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    />
                  </div>
                </div>

                {selectedAccount && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm">
                      <strong>Selected:</strong> {accounts.find(a => a.id === selectedAccount)?.name}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Current Balance: {formatCurrency(accounts.find(a => a.id === selectedAccount)?.balance || 0)} • 
                      Pending Items: {accounts.find(a => a.id === selectedAccount)?.pendingItems}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Import Statement */}
            {wizardStep === 1 && (
              <div className="space-y-6">
                {!statementUploaded ? (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="font-medium mb-2">Upload Bank Statement</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload your bank statement in CSV or Excel format
                    </p>
                    <Button onClick={simulateUpload}>
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </Button>
                    <p className="text-xs text-muted-foreground mt-4">
                      Supported formats: .csv, .xlsx, .xls • Max file size: 10MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      <div>
                        <p className="font-medium text-emerald-800">Statement Uploaded Successfully</p>
                        <p className="text-sm text-emerald-600">bank_statement_jan2024.csv • 156 transactions found</p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <p className="text-sm font-medium">Statement Summary:</p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total Credits</p>
                          <p className="font-mono font-semibold text-emerald-600">KSh 4,235,000</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Debits</p>
                          <p className="font-mono font-semibold text-red-600">KSh 1,850,000</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Net Change</p>
                          <p className="font-mono font-semibold">KSh 2,385,000</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Auto-Match */}
            {wizardStep === 2 && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <Zap className="w-12 h-12 mx-auto text-amber-500 mb-4 animate-pulse" />
                  <p className="font-medium text-lg mb-2">Auto-Matching Transactions</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Comparing internal records with bank statement entries...
                  </p>
                  
                  <div className="max-w-md mx-auto">
                    <Progress value={matchingProgress} className="h-3" />
                    <p className="text-sm text-muted-foreground mt-2">
                      {matchingProgress < 100 ? `${Math.round(matchingProgress)}% complete` : 'Complete!'}
                    </p>
                  </div>
                </div>

                {matchingProgress >= 100 && (
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-emerald-600">{matchedItems.length}</p>
                      <p className="text-sm text-muted-foreground">Auto-Matched</p>
                    </div>
                    <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-amber-600">{unmatchedInternal.length + unmatchedExternal.length}</p>
                      <p className="text-sm text-muted-foreground">Unmatched</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {matchedItems.length > 0 
                          ? Math.round(matchedItems.reduce((s, m) => s + m.confidence, 0) / matchedItems.length)
                          : 0}%
                      </p>
                      <p className="text-sm text-muted-foreground">Avg Confidence</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Review Matches */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                {/* Matched Items */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Matched Transactions ({matchedItems.length})
                  </h4>
                  <ScrollArea className="max-h-[200px] border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Internal Ref</TableHead>
                          <TableHead>Bank Ref</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Confidence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {matchedItems.map(item => (
                          <TableRow key={item.id}>
                            <TableCell><code className="text-xs">{item.internalRef}</code></TableCell>
                            <TableCell><code className="text-xs">{item.externalRef}</code></TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(item.amount)}</TableCell>
                            <TableCell>
                              <Badge variant={item.matchType === 'auto' ? 'secondary' : 'outline'}>
                                {item.matchType === 'auto' ? 'Auto' : 'Manual'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                item.confidence >= 95 ? 'bg-emerald-100 text-emerald-800' :
                                item.confidence >= 80 ? 'bg-amber-100 text-amber-800' :
                                'bg-red-100 text-red-800'
                              }>
                                {item.confidence}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                {/* Unmatched Internal */}
                {unmatchedInternal.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      Unmatched Internal Records ({unmatchedInternal.length})
                    </h4>
                    <div className="space-y-2 max-h-[150px] overflow-auto">
                      {unmatchedInternal.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/10 rounded border border-amber-200">
                          <div>
                            <code className="text-xs">{item.reference}</code>
                            <span className="text-sm ml-2">{item.description}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{formatCurrency(item.amount)}</span>
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              <Link2 className="w-3 h-3 mr-1" /> Manual Match
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unmatched External */}
                {unmatchedExternal.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      Unmatched Bank Entries ({unmatchedExternal.length})
                    </h4>
                    <div className="space-y-2 max-h-[150px] overflow-auto">
                      {unmatchedExternal.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/10 rounded border border-red-200">
                          <div>
                            <code className="text-xs">{item.reference}</code>
                            <span className="text-sm ml-2">{item.description}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{formatCurrency(item.amount)}</span>
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              <Link2 className="w-3 h-3 mr-1" /> Manual Match
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Calculate Variance */}
            {wizardStep === 4 && (
              <div className="space-y-6">
                <div className={`p-6 rounded-lg text-center ${
                  Math.abs(variance) > VARIANCE_THRESHOLD 
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200' 
                    : 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200'
                }`}>
                  {Math.abs(variance) > VARIANCE_THRESHOLD ? (
                    <>
                      <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                      <p className="font-semibold text-lg text-red-800">Variance Detected!</p>
                      <p className="text-red-600 mt-2">
                        The calculated variance of <strong>{formatCurrency(Math.abs(variance))}</strong> exceeds the threshold of {formatCurrency(VARIANCE_THRESHOLD)}
                      </p>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
                      <p className="font-semibold text-lg text-emerald-800">No Significant Variance</p>
                      <p className="text-emerald-600 mt-2">
                        All transactions are balanced within acceptable limits
                      </p>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <p className="text-sm text-muted-foreground">Book Balance</p>
                    <p className="text-xl font-mono font-bold">{formatCurrency(4235000)}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <p className="text-sm text-muted-foreground">Bank Balance</p>
                    <p className="text-xl font-mono font-bold">{formatCurrency(4235000 + variance)}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Calculated Variance:</span>
                    <span className={`font-mono font-bold text-xl ${
                      Math.abs(variance) > 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      {variance !== 0 ? formatCurrency(variance) : 'KSh 0.00'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Threshold: {formatCurrency(VARIANCE_THRESHOLD)}
                  </p>
                </div>
              </div>
            )}

            {/* Step 6: Confirm & Generate Report */}
            {wizardStep === 5 && (
              <div className="space-y-6">
                <div className="text-center py-4">
                  <FileText className="w-12 h-12 mx-auto text-primary mb-4" />
                  <p className="font-semibold text-lg">Ready to Complete Reconciliation</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Review the summary below and confirm to generate the final report
                  </p>
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <h4 className="font-medium">Reconciliation Summary</h4>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-muted-foreground">Account:</dt>
                    <dd>{accounts.find(a => a.id === selectedAccount)?.name}</dd>
                    <dt className="text-muted-foreground">Period:</dt>
                    <dd>{dateRange.start} to {dateRange.end}</dd>
                    <dt className="text-muted-foreground">Transactions Matched:</dt>
                    <dd>{matchedItems.length}</dd>
                    <dt className="text-muted-foreground">Unmatched Items:</dt>
                    <dd>{unmatchedInternal.length + unmatchedExternal.length}</dd>
                    <dt className="text-muted-foreground">Variance:</dt>
                    <dd className={Math.abs(variance) > 0 ? 'text-red-600 font-semibold' : ''}>
                      {variance !== 0 ? formatCurrency(variance) : 'None'}
                    </dd>
                  </dl>
                </div>

                <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                  <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                  <p className="text-sm text-blue-800">
                    Upon confirmation, this reconciliation will be recorded in history and cannot be modified.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Wizard Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={prevStep}
              disabled={wizardStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            {wizardStep < steps.length - 1 ? (
              <Button 
                onClick={nextStep}
                disabled={
                  (wizardStep === 0 && (!selectedAccount || !dateRange.start || !dateRange.end)) ||
                  (wizardStep === 1 && !statementUploaded) ||
                  (wizardStep === 2 && matchingProgress < 100)
                }
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={completeReconciliation}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete Reconciliation
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ReconciliationModule
