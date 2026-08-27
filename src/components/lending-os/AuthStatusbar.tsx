'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  User,
  LogOut,
  Building2,
  Shield,
  Users,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Settings,
  HelpCircle,
  Key
} from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import type { PortalType } from '@/lib/auth-types'

// Session Indicator Component (defined outside to avoid static-components error)
function SessionIndicator({ 
  sessionTimeRemaining, 
  isExpiringSoon, 
  refreshSession 
}: { 
  sessionTimeRemaining: number
  isExpiringSoon: (thresholdMs?: number) => boolean
  refreshSession: () => Promise<boolean>
}) {
  const formatTime = (ms: number): string => {
    if (ms <= 0) return '00:00'
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const isExpiring = isExpiringSoon(5 * 60 * 1000)
  const isCritical = isExpiringSoon(2 * 60 * 1000)

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
      isCritical 
        ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/50' 
        : isExpiring 
          ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50'
          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50'
    }`}>
      {isCritical ? (
        <AlertTriangle className="w-3 h-3" />
      ) : isExpiring ? (
        <Clock className="w-3 h-3" />
      ) : (
        <CheckCircle2 className="w-3 h-3" />
      )}
      <span>{formatTime(sessionTimeRemaining)}</span>
      {(isExpiring || isCritical) && (
        <button 
          onClick={() => refreshSession()}
          className="ml-1 underline hover:no-underline"
          title="Extend session"
        >
          Extend
        </button>
      )}
    </div>
  )
}

interface AuthStatusbarProps {
  onLoginClick?: () => void
  onPortalChange?: (portal: PortalType) => void
  showPortalSwitcher?: boolean
  compact?: boolean
}

export function AuthStatusbar({ 
  onLoginClick, 
  onPortalChange,
  showPortalSwitcher = true,
  compact = false
}: AuthStatusbarProps) {
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const {
    isAuthenticated,
    isLoading,
    session,
    logout,
    getCurrentUser,
    getCurrentTenant,
    getCurrentPortal,
    getSessionTimeRemaining,
    isSessionExpiringSoon,
    refreshSession
  } = useAuthStore()

  const user = getCurrentUser()
  const tenant = getCurrentTenant()
  const currentPortal = getCurrentPortal()

  // Update session timer
  useEffect(() => {
    if (!isAuthenticated) return

    const updateTimer = () => {
      setSessionTimeRemaining(getSessionTimeRemaining())
    }

    updateTimer()
    intervalRef.current = setInterval(updateTimer, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isAuthenticated, getSessionTimeRemaining])

  // Format time remaining
  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return '00:00'
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Get user initials for avatar
  const getUserInitials = (): string => {
    if (!user?.name) return 'U'
    const parts = user.name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return parts[0].substring(0, 2).toUpperCase()
  }

  // Get role badge color
  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
      case 'TENANT_ADMIN':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800'
      case 'TENANT_STAFF':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800'
      case 'TENANT_AGENT':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800'
      case 'CUSTOMER':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Get portal icon
  const getPortalIcon = (portal: PortalType) => {
    switch (portal) {
      case 'customer': return <Users className="w-4 h-4" />
      case 'lender': return <Building2 className="w-4 h-4" />
      case 'admin': return <Shield className="w-4 h-4" />
      default: return <Settings className="w-4 h-4" />
    }
  }

  // Logged In State
  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center gap-3 ${compact ? '' : 'p-1.5 px-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm'}`}>
        {/* User Info */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto p-1.5 hover:bg-transparent">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8 border-2 border-emerald-500/30">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                
                {!compact && (
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium text-slate-900 dark:text-white leading-tight">
                      {user.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getRoleBadgeStyle(user.role)}`}>
                        {user.role.replace('_', ' ')}
                      </Badge>
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    </div>
                  </div>
                )}
                
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-64">
            {/* User Header */}
            <DropdownMenuLabel className="font-normal pb-2">
              <div className="flex flex-col space-y-1.5">
                <div className="flex items-center gap-2">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-semibold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email || user.phone}</p>
                  </div>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* Tenant Info */}
            {tenant && (
              <>
                <DropdownMenuItem disabled className="focus:bg-transparent cursor-default">
                  <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm">{tenant.name}</span>
                    <span className="text-xs text-muted-foreground">@{tenant.slug}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Role & Status */}
            <DropdownMenuItem disabled className="focus:bg-transparent cursor-default">
              <Shield className="mr-2 h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <span>Role:</span>
                <Badge variant="secondary" className={getRoleBadgeStyle(user.role)}>
                  {user.role.replace('_', ' ')}
                </Badge>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem disabled className="focus:bg-transparent cursor-default">
              <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
              <span>Status: Active</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Actions */}
            <DropdownMenuItem onClick={() => refreshSession()}>
              <Clock className="mr-2 h-4 w-4" />
              <span>Refresh Session</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {formatTimeRemaining(sessionTimeRemaining)}
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem>
              <Key className="mr-2 h-4 w-4" />
              <span>Change Password</span>
            </DropdownMenuItem>

            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Preferences</span>
            </DropdownMenuItem>

            <DropdownMenuItem>
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Help & Support</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Logout */}
            <DropdownMenuItem 
              onClick={logout}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Tenant Display (when not in dropdown) */}
        {!compact && tenant && (
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-600">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600 dark:text-slate-300 max-w-[150px] truncate">
              {tenant.name}
            </span>
          </div>
        )}

        {/* Session Timer */}
        {!compact && (
          <SessionIndicator 
            sessionTimeRemaining={sessionTimeRemaining}
            isExpiringSoon={isSessionExpiringSoon}
            refreshSession={refreshSession}
          />
        )}

        {/* Portal Switcher */}
        {showPortalSwitcher && !compact && (
          <Select value={currentPortal} onValueChange={(v) => onPortalChange?.(v as PortalType)}>
            <SelectTrigger className="w-auto h-8 text-xs bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600">
              <SelectValue placeholder="Portal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Customer
                </div>
              </SelectItem>
              <SelectItem value="lender">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Lender Admin
                </div>
              </SelectItem>
              <SelectItem value="admin">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Super Admin
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    )
  }

  // Logged Out State
  return (
    <div className={`flex items-center gap-3 ${compact ? '' : 'p-1.5 px-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm'}`}>
      <Button
        onClick={onLoginClick}
        size={compact ? "sm" : "default"}
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        <User className="w-4 h-4 mr-1.5" />
        Sign In
      </Button>

      {showPortalSwitcher && (
        <Select defaultValue="customer" onValueChange={(v) => onPortalChange?.(v as PortalType)}>
          <SelectTrigger className={`w-auto ${compact ? 'h-8 text-xs' : 'h-9'} bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600`}>
            <SelectValue placeholder="Portal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="customer">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Customer
              </div>
            </SelectItem>
            <SelectItem value="lender">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Lender Admin
              </div>
            </SelectItem>
            <SelectItem value="admin">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Super Admin
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

// Compact inline version for headers
export function AuthStatusInline() {
  const { isAuthenticated, getCurrentUser, logout } = useAuthStore()
  const user = getCurrentUser()

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-600 dark:text-slate-300">👤</span>
      <span className="font-medium text-slate-900 dark:text-white">{user.name}</span>
      <button
        onClick={logout}
        className="text-xs text-slate-400 hover:text-red-500 transition-colors"
      >
        Sign out
      </button>
    </div>
  )
}

export default AuthStatusbar
