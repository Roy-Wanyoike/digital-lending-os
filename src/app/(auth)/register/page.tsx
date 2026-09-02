'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { z } from 'zod'

const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/

const registerSchema = z.object({
  tenantName: z.string().min(2, 'Organization name must be at least 2 characters').max(100, 'Organization name is too long'),
  ownerName: z.string().min(1, 'Your name is required').max(200, 'Name is too long'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(passwordComplexityRegex, 'Password must contain uppercase, lowercase, and a digit'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <RegisterPageInner />
    </Suspense>
  )
}

function RegisterPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const refParam = searchParams.get('ref') || ''

  const [tenantName, setTenantName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [referralCode, setReferralCode] = useState(refParam)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({})
  const [referralInfo, setReferralInfo] = useState<{ name: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsError, setTermsError] = useState(false)

  // Password strength calculation
  const getPasswordStrength = (pw: string): { score: number; label: string; color: string } => {
    if (!pw) return { score: 0, label: '', color: '' }
    let score = 0
    if (pw.length >= 8) score += 1
    if (pw.length >= 12) score += 1
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1
    if (/\d/.test(pw)) score += 1
    if (/[^a-zA-Z\d]/.test(pw)) score += 1
    if (score <= 2) return { score: Math.round((score / 5) * 100), label: 'Weak', color: 'bg-red-500' }
    if (score <= 3) return { score: Math.round((score / 5) * 100), label: 'Medium', color: 'bg-yellow-500' }
    return { score: Math.round((score / 5) * 100), label: 'Strong', color: 'bg-emerald-500' }
  }

  const passwordStrength = getPasswordStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    // Client-side validation with Zod
    const parsed = registerSchema.safeParse({ tenantName, ownerName, email, password, confirmPassword })
    if (!parsed.success) {
      const errors: Partial<Record<keyof RegisterFormData, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof RegisterFormData
        if (!errors[key]) errors[key] = issue.message
      }
      setFieldErrors(errors)
      return
    }

    // Validate terms
    if (!termsAccepted) {
      setTermsError(true)
      return
    }

    // Validate referral code if provided
    if (referralCode) {
      try {
        const refRes = await fetch('/api/referral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referralCode }),
        })
        const refData = await refRes.json()
        if (!refRes.ok) {
          setError('Invalid referral code: ' + (refData.error || 'please check and try again.'))
          return
        }
      } catch {
        setError('Could not validate referral code. Please try again.')
        return
      }
    }

    setLoading(true)

    try {
      const body: Record<string, string> = {
        name: tenantName,
        ownerName,
        ownerEmail: email,
        password,
      }
      if (referralCode) body.referralCode = referralCode

      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        router.push('/login?registered=true')
      } else {
        const data = await res.json()
        setError(data?.error || 'Registration failed. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Auto-validate referral code on mount
  useEffect(() => {
    let cancelled = false
    if (referralCode) {
      fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode }),
      })
        .then(r => r.json())
        .then(d => {
          if (cancelled) return
          if (d.valid) setReferralInfo({ name: d.referrer.name })
        })
        .catch(() => {})
    }
    return () => { cancelled = true }
  }, [referralCode])

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
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">
              YS
            </div>
            <span className="text-2xl font-bold text-foreground">Youngsend</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-none">Create your account</h1>
            <CardDescription className="mt-1">
              Financial Operating System for Global Commerce
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" aria-label="Create account form">
            {/* Referral Banner */}
            {(refParam || referralInfo) && (
              <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎁</span>
                  <div>
                    {referralInfo ? (
                      <p className="font-medium">Referred by {referralInfo.name}</p>
                    ) : (
                      <p className="font-medium">Referral code applied</p>
                    )}
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Code: <span className="font-mono font-semibold">{refParam || referralCode}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div role="alert" aria-live="assertive" className="rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="tenantName">Organization Name</Label>
              <Input
                id="tenantName"
                type="text"
                placeholder="Your company or organization"
                value={tenantName}
                onChange={(e) => { setTenantName(e.target.value); if (fieldErrors.tenantName) setFieldErrors(prev => ({ ...prev, tenantName: undefined })); if (error) setError('') }}
                required
                disabled={loading}
                autoComplete="organization"
                aria-invalid={!!fieldErrors.tenantName}
                aria-describedby={fieldErrors.tenantName ? 'tenantName-error' : undefined}
              />
              {fieldErrors.tenantName && (
                <p id="tenantName-error" className="text-sm text-red-600 dark:text-red-400">{fieldErrors.tenantName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerName">Your Name</Label>
              <Input
                id="ownerName"
                type="text"
                placeholder="John Doe"
                value={ownerName}
                onChange={(e) => { setOwnerName(e.target.value); if (fieldErrors.ownerName) setFieldErrors(prev => ({ ...prev, ownerName: undefined })); if (error) setError('') }}
                required
                disabled={loading}
                autoComplete="name"
                aria-invalid={!!fieldErrors.ownerName}
                aria-describedby={fieldErrors.ownerName ? 'ownerName-error' : undefined}
              />
              {fieldErrors.ownerName && (
                <p id="ownerName-error" className="text-sm text-red-600 dark:text-red-400">{fieldErrors.ownerName}</p>
              )}
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters, with uppercase, lowercase & digit"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined })); if (error) setError('') }}
                  required
                  minLength={8}
                  disabled={loading}
                  autoComplete="new-password"
                  className="pr-10"
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="text-sm text-red-600 dark:text-red-400">{fieldErrors.password}</p>
              )}
              {password && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Password strength</span>
                    <span className={`text-xs font-medium ${passwordStrength.label === 'Weak' ? 'text-red-600 dark:text-red-400' : passwordStrength.label === 'Medium' ? 'text-yellow-600 dark:text-yellow-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <Progress value={passwordStrength.score} className="h-1.5" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: undefined })); if (error) setError('') }}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  className="pr-10"
                  aria-invalid={!!fieldErrors.confirmPassword}
                  aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p id="confirmPassword-error" className="text-sm text-red-600 dark:text-red-400">{fieldErrors.confirmPassword}</p>
              )}
            </div>
            {/* Manual referral code input (if not from URL) */}
            {!refParam && (
              <div className="space-y-2">
                <Label htmlFor="referralCode" className="text-muted-foreground">
                  Referral Code <span className="text-muted-foreground/70">(optional)</span>
                </Label>
                <Input
                  id="referralCode"
                  type="text"
                  placeholder="e.g. YSABC123"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  disabled={loading}
                  className="uppercase"
                />
                <p className="text-xs text-muted-foreground/70">Enter a referral code to earn bonuses</p>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => { setTermsAccepted(checked === true); if (termsError) setTermsError(false) }}
                disabled={loading}
                aria-invalid={termsError}
                className="mt-0.5"
              />
              <Label htmlFor="terms" className="text-sm font-normal leading-snug cursor-pointer select-none">
                I agree to the{' '}
                <Link href="/terms" prefetch={false} className="text-emerald-600 dark:text-emerald-400 hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" prefetch={false} className="text-emerald-600 dark:text-emerald-400 hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>
            {termsError && (
              <p className="text-sm text-red-600 dark:text-red-400 -mt-2">You must accept the terms to continue</p>
            )}
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-base font-semibold"
              disabled={loading || !tenantName || !ownerName || !email || !password || !confirmPassword || !termsAccepted}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              prefetch={false}
              className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
      <div className="mt-6 pt-4 border-t flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        <span>256-bit SSL encrypted</span>
      </div>
    </div>
  )
}
