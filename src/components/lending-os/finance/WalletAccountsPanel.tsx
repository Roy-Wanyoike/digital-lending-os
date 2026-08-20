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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Progress
} from '@/components/ui/progress'
import {
  Wallet,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Landmark,
  PiggyBank,
  Receipt,
  CreditCard,
  Eye,
  Copy,
  MoreVertical,
  TrendingUp,
  AlertCircle
} from 'lucide-react'

// Types
interface WalletAccount {
  id: string
  name: string
  accountNumber: string
  accountType: 'operating' | 'disbursement' | 'collection' | 'reserve' | 'fees'
  currentBalance: number
  availableBalance: number
  pendingTransactions: number
  lastReconciled: Date | string | null
  reconciliationStatus: 'reconciled' | 'overdue' | 'pending'
  currency: string
  dailyLimit?: number
  usedToday?: number
}

interface TransferForm {
  fromAccount: string
  toAccount: string
  amount: string
  reference: string
}

// Mock Data
const mockAccounts: WalletAccount[] = [
  {
    id: 'acc-1',
    name: 'Operating Account',
    accountNumber: '****4589',
    accountType: 'operating',
    currentBalance: 2850000,
    availableBalance: 2650000,
    pendingTransactions: 12,
    lastReconciled: new Date(Date.now() - 86400000), // Yesterday
    reconciliationStatus: 'reconciled',
    currency: 'KES',
    dailyLimit: 5000000,
    usedToday: 2350000
  },
  {
    id: 'acc-2',
    name: 'Disbursement Float Account',
    accountNumber: '****7823',
    accountType: 'disbursement',
    currentBalance: 1500000,
    availableBalance: 1250000,
    pendingTransactions: 8,
    lastReconciled: new Date(Date.now() - 172800000), // 2 days ago
    reconciliationStatus: 'overdue',
    currency: 'KES',
    dailyLimit: 3000000,
    usedToday: 1800000
  },
  {
    id: 'acc-3',
    name: 'Collection Account',
    accountNumber: '****3156',
    accountType: 'collection',
    currentBalance: 4250000,
    availableBalance: 4200000,
    pendingTransactions: 5,
    lastReconciled: new Date(), // Today
    reconciliationStatus: 'reconciled',
    currency: 'KES'
  },
  {
    id: 'acc-4',
    name: 'Reserve Fund Account',
    accountNumber: '****9012',
    accountType: 'reserve',
    currentBalance: 800000,
    availableBalance: 800000,
    pendingTransactions: 0,
    lastReconciled: new Date(Date.now() - 259200000), // 3 days ago
    reconciliationStatus: 'overdue',
    currency: 'KES'
  },
  {
    id: 'acc-5',
    name: 'Fees Account',
    accountNumber: '****5678',
    accountType: 'fees',
    currentBalance: 450000,
    availableBalance: 450000,
    pendingTransactions: 3,
    lastReconciled: new Date(Date.now() - 43200000), // 12 hours ago
    reconciliationStatus: 'reconciled',
    currency: 'KES'
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

function formatCurrencyShort(amount: number): string {
  const absAmount = Math.abs(amount)
  if (absAmount >= 1000000) {
    return `KSh ${(amount / 1000000).toFixed(1)}M`
  }
  if (absAmount >= 1000) {
    return `KSh ${(amount / 1000).toFixed(1)}K`
  }
  return `KSh ${amount.toFixed(0)}`
}

function formatDate(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

// Get account icon and color based on type
const getAccountConfig = (type: WalletAccount['accountType']) => {
  switch (type) {
    case 'operating':
      return {
        icon: <Wallet className="w-6 h-6" />,
        bgColor: 'from-emerald-500 to-emerald-600',
        textColor: 'text-emerald-600',
        lightBg: 'bg-emerald-50 dark:bg-emerald-900/20',
        borderColor: 'border-emerald-200 dark:border-emerald-800'
      }
    case 'disbursement':
      return {
        icon: <CreditCard className="w-6 h-6" />,
        bgColor: 'from-blue-500 to-blue-600',
        textColor: 'text-blue-600',
        lightBg: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800'
      }
    case 'collection':
      return {
        icon: <ArrowDownLeft className="w-6 h-6" />,
        bgColor: 'from-purple-500 to-purple-600',
        textColor: 'text-purple-600',
        lightBg: 'bg-purple-50 dark:bg-purple-900/20',
        borderColor: 'border-purple-200 dark:border-purple-800'
      }
    case 'reserve':
      return {
        icon: <PiggyBank className="w-6 h-6" />,
        bgColor: 'from-amber-500 to-amber-600',
        textColor: 'text-amber-600',
        lightBg: 'bg-amber-50 dark:bg-amber-900/20',
        borderColor: 'border-amber-200 dark:border-amber-800'
      }
    case 'fees':
      return {
        icon: <Receipt className="w-6 h-6" />,
        bgColor: 'from-teal-500 to-teal-600',
        textColor: 'text-teal-600',
        lightBg: 'bg-teal-50 dark:bg-teal-900/20',
        borderColor: 'border-teal-200 dark:border-teal-800'
      }
  }
}

export function WalletAccountsPanel() {
  const [accounts, setAccounts] = useState<WalletAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [transferForm, setTransferForm] = useState<TransferForm>({
    fromAccount: '',
    toAccount: '',
    amount: '',
    reference: ''
  })
  const [transferring, setTransferring] = useState(false)

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setAccounts(mockAccounts)
      setLoading(false)
    }, 600)
    
    return () => clearTimeout(timer)
  }, [])

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => {
      setAccounts(mockAccounts)
      setLoading(false)
    }, 500)
  }

  const handleTransfer = async () => {
    if (!transferForm.fromAccount || !transferForm.toAccount || !transferForm.amount) return
    
    setTransferring(true)
    
    // Simulate transfer API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Update balances in mock data
    setAccounts(prev => prev.map(acc => {
      if (acc.id === transferForm.fromAccount) {
        return {
          ...acc,
          currentBalance: acc.currentBalance - parseFloat(transferForm.amount),
          availableBalance: acc.availableBalance - parseFloat(transferForm.amount),
          pendingTransactions: acc.pendingTransactions + 1
        }
      }
      if (acc.id === transferForm.toAccount) {
        return {
          ...acc,
          currentBalance: acc.currentBalance + parseFloat(transferForm.amount),
          availableBalance: acc.availableBalance + parseFloat(transferForm.amount),
          pendingTransactions: acc.pendingTransactions + 1
        }
      }
      return acc
    }))
    
    setTransferring(false)
    setShowTransferDialog(false)
    setTransferForm({ fromAccount: '', toAccount: '', amount: '', reference: '' })
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-slate-600" />
            Wallet Accounts
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            Multi-account wallet management • Total: {formatCurrency(totalBalance)}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
            <DialogTrigger asChild>
              <Button>
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Transfer Funds
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Transfer Between Accounts</DialogTitle>
                <DialogDescription>
                  Move funds between your internal accounts
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>From Account</Label>
                  <Select 
                    value={transferForm.fromAccount}
                    onValueChange={(v) => setTransferForm(prev => ({ ...prev, fromAccount: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} ({formatCurrencyShort(acc.availableBalance)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-center">
                  <Button variant="ghost" size="sm" className="rounded-full p-2">
                    <ArrowDownLeft className="w-5 h-5 rotate-90" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>To Account</Label>
                  <Select 
                    value={transferForm.toAccount}
                    onValueChange={(v) => setTransferForm(prev => ({ ...prev, toAccount: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.filter(a => a.id !== transferForm.fromAccount).map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amount (KES)</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Reference (Optional)</Label>
                  <Input
                    placeholder="e.g., Float replenishment"
                    value={transferForm.reference}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, reference: e.target.value }))}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleTransfer}
                  disabled={!transferForm.fromAccount || !transferForm.toAccount || !transferForm.amount || transferring}
                >
                  {transferring ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                      Transfer
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 animate-pulse">
                <div className="h-48 bg-muted rounded-lg" />
              </CardContent>
            </Card>
          ))
        ) : accounts.map(account => {
          const config = getAccountConfig(account.accountType)
          const utilizationPercent = account.dailyLimit && account.usedToday 
            ? (account.usedToday / account.dailyLimit) * 100 
            : null

          return (
            <Card 
              key={account.id} 
              className={`overflow-hidden ${config.borderColor} hover:shadow-lg transition-shadow`}
            >
              {/* Colored Header */}
              <div className={`bg-gradient-to-r ${config.bgColor} p-4 text-white`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      {config.icon}
                    </div>
                    <div>
                      <p className="font-semibold">{account.name}</p>
                      <p className="text-sm text-white/80">{account.accountNumber}</p>
                    </div>
                  </div>
                  
                  <Badge 
                    variant="secondary"
                    className={
                      account.reconciliationStatus === 'reconciled' 
                        ? 'bg-white/20 text-white border-0' 
                        : 'bg-red-500/20 text-white border-0'
                    }
                  >
                    {account.reconciliationStatus === 'reconciled' ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1" />Reconciled</>
                    ) : (
                      <><AlertTriangle className="w-3 h-3 mr-1" />Overdue</>
                    )}
                  </Badge>
                </div>
                
                {/* Main Balance */}
                <div className="mt-4 pl-1">
                  <p className="text-white/70 text-xs uppercase tracking-wide">Current Balance</p>
                  <p className="text-2xl font-bold tracking-tight mt-1">
                    {formatCurrency(account.currentBalance)}
                  </p>
                </div>
              </div>

              <CardContent className="p-4 space-y-4">
                {/* Available Balance */}
                <div className={`${config.lightBg} p-3 rounded-lg`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Available</span>
                    <span className={`font-mono font-semibold ${config.textColor}`}>
                      {formatCurrency(account.availableBalance)}
                    </span>
                  </div>
                  {account.pendingTransactions > 0 && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Pending Transactions
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {account.pendingTransactions}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Daily Limit Progress */}
                {utilizationPercent !== null && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Daily Limit Usage</span>
                      <span className="font-medium">{formatCurrencyShort(account.usedToday || 0)} / {formatCurrencyShort(account.dailyLimit || 0)}</span>
                    </div>
                    <Progress 
                      value={utilizationPercent} 
                      className={`h-2 ${
                        utilizationPercent > 90 ? '[&>div]:bg-red-500' :
                        utilizationPercent > 70 ? '[&>div]:bg-amber-500' :
                        '[&>div]:bg-emerald-500'
                      }`}
                    />
                  </div>
                )}

                {/* Last Reconciled */}
                <div className="flex items-center justify-between pt-2 border-t text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className={`w-4 h-4 ${
                      account.reconciliationStatus === 'reconciled' ? 'text-emerald-500' : 'text-amber-500'
                    }`} />
                    Last Reconciled
                  </span>
                  <span className="font-medium">
                    {account.lastReconciled ? formatDate(account.lastReconciled) : 'Never'}
                  </span>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Copy className="w-3 h-3 mr-1" />
                    Statement
                  </Button>
                  <Button variant="outline" size="sm" className="px-2">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary Footer */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
                <p className="text-xl font-bold">{formatCurrency(totalBalance)}</p>
              </div>
              <div className="h-10 w-px bg-border hidden md:block" />
              <div>
                <p className="text-sm text-muted-foreground">Available Across All Accounts</p>
                <p className="text-xl font-bold text-emerald-600">
                  {formatCurrency(accounts.reduce((sum, acc) => sum + acc.availableBalance, 0))}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Reconciled: {accounts.filter(a => a.reconciliationStatus === 'reconciled').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Overdue: {accounts.filter(a => a.reconciliationStatus === 'overdue').length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default WalletAccountsPanel
