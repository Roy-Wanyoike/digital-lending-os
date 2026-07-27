'use client'

import Link from 'next/link'
import { FileQuestion, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
            <FileQuestion className="h-7 w-7 text-amber-500" />
          </div>
          <div>
            <CardTitle className="text-xl text-foreground">Page not found</CardTitle>
            <CardDescription className="mt-1 text-muted-foreground">
              The page you are looking for does not exist or has been moved.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button className="flex-1" asChild>
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
