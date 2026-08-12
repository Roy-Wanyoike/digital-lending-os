import { Skeleton } from '@/components/ui/skeleton'

export default function ConversionLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Two-column layout matching the conversion form + wallets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Form skeleton */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <Skeleton className="h-6 w-36" />
          {['Source wallet', 'Amount', 'Swap button', 'Target wallet'].map((label) => (
            <div key={label} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
          <Skeleton className="h-10 w-full rounded-md" />
          {/* Quote result placeholder */}
          <div className="h-40 rounded-lg bg-muted/50" />
        </div>

        {/* Wallets grid skeleton */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-6 w-28" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
