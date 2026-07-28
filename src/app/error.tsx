'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, Home, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ErrorBoundary] Unhandled error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15 dark:bg-destructive/20">
            <AlertTriangle className="h-7 w-7 text-destructive dark:text-red-400" />
          </div>
          <div>
            <CardTitle className="text-xl text-foreground">
              Something went wrong
            </CardTitle>
            <CardDescription className="mt-1 text-muted-foreground">
              An unexpected error occurred. Please try again or contact support.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.digest && (
            <div className="rounded-md bg-muted border border-border px-4 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">For support reference:</p>
              <p className="text-xs">
                Error ID: <code className="font-mono">{error.digest}</code>
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              onClick={reset}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" asChild>
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
              <Button variant="outline" className="flex-1" asChild>
                <Link
                  href={`mailto:support@youngsend.com?subject=Error Report&body=Error: ${encodeURIComponent(error.message || 'Unknown error')}`}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Report Issue
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
