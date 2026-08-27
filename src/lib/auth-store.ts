// Digital Lending OS - Authentication Store
// Zustand store for managing authentication state

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { 
  AuthSession, 
  User, 
  Customer,
  Tenant, 
  PortalType, 
  LoginCredentials,
  AbacAttributes,
  PersistedAuthState,
  AuthResult
} from './auth-types'
import type { UserRole } from './auth-types'
import { 
  MOCK_TENANTS, 
  DEMO_CREDENTIALS,
  DEFAULT_ABAC_ATTRIBUTES,
  SESSION_CONFIG,
  ROLE_HIERARCHY
} from './auth-types'

// ============================================
// STORE INTERFACE
// ============================================

interface AuthStore {
  // State
  isAuthenticated: boolean
  isLoading: boolean
  isCheckingSession: boolean
  session: AuthSession | null
  error: string | null
  
  // Extended state (for compatibility with existing components)
  user: User | null
  customer: Customer | null
  tenant: Tenant | null
  token: string | null
  refreshToken: string | null
  portalType: PortalType | null
  sessionExpiresAt: number | null
  attributes: AbacAttributes
  
  // Derived (computed via getters)
  getCurrentUser: () => User | null
  getCurrentTenant: () => Tenant | null
  getCurrentPortal: () => PortalType
  hasRole: (role: UserRole | UserRole[]) => boolean
  hasMultiplePortals: () => boolean
  hasPermission: (permission: string) => boolean

  // Actions
  login: (portal: PortalType, credentials: LoginCredentials) => Promise<AuthResult>
  logout: () => void
  clearError: () => void
  checkSession: () => Promise<void>
  refreshSession: () => Promise<boolean>
  updateLastActivity: () => void
  
  // State setters
  setUser: (user: User | null) => void
  setCustomer: (customer: Customer | null) => void
  setTenant: (tenant: Tenant | null) => void
  setPortalType: (portal: PortalType) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  updateAbacAttributes: (attributes: Partial<AbacAttributes>) => void
  
  // Session timeout
  getSessionTimeRemaining: () => number
  isSessionExpiringSoon: (thresholdMs?: number) => boolean
}

// ============================================
// CONSTANTS
// ============================================

const SESSION_DURATION = SESSION_CONFIG.ACCESS_TOKEN_LIFETIME
const WARNING_THRESHOLD = SESSION_CONFIG.REFRESH_THRESHOLD

// ============================================
// HELPER FUNCTIONS
// ============================================

function createAuthResult(
  data: Partial<AuthResult> = {}
): AuthResult {
  return {
    success: false,
    user: null,
    customer: null,
    tenant: null,
    token: null,
    refreshToken: null,
    error: null,
    ...data
  }
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial State
      isAuthenticated: false,
      isLoading: false,
      isCheckingSession: true,
      session: null,
      error: null,
      
      // Extended state
      user: null,
      customer: null,
      tenant: null,
      token: null,
      refreshToken: null,
      portalType: null,
      sessionExpiresAt: null,
      attributes: { ...DEFAULT_ABAC_ATTRIBUTES },

      // Getters
      getCurrentUser: () => get().session?.user ?? get().user,
      
      getCurrentTenant: () => get().session?.tenant ?? get().tenant,
      
      getCurrentPortal: () => get().session?.portal ?? get().portalType ?? 'customer',
      
      hasRole: (role: UserRole | UserRole[]) => {
        const currentRole = get().session?.user?.role ?? get().user?.role
        if (!currentRole) return false
        
        if (Array.isArray(role)) {
          return role.includes(currentRole)
        }
        
        // Check role hierarchy - if requested role is lower or equal
        const currentLevel = ROLE_HIERARCHY[currentRole] ?? 0
        const requiredLevel = ROLE_HIERARCHY[role] ?? 0
        return currentLevel >= requiredLevel
      },
      
      hasMultiplePortals: () => {
        const user = get().session?.user ?? get().user
        if (!user) return false
        return ['SUPER_ADMIN', 'TENANT_ADMIN'].includes(user.role)
      },
      
      hasPermission: (permission: string) => {
        const user = get().session?.user ?? get().user
        if (!user) return false
        
        // Super admins have all permissions
        if (user.role === 'SUPER_ADMIN') return true
        
        // Check specific permissions based on role
        const rolePermissions: Record<UserRole, string[]> = {
          SUPER_ADMIN: ['*'],
          TENANT_ADMIN: [
            'tenant:*', 'customer:*', 'loan:*', 'application:*',
            'repayment:*', 'staff:*', 'reports:view', 'settings:*'
          ],
          MANAGER: [
            'customer:read', 'customer:create', 'customer:update',
            'loan:read', 'loan:approve', 'loan:disburse',
            'application:read', 'application:approve',
            'reports:view'
          ],
          TENANT_STAFF: [
            'customer:read', 'customer:create',
            'loan:read', 'application:read',
            'repayment:read'
          ],
          TENANT_AGENT: [
            'customer:read', 'customer:create',
            'loan:read'
          ],
          CUSTOMER: [
            'own:profile:read', 'own:profile:update',
            'own:loans:read', 'own:repayments:read'
          ]
        }
        
        const permissions = rolePermissions[user.role] || []
        
        // Check for wildcard permission
        if (permissions.includes('*')) return true
        
        // Check for resource wildcard
        const [resource] = permission.split(':')
        if (permissions.includes(`${resource}:*`)) return true
        
        // Check exact permission
        return permissions.includes(permission)
      },

      // Actions
      login: async (portal: PortalType, credentials: LoginCredentials): Promise<AuthResult> => {
        set({ isLoading: true, error: null })
        
        try {
          // Simulate API call delay
          await new Promise(resolve => setTimeout(resolve, 800))
          
          let user: User
          let tenant: Tenant | undefined
          let customer: Customer | undefined
          
          if (portal === 'admin') {
            // Super Admin login
            if (!credentials.email || !credentials.password) {
              throw new Error('Email and password are required')
            }
            
            // Accept any email/password for demo or validate against demo creds
            const isValidDemo = 
              credentials.email === DEMO_CREDENTIALS.superAdmin.email && 
              credentials.password === DEMO_CREDENTIALS.superAdmin.password
            
            if (isValidDemo || (credentials.email && credentials.password)) {
              user = {
                id: 'sa-001',
                email: credentials.email!,
                name: isValidDemo ? DEMO_CREDENTIALS.superAdmin.name : 
                  credentials.email!.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                role: 'SUPER_ADMIN',
                avatarUrl: undefined,
                isActive: true,
                permissions: ['*']
              }
            } else {
              throw new Error('Invalid email or password')
            }
          } else if (portal === 'lender') {
            // DCP Staff login - requires tenant selection
            if (!credentials.tenantSlug) {
              throw new Error('Please select your organization')
            }
            
            tenant = MOCK_TENANTS.find(t => t.slug === credentials.tenantSlug)
            
            if (!tenant) {
              throw new Error('Organization not found')
            }
            
            if (!credentials.email || !credentials.password) {
              throw new Error('Email and password are required')
            }
            
            const isAdmin = credentials.email.toLowerCase().includes('admin')
            user = {
              id: `staff-${Date.now()}`,
              email: credentials.email,
              name: credentials.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              role: isAdmin ? 'TENANT_ADMIN' : 'TENANT_STAFF',
              tenantId: tenant.id,
              tenantName: tenant.name,
              avatarUrl: undefined,
              isActive: true,
              department: isAdmin ? 'Management' : 'Operations'
            }
          } else if (portal === 'customer') {
            // Customer login with phone/PIN
            if (!credentials.phone || !credentials.pin) {
              throw new Error('Phone number and PIN are required')
            }
            
            // Validate phone format (basic)
            const phoneRegex = /^(\+254|0)?[7]\d{8}$/
            const cleanPhone = credentials.phone.replace(/[\s-]/g, '')
            if (!phoneRegex.test(cleanPhone)) {
              throw new Error('Invalid phone number format. Use +2547XX XXX XXX format')
            }
            
            const formattedPhone = cleanPhone.startsWith('+254') ? cleanPhone : `+254${cleanPhone.slice(-9)}`
            
            user = {
              id: `cust-${Date.now()}`,
              email: `${formattedPhone}@customer.dlos`,
              name: DEMO_CREDENTIALS.customer.name,
              role: 'CUSTOMER',
              phone: formattedPhone,
              avatarUrl: undefined,
              isActive: true
            }
            
            customer = {
              id: `cust-${Date.now()}`,
              phone: formattedPhone,
              name: DEMO_CREDENTIALS.customer.name,
              kycStatus: 'verified' as const,
              creditScore: 650
            }
          } else {
            throw new Error(`Login not supported for portal: ${portal}`)
          }

          // Create session
          const now = Date.now()
          const accessToken = `demo-token-${now}-${Math.random().toString(36).slice(2)}`
          const session: AuthSession = {
            user,
            customer: customer ?? null,
            tenant: tenant ?? null,
            portal,
            accessToken,
            refreshToken: `refresh-${now}`,
            expiresAt: now + SESSION_DURATION,
            lastActivity: now
          }

          set({
            isAuthenticated: true,
            isLoading: false,
            session,
            user,
            customer: customer ?? null,
            tenant: tenant ?? null,
            token: accessToken,
            refreshToken: `refresh-${now}`,
            portalType: portal,
            sessionExpiresAt: now + SESSION_DURATION,
            error: null,
            isCheckingSession: false,
            attributes: {
              ...DEFAULT_ABAC_ATTRIBUTES,
              userId: user.id,
              role: user.role,
              tenantId: user.tenantId ?? tenant?.id ?? null,
              portal,
              canApproveLoans: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER'].includes(user.role),
              canManageStaff: ['SUPER_ADMIN', 'TENANT_ADMIN'].includes(user.role),
              canAccessSensitiveData: ['SUPER_ADMIN', 'TENANT_ADMIN'].includes(user.role),
              canWriteOffLoans: ['SUPER_ADMIN', 'TENANT_ADMIN'].includes(user.role),
              loanApprovalLimit: user.role === 'SUPER_ADMIN' ? 10000000 :
                               user.role === 'TENANT_ADMIN' ? 5000000 :
                               user.role === 'MANAGER' ? 1000000 : 0
            },
            lastAuthAction: 'login'
          })

          return createAuthResult({
            success: true,
            user,
            customer: customer ?? null,
            tenant: tenant ?? null,
            token: accessToken,
            refreshToken: `refresh-${now}`
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed'
          set({
            isAuthenticated: false,
            isLoading: false,
            error: message,
            isCheckingSession: false,
            lastAuthAction: 'login_failed'
          })
          return createAuthResult({ error: message })
        }
      },

      logout: () => {
        set({
          isAuthenticated: false,
          session: null,
          user: null,
          customer: null,
          tenant: null,
          token: null,
          refreshToken: null,
          portalType: null,
          sessionExpiresAt: null,
          error: null,
          isCheckingSession: false,
          attributes: { ...DEFAULT_ABAC_ATTRIBUTES },
          lastAuthAction: 'logout'
        })
      },

      clearError: () => {
        set({ error: null })
      },

      checkSession: async () => {
        set({ isCheckingSession: true })
        
        // Simulate session check
        await new Promise(resolve => setTimeout(resolve, 300))
        
        const session = get().session
        if (session) {
          const now = Date.now()
          if (now >= session.expiresAt) {
            // Session expired
            get().logout()
          } else {
            set({ 
              isAuthenticated: true, 
              isCheckingSession: false 
            })
          }
        } else {
          set({ 
            isAuthenticated: false, 
            isCheckingSession: false 
          })
        }
      },

      refreshSession: async (): Promise<boolean> => {
        const session = get().session
        if (!session) return false
        
        // Simulate token refresh
        await new Promise(resolve => setTimeout(resolve, 200))
        
        const now = Date.now()
        const accessToken = `demo-token-${now}-${Math.random().toString(36).slice(2)}`
        const updatedSession: AuthSession = {
          ...session,
          accessToken,
          refreshToken: `refresh-${now}`,
          expiresAt: now + SESSION_DURATION,
          lastActivity: now
        }
        
        set({ 
          session: updatedSession,
          token: accessToken,
          refreshToken: `refresh-${now}`,
          sessionExpiresAt: now + SESSION_DURATION
        })
        return true
      },

      updateLastActivity: () => {
        const session = get().session
        if (session) {
          const updatedSession = { ...session, lastActivity: Date.now() }
          set({ session: updatedSession })
        }
      },

      // State setters
      setUser: (user: User | null) => set({ user }),
      setCustomer: (customer: Customer | null) => set({ customer }),
      setTenant: (tenant: Tenant | null) => set({ tenant }),
      setPortalType: (portal: PortalType) => set({ portalType: portal }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),
      updateAbacAttributes: (attributes: Partial<AbacAttributes>) => {
        set(state => ({
          attributes: { ...state.attributes, ...attributes }
        }))
      },

      getSessionTimeRemaining: () => {
        const session = get().session
        if (!session) return 0
        return Math.max(0, session.expiresAt - Date.now())
      },

      isSessionExpiringSoon: (thresholdMs: number = WARNING_THRESHOLD) => {
        return get().getSessionTimeRemaining() <= thresholdMs
      }
    }),
    {
      name: 'digital-lending-os-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        customer: state.customer,
        tenant: state.tenant,
        token: state.token,
        refreshToken: state.refreshToken,
        portalType: state.portalType,
        sessionExpiresAt: state.sessionExpiresAt,
        attributes: state.attributes
      }),
      version: 1
    }
  )
)

// Export convenience hooks
export function useIsAuthenticated() {
  return useAuthStore(state => state.isAuthenticated)
}

export function useCurrentUser() {
  return useAuthStore(state => state.getCurrentUser())
}

export function useCurrentPortal() {
  return useAuthStore(state => state.getCurrentPortal())
}
