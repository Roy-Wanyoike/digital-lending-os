import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null
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
// POST /api/auth - LOGIN
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json()
    const { portalType, email, phone, password, tenantSlug } = body

    // Validate required fields
    if (!portalType || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: portalType and password are required' },
        { status: 400 }
      )
    }

    // Get client IP for audit logging
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    // Route based on portal type
    switch (portalType) {
      case 'super_admin':
        return await handleSuperAdminLogin(email, password, ipAddress, userAgent)
      
      case 'dcp_admin':
      case 'dcp_staff':
        return await handleDcpUserLogin(portalType, email, password, tenantSlug, ipAddress, userAgent)
      
      case 'customer':
        return await handleCustomerLogin(phone, password, tenantSlug, ipAddress, userAgent)
      
      default:
        return NextResponse.json(
          { success: false, error: `Invalid portal type: ${portalType}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error during authentication' },
      { status: 500 }
    )
  }
}

// ============================================
// SUPER ADMIN LOGIN HANDLER
// ============================================

async function handleSuperAdminLogin(
  email: string | undefined,
  password: string,
  ipAddress: string,
  userAgent: string | undefined
) {
  if (!email) {
    return NextResponse.json(
      { success: false, error: 'Email is required for super admin login' },
      { status: 400 }
    )
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
    return NextResponse.json(
      { success: false, error: 'Invalid credentials or account not found' },
      { status: 401 }
    )
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
    
    return NextResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    )
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

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      avatar: user.avatar,
      phone: user.phone
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
    mfaRequired: false
  })
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
  userAgent: string | undefined
) {
  if (!email) {
    return NextResponse.json(
      { success: false, error: 'Email is required for DCP user login' },
      { status: 400 }
    )
  }

  if (!tenantSlug) {
    return NextResponse.json(
      { success: false, error: 'Tenant slug is required for DCP staff login' },
      { status: 400 }
    )
  }

  // Find tenant by slug
  const tenant = await db.tenant.findUnique({
    where: { slug: tenantSlug.toLowerCase() }
  })

  if (!tenant) {
    return NextResponse.json(
      { success: false, error: 'Tenant not found' },
      { status: 404 }
    )
  }

  if (tenant.status === 'SUSPENDED' || tenant.status === 'TERMINATED') {
    return NextResponse.json(
      { success: false, error: 'Tenant account is suspended or terminated' },
      { status: 403 }
    )
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
    return NextResponse.json(
      { success: false, error: 'Invalid credentials or user not found in this tenant' },
      { status: 401 }
    )
  }

  // Role-based access control
  if (portalType === 'dcp_admin' && !['SUPER_ADMIN', 'TENANT_ADMIN'].includes(user.role)) {
    return NextResponse.json(
      { success: false, error: 'Access denied. Admin privileges required.' },
      { status: 403 }
    )
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
    
    return NextResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    )
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

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      avatar: user.avatar,
      phone: user.phone
    },
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      branding: JSON.parse(tenant.branding || '{}')
    },
    token,
    expiresIn: Math.floor(TOKEN_EXPIRY_MS / 1000),
    mfaRequired: false
  })
}

// ============================================
// CUSTOMER LOGIN HANDLER
// ============================================

async function handleCustomerLogin(
  phone: string | undefined,
  password: string,
  tenantSlug: string | undefined,
  ipAddress: string,
  userAgent: string | undefined
) {
  if (!phone) {
    return NextResponse.json(
      { success: false, error: 'Phone number is required for customer login' },
      { status: 400 }
    )
  }

  // Normalize phone number (handle various formats)
  let normalizedPhone = phone.replace(/\s/g, '')
  if (normalizedPhone.startsWith('+254')) {
    normalizedPhone = '0' + normalizedPhone.slice(4)
  } else if (normalizedPhone.startsWith('254')) {
    normalizedPhone = '0' + normalizedPhone.slice(3)
  }

  // Build query
  const whereClause: Record<string, unknown> = {
    phone: normalizedPhone,
    status: 'ACTIVE'
  }

  // If tenantSlug provided, filter by tenant
  if (tenantSlug) {
    const tenant = await db.tenant.findUnique({
      where: { slug: tenantSlug.toLowerCase() }
    })
    
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      )
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
    return NextResponse.json(
      { success: false, error: 'Customer not found or account inactive' },
      { status: 401 }
    )
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
    
    return NextResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    )
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

  return NextResponse.json({
    success: true,
    customer: {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      email: customer.email,
      tenantId: customer.tenantId,
      status: customer.status
    },
    tenant: customer.tenant ? {
      id: customer.tenant.id,
      name: customer.tenant.name,
      slug: customer.tenant.slug,
      status: customer.tenant.status,
      branding: JSON.parse(customer.tenant.branding || '{}')
    } : null,
    token,
    expiresIn: Math.floor(TOKEN_EXPIRY_MS / 1000),
    mfaRequired: false
  })
}

// ============================================
// GET /api/auth - SESSION VALIDATION
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        isAuthenticated: false,
        error: 'No valid authorization token provided'
      }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json({
        isAuthenticated: false,
        error: 'Token expired or invalid'
      }, { status: 401 })
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
        return NextResponse.json({
          isAuthenticated: false,
          error: 'Customer account not found or inactive'
        }, { status: 401 })
      }

      return NextResponse.json({
        isAuthenticated: true,
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          email: customer.email,
          tenantId: customer.tenantId,
          status: customer.status
        },
        tenant: customer.tenant ? {
          id: customer.tenant.id,
          name: customer.tenant.name,
          slug: customer.tenant.slug,
          status: customer.tenant.status
        } : null,
        portalType: 'customer',
        expiresAt: new Date(decoded.exp as number).toISOString()
      })
    } else {
      // Validate and fetch user data
      const user = await db.user.findUnique({
        where: { id: decoded.userId as string },
        include: { tenant: true }
      })

      if (!user || !user.isActive) {
        return NextResponse.json({
          isAuthenticated: false,
          error: 'User account not found or inactive'
        }, { status: 401 })
      }

      return NextResponse.json({
        isAuthenticated: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          avatar: user.avatar,
          phone: user.phone
        },
        tenant: user.tenant ? {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          status: user.tenant.status
        } : null,
        portalType: portalType || 'dcp_staff',
        expiresAt: new Date(decoded.exp as number).toISOString()
      })
    }
  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.json({
      isAuthenticated: false,
      error: 'Failed to validate session'
    }, { status: 500 })
  }
}
