'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { 
  FileText, 
  CreditCard, 
  Users, 
  BarChart3,
  Inbox,
  Search,
  Plus,
  ArrowRight
} from 'lucide-react'

// ============================================
// EMPTY STATE COMPONENTS
// ============================================

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className 
}: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
          {icon || <Inbox className="w-8 h-8 text-slate-400 dark:text-slate-500" />}
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">{description}</p>
        {actionLabel && onAction && (
          <Button onClick={onAction} className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
            {actionLabel}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Pre-built empty states for common use cases

export function NoApplicationsEmpty() {
  return (
    <EmptyState
      icon={<FileText className="w-8 h-8 text-slate-400 dark:text-slate-500" />}
      title="No Applications Pending"
      description="There are no loan applications in the queue at the moment. New applications will appear here when customers submit them."
      actionLabel="Create Test Application"
      onAction={() => {}}
    />
  )
}

export function NoLoansEmpty() {
  return (
    <EmptyState
      icon={<CreditCard className="w-8 h-8 text-slate-400 dark:text-slate-500" />}
      title="No Active Loans"
      description="There are no active loans to display. Loans will appear here once they are approved and disbursed."
      actionLabel="View Applications"
      onAction={() => {}}
    />
  )
}

export function NoCustomersEmpty() {
  return (
    <EmptyState
      icon={<Users className="w-8 h-8 text-slate-400 dark:text-slate-500" />}
      title="No Customers Found"
      description="No customers match your search criteria. Try adjusting your filters or search terms."
      actionLabel="Add New Customer"
      onAction={() => {}}
    />
  )
}

export function NoDataChartEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
        <BarChart3 className="w-8 h-8 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Data Available</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
        There is no data available for this chart. Check back later once more data has been collected.
      </p>
    </div>
  )
}

export function SearchEmpty({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
        <Search className="w-8 h-8 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Results</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
        No results found for "{query}". Try a different search term or clear your filters.
      </p>
    </div>
  )
}

// ============================================
// SKELETON LOADING STATES
// ============================================

interface KPISkeletonProps {
  count?: number
}

export function KPICardSkeleton({ count = 4 }: KPISkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="dark:bg-slate-800/50 dark:border-slate-700 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="space-y-2 w-full">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </div>
              <Skeleton className="w-11 h-11 rounded-xl" />
            </div>
            <div className="flex items-center justify-between pt-3 border-t dark:border-slate-700">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-7 w-20" />
            </div>
          </CardContent>
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </Card>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <Card className="dark:bg-slate-800/50 dark:border-slate-700">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="overflow-hidden rounded-lg border dark:border-slate-700">
          {/* Header */}
          <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b dark:border-slate-700">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {Array.from({ length: cols }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-20" />
              ))}
            </div>
          </div>
          
          {/* Rows */}
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div 
              key={rowIndex} 
              className={`px-4 py-3 border-b last:border-b-0 dark:border-slate-700 ${
                rowIndex % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/50'
              }`}
            >
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {Array.from({ length: cols }).map((_, colIndex) => (
                  <Skeleton 
                    key={colIndex} 
                    className={`h-4 ${colIndex === 0 ? 'w-24' : colIndex === 1 ? 'w-32' : 'w-16'}`} 
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination skeleton */}
        <div className="mt-4 pt-4 border-t dark:border-slate-700 flex items-center justify-between">
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card className="dark:bg-slate-800/50 dark:border-slate-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full" style={{ height }} />
        
        {/* Summary stats skeleton */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t dark:border-slate-700">
          {[1, 2].map((i) => (
            <div key={i} className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
              <Skeleton className="h-3 w-20 mx-auto" />
              <Skeleton className="h-6 w-16 mx-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <Card className="dark:bg-slate-800/50 dark:border-slate-700">
      <CardHeader>
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-700">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// LOADING OVERLAY COMPONENT
// ============================================

interface LoadingOverlayProps {
  isLoading: boolean
  children: React.ReactNode
  message?: string
}

export function LoadingOverlay({ isLoading, children, message = 'Loading...' }: LoadingOverlayProps) {
  if (!isLoading) return <>{children}</>

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{message}</p>
        </div>
      </div>
    </div>
  )
}
