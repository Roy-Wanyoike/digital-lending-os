import { Skeleton } from '@/components/ui/skeleton'

export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header skeleton */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-20 hidden sm:block" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      </header>

      {/* Content skeleton */}
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-lg w-full space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <div className="space-y-3 w-full">
              <Skeleton className="h-10 w-3/4 mx-auto" />
              <Skeleton className="h-10 w-1/2 mx-auto" />
            </div>
            <Skeleton className="h-5 w-96 max-w-full mx-auto" />
          </div>
          <div className="flex items-center justify-center gap-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </main>

      {/* Footer skeleton */}
      <footer className="border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-40 hidden sm:block" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      </footer>
    </div>
  )
}
