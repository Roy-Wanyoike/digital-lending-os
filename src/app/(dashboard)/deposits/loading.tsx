import { Skeleton } from '@/components/ui/skeleton'

export default function DepositsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border bg-muted/30 px-6 py-3">
          <div className="flex gap-6">
            {['Reference', 'Wallet', 'Amount', 'Method', 'Status', 'Date'].map((h) => (
              <Skeleton key={h} className="h-3 w-16" />
            ))}
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-6 border-b border-border last:border-0 px-6 py-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20 ml-auto" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}