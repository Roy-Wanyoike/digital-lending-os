/**
 * Customers API
 * GET /api/customers - List customers
 * POST /api/customers - Create a new customer
 * 
 * Enhanced with:
 * - Rate limiting (100 req/min for general API)
 * - Input validation using Zod schemas
 * - Standardized API responses
 * - Security utilities for sanitization
 * - Pagination validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, createAuditLog, getClientIP as getAuthIP } from '@/lib/auth-utils'
import type { AuthContext, RouteContext } from '@/lib/auth-types'
import {
  withRateLimit,
  createRateLimiter,
} from '@/lib/rate-limit'
import {
  paginationSchema,
  customerNameSchema,
  kenyanPhoneSchema,
  emailSchema,
  nationalIdSchema,
  kraPinSchema,
  idParamSchema,
  formatValidationErrors,
  getPagination,
} from '@/lib/validation'
import {
  sanitizeInput,
  sanitizeObject,
  isValidPhoneNumber,
  normalizePhoneNumber,
  maskPhone,
  maskEmail,
  maskKRAPIN,
  maskId,
  hashSensitiveData,
  containsSqlInjection,
  extractClientIP as getSecurityIP,
} from '@/lib/security'
import {
  ApiResponse,
  generateRequestId,
  type ErrorCode,
} from '@/lib/api-response'

// ============================================
// RATE LIMITING CONFIGURATION
// ============================================

const apiLimiter = createRateLimiter('general', {
  prefix: 'customers-api',
})

// ============================================
// HELPERS
// ============================================

function getClientIP(request: NextRequest): string {
  return getSecurityIP(request.headers)
}

// ============================================
// CREATE CUSTOMER VALIDATION SCHEMA
// ============================================

const createCustomerSchema = customerNameSchema.extend({
  tenantId: idParamSchema.optional(),
  email: emailSchema.optional().nullable(),
  phone: kenyanPhoneSchema, // Required
  alternativePhone: kenyanPhoneSchema.optional().nullable(),
  dateOfBirth: z => z.coerce.date().optional().nullable(),
  gender: z => z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  nationalId: nationalIdSchema.optional().nullable(),
  kraPin: kraPinSchema.optional().nullable(),
  employmentStatus: z => z.enum([
    'EMPLOYED', 'SELF_EMPLOYED', 'UNEMPLOYED',
    'STUDENT', 'RETIRED', 'OTHER'
  ]).optional().nullable(),
  employerName: z => z.string().trim().max(100).optional().nullable(),
  incomeAmount: z => z.number().positive().optional().nullable(),
  incomeFrequency: z => z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'ANNUALLY']).optional().nullable(),
  businessName: z => z.string().trim().max(100).optional().nullable(),
  county: z => z.string().trim().max(100).optional().nullable(),
  city: z => z.string().trim().max(100).optional().nullable(),
  bankName: z => z.string().trim().max(100).optional().nullable(),
  bankAccount: z => z.string().trim().max(30).optional().nullable(),
  mpesaPhone: kenyanPhoneSchema.optional(),
}).refine(
  (data) => !(data.email && !data.email.includes('@')),
  { message: 'Invalid email format', path: ['email'] }
)

type CreateCustomerInput = ReturnType<typeof createCustomerSchema.parse>

// Import Zod for schema definition
import { z } from 'zod'

// ============================================
// GET /api/customers - LIST CUSTOMERS
// ============================================

export const GET = withRateLimit('general', withAuth(async (
  request: NextRequest,
  _context: RouteContext,
  authContext: AuthContext
) => {
  const requestId = generateRequestId()
  const startTime = Date.now()
  
  try {
    const { user } = authContext
    const { searchParams } = new URL(request.url)
    
    // Validate pagination parameters
    const pagination = getPagination(searchParams)
    
    // Extract and validate filter parameters
    const tenantId = searchParams.get('tenantId')
    const status = searchParams.get('status')?.toUpperCase()
    const riskLevel = searchParams.get('riskLevel')?.toUpperCase()
    const search = searchParams.get('search')

    // Sanitize search term to prevent injection
    const sanitizedSearch = search ? sanitizeInput(search) : undefined

    // Use authenticated user's tenantId if not provided
    const effectiveTenantId = tenantId || user.tenantId

    // Customers can only access their own data
    if (user.role === 'CUSTOMER') {
      return ApiResponse.forbidden({
        message: 'Customers cannot access this endpoint',
        currentRole: user.role,
        requiredRoles: ['STAFF', 'AGENT', 'MANAGER', 'TENANT_ADMIN', 'SUPER_ADMIN'],
        requestId,
      })
    }

    // Ensure tenant isolation - non-SUPER_ADMIN must use their own tenant
    if (user.role !== 'SUPER_ADMIN' && effectiveTenantId !== user.tenantId) {
      return ApiResponse.forbidden({
        message: 'Access denied: Cannot access other tenant data',
        requestId,
      })
    }

    // Build where clause - tenant isolation is required
    if (!effectiveTenantId) {
      return ApiResponse.error('tenantId query parameter is required', {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        details: [{ field: 'tenantId', message: 'tenantId is required', code: 'REQUIRED' }],
        requestId,
      })
    }
    
    const where: Record<string, unknown> = {
      tenantId: effectiveTenantId,
    }
    
    // Add validated filters
    const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'BLACKLISTED']
    if (status && validStatuses.includes(status)) {
      where.status = status
    }
    
    const validRiskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    if (riskLevel && validRiskLevels.includes(riskLevel)) {
      where.riskLevel = riskLevel
    }
    
    // Safe search implementation
    if (sanitizedSearch) {
      // Check for SQL injection patterns in search
      if (containsSqlInjection(sanitizedSearch)) {
        console.warn(`[Security] Potential SQL injection in customer search`, {
          requestId,
          ip: getClientIP(request),
          search: sanitizedSearch,
        })
        
        return ApiResponse.error('Invalid search query', {
          statusCode: 400,
          code: 'BAD_REQUEST',
          requestId,
        })
      }
      
      where.OR = [
        { firstName: { contains: sanitizedSearch, mode: 'insensitive' as const } },
        { lastName: { contains: sanitizedSearch, mode: 'insensitive' as const } },
        { phone: { contains: sanitizedSearch.replace(/\D/g, ''), mode: 'insensitive' as const } },
        { email: { contains: sanitizedSearch, mode: 'insensitive' as const } },
        { nationalId: { contains: sanitizedSearch, mode: 'insensitive' as const } }
      ]
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
        include: {
          _count: {
            select: {
              loans: true,
              loanApplications: true,
              repayments: true
            }
          }
        }
      }),
      db.customer.count({ where })
    ])

    // Audit log for customer list access
    createAuditLog(
      'customer:list',
      user.id,
      { 
        filters: { status, riskLevel, search: sanitizedSearch }, 
        page: pagination.page, 
        limit: pagination.limit, 
        tenantId: user.tenantId 
      },
      getClientIP(request)
    )

    // Mask sensitive data before returning
    const maskedCustomers = customers.map(customer => ({
      ...customer,
      phone: maskPhone(customer.phone),
      email: maskEmail(customer.email),
      alternativePhone: customer.alternativePhone ? maskPhone(customer.alternativePhone) : null,
      nationalId: customer.nationalId ? maskId(customer.nationalId) : null,
      kraPin: customer.kraPin ? maskKRAPIN(customer.kraPin) : null,
    }))

    return ApiResponse.paginated(
      maskedCustomers,
      pagination.page,
      pagination.limit,
      total,
      {
        requestId,
        processingTimeMs: Date.now() - startTime,
      }
    )
  } catch (error) {
    console.error('[Customers] Error fetching customers:', error)
    
    return ApiResponse.internalError({
      message: 'Failed to fetch customers',
      originalError: error,
      requestId,
    })
  }
}))

// ============================================
// POST /api/customers - CREATE CUSTOMER
// ============================================

export const POST = withRateLimit('general', withAuth(async (
  request: NextRequest,
  _context: RouteContext,
  authContext: AuthContext
) => {
  const requestId = generateRequestId()
  const startTime = Date.now()
  
  try {
    const { user } = authContext
    
    // Check role - AGENT and above can create customers
    const allowedRoles = ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STAFF', 'AGENT']
    if (!allowedRoles.includes(user.role)) {
      return ApiResponse.forbidden({
        message: 'Insufficient permissions to create customers',
        currentRole: user.role,
        requiredRoles: allowedRoles,
        requestId,
      })
    }
    
    // Parse and sanitize body
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

    const sanitizedBody = sanitizeObject(body as Record<string, unknown>)
    
    // Validate against schema
    const validationResult = createCustomerSchema.safeParse(sanitizedBody)
    
    if (!validationResult.success) {
      return ApiResponse.zodError(validationResult.error, { requestId })
    }

    const data = validationResult.data
    
    // Use authenticated user's tenantId if not provided
    const effectiveTenantId = data.tenantId || user.tenantId

    // Ensure tenant access
    if (user.role !== 'SUPER_ADMIN' && effectiveTenantId !== user.tenantId) {
      return ApiResponse.forbidden({
        message: 'Access denied: Cannot create customer for other tenant',
        requestId,
      })
    }

    // Check if tenant exists
    const tenant = await db.tenant.findUnique({ where: { id: effectiveTenantId } })
    if (!tenant) {
      return ApiResponse.notFound({
        entityType: 'Tenant',
        entityId: effectiveTenantId,
        requestId,
      })
    }

    // Normalize phone for database storage (without + prefix)
    const normalizedPhone = data.phone.replace('+', '')
    
    // Check for duplicate phone within tenant
    const existingCustomer = await db.customer.findFirst({
      where: { tenantId: effectiveTenantId, phone: normalizedPhone }
    })

    if (existingCustomer) {
      return ApiResponse.conflict({
        message: 'A customer with this phone number already exists in this tenant',
        field: 'phone',
        requestId,
      })
    }

    // Create customer with validated data
    const customer = await db.customer.create({
      data: {
        tenantId: effectiveTenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: normalizedPhone,
        alternativePhone: data.alternativePhone ? data.alternativePhone.replace('+', '') : null,
        dateOfBirth: data.dateOfBirth || null,
        gender: data.gender || null,
        nationalId: data.nationalId || null,
        kraPin: data.kraPin || null,
        employmentStatus: data.employmentStatus || null,
        employerName: data.employerName || null,
        incomeAmount: data.incomeAmount || null,
        incomeFrequency: data.incomeFrequency || null,
        businessName: data.businessName || null,
        county: data.county || null,
        city: data.city || null,
        bankName: data.bankName || null,
        bankAccount: data.bankAccount || null,
        mpesaPhone: data.mpesaPhone ? data.mpesaPhone.replace('+', '') : normalizedPhone,
      }
    })

    // Audit log for customer creation
    createAuditLog(
      'customer:create',
      user.id,
      { 
        customerPhone: maskPhone(normalizedPhone), 
        customerName: `${data.firstName} ${data.lastName}`, 
        entityId: customer.id, 
        tenantId: user.tenantId 
      },
      getClientIP(request)
    )

    // Return created customer with masked sensitive data
    return ApiResponse.created(
      {
        ...customer,
        phone: maskPhone(customer.phone),
        email: maskEmail(customer.email),
        alternativePhone: customer.alternativePhone ? maskPhone(customer.alternativePhone) : null,
        nationalId: customer.nationalId ? maskId(customer.nationalId) : null,
        kraPin: customer.kraPin ? maskKRAPIN(customer.kraPin) : null,
      },
      {
        location: `/api/customers/${customer.id}`,
        message: 'Customer created successfully',
        requestId,
      }
    )
  } catch (error) {
    console.error('[Customers] Error creating customer:', error)
    
    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return ApiResponse.conflict({
        message: 'A customer with this identifier already exists',
        requestId,
      })
    }
    
    return ApiResponse.internalError({
      message: 'Failed to create customer',
      originalError: error,
      requestId,
    })
  }
}))
