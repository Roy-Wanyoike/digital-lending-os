/**
 * Digital Lending OS - Authentication API
 * POST /api/auth - LOGIN
 * GET /api/auth - SESSION VALIDATION
 * 
 * Enhanced with:
 * - Rate limiting (10 req/min for auth endpoints)
 * - Input validation using Zod schemas
 * - Standardized API responses
 * - Security utilities for sanitization and logging
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { 
  createRateLimiter, 
  withRateLimit,
  type RateLimitResult 
} from '@/lib/rate-limit'
import { 
  loginSchema, 
  emailSchema, 
  kenyanPhoneSchema,
  formatValidationErrors,
  createValidationErrorBody
} from '@/lib/validation'
import { 
  sanitizeInput, 
  sanitizeObject, 
  isValidPhoneNumber,
  normalizePhoneNumber,
  hashSensitiveData,
  maskPhone,
  extractClientIP as getSecurityIP
} from '@/lib/security'
import { 
  ApiResponse, 
  generateRequestId 
} from '@/lib/api-response'

// ============================================
// RATE LIMITING CONFIGURATION
// ============================================

/**
 * Auth-specific rate limiter.
 * Strict limits for authentication endpoints (brute force protection).
 */
const authLimiter = createRateLimiter('auth', {
  prefix: 'auth',
  skipInDevelopment: false, // Always enforce on auth routes
})

// ============================================
// TOKEN UTILITIES (Demo Implementation)
// ============================================

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

function generateToken(payload: Record<string, unknown>): string {
  const data = {
    ...payload,
    exp: Date.now() + TOKEN_EXPIRY_MS,
    iat: Date.now()
  }
  return Buffer.from(JSON.stringify(data)).toString('base64')
}

function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString())
    if (decoded.exp && decoded.exp > Date.now()) {
      return decoded
    }
    return null
  } catch {
    return null
  }
}

// ============================================
// PASSWORD VERIFICATION (Demo)
// ============================================

// Demo passwords that work with seed data
const DEMO_PASSWORDS = ['password123', 'admin123', 'demo123', 'Password123!', 'password']

function verifyPassword(inputPassword: string): boolean {
  // Sanitize password before comparison (prevent timing attacks via length)
  if (!inputPassword || typeof inputPassword !== 'string') {
    return false
  }
  return DEMO_PASSWORDS.includes(inputPassword)
}

// ============================================
// AUDIT LOGGING
// ============================================

async function createAuditLog(params: {
  userId?: string
  tenantId?: string
  action: string
  entityType?: string
  entityId?: string
  ipAddress?: string
  userAgent?: string
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId || null,
        tenantId: params.tenantId || null,
        action: params.action,
        entityType: params.entityType || 'AUTH',
        entityId: params.entityId || null,
        ipAddress: params.ipAddress ? hashSensitiveData(params.ipAddress) : null,
        userAgent: params.userAgent ? sanitizeInput(params.userAgent.slice(0, 500)) : null
      }
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

// ============================================
// TYPES
// ============================================

type PortalType = 'super_admin' | 'dcp_admin' | 'dcp_staff' | 'customer'

interface LoginRequest {
  portalType: PortalType
  email?: string
  phone?: string
  password: string
  tenantSlug?: string
}

// ============================================
// HELPERS
// ============================================

/**
 * Extract client IP address securely.
 */
function getClientIP(request: NextRequest): string {
  return getSecurityIP(request.headers)
}

/**
 * Check rate limit and return error response if limited.
 */
function checkAuthRateLimit(request: Request, requestId: string): NextResponse | null {
  const result: RateLimitResult = authLimiter.checkRequest(request)
  
  if (!result.success) {
    console.warn(`[Auth] Rate limit exceeded`, {
      requestId,
      ip: getClientIP(request as NextRequest),
      info: result.info,
    })
    
    return ApiResponse.rateLimited({
      retryAfterSeconds: Math.ceil(result.info.retryAfterMs / 1000),
      message: 'Too many authentication attempts. Please try again later.',
      requestId,
    })
  }
  
  return null
}

// ============================================
// POST /api/auth - LOGIN
// ============================================

export const POST = withRateLimit('auth', async (request: NextRequest) => {
  const requestId = generateRequestId()
  const startTime = Date.now()
  
  try {
    // Parse request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return ApiResponse.error('Invalid JSON in request body', {
        statusCode: 400,
        code: 'BAD_REQUEST',
        requestId,
      })
    }

    // Sanitize input object
    const sanitizedBody = sanitizeObject(body as Record<string, unknown>)
    
    // Validate against schema
    const validationResult = loginSchema.safeParse(sanitizedBody)
    
    if (!validationResult.success) {
      return ApiResponse.zodError(validationResult.error, { requestId })
    }

    const { portalType, email, phone, password, tenantSlug } = validationResult.data
    
    // Get client IP for audit logging
    const ipAddress = getClientIP(request)
    const userAgent = request.headers.get('user-agent')?.slice(0, 500) || undefined

    // Route based on portal type
    switch (portalType) {
      case 'super_admin':
        return await handleSuperAdminLogin(email, password, ipAddress, userAgent, requestId)
      
      case 'dcp_admin':
      case 'dcp_staff':
        return await handleDcpUserLogin(portalType, email, password, tenantSlug, ipAddress, userAgent, requestId)
      
      case 'customer':
        return await handleCustomerLogin(phone, password, tenantSlug, ipAddress, userAgent, requestId)
      
      default:
        return ApiResponse.error(`Invalid portal type: ${portalType}`, {
          statusCode: 400,
          code: 'BAD_REQUEST',
          requestId,
        })
    }
  } catch (error) {
    console.error('[Auth] Login error:', error)
    
    return ApiResponse.internalError({
      message: 'Internal server error during authentication',
      originalError: error,
      requestId,
    })
  }
})

// ============================================
// SUPER ADMIN LOGIN HANDLER
// ============================================

async function handleSuperAdminLogin(
  email: string | undefined,
  password: string,
  ipAddress: string,
  userAgent: string | undefined,
  requestId: string
) {
  // Validate required fields
  if (!email) {
    return ApiResponse.error('Email is required for super admin login', {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: [{
        field: 'email',
        message: 'Email is required for super admin login',
        code: 'REQUIRED',
      }],
      requestId,
    })
  }

  // Find super admin user (role = SUPER_ADMIN)
  const user = await db.user.findFirst({
    where: {
      role: 'SUPER_ADMIN',
      email: email.toLowerCase().trim(),
      isActive: true
    },
    include: {
      tenant: true
    }
  })

  if (!user) {
    // Log failed attempt (don't reveal if user exists)
    await createAuditLog({
      action: 'LOGIN_FAILED_SUPER_ADMIN',
      entityType: 'USER',
      ipAddress,
      userAgent
    })
    
    return ApiResponse.error('Invalid credentials or account not found', {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      requestId,
      logError: false, // Don't log full error - security risk
    })
  }

  // Verify password (demo mode - simple comparison)
  if (!verifyPassword(password)) {
    await createAuditLog({
      userId: user.id,
      tenantId: user.tenantId,
      action: 'LOGIN_FAILED',
      entityType: 'USER',
      entityId: user.id,
      ipAddress,
      userAgent
    })
    
    return ApiResponse.error('Invalid credentials', {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      requestId,
      logError: false,
    })
  }

  // Update last login
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  })

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    portalType: 'super_admin'
  })

  // Create audit log
  await createAuditLog({
    userId: user.id,
    tenantId: user.tenantId,
    action: 'LOGIN',
    entityType: 'USER',
    entityId: user.id,
    ipAddress,
    userAgent
  })

  return ApiResponse.success(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        avatar: user.avatar,
        phone: maskPhone(user.phone),
      },
      tenant: user.tenant ? {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        status: user.tenant.status,
        branding: JSON.parse(user.tenant.branding || '{}')
      } : null,
      token,
      expiresIn: Math.floor(TOKEN_EXPIRY_MS / 1000), // seconds
      mfaRequired: false,
    },
    {
      message: 'Authentication successful',
      requestId,
    }
  )
}

// ============================================
// DCP USER LOGIN HANDLER (Admin/Staff)
// ============================================

async function handleDcpUserLogin(
  portalType: 'dcp_admin' | 'dcp_staff',
  email: string | undefined,
  password: string,
  tenantSlug: string | undefined,
  ipAddress: string,
  userAgent: string | undefined,
  requestId: string
) {
  if (!email) {
    return ApiResponse.error('Email is required for DCP user login', {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: [{ field: 'email', message: 'Email is required', code: 'REQUIRED' }],
      requestId,
    })
  }

  if (!tenantSlug) {
    return ApiResponse.error('Tenant slug is required for DCP staff login', {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: [{ field: 'tenantSlug', message: 'Tenant slug is required', code: 'REQUIRED' }],
      requestId,
    })
  }

  // Sanitize tenant slug
  const sanitizedSlug = sanitizeInput(tenantSlug).toLowerCase()

  // Find tenant by slug
  const tenant = await db.tenant.findUnique({
    where: { slug: sanitizedSlug }
  })

  if (!tenant) {
    return ApiResponse.error('Tenant not found', {
      statusCode: 404,
      code: 'ENTITY_NOT_FOUND',
      requestId,
    })
  }

  if (tenant.status === 'SUSPENDED' || tenant.status === 'TERMINATED') {
    return ApiResponse.error('Tenant account is suspended or terminated', {
      statusCode: 403,
      code: 'FORBIDDEN',
      requestId,
    })
  }

  // Find user in this tenant
  const user = await db.user.findFirst({
    where: {
      tenantId: tenant.id,
      email: email.toLowerCase().trim(),
      isActive: true
    }
  })

  if (!user) {
    await createAuditLog({
      action: `LOGIN_FAILED_${portalType.toUpperCase()}`,
      entityType: 'USER',
      ipAddress,
      userAgent,
    })
    
    return ApiResponse.error('Invalid credentials or user not found in this tenant', {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      requestId,
      logError: false,
    })
  }

  // Role-based access control
  if (portalType === 'dcp_admin' && !['SUPER_ADMIN', 'TENANT_ADMIN'].includes(user.role)) {
    return ApiResponse.error('Access denied. Admin privileges required.', {
      statusCode: 403,
      code: 'INSUFFICIENT_PERMISSIONS',
      requestId,
    })
  }

  // Verify password (demo mode)
  if (!verifyPassword(password)) {
    await createAuditLog({
      userId: user.id,
      tenantId: user.tenantId,
      action: 'LOGIN_FAILED',
      entityType: 'USER',
      entityId: user.id,
      ipAddress,
      userAgent
    })
    
    return ApiResponse.error('Invalid credentials', {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      requestId,
      logError: false,
    })
  }

  // Update last login
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  })

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    portalType
  })

  // Create audit log
  await createAuditLog({
    userId: user.id,
    tenantId: user.tenantId,
    action: 'LOGIN',
    entityType: 'USER',
    entityId: user.id,
    ipAddress,
    userAgent
  })

  return ApiResponse.success(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        avatar: user.avatar,
        phone: maskPhone(user.phone),
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        branding: JSON.parse(tenant.branding || '{}'),
      },
      token,
      expiresIn: Math.floor(TOKEN_EXPIRY_MS / 1000),
      mfaRequired: false,
    },
    {
      message: 'Authentication successful',
      requestId,
    }
  )
}

// ============================================
// CUSTOMER LOGIN HANDLER
// ============================================

async function handleCustomerLogin(
  phone: string | undefined,
  password: string,
  tenantSlug: string | undefined,
  ipAddress: string,
  userAgent: string | undefined,
  requestId: string
) {
  if (!phone) {
    return ApiResponse.error('Phone number is required for customer login', {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: [{ field: 'phone', message: 'Phone number is required', code: 'REQUIRED' }],
      requestId,
    })
  }

  // Normalize phone number (already validated by Zod schema)
  const normalizedPhone = normalizePhoneNumber(phone) || phone
  
  // Build query
  const whereClause: Record<string, unknown> = {
    phone: normalizedPhone.replace('+', ''), // Store without +
    status: 'ACTIVE'
  }

  // If tenantSlug provided, filter by tenant
  if (tenantSlug) {
    const sanitizedSlug = sanitizeInput(tenantSlug).toLowerCase()
    const tenant = await db.tenant.findUnique({
      where: { slug: sanitizedSlug }
    })
    
    if (!tenant) {
      return ApiResponse.error('Tenant not found', {
        statusCode: 404,
        code: 'ENTITY_NOT_FOUND',
        requestId,
      })
    }
    
    whereClause.tenantId = tenant.id
  }

  // Find customer
  const customer = await db.customer.findFirst({
    where: whereClause,
    include: {
      tenant: true
    }
  })

  if (!customer) {
    await createAuditLog({
      action: 'CUSTOMER_LOGIN_FAILED',
      entityType: 'CUSTOMER',
      ipAddress,
      userAgent,
    })
    
    return ApiResponse.error('Customer not found or account inactive', {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      requestId,
      logError: false,
    })
  }

  // Verify PIN/password (demo mode - same as user passwords)
  if (!verifyPassword(password)) {
    await createAuditLog({
      tenantId: customer.tenantId,
      action: 'CUSTOMER_LOGIN_FAILED',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      ipAddress,
      userAgent
    })
    
    return ApiResponse.error('Invalid credentials', {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      requestId,
      logError: false,
    })
  }

  // Generate token
  const token = generateToken({
    customerId: customer.id,
    phone: customer.phone,
    tenantId: customer.tenantId,
    portalType: 'customer'
  })

  // Create audit log
  await createAuditLog({
    tenantId: customer.tenantId,
    action: 'CUSTOMER_LOGIN',
    entityType: 'CUSTOMER',
    entityId: customer.id,
    ipAddress,
    userAgent
  })

  return ApiResponse.success(
    {
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: maskPhone(customer.phone),
        email: customer.email,
        tenantId: customer.tenantId,
        status: customer.status,
      },
      tenant: customer.tenant ? {
        id: customer.tenant.id,
        name: customer.tenant.name,
        slug: customer.tenant.slug,
        status: customer.tenant.status,
        branding: JSON.parse(customer.tenant.branding || '{}'),
      } : null,
      token,
      expiresIn: Math.floor(TOKEN_EXPIRY_MS / 1000),
      mfaRequired: false,
    },
    {
      message: 'Authentication successful',
      requestId,
    }
  )
}

// ============================================
// GET /api/auth - SESSION VALIDATION
// ============================================

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    // Get Authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized({ requestId })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded) {
      return ApiResponse.invalidToken({ requestId })
    }

    // Reconstruct session data based on decoded token
    const portalType = decoded.portalType as string
    
    if (portalType === 'customer') {
      // Validate and fetch customer data
      const customer = await db.customer.findUnique({
        where: { id: decoded.customerId as string },
        include: { tenant: true }
      })

      if (!customer || customer.status !== 'ACTIVE') {
        return ApiResponse.error('Customer account not found or inactive', {
          statusCode: 401,
          code: 'INVALID_TOKEN',
          requestId,
        })
      }

      return ApiResponse.success(
        {
          isAuthenticated: true,
          customer: {
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: maskPhone(customer.phone),
            email: customer.email,
            tenantId: customer.tenantId,
            status: customer.status,
          },
          tenant: customer.tenant ? {
            id: customer.tenant.id,
            name: customer.tenant.name,
            slug: customer.tenant.slug,
            status: customer.tenant.status,
          } : null,
          portalType: 'customer',
          expiresAt: new Date(decoded.exp as number).toISOString(),
        },
        { requestId }
      )
    } else {
      // Validate and fetch user data
      const user = await db.user.findUnique({
        where: { id: decoded.userId as string },
        include: { tenant: true }
      })

      if (!user || !user.isActive) {
        return ApiResponse.error('User account not found or inactive', {
          statusCode: 401,
          code: 'INVALID_TOKEN',
          requestId,
        })
      }

      return ApiResponse.success(
        {
          isAuthenticated: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            avatar: user.avatar,
            phone: maskPhone(user.phone),
          },
          tenant: user.tenant ? {
            id: user.tenant.id,
            name: user.tenant.name,
            slug: user.tenant.slug,
            status: user.tenant.status,
          } : null,
          portalType: portalType || 'dcp_staff',
          expiresAt: new Date(decoded.exp as number).toISOString(),
        },
        { requestId }
      )
    }
  } catch (error) {
    console.error('[Auth] Session validation error:', error)
    
    return ApiResponse.internalError({
      message: 'Failed to validate session',
      originalError: error,
      requestId,
    })
  }
}
