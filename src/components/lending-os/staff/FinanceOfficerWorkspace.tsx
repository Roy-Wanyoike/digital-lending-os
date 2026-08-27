'use client'

import React, { useState } from 'react'
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
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  Wallet,
  CreditCard,
  Building2,
  RefreshCw,
  Download,
  FileText,
  Eye,
  CheckCircle,
  XCircle
} from 'lucide-react'

// Types
interface DisbursementItem {
  id: string
  customerName: string
  amount: number
  accountNumber: string
  method: 'mpesa' | 'bank' | 'wallet'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  loanId: string
}

interface SettlementInfo {
  source: string
  transactionCount: number
  amount: number
  status: 'pending' | 'settled' | 'delayed' | 'error'
}

interface ReconciliationAlert {
  id: string
  type: 'unmatched' | 'delayed' | 'discrepancy' | 'failed'
  message: string
  severity: 'warning' | 'error' | 'info'
  timestamp: string
}

interface FinancialSummary {
  disbursements: number
  collections: number
  feesCollected: number
  netFlow: number
}

// Demo Data
const FINANCIAL_SUMMARY: FinancialSummary = {
  disbursements: 180000,
  collections: 97000,
  feesCollected: 12000,
  netFlow: -71000,
}

const PENDING_DISBURSEMENTS: DisbursementItem[] = [
  { id: 'DIS-001', customerName: 'Mary Atieno', amount: 25000, accountNumber: '07XX***XX12', method: 'mpesa', status: 'pending', loanId: 'LN-2026-0852' },
  { id: 'DIS-002', customerName: 'John Doe', amount: 50000, accountNumber: '01XX***XX45', method: 'bank', status: 'pending', loanId: 'LN-2026-0853' },
  { id: 'DIS-003', customerName: 'Faith Wanjiku', amount: 15000, accountNumber: '07XX***XX78', method: 'mpesa', status: 'pending', loanId: 'LN-2026-0854' },
  { id: 'DIS-004', customerName: 'Peter Kamau', amount: 35000, accountNumber: '01XX***XX90', method: 'bank', status: 'processing', loanId: 'LN-2026-0855' },
  { id: 'DIS-005', customerName: 'Grace Mumbi', amount: 20000, accountNumber: 'Airtel***34', method: 'wallet', status: 'pending', loanId: 'LN-2026-0856' },
]

const SETTLEMENTS: SettlementInfo[] = [
  { source: 'M-Pesa', transactionCount: 128, amount: 892000, status: 'pending' },
  { source: 'Bank Transfer', transactionCount: 12, amount: 340000, status: 'settled' },
  { source: 'Airtel Money', transactionCount: 45, amount: 156000, status: 'settled' },
]

const RECONCILIATION_ALERTS: ReconciliationAlert[] = [
  { id: '1', type: 'unmatched', message: '3 unmatched transactions from today', severity: 'warning', timestamp: '10 min ago' },
  { id: '2', type: 'delayed', message: 'M-Pesa settlement delayed by 2 hours', severity: 'warning', timestamp: '1 hour ago' },
  { id: '3', type: 'discrepancy', message: 'KSh 500 discrepancy in bank batch #1245', severity: 'error', timestamp: '2 hours ago' },
]

interface FinanceOfficerWorkspaceProps {
  tenantId: string
  userId: string
  userName?: string
}

export function FinanceOfficerWorkspace({ 
  tenantId, 
  userId, 
  userName = 'Michael Kamau' 
}: FinanceOfficerWorkspaceProps) {
  const [selectedDisbursement, setSelectedDisbursement] = useState<DisbursementItem | null>(null)
  const [disburseDialogOpen, setDisburseDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const getMethodBadge = (method: DisbursementItem['method']) => {
    const variants = {
      mpesa: { label: 'M-Pesa', className: 'bg-green-100 text-green-700' },
      bank: { label: 'Bank', className: 'bg-blue-100 text-blue-700' },
      wallet: { label: 'Wallet', className: 'bg-purple-100 text-purple-700' },
    }
    const config = variants[method]
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>
  }

  const getStatusBadge = (status: DisbursementItem['status']) => {
    const variants = {
      pending: { label: 'Pending', variant: 'secondary' as const, icon: <Clock className="w-3 h-3" /> },
      processing: { label: 'Processing', variant: 'default' as const, icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
      completed: { label: 'Completed', variant: 'default' as const, className: 'bg-emerald-600', icon: <CheckCircle2 className="w-3 h-3" /> },
      failed: { label: 'Failed', variant: 'destructive' as const, icon: <XCircle className="w-3 h-3" /> },
    }
    const config = variants[status]
    return (
      <Badge variant={config.variant} className={config.className || ''}>
        {(config as any).icon}
        {' '}{config.label}
      </Badge>
    )
  }

  const getSettlementStatusIcon = (status: SettlementInfo['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'settled': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case 'delayed': return <AlertTriangle className="w-4 h-4 text-orange-500" />
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const handleDisburse = () => {
    setIsProcessing(true)
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false)
      setDisburseDialogOpen(false)
    }, 2000)
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `KSh ${(amount / 1000000).toFixed(1)}M`
    }
    return `KSh ${amount.toLocaleString()}`
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Wallet className="w-8 h-8 text-teal-600" />
            Finance Officer Workspace
          </h1>
          <p className="text-muted-foreground mt-1">Welcome back, {userName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 px-3 py-1">
            <Clock className="w-3 h-3 text-yellow-500" />
            {PENDING_DISBURSEMENTS.filter(d => d.status === 'pending').length} Pending Disbursements
          </Badge>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Disbursements</p>
                <p className="text-xl font-bold">{formatCurrency(FINANCIAL_SUMMARY.disbursements)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Collections</p>
                <p className="text-xl font-bold">{formatCurrency(FINANCIAL_SUMMARY.collections)}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-full">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fees Collected</p>
                <p className="text-xl font-bold">{formatCurrency(FINANCIAL_SUMMARY.feesCollected)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${FINANCIAL_SUMMARY.netFlow >= 0 ? 'from-emerald-50 to-white border-emerald-100' : 'from-red-50 to-white border-red-100'}`}>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Flow</p>
                <p className={`text-xl font-bold ${FINANCIAL_SUMMARY.netFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {FINANCIAL_SUMMARY.netFlow >= 0 ? '+' : ''}{formatCurrency(FINANCIAL_SUMMARY.netFlow)}
                </p>
              </div>
              <div className={`p-3 rounded-full ${FINANCIAL_SUMMARY.netFlow >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {FINANCIAL_SUMMARY.netFlow >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Disbursements */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Pending Disbursements
                </CardTitle>
                <CardDescription>{PENDING_DISBURSEMENTS.filter(d => d.status === 'pending').length} loans ready for disbursement</CardDescription>
              </div>
              <Button size="sm" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Process All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PENDING_DISBURSEMENTS.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.customerName}</p>
                        <p className="text-xs text-muted-foreground">{item.loanId}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">KSh {item.amount.toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-sm">{item.accountNumber}</TableCell>
                    <TableCell>{getMethodBadge(item.method)}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right">
                      {item.status === 'pending' && (
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedDisbursement(item)
                            setDisburseDialogOpen(true)
                          }}
                        >
                          Disburse
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Settlements & Alerts */}
        <div className="space-y-6">
          {/* Pending Settlements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-orange-600" />
                Settlements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {SETTLEMENTS.map((settlement, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {settlement.source === 'M-Pesa' && <Wallet className="w-4 h-4 text-green-600" />}
                      {settlement.source === 'Bank Transfer' && <Building2 className="w-4 h-4 text-blue-600" />}
                      {settlement.source === 'Airtel Money' && <CreditCard className="w-4 h-4 text-red-600" />}
                      <span className="font-medium text-sm">{settlement.source}</span>
                    </div>
                    {getSettlementStatusIcon(settlement.status)}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{settlement.transactionCount} transactions</span>
                    <span className="font-semibold">KSh {(settlement.amount / 1000).toFixed(0)}K</span>
                  </div>
                  <Badge 
                    variant={settlement.status === 'settled' ? 'default' : 'secondary'}
                    className="w-full justify-center"
                  >
                    {settlement.status === 'pending' ? '⏳ Awaiting' : settlement.status === 'settled' ? '✅ Settled' : settlement.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Reconciliation Alerts */}
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
                <AlertTriangle className="w-5 h-5" />
                Reconciliation Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-3">
                  {RECONCILIATION_ALERTS.map((alert) => (
                    <div key={alert.id} className={`p-3 rounded-lg ${
                      alert.severity === 'error' ? 'bg-red-50 border border-red-200' :
                      alert.severity === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-gray-50 border border-gray-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        {alert.severity === 'error' ? (
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
                        ) : (
                          <AlertTriangle className={`w-4 h-4 mt-0.5 ${alert.severity === 'warning' ? 'text-yellow-500' : 'text-gray-400'}`} />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{alert.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button className="justify-start gap-3 h-auto py-4 bg-teal-600 hover:bg-teal-700">
                <DollarSign className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">Process Disbursements</p>
                  <p className="text-xs opacity-80">Approve & send funds</p>
                </div>
              </Button>
              
              <Button variant="outline" className="justify-start gap-3 h-auto py-4">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium">Reconcile</p>
                  <p className="text-xs text-muted-foreground">Match transactions</p>
                </div>
              </Button>
              
              <Button variant="outline" className="justify-start gap-3 h-auto py-4">
                <FileText className="w-5 h-5 text-purple-600" />
                <div className="text-left">
                  <p className="font-medium">Reports</p>
                  <p className="text-xs text-muted-foreground">Financial reports</p>
                </div>
              </Button>
              
              <Button variant="outline" className="justify-start gap-3 h-auto py-4">
                <Download className="w-5 h-5 text-emerald-600" />
                <div className="text-left">
                  <p className="font-medium">Export</p>
                  <p className="text-xs text-muted-foreground">Download data</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Balances */}
        <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-600" />
              Account Balances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-white rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">M-Pesa Float</span>
                </div>
                <span className="font-semibold">KSh 2,450,000</span>
              </div>
              <Progress value={65} className="h-2" />
              <p className="text-xs text-muted-foreground">65% of recommended float level</p>
            </div>

            <div className="p-4 bg-white rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Operating Account</span>
                </div>
                <span className="font-semibold">KSh 8,750,000</span>
              </div>
              <Progress value={87} className="h-2" />
              <p className="text-xs text-muted-foreground">Healthy balance</p>
            </div>

            <Separator />

            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <span className="text-sm font-medium text-emerald-800">Total Available Liquidity</span>
              <span className="font-bold text-emerald-600">KSh 11,200,000</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disbursement Confirmation Dialog */}
      <Dialog open={disburseDialogOpen} onOpenChange={setDisburseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Confirm Disbursement
            </DialogTitle>
            <DialogDescription>
              Review and confirm this disbursement
            </DialogDescription>
          </DialogHeader>
          
          {selectedDisbursement && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Customer</span>
                  <span className="font-medium">{selectedDisbursement.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="font-bold text-lg">KSh {selectedDisbursement.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Method</span>
                  <span className="capitalize">{selectedDisbursement.method.replace('_', '-')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Account</span>
                  <span className="font-mono">{selectedDisbursement.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Loan ID</span>
                  <span>{selectedDisbursement.loanId}</span>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This action will initiate an immediate fund transfer. Please verify all details before proceeding.
                </p>
              </div>

              {isProcessing ? (
                <div className="text-center py-4 space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                  <p className="text-sm text-muted-foreground">Processing disbursement...</p>
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDisburseDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleDisburse}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Confirm Disbursement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
