// Digital Lending OS - Authentication Types
// Multi-Portal Authentication System for Kenyan DCPs

// ============================================
// CORE TYPES
// ============================================

export type PortalType = 'customer' | 'lender' | 'admin' | 'architecture'

export type UserRole = 
  | 'SUPER_ADMIN'        // Platform operator
  | 'TENANT_ADMIN'       // DCP organization admin
  | 'TENANT_STAFF'       // DCP staff member
  | 'TENANT_AGENT'       // Field agent
  | 'MANAGER'            // Manager with approval authority
  | 'CUSTOMER'           // Borrower/customer

export type TenantStatus = 
  | 'ACTIVE'
  | 'TRIAL'
  | 'SUSPENDED'
  | 'PENDING_ONBOARDING'

export type TenantPlan = 
  | 'STARTER'
  | 'PROFESSIONAL'
  | 'ENTERPRISE'
  | 'CUSTOM'

// ============================================
// ENTITY TYPES
// ============================================

export interface Tenant {
  id: string
  name: string
  slug: string
  logoUrl?: string
  primaryColor?: string
  status: TenantStatus
  plan: TenantPlan
  // Additional fields for RBAC/ABAC
  settings?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  tenantId?: string
  tenantName?: string
  avatarUrl?: string
  phone?: string
  // Additional fields
  department?: string
  permissions?: string[]
  isActive?: boolean
}

export interface Customer {
  id: string
  phone: string
  name?: string
  customerId?: string
  tenantId?: string
  kycStatus?: 'pending' | 'verified' | 'rejected'
  creditScore?: number
  createdAt?: string
}

// ============================================
// AUTHENTICATION TYPES
// ============================================

export interface LoginCredentials {
  // For Super Admin / DCP Staff login
  email?: string
  password?: string
  
  // For DCP Staff login (tenant selection)
  tenantSlug?: string
  
  // For Customer login
  phone?: string
  pin?: string
  
  // MFA
  mfaCode?: string
  mfaToken?: string
}

export interface LoginRequest {
  portal: PortalType
  credentials: LoginCredentials
}

export interface AuthSession {
  user: User
  customer?: Customer | null
  tenant?: Tenant | null
  portal: PortalType
  accessToken: string
  refreshToken?: string
  expiresAt: number
  lastActivity: number
}

export interface LoginResponse {
  success: boolean
  session?: AuthSession
  error?: string
  message?: string
  mfaRequired?: boolean
  mfaToken?: string
}

export interface TokenPayload {
  sub: string           // User ID
  email: string
  role: UserRole
  tenantId?: string
  portal: PortalType
  exp: number           // Expiration timestamp
  iat: number           // Issued at timestamp
  jti?: string          // JWT ID (for token revocation)
}

// ============================================
// AUTH STATE TYPES (for Zustand Store)
// ============================================

export interface AbacAttributes {
  userId: string
  role: UserRole
  tenantId: string | null
  portal: PortalType | null
  department: string | null
  isTenantOwner: boolean
  loanApprovalLimit: number
  canAccessSensitiveData: boolean
  canManageStaff: boolean
  canApproveLoans: boolean
  canWriteOffLoans: boolean
}

export interface PersistedAuthState {
  user: User | null
  customer: Customer | null
  tenant: Tenant | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  portalType: PortalType | null
  sessionExpiresAt: number | null
  attributes: AbacAttributes
}

export interface AuthState {
  // Identity
  user: User | null
  customer: Customer | null
  tenant: Tenant | null
  
  // Status
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  portalType: PortalType | null
  
  // Tokens
  token: string | null
  refreshToken: string | null
  sessionExpiresAt: number | null
  tokenRefreshTimer: ReturnType<typeof setTimeout> | null
  
  // ABAC Attributes
  attributes: AbacAttributes
  
  // Errors
  error: string | null
  lastAuthAction: string | null
}

export interface AuthActions {
  // Authentication
  login: (portal: PortalType, credentials: LoginCredentials) => Promise<AuthResult>
  logout: () => Promise<void>
  registerCustomer: (data: RegisterCustomerData) => Promise<AuthResult>
  
  // Session Management
  initializeAuth: () => Promise<void>
  refreshAccessToken: () => Promise<boolean>
  checkSession: () => Promise<boolean>
  
  // Token Management
  setTokens: (accessToken: string, refreshToken?: string, expiresIn?: number) => void
  clearTokens: () => void
  
  // State Updates
  setUser: (user: User | null) => void
  setCustomer: (customer: Customer | null) => void
  setTenant: (tenant: Tenant | null) => void
  setPortalType: (portal: PortalType) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  updateAbacAttributes: (attributes: Partial<AbacAttributes>) => void
  
  // Permission Checks
  hasPermission: (permission: string) => boolean
  hasRole: (role: UserRole | UserRole[]) => boolean
  canAccessResource: (resource: string, action: string) => boolean
}

export interface AuthStore extends AuthState, AuthActions {}

export interface AuthResult {
  success: boolean
  user?: User | null
  customer?: Customer | null
  tenant?: Tenant | null
  token?: string | null
  refreshToken?: string | null
  error?: string | null
  errorCode?: string
  message?: string
  requiresMfa?: boolean
  mfaToken?: string
}

export interface RegisterCustomerData {
  phone: string
  firstName: string
  lastName: string
  idNumber?: string
  pin: string
  agreedToTerms: boolean
}

// ============================================
// AUDIT LOG TYPES
// ============================================

export interface AuditLogEntry {
  id: string
  userId: string
  tenantId: string
  action: string
  entityType: string
  entityId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
  timestamp: string
}

// ============================================
// PERMISSION TYPE
// ============================================

export type Permission = string

// ============================================
// CONFIGURATION EXPORTS
// ============================================

/** Session configuration */
export const SESSION_CONFIG = {
  /** Access token lifetime in milliseconds */
  ACCESS_TOKEN_LIFETIME: 30 * 60 * 1000, // 30 minutes
  /** Refresh token lifetime in milliseconds */
  REFRESH_TOKEN_LIFETIME: 7 * 24 * 60 * 60 * 1000, // 7 days
  /** Time before expiration to trigger refresh (in ms) */
  REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes
  /** Maximum session idle time before forced logout */
  MAX_IDLE_TIME: 8 * 60 * 60 * 1000, // 8 hours
} as const;

/** Default ABAC attribute values */
export const DEFAULT_ABAC_ATTRIBUTES: AbacAttributes = {
  userId: '',
  role: 'CUSTOMER',
  tenantId: null,
  portal: null,
  department: null,
  isTenantOwner: false,
  loanApprovalLimit: 0,
  canAccessSensitiveData: false,
  canManageStaff: false,
  canApproveLoans: false,
  canWriteOffLoans: false,
};

/** Role hierarchy for inheritance (higher index = higher privilege) */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  CUSTOMER: 0,
  TENANT_AGENT: 1,
  TENANT_STAFF: 2,
  MANAGER: 3,
  TENANT_ADMIN: 4,
  SUPER_ADMIN: 5,
};

/** Portal configurations */
export const PORTAL_CONFIG: Record<PortalType, {
  type: PortalType
  name: string
  description: string
  icon: string
  color: string
  bgColor: string
  requiresTenantSelection: boolean
  requiresMfa: boolean
  allowedRoles: UserRole[]
}> = {
  customer: {
    type: 'customer',
    name: 'Customer Portal',
    description: 'Borrower self-service',
    icon: 'Users',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    requiresTenantSelection: false,
    requiresMfa: false,
    allowedRoles: ['CUSTOMER']
  },
  lender: {
    type: 'lender',
    name: 'Lender Admin',
    description: 'DCP administration',
    icon: 'Building2',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    requiresTenantSelection: true,
    requiresMfa: false,
    allowedRoles: ['TENANT_AGENT', 'TENANT_STAFF', 'MANAGER', 'TENANT_ADMIN']
  },
  admin: {
    type: 'admin',
    name: 'Super Admin',
    description: 'Platform operations',
    icon: 'Shield',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100',
    requiresTenantSelection: false,
    requiresMfa: true,
    allowedRoles: ['SUPER_ADMIN']
  },
  architecture: {
    type: 'architecture',
    name: 'Architecture',
    description: 'System overview',
    icon: 'Network',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    requiresTenantSelection: false,
    requiresMfa: false,
    allowedRoles: ['SUPER_ADMIN', 'TENANT_ADMIN']
  }
};

// ============================================
// DEMO CREDENTIALS (for prototype testing)
// ============================================

export const DEMO_CREDENTIALS = {
  superAdmin: {
    email: 'admin@digitallending.os',
    password: 'Admin@2024!',
    name: 'Platform Administrator',
    role: 'SUPER_ADMIN' as UserRole
  },
  dcpAdmin: {
    email: 'admin@abepot.co.ke',
    password: 'DCP@2024!',
    tenantSlug: 'abepot',
    name: 'John Admin',
    role: 'TENANT_ADMIN' as UserRole
  },
  dcpStaff: {
    email: 'staff@abepot.co.ke',
    password: 'Staff@2024!',
    tenantSlug: 'abepot',
    name: 'Jane Staff',
    role: 'TENANT_STAFF' as UserRole
  },
  customer: {
    phone: '+254712345678',
    pin: '1234',
    name: 'Kamau Customer',
    role: 'CUSTOMER' as UserRole
  }
};

// ============================================
// MOCK TENANTS (for demo/testing)
// ============================================

export const MOCK_TENANTS: Tenant[] = [
  { id: '1', name: 'Abepot Credit Limited', slug: 'abepot', primaryColor: '#059669', status: 'ACTIVE', plan: 'PROFESSIONAL' },
  { id: '2', name: 'Fabilo Credit PLC', slug: 'fabilo', primaryColor: '#2563eb', status: 'ACTIVE', plan: 'ENTERPRISE' },
  { id: '3', name: 'Signature Capital Kenya', slug: 'signaturecapital', primaryColor: '#7c3aed', status: 'ACTIVE', plan: 'ENTERPRISE' },
  { id: '4', name: 'Karibu Microfinance', slug: 'karibucredit', primaryColor: '#ea580c', status: 'TRIAL', plan: 'STARTER' },
  { id: '5', name: 'ED Partners Africa', slug: 'edpartners', primaryColor: '#0891b2', status: 'ACTIVE', plan: 'ENTERPRISE' },
  { id: '6', name: 'Peak Credit Services', slug: 'peakcredit', primaryColor: '#dc2626', status: 'ACTIVE', plan: 'PROFESSIONAL' },
  { id: '7', name: 'Hela Pesa Limited', slug: 'helapesa', primaryColor: '#16a34a', status: 'ACTIVE', plan: 'STARTER' },
  { id: '8', name: 'Rapid Loans Kenya', slug: 'rapidloans', primaryColor: '#9333ea', status: 'SUSPENDED', plan: 'PROFESSIONAL' }
];
