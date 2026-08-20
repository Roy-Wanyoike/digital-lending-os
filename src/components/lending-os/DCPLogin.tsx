'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Search,
  CheckCircle2,
  Landmark,
  ChevronDown
} from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { MOCK_TENANTS, DEMO_CREDENTIALS, type Tenant } from '@/lib/auth-types'

interface DCPLoginProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function DCPLogin({ onSuccess, onError }: DCPLoginProps) {
  const [selectedTenantSlug, setSelectedTenantSlug] = useState<string>('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [tenantSearch, setTenantSearch] = useState('')
  const [rememberTenant, setRememberTenant] = useState(false)

  const login = useAuthStore(state => state.login)

  // Get selected tenant details
  const selectedTenant = useMemo(() => {
    return MOCK_TENANTS.find(t => t.slug === selectedTenantSlug) || null
  }, [selectedTenantSlug])

  // Filter tenants based on search
  const filteredTenants = useMemo(() => {
    if (!tenantSearch.trim()) return MOCK_TENANTS
    const search = tenantSearch.toLowerCase()
    return MOCK_TENANTS.filter(t => 
      t.name.toLowerCase().includes(search) || 
      t.slug.toLowerCase().includes(search)
    )
  }, [tenantSearch])

  // Active tenants only for selection
  const activeTenants = filteredTenants.filter(t => t.status === 'ACTIVE')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setIsLoading(true)

    try {
      if (!selectedTenantSlug) {
        throw new Error('Please select your organization')
      }
      
      if (!email.trim()) {
        throw new Error('Work email is required')
      }
      
      if (!password) {
        throw new Error('Password is required')
      }

      const success = await login('lender', { 
        email: email.trim(), 
        password,
        tenantSlug: selectedTenantSlug 
      })
      
      if (success) {
        onSuccess?.()
      } else {
        const storeError = useAuthStore.getState().error
        throw new Error(storeError || 'Invalid credentials or organization')
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
    setSelectedTenantSlug(DEMO_CREDENTIALS.dcpAdmin.tenantSlug)
    setEmail(DEMO_CREDENTIALS.dcpAdmin.email)
    setPassword(DEMO_CREDENTIALS.dcpAdmin.password)
  }

  const getStatusBadgeColor = (status: Tenant['status']) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'TRIAL': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'SUSPENDED': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  const getPlanBadgeVariant = (plan: Tenant['plan']) => {
    switch (plan) {
      case 'ENTERPRISE': return 'default'
      case 'PROFESSIONAL': return 'secondary'
      default: return 'outline'
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg shadow-blue-900/30 mb-3">
          <Building2 className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">DCP Staff Portal</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Sign in to your organization account</p>
      </div>

      {/* Login Form */}
      <Card className="border-slate-200 dark:border-slate-700 shadow-lg">
        <CardContent className="p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tenant Selector */}
            <div className="space-y-2">
              <Label htmlFor="tenant-select" className="text-sm font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                Select Your Organization
              </Label>
              
              {/* Custom Tenant Search/Select */}
              <div className="relative">
                <Select value={selectedTenantSlug} onValueChange={setSelectedTenantSlug} disabled={isLoading}>
                  <SelectTrigger id="tenant-select" className="h-11 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500/20">
                    <div className="flex items-center gap-2">
                      {selectedTenant ? (
                        <>
                          <div 
                            className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ backgroundColor: selectedTenant.primaryColor || '#64748b' }}
                          >
                            {selectedTenant.name.charAt(0)}
                          </div>
                          <span className="truncate">{selectedTenant.name}</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-400">Search or select tenant...</span>
                        </>
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {activeTenants.map((tenant) => (
                      <SelectItem key={tenant.slug} value={tenant.slug}>
                        <div className="flex items-center gap-2 py-1">
                          <div 
                            className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: tenant.primaryColor || '#64748b' }}
                          >
                            {tenant.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm">{tenant.name}</p>
                            <p className="text-xs text-muted-foreground truncate">@{tenant.slug}</p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                    {activeTenants.length === 0 && (
                      <div className="py-3 px-2 text-center text-sm text-muted-foreground">
                        No organizations found
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Tenant Preview */}
              {selectedTenant && (
                <div 
                  className="flex items-center gap-3 p-3 rounded-lg border transition-colors"
                  style={{ 
                    borderColor: `${selectedTenant.primaryColor}30`,
                    backgroundColor: `${selectedTenant.primaryColor}08`
                  }}
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold text-white shadow-sm"
                    style={{ backgroundColor: selectedTenant.primaryColor || '#64748b' }}
                  >
                    {selectedTenant.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                      {selectedTenant.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusBadgeColor(selectedTenant.status)}`}>
                        {selectedTenant.status}
                      </Badge>
                      <Badge variant={getPlanBadgeVariant(selectedTenant.plan)} className="text-[10px] px-1.5 py-0">
                        {selectedTenant.plan}
                      </Badge>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                </div>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="dcp-email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                Work Email
              </Label>
              <Input
                id="dcp-email"
                type="email"
                placeholder="you@organization.co.ke"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email work"
                className="h-11 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="dcp-password" className="text-sm font-medium flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="dcp-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="h-11 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500/20 pr-10"
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

            {/* Remember Tenant Option */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember-tenant"
                checked={rememberTenant}
                onChange={(e) => setRememberTenant(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="remember-tenant" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                Remember this organization
              </label>
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
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold h-11 shadow-lg shadow-blue-900/20 transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <Separator />

          {/* Demo Credentials */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5" />
              Quick Demo Access
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fillDemoCredentials}
              className="w-full border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs"
            >
              Fill DCP Admin Credentials
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-4 text-center space-y-2">
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3" />
          Secure connection • Encrypted data transfer
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Powered by{' '}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Digital Lending OS</span>
        </p>
      </div>
    </div>
  )
}

export default DCPLogin
