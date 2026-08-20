'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Scale,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  Link2,
  Unlink,
  FileText,
  ChevronRight,
  Zap,
  Eye
} from 'lucide-react'

// Types
interface ReconciliationItem {
  id: string
  referenceNumber: string
  type: string
  amount: number
  currency: string
  date: Date | string
  externalRef?: string | null
  internalAccount: string
  status: 'matched' | 'unmatched'
  matchedAt?: Date | null
  confidence?: number
  discrepancy?: string | null
}

interface AutoMatchSuggestion {
  internalTransaction: ReconciliationItem
  suggestedExternalRecord: {
    reference: string
    amount: number
    date: Date | string
    source: string
    account: string
  }
  confidence: number
  reason: string
}

interface Discrepancy {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high'
  description: string
  transactionRef: string
  detectedAt: Date | string
  status: string
}

interface ReconciliationPanelProps {
  compact?: boolean
}

export function ReconciliationPanel({ compact = false }: ReconciliationPanelProps) {
  const [statusFilter, setStatusFilter] = useState('unmatched')
  const [items, setItems] = useState<ReconciliationItem[]>([])
  const [suggestions, setSuggestions] = useState<AutoMatchSuggestion[]>([])
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showMatchDialog, setShowMatchDialog] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        tenantId: 'default-tenant',
        status: statusFilter
      })
      
      const response = await fetch(`/api/finance/reconciliation?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setSummary(result.data.summary)
        setItems(statusFilter === 'unmatched' ? result.data.unmatched : 
                statusFilter === 'matched' ? result.data.matched :
                [...result.data.matched, ...result.data.unmatched])
        setSuggestions(result.data.suggestions || [])
        setDiscrepancies(result.data.summary?.discrepancies || [])
      } else {
        setError(result.error || 'Failed to load reconciliation data')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

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
      year: 'numeric'
    })
  }

  // Handle item selection
  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Handle manual match
  const handleManualMatch = async () => {
    if (selectedItems.size === 0) return
    
    try {
      const response = await fetch('/api/finance/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'match',
          transactionIds: Array.from(selectedItems),
          notes: 'Manually matched via reconciliation panel'
        })
      })
      
      const result = await response.json()
      if (result.success) {
        setShowMatchDialog(false)
        setSelectedItems(new Set())
        fetchData()
      }
    } catch (err) {
      console.error('Match error:', err)
    }
  }

  // Get confidence color
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return 'text-emerald-600 bg-emerald-100'
    if (confidence >= 50) return 'text-amber-600 bg-amber-100'
    return 'text-red-600 bg-red-100'
  }

  // Get severity badge
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High</Badge>
      case 'medium':
        return <Badge className="bg-amber-100 text-amber-800">Medium</Badge>
      case 'low':
        return <Badge className="bg-blue-100 text-blue-800">Low</Badge>
      default:
        return <Badge variant="outline">{severity}</Badge>
    }
  }

  if (compact) {
    // Compact view for dashboard widget
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="w-5 h-5 text-slate-500" />
              Reconciliation
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <a href="#reconciliation-full">View →</a>
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
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <p className="text-lg font-bold text-emerald-600">{summary?.matchedCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Matched</p>
                </div>
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-lg font-bold text-amber-600">{summary?.unmatchedCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <p className="text-lg font-bold">{summary?.matchRate || 0}%</p>
                  <p className="text-xs text-muted-foreground">Match Rate</p>
                </div>
              </div>

              {/* Recent Discrepancies */}
              {discrepancies.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Discrepancies
                  </p>
                  {discrepancies.slice(0, 2).map(d => (
                    <div key={d.id} className="flex items-start gap-2 p-2 rounded bg-amber-50 dark:bg-amber-900/10 text-sm">
                      <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${
                        d.severity === 'high' ? 'text-red-500' : 'text-amber-500'
                      }`} />
                      <span className="truncate">{d.description}</span>
                    </div>
                  ))}
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
    <div id="reconciliation-full" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Scale className="w-6 h-6 text-slate-600" />
            Bank Reconciliation
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            Match transactions with bank records and resolve discrepancies
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
            <DialogTrigger asChild>
              <Button disabled={selectedItems.size === 0}>
                <Link2 className="w-4 h-4 mr-2" />
                Match Selected ({selectedItems.size})
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Manual Match</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p>You are about to mark {selectedItems.size} transaction(s) as reconciled.</p>
                <div className="p-3 bg-muted rounded-lg space-y-1">
                  <p className="text-sm"><strong>Transactions:</strong> {selectedItems.size}</p>
                  <p className="text-sm"><strong>Action:</strong> Mark as reconciled</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowMatchDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleManualMatch}>Confirm Match</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
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

      {/* Summary Cards */}
      {!loading && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{summary.totalTransactions}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{summary.matchedCount}</p>
              <p className="text-xs text-muted-foreground">Matched</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 dark:border-amber-800">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{summary.unmatchedCount}</p>
              <p className="text-xs text-muted-foreground">Unmatched</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{summary.matchRate}%</p>
              <p className="text-xs text-muted-foreground">Match Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold">{formatCurrency(summary.totalUnmatchedAmount)}</p>
              <p className="text-xs text-muted-foreground">Unmatched Amt</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold text-red-600">{discrepancies.length}</p>
              <p className="text-xs text-muted-foreground">Discrepancies</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction List */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Transactions</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unmatched">Unmatched</SelectItem>
                  <SelectItem value="matched">Matched</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[450px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-[40px]" />
                    <TableHead>Reference</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(8)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(7)].map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-5 bg-muted rounded animate-pulse" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map(item => (
                      <TableRow 
                        key={item.id}
                        className={`cursor-pointer hover:bg-muted/50 ${item.discrepancy ? 'bg-amber-50/50 dark:bg-amber-900/5' : ''}`}
                        onClick={() => toggleItemSelection(item.id)}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={() => {}}
                            className="rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>
                          <code className="text-xs font-mono">{item.referenceNumber}</code>
                          {item.discrepancy && (
                            <AlertTriangle className="w-3 h-3 inline ml-1 text-amber-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm capitalize">{item.type.replace(/_/g, ' ')}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(item.amount)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(item.date)}
                        </TableCell>
                        <TableCell>
                          {item.status === 'matched' ? (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 gap-1">
                              <CheckCircle2 className="w-3 h-3" />Matched
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 gap-1">
                              <Clock className="w-3 h-3" />Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.confidence !== undefined && (
                            <Badge variant="secondary" className={getConfidenceColor(item.confidence)}>
                              {item.confidence}%
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Sidebar - Suggestions & Discrepancies */}
        <div className="space-y-6">
          {/* Auto-Match Suggestions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Auto-Match Suggestions
              </CardTitle>
              <CardDescription>AI-powered matching recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              {suggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No suggestions available
                </p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-auto">
                  {suggestions.map((suggestion, index) => (
                    <div 
                      key={index}
                      className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={getConfidenceColor(suggestion.confidence)}>
                          {suggestion.confidence}% match
                        </Badge>
                        <Button variant="ghost" size="sm" className="h-7 px-2">
                          <Link2 className="w-3 h-3 mr-1" />
                          Match
                        </Button>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Internal:</span>
                          <code className="font-mono text-xs">{suggestion.internalTransaction.referenceNumber}</code>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">External:</span>
                          <code className="font-mono text-xs">{suggestion.suggestedExternalRecord.reference}</code>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount:</span>
                          <span>{formatCurrency(suggestion.internalTransaction.amount)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground pt-1 border-t mt-2">
                          {suggestion.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discrepancies */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Discrepancies
              </CardTitle>
            </CardHeader>
            <CardContent>
              {discrepancies.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm text-muted-foreground">No discrepancies found</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[250px] overflow-auto">
                  {discrepancies.map(d => (
                    <div 
                      key={d.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        d.severity === 'high' ? 'border-red-500 bg-red-50 dark:bg-red-900/10' :
                        d.severity === 'medium' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10' :
                        'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        {getSeverityBadge(d.severity)}
                        <span className="text-xs text-muted-foreground">{formatDate(d.detectedAt)}</span>
                      </div>
                      <p className="text-sm">{d.description}</p>
                      <code className="text-xs text-muted-foreground block mt-1">{d.transactionRef}</code>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ReconciliationPanel
