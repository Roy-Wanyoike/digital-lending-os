// Digital Lending OS - Authentication Store
// Enhanced Zustand store with real JWT API integration

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { 
  User, 
  Tenant, 
  PortalType, 
  LoginCredentials,
  AuthResult
} from './auth-types'
import type { UserRole } from './auth-types'

// ============================================
// API CONFIGURATION
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

// Backend port for gateway (if needed)
const BACKEND_PORT = process.env.NEXT_PUBLIC_BACKEND_PORT || '4000'

// ============================================
// INTERFACES
// ============================================

interface ApiUser {
  id: string
  email: string
  name: string | null
  role: UserRole
  tenantId: string | null
  tenant?: {
    id: string
    name: string
    slug: string
    plan: string
  } | null
}

interface LoginResponse {
  user: ApiUser
  accessToken: string
  refreshToken: string
  expiresIn: string
}

interface MeResponse {
  id: string
  email: string
  name: string | null
  role: UserRole
  tenantId: string | null
  tenant?: Tenant
  // ... other user fields
}

interface AuthError {
  code: string
  message: string
  details?: Record<string, unknown>
}

// ============================================
// STORE INTERFACE
// ============================================

interface AuthState {
  // State
  isAuthenticated: boolean
  isLoading: boolean
  isCheckingSession: boolean
  error: string | null
  
  // User data
  user: User | null
  tenant: Tenant | null
  
  // Tokens
  accessToken: string | null
  refreshToken: string | null
  
  // Session info
  portalType: PortalType | null
  sessionExpiresAt: number | null
  lastActivityAt: number | null
  
  // Actions - Authentication
  login: (email: string, password: string) => Promise<AuthResult>
  loginWithPortal: (portal: PortalType, credentials: LoginCredentials) => Promise<AuthResult>
  logout: () => Promise<void>
  
  // Actions - Token Management
  refreshToken: () => Promise<boolean>
  setTokens: (accessToken: string, refreshToken: string, expiresIn?: string) => void
  clearTokens: () => void
  
  // Actions - User Data
  fetchUser: () => Promise<void>
  
  // Actions - Session
  checkSession: () => Promise<boolean>
  initializeFromStorage: () => void
  
  // Actions - Password
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; error?: string }>
  
  // State setters
  setUser: (user: User | null) => void
  setTenant: (tenant: Tenant | null) => void
  setPortalType: (portal: PortalType) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  
  // Computed/Getters (as methods)
  hasRole: (role: UserRole | UserRole[]) => boolean
  getAccessToken: () => string | null
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function createAuthResult(data: Partial<AuthResult> = {}): AuthResult {
  return {
    success: false,
    user: null,
    tenant: null,
    token: null,
    refreshToken: null,
    error: null,
    ...data
  }
}

/**
 * Make authenticated API request with automatic token refresh
 */
async function authFetch<T>(
  url: string,
  options: RequestInit = {},
  getToken: () => string | null,
  onTokenRefresh: () => Promise<boolean>
): Promise<{ data: T | null; error: AuthError | null }> {
  const token = getToken()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    let response = await fetch(url, { ...options, headers })

    // If unauthorized, try to refresh token
    if (response.status === 401) {
      const refreshed = await onTokenRefresh()
      if (refreshed) {
        const newToken = getToken()
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`
          response = await fetch(url, { ...options, headers })
        }
      }
    }

    const data = await response.json()

    if (!response.ok) {
      return {
        data: null,
        error: {
          code: data.errorCode || 'UNKNOWN',
          message: data.message || data.error || 'Request failed',
          details: data.details,
        },
      }
    }

    return { data: data.data ?? data, error: null }
  } catch (error) {
    console.error('API request failed:', error)
    return {
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error occurred',
      },
    }
  }
}

/**
 * Convert API user to frontend User format
 */
function apiUserToUser(apiUser: ApiUser): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.name || '',
    role: apiUser.role,
    tenantId: apiUser.tenantId || undefined,
    tenantName: apiUser.tenant?.name,
    isActive: true,
  }
}

// ============================================
// TOKEN REFRESH TIMER
// ============================================

let tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null

function scheduleTokenRefresh(
  expiresIn: string, 
  refreshFn: () => void,
  bufferMs: number = 5 * 60 * 1000 // Refresh 5 minutes before expiry
) {
  // Clear existing timer
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer)
  }

  // Parse expiry time
  let expiryMs: number
  if (expiresIn.endsWith('m')) {
    expiryMs = parseInt(expiresIn) * 60 * 1000
  } else if (expiresIn.endsWith('h')) {
    expiryMs = parseInt(expiresIn) * 60 * 60 * 1000
  } else if (expiresIn.endsWith('d')) {
    expiryMs = parseInt(expiresIn) * 24 * 60 * 60 * 1000
  } else {
    expiryMs = 15 * 60 * 1000 // Default to 15 minutes
  }

  // Schedule refresh (with buffer)
  const refreshDelay = Math.max(0, expiryMs - bufferMs)
  tokenRefreshTimer = setTimeout(refreshFn, refreshDelay)
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      isAuthenticated: false,
      isLoading: false,
      isCheckingSession: true,
      error: null,
      
      user: null,
      tenant: null,
      accessToken: null,
      refreshToken: null,
      portalType: null,
      sessionExpiresAt: null,
      lastActivityAt: null,

      // ==========================================
      // AUTHENTICATION ACTIONS
      // ==========================================

      /**
       * Login with email and password
       */
      login: async (email: string, password: string): Promise<AuthResult> => {
        set({ isLoading: true, error: null })

        try {
          const result = await authFetch<LoginResponse>(
            `${API_BASE_URL}/auth/login`,
            {
              method: 'POST',
              body: JSON.stringify({ email, password }),
            },
            () => get().accessToken,
            () => get().refreshToken()
          )

          if (result.error || !result.data) {
            const errorMessage = result.error?.message === 'Invalid email or password' 
              ? 'Invalid email or password' 
              : (result.error?.message || 'Login failed')
            
            set({
              isLoading: false,
              error: errorMessage,
              isAuthenticated: false,
            })
            
            return createAuthResult({ error: errorMessage })
          }

          const { user: apiUser, accessToken, refreshToken, expiresIn } = result.data
          const user = apiUserToUser(apiUser)

          // Calculate session expiry
          const now = Date.now()
          let expiresAtMs: number
          if (expiresIn.endsWith('m')) {
            expiresAtMs = now + parseInt(expiresIn) * 60 * 1000
          } else {
            expiresAtMs = now + 15 * 60 * 1000
          }

          set({
            isAuthenticated: true,
            isLoading: false,
            user,
            tenant: apiUser.tenant || null,
            accessToken,
            refreshToken,
            sessionExpiresAt: expiresAtMs,
            lastActivityAt: now,
            error: null,
            isCheckingSession: false,
          })

          // Schedule auto-refresh
          scheduleTokenRefresh(expiresIn, () => {
            get().refreshToken()
          })

          return createAuthResult({
            success: true,
            user,
            tenant: apiUser.tenant || null,
            token: accessToken,
            refreshToken,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed'
          set({
            isLoading: false,
            error: message,
            isAuthenticated: false,
          })
          
          return createAuthResult({ error: message })
        }
      },

      /**
       * Login with portal type and credentials
       */
      loginWithPortal: async (portal: PortalType, credentials: LoginCredentials): Promise<AuthResult> => {
        set({ isLoading: true, error: null })

        try {
          // For admin/lender portals, use email/password login
          if ((portal === 'admin' || portal === 'lender') && credentials.email && credentials.password) {
            return get().login(credentials.email, credentials.password)
          }

          // For customer portal with phone/PIN (would need separate endpoint)
          // For now, fall back to demo mode
          await new Promise(resolve => setTimeout(resolve, 800))

          // Demo mode for customer portal
          if (portal === 'customer' && credentials.phone && credentials.pin) {
            const user: User = {
              id: `cust-${Date.now()}`,
              email: `${credentials.phone}@customer.dlos`,
              name: 'Customer User',
              role: 'CUSTOMER',
              phone: credentials.phone,
              isActive: true,
            }

            const now = Date.now()
            
            set({
              isAuthenticated: true,
              isLoading: false,
              user,
              tenant: null,
              token: `demo-token-${now}`,
              refreshToken: `refresh-${now}`,
              portalType: portal,
              sessionExpiresAt: now + 30 * 60 * 1000,
              lastActivityAt: now,
              isCheckingSession: false,
            })

            return createAuthResult({
              success: true,
              user,
              token: `demo-token-${now}`,
              refreshToken: `refresh-${now}`,
            })
          }

          throw new Error('Invalid credentials')
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed'
          set({
            isLoading: false,
            error: message,
            isAuthenticated: false,
            isCheckingSession: false,
          })
          
          return createAuthResult({ error: message })
        }
      },

      /**
       * Logout and clear all auth state
       */
      logout: async (): Promise<void> => {
        try {
          // Call logout API to invalidate session
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(get().accessToken ? { Authorization: `Bearer ${get().accessToken}` } : {}),
            },
            credentials: 'include', // Include cookies
          }).catch(() => {
            // Ignore errors during logout
          })
        } finally {
          // Clear timer
          if (tokenRefreshTimer) {
            clearTimeout(tokenRefreshTimer)
            tokenRefreshTimer = null
          }

          // Clear all state
          set({
            isAuthenticated: false,
            user: null,
            tenant: null,
            accessToken: null,
            refreshToken: null,
            portalType: null,
            sessionExpiresAt: null,
            lastActivityAt: null,
            error: null,
            isCheckingSession: false,
          })
        }
      },

      // ==========================================
      // TOKEN MANAGEMENT
      // ==========================================

      /**
       * Refresh access token using refresh token
       */
      refreshToken: async (): Promise<boolean> => {
        const currentRefreshToken = get().refreshToken
        
        if (!currentRefreshToken) {
          return false
        }

        try {
          const result = await authFetch<{
            accessToken: string
            refreshToken: string
            expiresIn: string
          }>(
            `${API_BASE_URL}/auth/refresh`,
            {
              method: 'POST',
              body: JSON.stringify({ refreshToken: currentRefreshToken }),
              credentials: 'include', // Include cookies for httpOnly refresh token
            },
            () => null, // Don't use access token for refresh
            async () => false // Prevent infinite loop
          )

          if (result.error || !result.data) {
            // Token refresh failed, need to re-login
            console.warn('Token refresh failed:', result.error)
            await get().logout()
            return false
          }

          const { accessToken, refreshToken, expiresIn } = result.data
          const now = Date.now()
          
          let expiresAtMs: number
          if (expiresIn.endsWith('m')) {
            expiresAtMs = now + parseInt(expiresIn) * 60 * 1000
          } else {
            expiresAtMs = now + 15 * 60 * 1000
          }

          set({
            accessToken,
            refreshToken: refreshToken || currentRefreshToken,
            sessionExpiresAt: expiresAtMs,
            lastActivityAt: now,
          })

          // Schedule next refresh
          scheduleTokenRefresh(expiresIn, () => {
            get().refreshToken()
          })

          return true
        } catch (error) {
          console.error('Token refresh error:', error)
          return false
        }
      },

      /**
       * Set tokens in state
       */
      setTokens: (accessToken: string, refreshToken: string, expiresIn?: string): void => {
        const now = Date.now()
        
        let expiresAtMs: number
        if (expiresIn?.endsWith('m')) {
          expiresAtMs = now + parseInt(expiresIn) * 60 * 1000
        } else if (expiresIn?.endsWith('h')) {
          expiresAtMs = now + parseInt(expiresIn) * 60 * 60 * 1000
        } else {
          expiresAtMs = now + 15 * 60 * 1000
        }

        set({
          accessToken,
          refreshToken,
          sessionExpiresAt: expiresAtMs,
          lastActivityAt: now,
          isAuthenticated: true,
        })

        // Schedule auto-refresh
        if (expiresIn) {
          scheduleTokenRefresh(expiresIn, () => {
            get().refreshToken()
          })
        }
      },

      /**
       * Clear tokens from state
       */
      clearTokens: (): void => {
        if (tokenRefreshTimer) {
          clearTimeout(tokenRefreshTimer)
          tokenRefreshTimer = null
        }

        set({
          accessToken: null,
          refreshToken: null,
          sessionExpiresAt: null,
          isAuthenticated: false,
        })
      },

      // ==========================================
      // USER DATA
      // ==========================================

      /**
       * Fetch current user profile from API
       */
      fetchUser: async (): Promise<void> => {
        const token = get().accessToken
        if (!token) return

        try {
          const result = await authFetch<MeResponse>(
            `${API_BASE_URL}/auth/me`,
            { method: 'GET' },
            () => token,
            () => get().refreshToken()
          )

          if (result.error || !result.data) {
            console.warn('Failed to fetch user:', result.error)
            return
          }

          const userData = result.data
          const user: User = {
            id: userData.id,
            email: userData.email,
            name: userData.name || '',
            role: userData.role,
            tenantId: userData.tenantId || undefined,
            tenantName: userData.tenant?.name,
            isActive: true,
          }

          set({ user, tenant: userData.tenant || null })
        } catch (error) {
          console.error('Failed to fetch user:', error)
        }
      },

      // ==========================================
      // SESSION MANAGEMENT
      // ==========================================

      /**
       * Check if current session is valid
       */
      checkSession: async (): Promise<boolean> => {
        set({ isCheckingSession: true })

        const token = get().accessToken
        const expiresAt = get().sessionExpiresAt

        // No token means no session
        if (!token) {
          set({ isAuthenticated: false, isCheckingSession: false })
          return false
        }

        // Check if token is expired
        if (expiresAt && Date.now() >= expiresAt) {
          // Try to refresh
          const refreshed = await get().refreshToken()
          if (!refreshed) {
            set({ isAuthenticated: false, isCheckingSession: false })
            return false
          }
        }

        // Verify token by fetching user
        try {
          await get().fetchUser()
          set({ isAuthenticated: true, isCheckingSession: false })
          return true
        } catch (error) {
          set({ isAuthenticated: false, isCheckingSession: false })
          return false
        }
      },

      /**
       * Initialize auth state from persisted storage
       */
      initializeFromStorage: (): void => {
        const { accessToken, sessionExpiresAt } = get()

        if (accessToken && sessionExpiresAt) {
          if (Date.now() < sessionExpiresAt) {
            set({ isAuthenticated: true, isCheckingSession: false })
            
            // Schedule refresh if needed
            const timeUntilExpiry = sessionExpiresAt - Date.now()
            if (timeUntilExpiry < 5 * 60 * 1000) { // Less than 5 minutes
              get().refreshToken()
            } else {
              scheduleTokenRefresh(
                `${Math.ceil(timeUntilExpiry / 60000)}m`,
                () => get().refreshToken()
              )
            }
          } else {
            // Token expired, clear it
            get().clearTokens()
            set({ isCheckingSession: false })
          }
        } else {
          set({ isCheckingSession: false, isAuthenticated: false })
        }
      },

      // ==========================================
      // PASSWORD MANAGEMENT
      // ==========================================

      /**
       * Change password (authenticated)
       */
      changePassword: async (
        currentPassword: string, 
        newPassword: string
      ): Promise<{ success: boolean; error?: string }> => {
        const token = get().accessToken
        if (!token) {
          return { success: false, error: 'Not authenticated' }
        }

        try {
          const result = await authFetch<void>(
            `${API_BASE_URL}/auth/change-password`,
            {
              method: 'PUT',
              body: JSON.stringify({ currentPassword, newPassword }),
            },
            () => token,
            () => get().refreshToken()
          )

          if (result.error) {
            return { success: false, error: result.error.message }
          }

          // After password change, server invalidates all sessions
          // Logout the user
          await get().logout()

          return { success: true }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to change password'
          return { success: false, error: message }
        }
      },

      /**
       * Initiate password reset
       */
      forgotPassword: async (email: string): Promise<{ success: boolean; error?: string }> => {
        try {
          const result = await authFetch<void>(
            `${API_BASE_URL}/auth/forgot-password`,
            {
              method: 'POST',
              body: JSON.stringify({ email }),
            },
            () => null,
            async () => false
          )

          if (result.error) {
            return { success: false, error: result.error.message }
          }

          return { success: true }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to send reset email'
          return { success: false, error: message }
        }
      },

      /**
       * Complete password reset with token
       */
      resetPassword: async (
        token: string, 
        password: string
      ): Promise<{ success: boolean; error?: string }> => {
        try {
          const result = await authFetch<void>(
            `${API_BASE_URL}/auth/reset-password`,
            {
              method: 'POST',
              body: JSON.stringify({ token, password }),
            },
            () => null,
            async () => false
          )

          if (result.error) {
            return { success: false, error: result.error.message }
          }

          return { success: true }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to reset password'
          return { success: false, error: message }
        }
      },

      // ==========================================
      // STATE SETTERS
      // ==========================================

      setUser: (user: User | null) => set({ user }),
      setTenant: (tenant: Tenant | null) => set({ tenant }),
      setPortalType: (portal: PortalType) => set({ portalType: portal }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),

      // ==========================================
      // COMPUTED GETTERS
      // ==========================================

      hasRole: (role: UserRole | UserRole[]): boolean => {
        const currentRole = get().user?.role
        if (!currentRole) return false
        
        if (Array.isArray(role)) {
          return role.includes(currentRole)
        }
        
        // Role hierarchy check
        const roleHierarchy: Record<UserRole, number> = {
          CUSTOMER: 0,
          TENANT_AGENT: 1,
          STAFF: 2,
          MANAGER: 3,
          TENANT_ADMIN: 4,
          SUPER_ADMIN: 5,
        }
        
        return (roleHierarchy[currentRole] || 0) >= (roleHierarchy[role] || 0)
      },

      getAccessToken: (): string | null => get().accessToken,
    }),
    {
      name: 'digital-lending-os-auth-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields to localStorage
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        tenant: state.tenant,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        portalType: state.portalType,
        sessionExpiresAt: state.sessionExpiresAt,
      }),
      version: 2,
      
      // Migration from v1 if needed
      migrate: (persisted: unknown, version: number) => {
        if (version < 2) {
          // Migrate old format to new format
          const oldState = persisted as any
          return {
            ...oldState,
            // Add new fields with defaults
            lastActivityAt: null,
          }
        }
        return persisted as any
      },
    }
  )
)

// ============================================
// CONVENIENCE HOOKS
// ============================================

export function useIsAuthenticated() {
  return useAuthStore(state => state.isAuthenticated)
}

export function useCurrentUser() {
  return useAuthStore(state => state.user)
}

export function useCurrentPortal() {
  return useAuthStore(state => state.portalType || 'customer')
}

export function useAuthLoading() {
  return useAuthStore(state => state.isLoading || state.isCheckingSession)
}

export function useAuthError() {
  return useAuthStore(state => state.error)
}
