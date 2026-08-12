import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KeyRound } from 'lucide-react'

export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted px-4 py-12">
      {/* Back to home link */}
      <Link
        href="/"
        prefetch={false}
        className="absolute top-4 left-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        &larr; Back to home
      </Link>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">
              YS
            </div>
            <span className="text-2xl font-bold text-foreground">Youngsend</span>
          </div>
          <div>
            <CardTitle className="text-xl">Reset Password</CardTitle>
            <CardDescription className="mt-1">
              We&apos;ll help you get back into your account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <KeyRound className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-muted-foreground mb-6">
            Password reset functionality will be available soon. Please contact your administrator.
          </p>
          <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-base font-semibold">
            <Link href="/login" prefetch={false}>
              Back to Login
            </Link>
          </Button>
        </CardContent>
      </Card>

      <p className="mt-8 text-xs text-muted-foreground">
        Need help?{' '}
        <Link href="/support" prefetch={false} className="underline hover:text-foreground transition-colors">
          Contact support
        </Link>
      </p>
    </div>
  )
}
