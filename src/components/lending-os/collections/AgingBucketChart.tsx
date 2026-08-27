'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { AgingBucket } from './types'

interface AgingBucketChartProps {
  buckets: AgingBucket[]
  onBucketClick?: (bucket: AgingBucket) => void
  selectedBucket?: string | null
}

// Color mapping for severity levels
const severityColors = {
  low: {
    bg: 'bg-emerald-500',
    hover: 'hover:bg-emerald-600',
    text: 'text-emerald-700 dark:text-emerald-400',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800'
  },
  medium: {
    bg: 'bg-amber-500',
    hover: 'hover:bg-amber-600',
    text: 'text-amber-700 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800'
  },
  high: {
    bg: 'bg-orange-500',
    hover: 'hover:bg-orange-600',
    text: 'text-orange-700 dark:text-orange-400',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800'
  },
  critical: {
    bg: 'bg-red-500',
    hover: 'hover:bg-red-600',
    text: 'text-red-700 dark:text-red-400',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800'
  },
  severe: {
    bg: 'bg-rose-700',
    hover: 'hover:bg-rose-800',
    text: 'text-rose-700 dark:text-rose-400',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800'
  }
}

export function AgingBucketChart({ buckets, onBucketClick, selectedBucket }: AgingBucketChartProps) {
  // Calculate max amount for percentage calculations
  const maxAmount = useMemo(() => {
    return Math.max(...buckets.map(b => b.amount), 1)
  }, [buckets])

  // Calculate total for summary
  const totals = useMemo(() => ({
    count: buckets.reduce((sum, b) => sum + b.count, 0),
    amount: buckets.reduce((sum, b) => sum + b.amount, 0)
  }), [buckets])

  // Format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `KSh ${(amount / 1000000).toFixed(1)}M`
    }
    return `KSh ${amount.toLocaleString()}`
  }

  // Format number with commas
  const formatNumber = (num: number): string => num.toLocaleString()

  if (buckets.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-slate-500">
        <p>No aging data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Horizontal Bar Chart */}
      <div className="space-y-3">
        {buckets.map((bucket) => {
          const colors = severityColors[bucket.severity]
          const percentage = (bucket.amount / maxAmount) * 100
          const isSelected = selectedBucket === bucket.bucket

          return (
            <div
              key={bucket.bucket}
              className={cn(
                "group cursor-pointer transition-all duration-200 rounded-lg p-3",
                "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                isSelected && colors.border,
                isSelected && "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
              )}
              onClick={() => onBucketClick?.(bucket)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  "text-sm font-medium transition-colors",
                  colors.text
                )}>
                  {bucket.bucket}
                </span>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    colors.badge
                  )}>
                    {formatNumber(bucket.count)} loans
                  </span>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="relative h-8 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-md transition-all duration-500 ease-out flex items-center justify-end pr-3",
                    colors.bg,
                    !isSelected && colors.hover
                  )}
                  style={{ width: `${percentage}%` }}
                >
                  {percentage > 20 && (
                    <span className="text-xs font-medium text-white truncate drop-shadow-sm">
                      {formatCurrency(bucket.amount)}
                    </span>
                  )}
                </div>
                
                {/* Show amount outside if bar is too short */}
                {percentage <= 20 && (
                  <span className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium",
                    colors.text
                  )}>
                    {formatCurrency(bucket.amount)}
                  </span>
                )}
              </div>

              {/* Percentage of total */}
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {((bucket.amount / totals.amount) * 100).toFixed(1)}% of total overdue
                </span>
                {isSelected && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    ✓ Selected - Click to deselect
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary Row */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Total Overdue Portfolio</span>
          <div className="text-right">
            <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(totals.amount)}</span>
            <span className="text-slate-500 dark:text-slate-400 ml-2">
              ({formatNumber(totals.count)} loans)
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-xs text-slate-600 dark:text-slate-400">Low Risk (1-7 days)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span className="text-xs text-slate-600 dark:text-slate-400">Medium (8-30 days)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span className="text-xs text-slate-600 dark:text-slate-400">High (31-60 days)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-xs text-slate-600 dark:text-slate-400">Critical (61-90 days)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-rose-700" />
          <span className="text-xs text-slate-600 dark:text-slate-400">Severe (90+ days)</span>
        </div>
      </div>
    </div>
  )
}
