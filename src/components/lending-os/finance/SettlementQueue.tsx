'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Truck,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  Wifi,
  WifiOff,
  ArrowRight,
  Calendar,
  Banknote
} from 'lucide-react'

// Types
interface SettlementItem {
  id: string
  referenceNumber: string
  type: string
  amount: number
  currency: string
  date: Date | string
  sourceAccount: string
  destinationAccount: string
  holdingPeriod: string
  priority: 'high' | 'medium' | 'low'
}

interface SettlementBatch {
  id: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  itemCount: number
  totalAmount: number
  currency: string
  createdAt: Date | string
  processedAt?: Date | string | null
  completedAt?: Date | string | null
  bankReference?: string | null
  notes?: string | null
  error?: string
  retryCount?: number
  nextRetry?: Date | string
}

interface BankIntegration {
  status: 'connected' | 'disconnected' | 'error'
  bankName: string
  accountNumber: string
  lastSync: Date | string
  nextSync: Date | string
}

interface SettlementQueueProps {
  compact?: boolean
}

export function SettlementQueue({ compact = false }: SettlementQueueProps) {
  const [pendingItems, setPendingItems] = useState<SettlementItem[]>([])
  const [batches, setBatches] = useState<SettlementBatch[]>([])
  const [bankIntegration, setBankIntegration] = useState<BankIntegration | null>(null)
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingBatch, setProcessingBatch] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/finance/settlements?tenantId=default-tenant')
      const result = await response.json()
      
      if (result.success) {
        setPendingItems(result.data.pendingItems || [])
        setBatches(result.data.settlementBatches || [])
        setBankIntegration(result.data.bankIntegration || null)
        setSummary(result.data.summary || null)
      } else {
        setError(result.error || 'Failed to load settlement data')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
    return new Date(date).toLocaleDateString('en-KE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Process a batch
  const handleProcessBatch = async (batchId: string) => {
    try {
      setProcessingBatch(batchId)
      
      const response = await fetch('/api/finance/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process_batch',
          batchId
        })
      })
      
      const result = await response.json()
      if (result.success) {
        fetchData() // Refresh data
      }
    } catch (err) {
      console.error('Process batch error:', err)
    } finally {
      setProcessingBatch(null)
    }
  }

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High</Badge>
      case 'medium':
        return <Badge className="bg-amber-100 text-amber-800">Medium</Badge>
      case 'low':
        return <Badge variant="secondary">Low</Badge>
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  // Get status badge for batches
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 gap-1"><CheckCircle2 className="w-3 h-3" />Completed</Badge>
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800 gap-1"><Clock className="w-3 h-3 animate-spin" />Processing</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 gap-1"><XCircle className="w-3 h-3" />Failed</Badge>
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (compact) {
    // Compact view for dashboard widget
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="w-5 h-5 text-slate-500" />
              Settlement Queue
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <a href="#settlement-full">View →</a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(summary?.totalPendingAmount || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Pending Amount</p>
                </div>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <p className="text-lg font-bold">{summary?.totalPendingCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Pending Items</p>
                </div>
              </div>

              {/* Recent Batches */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Recent Batches</p>
                {(batches || []).slice(0, 3).map(batch => (
                  <div key={batch.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                    <span className="truncate">{batch.name}</span>
                    {getStatusBadge(batch.status)}
                  </div>
                ))}
              </div>

              {/* Bank Status */}
              {bankIntegration && (
                <div className={`flex items-center justify-between p-2 rounded ${
                  bankIntegration.status === 'connected' 
                    ? 'bg-emerald-50 dark:bg-emerald-900/10' 
                    : 'bg-red-50 dark:bg-red-900/10'
                }`}>
                  <div className="flex items-center gap-2">
                    {bankIntegration.status === 'connected' ? (
                      <Wifi className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm">{bankIntegration.bankName}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {bankIntegration.accountNumber}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Full view
  return (
    <div id="settlement-full" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Truck className="w-6 h-6 text-slate-600" />
            Settlement Management
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            Process pending settlements and manage bank integration
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => {
              // Create new batch action
              alert('Create new settlement batch')
            }}
          >
            <Play className="w-4 h-4 mr-2" />
            New Batch
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary Cards & Bank Integration */}
      {!loading && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xl font-bold text-blue-600">{formatCurrency(summary.totalPendingAmount)}</p>
              <p className="text-xs text-muted-foreground">Pending Amount</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xl font-bold">{summary.totalPendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending Items</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xl font-bold text-amber-600">{formatCurrency(summary.processingAmount)}</p>
              <p className="text-xs text-muted-foreground">Processing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(summary.todaySettled)}</p>
              <p className="text-xs text-muted-foreground">Today Settled</p>
            </CardContent>
          </Card>
          
          {/* Bank Integration Status */}
          <Card className={bankIntegration?.status === 'connected' ? 'border-emerald-200' : 'border-red-200'}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {bankIntegration?.status === 'connected' ? (
                  <Wifi className="w-4 h-4 text-emerald-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm font-medium truncate">
                  {bankIntegration?.bankName || 'No Connection'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{bankIntegration?.accountNumber}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Synced: {bankIntegration ? formatDate(bankIntegration.lastSync) : '-'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Items */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Pending Settlements
              </CardTitle>
              <Badge variant="secondary">{pendingItems.length} items</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Holding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(8)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(5)].map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-5 bg-muted rounded animate-pulse" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : pendingItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No pending settlements
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingItems.map(item => (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        <TableCell>
                          <code className="text-xs font-mono">{item.referenceNumber}</code>
                        </TableCell>
                        <TableCell className="capitalize text-sm">
                          {item.type.replace(/_/g, ' ').replace('REPAYMENT_', '')}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatCurrency(item.amount)}
                        </TableCell>
                        <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.holdingPeriod}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Settlement Batches */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-500" />
                Settlement Batches
              </CardTitle>
              <Badge variant="secondary">{batches.length} batches</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[400px] overflow-auto">
              <div className="space-y-3">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted rounded animate-pulse" />
                  ))
                ) : batches.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No settlement batches</p>
                ) : (
                  batches.map(batch => (
                    <div 
                      key={batch.id}
                      className={`p-4 rounded-lg border transition-colors hover:bg-muted/50 ${
                        batch.status === 'failed' ? 'border-red-200 bg-red-50/50 dark:bg-red-900/5' :
                        batch.status === 'processing' ? 'border-blue-200 bg-blue-50/50 dark:bg-blue-900/5' :
                        'border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{batch.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            Created {formatDate(batch.createdAt)}
                          </p>
                        </div>
                        {getStatusBadge(batch.status)}
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-center mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Items</p>
                          <p className="font-semibold">{batch.itemCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Amount</p>
                          <p className="font-mono font-semibold">{formatCurrency(batch.totalAmount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Ref</p>
                          <p className="font-mono text-xs">{batch.bankReference || '-'}</p>
                        </div>
                      </div>

                      {/* Error Display */}
                      {batch.error && (
                        <div className="flex items-start gap-2 p-2 bg-red-100 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-300 mb-3">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{batch.error}</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-3 border-t">
                        {batch.notes && (
                          <p className="text-xs text-muted-foreground truncate mr-2">{batch.notes}</p>
                        )}
                        
                        <div className="flex gap-2 ml-auto">
                          {batch.status === 'pending' && (
                            <Button 
                              size="sm"
                              onClick={() => handleProcessBatch(batch.id)}
                              disabled={processingBatch === batch.id}
                            >
                              {processingBatch === batch.id ? (
                                <>
                                  <Pause className="w-3 h-3 mr-1 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 mr-1" />
                                  Process
                                </>
                              )}
                            </Button>
                          )}
                          
                          {batch.status === 'failed' && batch.nextRetry && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleProcessBatch(batch.id)}
                            >
                              Retry ({new Date(batch.nextRetry).getHours()}:{String(new Date(batch.nextRetry).getMinutes()).padStart(2, '0')})
                            </Button>
                          )}

                          {batch.status === 'completed' && (
                            <Button size="sm" variant="ghost" asChild>
                              <a href="#">View Details</a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Settlement History Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-500" />
            Settlement History
          </CardTitle>
          <CardDescription>Recent settlement activity timeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            
            <div className="space-y-6">
              {(batches || []).filter(b => b.status !== 'pending').slice(0, 5).map((batch, index) => (
                <div key={batch.id} className="flex gap-4 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0 ${
                    batch.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                    batch.status === 'failed' ? 'bg-red-100 text-red-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {batch.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : batch.status === 'failed' ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </div>
                  
                  <div className="flex-1 pb-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{batch.name}</h4>
                      <span className="text-sm text-muted-foreground">
                        {batch.completedAt ? formatDate(batch.completedAt) : formatDate(batch.createdAt)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{batch.itemCount} transactions</span>
                      <span>{formatCurrency(batch.totalAmount)}</span>
                      {batch.bankReference && (
                        <span className="font-mono">{batch.bankReference}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {(!batches || batches.filter(b => b.status !== 'pending').length === 0) && (
                <p className="text-center text-muted-foreground py-8">No settlement history available</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SettlementQueue
