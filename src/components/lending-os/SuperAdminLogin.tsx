'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Shield,
  Landmark,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  LockKeyhole,
  FileCheck,
  Server
} from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { DEMO_CREDENTIALS } from '@/lib/auth-types'

interface SuperAdminLoginProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function SuperAdminLogin({ onSuccess, onError }: SuperAdminLoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const login = useAuthStore(state => state.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setIsLoading(true)

    try {
      // Basic validation
      if (!email.trim()) {
        throw new Error('Email address is required')
      }
      if (!password) {
        throw new Error('Password is required')
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      const success = await login('admin', { email: email.trim(), password })
      
      if (success) {
        onSuccess?.()
      } else {
        const storeError = useAuthStore.getState().error
        throw new Error(storeError || 'Invalid credentials')
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
    setEmail(DEMO_CREDENTIALS.superAdmin.email)
    setPassword(DEMO_CREDENTIALS.superAdmin.password)
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl shadow-lg shadow-slate-900/30 mb-4">
          <Landmark className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Digital Lending OS</h1>
        <p className="text-slate-400 text-sm">Platform Administration Console</p>
        <Badge variant="secondary" className="mt-3 bg-slate-800 text-emerald-400 border border-slate-700">
          <Shield className="w-3 h-3 mr-1.5" />
          Platform Administrator
        </Badge>
      </div>

      {/* Login Form */}
      <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50 shadow-2xl shadow-black/20">
        <CardContent className="p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-slate-300 text-sm font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                Admin Email
              </Label>
              <div className="relative">
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@digitallending.os"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                  className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20 h-11 pr-10"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-slate-300 text-sm font-medium flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20 h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {localError && (
              <div className="flex items-start gap-2 p-3 bg-red-950/50 border border-red-800/50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-300">{localError}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold h-11 shadow-lg shadow-emerald-900/30 transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <LockKeyhole className="w-4 h-4 mr-2" />
                  Sign In to Platform
                </>
              )}
            </Button>
          </form>

          <Separator className="bg-slate-700" />

          {/* Demo Credentials Hint */}
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
            <p className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" />
              Demo Mode - Quick Access
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fillDemoCredentials}
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white text-xs"
            >
              Fill Demo Credentials
            </Button>
            <p className="text-[10px] text-slate-500 mt-2 text-center">
              Auto-fills platform administrator credentials for testing
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security Indicators */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <SecurityBadge 
          icon={<LockKeyhole className="w-3.5 h-3.5" />} 
          label="Encrypted" 
        />
        <SecurityBadge 
          icon={<FileCheck className="w-3.5 h-3.5" />} 
          label="Audited" 
        />
        <SecurityBadge 
          icon={<Shield className="w-3.5 h-3.5" />} 
          label="MFA Ready" 
        />
      </div>

      {/* Footer Links */}
      <div className="mt-6 text-center space-y-2">
        <p className="text-xs text-slate-500">
          Secure Admin Access • CBK Compliant Platform
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
          <button className="hover:text-slate-300 transition-colors">Documentation</button>
          <span>•</span>
          <button className="hover:text-slate-300 transition-colors">Support</button>
          <span>•</span>
          <button className="hover:text-slate-300 transition-colors">Status</button>
        </div>
      </div>
    </div>
  )
}

// Security Badge Component
function SecurityBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
      <span className="text-emerald-400">{icon}</span>
      <span className="text-[11px] text-slate-400 font-medium">{label}</span>
    </div>
  )
}

export default SuperAdminLogin
