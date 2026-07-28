'use client'

import Link from 'next/link'
import { ArrowLeft, Home, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 dark:bg-amber-500/20">
            <svg className="h-7 w-7 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          </div>
          <div>
            <CardTitle className="text-xl text-foreground">We couldn&apos;t find that page</CardTitle>
            <CardDescription className="mt-1 text-muted-foreground">
              The link may be broken, or the page may have moved. Your account and data are safe.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* M3: User-friendly copy + H4: Consistent button in both modes */}
          <div className="flex gap-2">
            <Button className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white" asChild>
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            Your data is secure — this is just a navigation issue
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
