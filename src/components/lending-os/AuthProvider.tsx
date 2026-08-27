'use client'

import React, { useEffect, useState, useCallback, createContext, useContext } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import type { PortalType, ReactNode } from '@/lib/auth-types'
import { LoginScreen } from './LoginScreen'
import { Loader2, AlertCircle, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// Auth Context for providing auth state to children
interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  currentPortal: PortalType
  requireAuth: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
  defaultPortal?: PortalType
  requireAuthentication?: boolean
  onAuthChange?: (isAuthenticated: boolean) => void
}

// Session check interval (every minute)
const SESSION_CHECK_INTERVAL = 60 * 1000

export function AuthProvider({ 
  children, 
  defaultPortal = 'customer',
  requireAuthentication = false,
  onAuthChange 
}: AuthProviderProps) {
  const [currentPortal, setCurrentPortal] = useState<PortalType>(defaultPortal)
  const [showLogin, setShowLogin] = useState(false)
  
  const {
    isAuthenticated,
    isCheckingSession,
    session,
    error,
    checkSession,
    logout,
    isSessionExpiringSoon,
    getSessionTimeRemaining,
    refreshSession
  } = useAuthStore()

  // Check session on mount
  useEffect(() => {
    checkSession()
  }, [checkSession])

  // Notify parent of auth state changes
  useEffect(() => {
    onAuthChange?.(isAuthenticated)
  }, [isAuthenticated, onAuthChange])

  // Session monitoring
  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(async () => {
      // Check if session is expiring soon and try to refresh
      if (isSessionExpiringSoon()) {
        const refreshed = await refreshSession()
        if (!refreshed) {
          logout()
        }
      }
    }, SESSION_CHECK_INTERVAL)

    return () => clearInterval(interval)
  }, [isAuthenticated, isSessionExpiringSoon, refreshSession, logout])

  // Handle visibility change (refresh when tab becomes visible again)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        await checkSession()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isAuthenticated, checkSession])

  const requireAuth = useCallback(() => {
    setShowLogin(true)
  }, [])

  const handleLoginSuccess = useCallback(() => {
    setShowLogin(false)
  }, [])

  const handleLoginClose = useCallback(() => {
    if (!requireAuthentication) {
      setShowLogin(false)
    }
  }, [requireAuthentication])

  // Show loading state during initial session check
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <Card className="w-full max-w-md mx-4 border-0 shadow-none bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
            <p className="text-slate-600 font-medium">Verifying your session...</p>
            <p className="text-sm text-slate-400 mt-2">Please wait while we check your authentication</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If authentication is required and user is not authenticated, show login screen
  if (requireAuthentication && !isAuthenticated && !showLogin) {
    setShowLogin(true)
  }

  // Show login modal/screen when required
  if (showLogin || (requireAuthentication && !isAuthenticated)) {
    return (
      <AuthContext.Provider value={{ isAuthenticated, isLoading: false, currentPortal, requireAuth }}>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-4">
          {/* Background Pattern */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-3xl" />
          </div>
          
          <div className="relative z-10 w-full max-w-md">
            <LoginScreen 
              portal={currentPortal}
              onPortalChange={setCurrentPortal}
              onSuccess={handleLoginSuccess}
              onClose={handleLoginClose}
              showPortalSelector={!requireAuthentication}
            />
          </div>
        </div>
      </AuthContext.Provider>
    )
  }

  // Render children with auth context
  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading: false, currentPortal, requireAuth }}>
      {children}
      
      {/* Session Expiry Warning Banner */}
      {isAuthenticated && isSessionExpiringSoon(2 * 60 * 1000) && (
        <SessionWarningBanner 
          timeRemaining={getSessionTimeRemaining()}
          onRefresh={() => refreshSession()}
          onLogout={logout}
        />
      )}
      
      {/* Error Toast */}
      {error && (
        <ErrorNotification 
          message={error} 
          onDismiss={() => useAuthStore.getState().clearError()} 
        />
      )}
    </AuthContext.Provider>
  )
}

// Session Warning Component
function SessionWarningBanner({ 
  timeRemaining, 
  onRefresh, 
  onLogout 
}: { 
  timeRemaining: number
  onRefresh: () => void
  onLogout: () => void 
}) {
  const minutes = Math.floor(timeRemaining / 60000)
  const seconds = Math.floor((timeRemaining % 60000) / 1000)

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-50 border-b border-amber-200 px-4 py-2">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            Session expires in <strong>{minutes}:{seconds.toString().padStart(2, '0')}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onRefresh}
            className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            Extend Session
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={onLogout}
            className="h-7 text-xs text-amber-600 hover:text-amber-800"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}

// Error Notification Component
function ErrorNotification({ 
  message, 
  onDismiss 
}: { 
  message: string
  onDismiss: () => void 
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-right duration-300">
      <Card className="border-red-200 bg-red-50 shadow-lg">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800">Authentication Error</p>
            <p className="text-sm text-red-600 mt-1">{message}</p>
          </div>
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-600 transition-colors"
            aria-label="Dismiss"
          >
            ×
          </button>
        </CardContent>
      </Card>
    </div>
  )
}

// Offline Indicator Component
export function OfflineIndicator() {
  // Use lazy initializer to get initial state from navigator
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-2">
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm">
        <WifiOff className="w-4 h-4" />
        <span>You are offline. Some features may be unavailable.</span>
      </div>
    </div>
  )
}

export default AuthProvider
