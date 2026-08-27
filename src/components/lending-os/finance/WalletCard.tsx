'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  FileText,
  MoreVertical,
  TrendingUp,
  Clock,
  CheckCircle2
} from 'lucide-react'

interface WalletData {
  balance: number
  availableBalance: number
  currency: string
  lastUpdated: Date | string
}

interface WalletCardProps {
  data?: WalletData | null
  loading?: boolean
}

export function WalletCard({ data, loading = false }: WalletCardProps) {
  if (loading || !data) {
    return (
      <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
        <CardContent className="p-5 animate-pulse">
          <div className="h-24 bg-white/20 rounded" />
        </CardContent>
      </Card>
    )
  }

  const pendingAmount = data.balance - data.availableBalance
  const trendPercentage = 12 // Sample trend

  return (
    <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20 hover:shadow-xl transition-shadow duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2.5 bg-white/10 rounded-lg">
            <Wallet className="w-6 h-6" />
          </div>
          <Badge 
            variant="secondary" 
            className="bg-white/20 text-white border-0 gap-1"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            Active
          </Badge>
        </div>

        {/* Main Balance */}
        <div className="mb-4">
          <p className="text-emerald-100 text-sm font-medium">Wallet Balance</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
              {formatCurrency(data.balance)}
            </h3>
            <span className="text-sm font-medium opacity-80">{data.currency}</span>
          </div>
          
          {/* Trend Indicator */}
          <div className="flex items-center gap-1 mt-2 text-emerald-200 text-xs">
            <TrendingUp className="w-3 h-3" />
            <span>+{trendPercentage}% from last month</span>
          </div>
        </div>

        {/* Balance Breakdown */}
        <div className="space-y-2 pt-3 border-t border-white/20">
          <div className="flex justify-between text-sm">
            <span className="text-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Available
            </span>
            <span className="font-medium">{formatCurrency(data.availableBalance)}</span>
          </div>
          
          {pendingAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-emerald-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Pending
              </span>
              <span className="font-medium">{formatCurrency(pendingAmount)}</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/20">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-white/10 p-2 flex-col gap-1 h-auto"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span className="text-[10px] leading-none">Top-up</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-white/10 p-2 flex-col gap-1 h-auto"
          >
            <CreditCard className="w-4 h-4" />
            <span className="text-[10px] leading-none">Transfer</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-white/10 p-2 flex-col gap-1 h-auto"
          >
            <FileText className="w-4 h-4" />
            <span className="text-[10px] leading-none">Statement</span>
          </Button>
        </div>

        {/* Last Updated */}
        <p className="text-emerald-200/60 text-[10px] mt-3 text-right">
          Updated: {formatLastUpdated(data.lastUpdated)}
        </p>
      </CardContent>
    </Card>
  )
}

// Helper functions
function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount)
  
  if (absAmount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`
  }
  
  if (absAmount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`
  }
  
  return `${Math.round(amount)}`
}

function formatLastUpdated(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  return d.toLocaleDateString()
}

export default WalletCard
