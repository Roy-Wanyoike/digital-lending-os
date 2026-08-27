'use client'

import React, { useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  X,
  Users,
  Building2,
  Shield,
  Network,
  Landmark
} from 'lucide-react'
import { SuperAdminLogin } from './SuperAdminLogin'
import { DCPLogin } from './DCPLogin'
import { CustomerLogin } from './CustomerLogin'
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

  const handleTabChange = useCallback((value: string) => {
    const newPortal = value as PortalType
    setActiveTab(newPortal)
    setLoginError(null)
    onPortalChange?.(newPortal)
  }, [onPortalChange])

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
          borderColor: 'border-slate-200 dark:border-slate-700'
        }
      case 'lender':
        return {
          icon: <Building2 className="w-5 h-5" />,
          title: 'DCP Staff',
          description: 'Organization administration',
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950/30',
          borderColor: 'border-blue-200 dark:border-blue-800/50'
        }
      case 'customer':
        return {
          icon: <Users className="w-5 h-5" />,
          title: 'Customer',
          description: 'Borrower self-service',
          color: 'text-emerald-600 dark:text-emerald-400',
          bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
          borderColor: 'border-emerald-200 dark:border-emerald-800/50'
        }
      default:
        return {
          icon: <Network className="w-5 h-5" />,
          title: portal.charAt(0).toUpperCase() + portal.slice(1),
          description: '',
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-50 dark:bg-purple-950/30',
          borderColor: 'border-purple-200 dark:border-purple-800/50'
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
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/30">
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

          {/* Login Forms */}
          <TabsContent value="customer" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <CustomerLogin 
              onSuccess={handleSuccess} 
              onError={handleError}
              onRegisterClick={() => alert('Registration flow would open here')}
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
              onRegisterClick={() => alert('Registration flow would open here')}
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
      {loginError && (
        <Card className="mt-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
          <CardContent className="py-3 px-4">
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {loginError}
            </p>
          </CardContent>
        </Card>
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
    </div>
  )
}

export default LoginScreen
