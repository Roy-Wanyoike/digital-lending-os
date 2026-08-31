'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  X,
  Users,
  Building2,
  Shield,
  Network,
  Landmark,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Lock,
  Mail,
  Smartphone
} from 'lucide-react'
import { SuperAdminLogin } from './SuperAdminLogin'
import { DCPLogin } from './DCPLogin'
import { CustomerLogin } from './CustomerLogin'
import { useAuthStore } from '@/lib/auth-store'
import type { PortalType } from '@/lib/auth-types'

interface LoginScreenProps {
  portal?: PortalType
  onPortalChange?: (portal: PortalType) => void
  onSuccess?: () => void
  onClose?: () => void
  showPortalSelector?: boolean
}

export function LoginScreen({ 
  portal: initialPortal = 'customer',
  onPortalChange,
  onSuccess,
  onClose,
  showPortalSelector = true
}: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<PortalType>(initialPortal)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)
  
  // Get auth state for global error display
  const authError = useAuthStore(state => state.error)
  const isLoading = useAuthStore(state => state.isLoading)
  const clearError = useAuthStore(state => state.clearError)

  // Clear errors when switching tabs
  const handleTabChange = useCallback((value: string) => {
    const newPortal = value as PortalType
    setActiveTab(newPortal)
    setLoginError(null)
    clearError()
    onPortalChange?.(newPortal)
  }, [onPortalChange, clearError])

  const handleSuccess = useCallback(() => {
    setLoginError(null)
    onSuccess?.()
  }, [onSuccess])

  const handleError = useCallback((error: string) => {
    setLoginError(error)
  }, [])

  // Get portal-specific styling
  const getPortalConfig = (portal: PortalType) => {
    switch (portal) {
      case 'admin':
        return {
          icon: <Shield className="w-5 h-5" />,
          title: 'Super Admin',
          description: 'Platform operator access',
          color: 'text-slate-700 dark:text-slate-300',
          bgColor: 'bg-slate-100 dark:bg-slate-800',
          borderColor: 'border-slate-200 dark:border-slate-700',
          gradient: 'from-slate-600 to-slate-800'
        }
      case 'lender':
        return {
          icon: <Building2 className="w-5 h-5" />,
          title: 'DCP Staff',
          description: 'Organization administration',
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950/30',
          borderColor: 'border-blue-200 dark:border-blue-800/50',
          gradient: 'from-blue-600 to-indigo-600'
        }
      case 'customer':
        return {
          icon: <Users className="w-5 h-5" />,
          title: 'Customer',
          description: 'Borrower self-service',
          color: 'text-emerald-600 dark:text-emerald-400',
          bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
          borderColor: 'border-emerald-200 dark:border-emerald-800/50',
          gradient: 'from-emerald-500 to-teal-500'
        }
      default:
        return {
          icon: <Network className="w-5 h-5" />,
          title: portal.charAt(0).toUpperCase() + portal.slice(1),
          description: '',
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-50 dark:bg-purple-950/30',
          borderColor: 'border-purple-200 dark:border-purple-800/50',
          gradient: 'from-purple-600 to-pink-600'
        }
    }
  }

  const currentConfig = getPortalConfig(activeTab)

  return (
    <div className="relative w-full">
      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/60 hover:text-white transition-colors"
          aria-label="Close login screen"
        >
          <X className="w-6 h-6" />
        </button>
      )}

      {/* Platform Branding */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <div className={`w-10 h-10 bg-gradient-to-br ${currentConfig.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
          <Landmark className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Digital Lending OS</h2>
          <p className="text-xs text-slate-400">Multi-Tenant Lending Platform</p>
        </div>
      </div>

      {/* Portal Selector Tabs */}
      {showPortalSelector && (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-white/10 backdrop-blur-sm border border-white/10 p-1 h-auto">
            <TabsTrigger 
              value="customer" 
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-lg py-2.5 px-3 text-white/80 text-xs font-medium transition-all duration-200"
            >
              <Users className="w-4 h-4 mr-1.5 hidden sm:block" />
              Customer
            </TabsTrigger>
            <TabsTrigger 
              value="lender" 
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-lg py-2.5 px-3 text-white/80 text-xs font-medium transition-all duration-200"
            >
              <Building2 className="w-4 h-4 mr-1.5 hidden sm:block" />
              DCP Staff
            </TabsTrigger>
            <TabsTrigger 
              value="admin" 
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-lg py-2.5 px-3 text-white/80 text-xs font-medium transition-all duration-200"
            >
              <Shield className="w-4 h-4 mr-1.5 hidden sm:block" />
              Admin
            </TabsTrigger>
          </TabsList>

          {/* Current Portal Indicator */}
          <div className={`mb-4 flex items-center gap-2 px-4 py-2 rounded-lg ${currentConfig.bgColor} border ${currentConfig.borderColor}`}>
            <span className={currentConfig.color}>{currentConfig.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${currentConfig.color}`}>{currentConfig.title}</p>
              <p className="text-xs text-muted-foreground truncate">{currentConfig.description}</p>
            </div>
            <Badge variant="secondary" className="text-[10px]">v2.0</Badge>
          </div>

          {/* Remember Me Option - Only show for admin/lender portals */}
          {(activeTab === 'admin' || activeTab === 'lender') && (
            <div className="mb-4 flex items-center gap-2 px-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                className="data-[state=checked]:bg-white data-[state=checked]:border-white"
              />
              <label
                htmlFor="remember-me"
                className="text-sm text-white/70 cursor-pointer select-none"
              >
                Keep me signed in
              </label>
            </div>
          )}

          {/* Login Forms */}
          <TabsContent value="customer" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <CustomerLogin 
              onSuccess={handleSuccess} 
              onError={handleError}
              onRegisterClick={() => console.log('Register clicked')}
            />
          </TabsContent>

          <TabsContent value="lender" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <DCPLogin onSuccess={handleSuccess} onError={handleError} />
          </TabsContent>

          <TabsContent value="admin" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <SuperAdminLogin onSuccess={handleSuccess} onError={handleError} />
          </TabsContent>
        </Tabs>
      )}

      {/* Single Portal Mode (no tabs) */}
      {!showPortalSelector && (
        <>
          {/* Current Portal Indicator */}
          <div className={`mb-6 flex items-center justify-center gap-2 px-4 py-3 rounded-xl ${currentConfig.bgColor} border ${currentConfig.borderColor}`}>
            <span className={currentConfig.color}>{currentConfig.icon}</span>
            <div>
              <p className={`font-semibold text-sm ${currentConfig.color}`}>{currentConfig.title}</p>
              <p className="text-xs text-muted-foreground">{currentConfig.description}</p>
            </div>
          </div>

          {/* Render appropriate login form */}
          {activeTab === 'customer' && (
            <CustomerLogin 
              onSuccess={handleSuccess} 
              onError={handleError}
              onRegisterClick={() => console.log('Register clicked')}
            />
          )}
          {activeTab === 'lender' && (
            <DCPLogin onSuccess={handleSuccess} onError={handleError} />
          )}
          {activeTab === 'admin' && (
            <SuperAdminLogin onSuccess={handleSuccess} onError={handleError} />
          )}
        </>
      )}

      {/* Global Error Display */}
      {(loginError || authError) && (
        <Card className="mt-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 animate-in slide-in-from-top-2 duration-200">
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">
                {loginError || authError}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-slate-900/90 rounded-lg shadow-lg">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span className="text-sm font-medium">Authenticating...</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Standalone Login Page Component for dedicated login routes
export function LoginPage({ 
  defaultPortal = 'customer' 
}: { 
  defaultPortal?: PortalType 
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-600/5 rounded-full blur-3xl" />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Floating Security Badges */}
        <div className="absolute top-20 left-10 opacity-10">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <div className="absolute top-40 right-20 opacity-10">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div className="absolute bottom-32 left-1/4 opacity-10">
          <Mail className="w-7 h-7 text-white" />
        </div>
        <div className="absolute bottom-20 right-1/3 opacity-10">
          <Smartphone className="w-6 h-6 text-white" />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <LoginScreen 
          portal={defaultPortal}
          showPortalSelector={true}
          onSuccess={() => {
            window.location.href = '/'
          }}
        />
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-xs text-white/30">
          Secure Authentication • JWT Tokens • End-to-End Encryption
        </p>
        <p className="text-xs text-white/20 mt-1">
          Digital Lending OS v2.0 • Built with Next.js & TypeScript
        </p>
      </div>
    </div>
  )
}

// Simple Email/Password Login Form Component (for embedded use)
interface EmailLoginFormProps {
  onSuccess?: () => void
  onError?: (error: string) => void
  showRememberMe?: boolean
  showForgotPassword?: boolean
  buttonText?: string
  title?: string
  subtitle?: string
}

export function EmailLoginForm({
  onSuccess,
  onError,
  showRememberMe = true,
  showForgotPassword = true,
  buttonText = 'Sign In',
  title = 'Welcome Back',
  subtitle = 'Sign in to your account'
}: EmailLoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [localLoading, setLocalLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const login = useAuthStore(state => state.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setLocalLoading(true)

    try {
      if (!email.trim()) {
        throw new Error('Email address is required')
      }
      if (!password) {
        throw new Error('Password is required')
      }

      const result = await login(email.trim(), password)
      
      if (result.success) {
        onSuccess?.()
      } else {
        throw new Error(result.error || 'Invalid email or password')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setLocalError(message)
      onError?.(message)
    } finally {
      setLocalLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setLocalError('Please enter your email address first')
      return
    }

    try {
      const result = await useAuthStore.getState().forgotPassword(email.trim())
      if (result.success) {
        setLocalError(null)
        alert('If an account exists with that email, a password reset link has been sent.')
      } else {
        setLocalError(result.error || 'Failed to send reset email')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email'
      setLocalError(message)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={localLoading}
            autoComplete="email"
            className="w-full h-11 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
          />
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={localLoading}
              autoComplete="current-password"
              className="w-full h-11 px-4 pr-11 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          {showRememberMe && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">Remember me</span>
            </label>
          )}
          
          {showForgotPassword && (
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
            >
              Forgot password?
            </button>
          )}
        </div>

        {/* Error Message */}
        {localError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{localError}</p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={localLoading}
          className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all duration-200"
        >
          {localLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            buttonText
          )}
        </Button>
      </form>
    </div>
  )
}

export default LoginScreen
