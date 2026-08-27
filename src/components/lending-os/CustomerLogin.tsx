'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'
import {
  Smartphone,
  Lock,
  Loader2,
  AlertCircle,
  UserPlus,
  HelpCircle,
  ArrowRight,
  Wallet,
  CheckCircle2,
  Sparkles
} from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { DEMO_CREDENTIALS } from '@/lib/auth-types'

interface CustomerLoginProps {
  onSuccess?: () => void
  onError?: (error: string) => void
  onRegisterClick?: () => void
}

export function CustomerLogin({ 
  onSuccess, 
  onError,
  onRegisterClick 
}: CustomerLoginProps) {
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [showNumpad, setShowNumpad] = useState(true)
  const [isReturningCustomer, setIsReturningCustomer] = useState(false)
  
  const phoneInputRef = useRef<HTMLInputElement>(null)
  const login = useAuthStore(state => state.login)

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '')
    
    // Limit to 12 digits (including country code)
    if (digits.length > 12) return phone
    
    // Auto-add +254 prefix if starting with 0 or 7
    if (digits.length > 0 && !value.startsWith('+') && !value.startsWith('2')) {
      if (digits.startsWith('0')) {
        return '+254' + digits.slice(1)
      }
      if (digits.startsWith('7')) {
        return '+254' + digits
      }
      return '+' + digits
    }
    
    return value
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhone(formatted)
    setLocalError(null)
    
    // Check if this looks like a returning customer (demo logic)
    if (formatted.length >= 13) {
      setIsReturningCustomer(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setIsLoading(true)

    try {
      // Validate phone number
      const cleanPhone = phone.replace(/[\s+-]/g, '')
      
      if (!phone.trim() || cleanPhone.length < 10) {
        throw new Error('Please enter a valid M-Pesa phone number')
      }
      
      if (!pin || pin.length < 4) {
        throw new Error('Please enter your 4-digit PIN')
      }

      const success = await login('customer', { 
        phone: phone.trim(), 
        pin 
      })
      
      if (success) {
        onSuccess?.()
      } else {
        const storeError = useAuthStore.getState().error
        throw new Error(storeError || 'Invalid phone number or PIN')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setLocalError(message)
      onError?.(message)
    } finally {
      setIsLoading(false)
    }
  }

  const fillDemoCredentials = () => {
    setPhone(DEMO_CREDENTIALS.customer.phone)
    setPin(DEMO_CREDENTIALS.customer.pin)
  }

  const handleForgotPin = () => {
    // Placeholder for forgot PIN flow
    alert('PIN Reset: In production, this would initiate an SMS-based PIN reset flow.')
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header - Friendly Welcome */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-lg shadow-emerald-500/30 mb-4">
          <Wallet className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-center gap-2">
          Welcome Back!
          <Sparkles className="w-5 h-5 text-amber-500" />
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Access your loan account quickly & securely
        </p>
      </div>

      {/* Login Form */}
      <Card className="border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
        <CardContent className="p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone Number Field */}
            <div className="space-y-3">
              <Label htmlFor="customer-phone" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                M-Pesa Phone Number
              </Label>
              
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium pointer-events-none">
                  📱
                </span>
                <Input
                  ref={phoneInputRef}
                  id="customer-phone"
                  type="tel"
                  placeholder="+254 7XX XXX XXX"
                  value={phone}
                  onChange={handlePhoneChange}
                  disabled={isLoading}
                  autoComplete="tel"
                  inputMode="numeric"
                  pattern="[+0-9]*"
                  className="h-14 pl-12 pr-4 text-lg tracking-wide bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-emerald-500 focus:ring-emerald-500/20 placeholder:text-slate-400"
                />
              </div>
              
              {/* Phone format hint */}
              <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                Enter your registered Safaricom number
              </p>
            </div>

            {/* PIN Input */}
            <div className="space-y-3">
              <Label htmlFor="customer-pin" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                Your PIN
              </Label>
              
              <div className="flex justify-center py-2">
                <InputOTP
                  maxLength={4}
                  value={pin}
                  onChange={(value) => {
                    setPin(value)
                    setLocalError(null)
                  }}
                  disabled={isLoading}
                  containerClassName="gap-3"
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3].map((idx) => (
                      <InputOTPSlot 
                        key={idx} 
                        index={idx}
                        className="w-14 h-14 text-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/20"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {/* Forgot PIN Link */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPin}
                  className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors inline-flex items-center gap-1"
                >
                  <HelpCircle className="w-3 h-3" />
                  Forgot PIN?
                </button>
              </div>
            </div>

            {/* Returning Customer Preview */}
            {isReturningCustomer && phone.length >= 13 && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-emerald-800 dark:text-emerald-300">
                      Account Found!
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                      Welcome back! Sign in to view your loan status and make payments.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {localError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-lg animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{localError}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || pin.length < 4}
              size="lg"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold h-14 text-base shadow-lg shadow-emerald-500/25 transition-all duration-200 disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-3 bg-card text-slate-500 dark:text-slate-400">or</span>
            </div>
          </div>

          {/* Register Button */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onRegisterClick}
            className="w-full h-12 border-dashed border-2 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-emerald-400 hover:text-emerald-600 transition-all duration-200"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            New Borrower? Apply for a Loan Today!
          </Button>

          {/* Demo Credentials */}
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800/50">
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
              💡 Demo Mode
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={fillDemoCredentials}
              className="w-full text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-xs h-8"
            >
              Fill Demo Customer Credentials
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="mt-6 space-y-3">
        <div className="grid grid-cols-3 gap-3 text-center">
          <FeatureBadge icon="🔒" label="Secure" />
          <FeatureBadge icon="⚡" label="Fast" />
          <FeatureBadge icon="📱" label="M-Pesa Ready" />
        </div>
        
        <p className="text-xs text-center text-slate-400 dark:text-slate-500">
          By signing in, you agree to our{' '}
          <button className="underline hover:text-slate-600 dark:hover:text-slate-300">Terms</button>
          {' '}and{' '}
          <button className="underline hover:text-slate-600 dark:hover:text-slate-300">Privacy Policy</button>
        </p>
      </div>
    </div>
  )
}

// Feature Badge Component
function FeatureBadge({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="py-2 px-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50">
      <span className="text-lg">{icon}</span>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{label}</p>
    </div>
  )
}

export default CustomerLogin
