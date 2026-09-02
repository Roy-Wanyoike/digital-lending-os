'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, ShieldCheck, Mail } from 'lucide-react'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ForgotPasswordFormData, string>>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    setSuccess(false)

    const parsed = forgotPasswordSchema.safeParse({ email })
    if (!parsed.success) {
      const errors: Partial<Record<keyof ForgotPasswordFormData, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ForgotPasswordFormData
        if (!errors[key]) errors[key] = issue.message
      }
      setFieldErrors(errors)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        const msg = typeof d.error === 'string' ? d.error : d.error?.message || 'Failed to send reset email'
        throw new Error(msg)
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">
              DLO
            </div>
            <span className="text-2xl font-bold text-foreground">Digital Lending OS</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-none">Check your email</h1>
            <CardDescription className="mt-1">
              We sent a password reset link to {email}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center text-center">
          <div className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 mb-4">
            <Mail className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <button
              type="button"
              onClick={() => setSuccess(false)}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
            >
              try again
            </button>
          </p>
          <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-base font-semibold">
            <Link href="/login" prefetch={false}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Login
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center space-y-4 pb-2">
        <div className="flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">
            DLO
          </div>
          <span className="text-2xl font-bold text-foreground">Digital Lending OS</span>
        </div>
        <div>
          <h1 className="text-xl font-semibold leading-none">Reset Password</h1>
          <CardDescription className="mt-1">
            Enter your email and we&apos;ll send you a reset link
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" aria-live="assertive" className="rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined })); if (error) setError('') }}
              required
              disabled={loading}
              autoComplete="email"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email && (
              <p id="email-error" className="text-sm text-red-600 dark:text-red-400">{fieldErrors.email}</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-base font-semibold"
            disabled={loading || !email}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link
            href="/login"
            prefetch={false}
            className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
          >
            Sign in
          </Link>
        </p>
        <div className="mt-4 pt-4 border-t flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>256-bit SSL encrypted</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted px-4 py-12">
      <Link
        href="/"
        prefetch={false}
        className="absolute top-4 left-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        &larr; Back to home
      </Link>
      <Suspense fallback={
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          </CardContent>
        </Card>
      }>
        <ForgotPasswordForm />
      </Suspense>
      <p className="mt-8 text-xs text-muted-foreground">
        Need help?{' '}
        <a href="mailto:support@digitallendingos.co.ke" className="underline hover:text-foreground transition-colors">
          Contact support
        </a>
      </p>
    </div>
  )
}
