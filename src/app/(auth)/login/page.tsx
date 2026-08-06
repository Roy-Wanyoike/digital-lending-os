'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type LoginFormData = z.infer<typeof loginSchema>

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const registered = searchParams.get('registered')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    // Client-side validation
    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      const errors: Partial<Record<keyof LoginFormData, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof LoginFormData
        if (!errors[key]) errors[key] = issue.message
      }
      setFieldErrors(errors)
      return
    }

    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    })

    if (result?.error) {
      // Surface rate-limit errors from authorize(); fall back to generic message
      setError(result.error === 'CredentialsSignin' || !result.error
        ? 'Invalid email or password'
        : result.error)
      setLoading(false)
    } else {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center space-y-4 pb-2">
        <div className="flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">
            YS
          </div>
          <span className="text-2xl font-bold text-foreground">Youngsend</span>
        </div>
        <div>
          <h1 className="text-xl font-semibold leading-none">Welcome back</h1>
          <CardDescription className="mt-1">
            Financial Operating System for Global Commerce
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {registered && (
          <div role="status" className="rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 mb-4">
            Account created successfully. Please sign in.
          </div>
        )}
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
              onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined })) }}
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {/* V3: Forgot password link */}
              <Link
                href="/forgot-password"
                prefetch={false}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined })) }}
                required
                disabled={loading}
                autoComplete="current-password"
                className="pr-10"
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              />
              {fieldErrors.password && (
                <p id="password-error" className="text-sm text-red-600 dark:text-red-400 mt-1">{fieldErrors.password}</p>
              )}
              {/* V3: Password visibility toggle */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {/* H1: Deeper, authoritative CTA */}
          <Button
            type="submit"
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white h-11 text-base font-semibold"
            disabled={loading || !email || !password}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            prefetch={false}
            className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
          >
            Sign up
          </Link>
        </p>

        {/* V3: Trust signals */}
        <div className="mt-6 pt-4 border-t flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>256-bit SSL encrypted</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted px-4 py-12">
      {/* Back to home link */}
      <Link
        href="/"
        prefetch={false}
        className="absolute top-4 left-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to home
      </Link>
      {/* V3: Login page header branding */}
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-white font-bold text-[10px]">YS</div>
        <span className="text-sm font-semibold text-muted-foreground">Youngsend</span>
      </div>
      <Suspense fallback={
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          </CardContent>
        </Card>
      }>
        <LoginForm />
      </Suspense>
      {/* V2: Footer with legal links on login */}
      <p className="mt-8 text-xs text-muted-foreground">
        By signing in you agree to our{' '}
        <Link href="/terms" prefetch={false} className="underline hover:text-foreground transition-colors">Terms</Link>
        {' '}and{' '}
        <Link href="/privacy" prefetch={false} className="underline hover:text-foreground transition-colors">Privacy Policy</Link>
      </p>
    </div>
  )
}
