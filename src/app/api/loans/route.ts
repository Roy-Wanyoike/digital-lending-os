/**
 * Loans API
 * GET /api/loans - List loans
 * POST /api/loans - Create a new loan (from approved application)
 * 
 * Enhanced with:
 * - Rate limiting (100 req/min for general API)
 * - Input validation using Zod schemas
 * - Standardized API responses
 * - Security utilities for sanitization
 * - Financial amount validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withRoles, createAuditLog, getClientIP as getAuthIP } from '@/lib/auth-utils'
import type { AuthContext, RouteContext, UserRole } from '@/lib/auth-types'
import {
  withRateLimit,
  createRateLimiter,
} from '@/lib/rate-limit'
import {
  paginationSchema,
  idParamSchema,
  loanAmountSchema,
  interestRateSchema,
  getPagination,
} from '@/lib/validation'
import {
  sanitizeInput,
  sanitizeObject,
  validateAmount,
  maskPhone,
  hashSensitiveData,
  containsSqlInjection,
  extractClientIP as getSecurityIP,
} from '@/lib/security'
import {
  ApiResponse,
  generateRequestId,
} from '@/lib/api-response'

// Import Zod for schema definition
import { z } from 'zod'

// ============================================
// RATE LIMITING CONFIGURATION
// ============================================

const apiLimiter = createRateLimiter('general', {
  prefix: 'loans-api',
})

// ============================================
// HELPERS
// ============================================

function getClientIP(request: NextRequest): string {
  return getSecurityIP(request.headers)
}

// ============================================
// CREATE LOAN VALIDATION SCHEMA
// ============================================

const createLoanSchema = z.object({
  tenantId: idParamSchema.optional(),
  customerId: idParamSchema, // Required
  applicationId: idParamSchema.optional(),
  productId: idParamSchema, // Required
  principal: loanAmountSchema, // Required - validated as positive number within bounds
  approvedAmount: loanAmountSchema.optional(), // Optional, defaults to principal
  interestRate: interestRateSchema, // Required - percentage
  interestType: z.enum(['FLAT_RATE', 'REDUCING_BALANCE', 'DIMINISHING']).default('FLAT_RATE'),
  termDays: z.number().int().positive().min(7).max(3650), // 7 days to 10 years
  processingFee: z.number().min(0).max(100000).optional().default(0),
  insuranceFee: z.number().min(0).max(50000).optional().default(0),
  disbursementMethod: z.enum(['MPESA', 'BANK_TRANSFER', 'CHEQUE', 'CASH']).default('MPESA'),
  disbursementAccount: z.string().max(50).optional().nullable(),
}).refine(
  (data) => data.approvedAmount === undefined || data.approvedAmount <= data.principal * 1.5,
  {
    message: 'Approved amount cannot exceed 150% of principal',
    path: ['approvedAmount'],
  }
)

type CreateLoanInput = z.infer<typeof createLoanSchema>

// Valid loan statuses for filtering
const VALID_STATUSES = [
  'PENDING_DISBURSEMENT',
  'ACTIVE',
  'DUE',
  'OVERDUE',
  'DEFAULTED',
  'PAID_OFF',
  'WRITTEN_OFF',
  'RESTRUCTURED',
  'CANCELLED',
]

const VALID_ARREARS_STATUS = [
  'CURRENT',
  '1_30_DAYS',
  '31_60_DAYS',
  '61_90_DAYS',
  '91_180_DAYS',
  'OVER_180_DAYS',
]

// ============================================
// GET /api/loans - LIST LOANS
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
    const customerId = searchParams.get('customerId')
    const arrearsStatus = searchParams.get('arrearsStatus')?.toUpperCase()

    // Use authenticated user's tenantId if not provided
    const effectiveTenantId = tenantId || user.tenantId

    // Customers cannot access this endpoint directly
    if (user.role === 'CUSTOMER') {
      return ApiResponse.forbidden({
        message: 'Access denied. Customers should use /api/customers/[id]/loans',
        currentRole: user.role,
        requestId,
      })
    }

    // Ensure tenant isolation
    if (user.role !== 'SUPER_ADMIN' && effectiveTenantId !== user.tenantId) {
      return ApiResponse.forbidden({
        message: 'Access denied: Cannot access other tenant data',
        requestId,
      })
    }

    // Build where clause
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
    
    // Add validated status filter
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status
    }
    
    // Add validated customer ID filter
    if (customerId) {
      // Validate it looks like a valid ID format
      if (customerId.length < 10 || customerId.length > 30) {
        return ApiResponse.error('Invalid customer ID format', {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          details: [{ field: 'customerId', message: 'Invalid customer ID format', code: 'INVALID_FORMAT' }],
          requestId,
        })
      }
      where.customerId = customerId
    }
    
    // Add validated arrears status filter
    if (arrearsStatus && VALID_ARREARS_STATUS.includes(arrearsStatus)) {
      where.arrearsStatus = arrearsStatus
    }

    const [loans, total] = await Promise.all([
      db.loan.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              category: true
            }
          },
          _count: {
            select: {
              repayments: true
            }
          }
        }
      }),
      db.loan.count({ where })
    ])

    // Audit log for loan list access
    createAuditLog(
      'loan:list',
      user.id,
      { 
        filters: { status, customerId, arrearsStatus }, 
        page: pagination.page, 
        limit: pagination.limit, 
        tenantId: user.tenantId 
      },
      getClientIP(request)
    )

    // Mask sensitive customer phone numbers in response
    const maskedLoans = loans.map(loan => ({
      ...loan,
      customer: loan.customer ? {
        ...loan.customer,
        phone: maskPhone(loan.customer.phone),
      } : loan.customer,
    }))

    return ApiResponse.paginated(
      maskedLoans,
      pagination.page,
      pagination.limit,
      total,
      {
        requestId,
        processingTimeMs: Date.now() - startTime,
      }
    )
  } catch (error) {
    console.error('[Loans] Error fetching loans:', error)
    
    return ApiResponse.internalError({
      message: 'Failed to fetch loans',
      originalError: error,
      requestId,
    })
  }
}))

// ============================================
// POST /api/loans - CREATE LOAN
// ============================================

export const POST = withRateLimit('general', withRoles(['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER'])(async (
  request: NextRequest,
  _context: RouteContext,
  authContext: AuthContext
) => {
  const requestId = generateRequestId()
  const startTime = Date.now()
  
  try {
    const { user } = authContext
    
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
    const validationResult = createLoanSchema.safeParse(sanitizedBody)
    
    if (!validationResult.success) {
      return ApiResponse.zodError(validationResult.error, { requestId })
    }

    const data = validationResult.data
    
    // Use authenticated user's tenantId if not provided
    const effectiveTenantId = data.tenantId || user.tenantId

    // Ensure tenant access
    if (user.role !== 'SUPER_ADMIN' && effectiveTenantId !== user.tenantId) {
      return ApiResponse.forbidden({
        message: 'Access denied: Cannot create loan for other tenant',
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

    // Check if customer exists and belongs to tenant
    const customer = await db.customer.findFirst({ 
      where: { id: data.customerId, tenantId: effectiveTenantId } 
    })
    if (!customer) {
      return ApiResponse.notFound({
        entityType: 'Customer',
        entityId: data.customerId,
        requestId,
      })
    }

    // Check if product exists
    const product = await db.product.findFirst({
      where: { id: data.productId, tenantId: effectiveTenantId }
    })
    if (!product) {
      return ApiResponse.notFound({
        entityType: 'Product',
        entityId: data.productId,
        requestId,
      })
    }

    // Generate loan number
    const loanCount = await db.loan.count({ where: { tenantId: effectiveTenantId } })
    const loanNumber = `LN-${new Date().getFullYear()}-${String(loanCount + 1).padStart(6, '0')}`

    // Calculate totals with validated amounts
    const actualAmount = data.approvedAmount || data.principal
    const monthlyRate = data.interestRate / 100
    const months = Math.ceil(data.termDays / 30)
    const totalInterest = data.principal * monthlyRate * months
    const totalFees = (data.processingFee || 0) + (data.insuranceFee || 0)
    const totalRepayable = data.principal + totalInterest + totalFees

    // Generate repayment schedule
    const schedule = generateRepaymentSchedule(data.principal, data.interestRate, data.termDays, months)

    // Calculate maturity date
    const disbursementDate = new Date()
    const maturityDate = new Date(disbursementDate)
    maturityDate.setDate(maturityDate.getDate() + data.termDays)

    // Create the loan
    const loan = await db.loan.create({
      data: {
        tenantId: effectiveTenantId,
        customerId: data.customerId,
        applicationId: data.applicationId || null,
        productId: data.productId,
        loanNumber,
        principal: data.principal,
        approvedAmount: actualAmount,
        interestRate: data.interestRate,
        interestType: data.interestType,
        processingFee: data.processingFee || 0,
        insuranceFee: data.insuranceFee || 0,
        otherFees: 0,
        totalInterest,
        totalFees,
        totalRepayable,
        termDays: data.termDays,
        disbursementDate,
        maturityDate,
        outstandingBalance: totalRepayable,
        nextPaymentDue: getNextPaymentDate(disbursementDate, 30),
        status: 'APPROVED',
        arrearsStatus: 'CURRENT',
        disbursementMethod: data.disbursementMethod,
        disbursementAccount: data.disbursementAccount || null,
        repaymentSchedule: JSON.stringify(schedule)
      }
    })

    // Audit log for loan creation (critical action)
    createAuditLog(
      'loan:create',
      user.id,
      {
        loanNumber,
        principal: data.principal,
        customerId: data.customerId,
        productId: data.productId,
        approvedBy: user.name || user.email,
        entityId: loan.id,
        tenantId: user.tenantId,
      },
      getClientIP(request)
    )

    // Return created loan with masked customer info
    return ApiResponse.created(
      {
        ...loan,
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: maskPhone(customer.phone),
        },
      },
      {
        location: `/api/loans/${loan.id}`,
        message: 'Loan created successfully',
        requestId,
      }
    )
  } catch (error) {
    console.error('[Loans] Error creating loan:', error)
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return ApiResponse.conflict({
          message: 'A loan with this reference already exists',
          requestId,
        })
      }
      if (error.message.includes('Foreign key constraint')) {
        return ApiResponse.error('Referenced entity not found', {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          requestId,
        })
      }
    }
    
    return ApiResponse.internalError({
      message: 'Failed to create loan',
      originalError: error,
      requestId,
    })
  }
}))

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate repayment schedule for a loan.
 */
function generateRepaymentSchedule(
  principal: number,
  annualRate: number,
  termDays: number,
  installments: number
): Array<{
  installmentNo: number
  dueDate: string
  principal: number
  interest: number
  fees: number
  total: number
  status: string
}> {
  const schedule = []
  const monthlyInterest = (annualRate / 100) * principal / 12
  const principalPerInstallment = principal / installments
  const feesPerInstallment = 0 // Can be calculated based on fee structure
  
  for (let i = 1; i <= installments; i++) {
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (termDays / installments) * i)
    
    schedule.push({
      installmentNo: i,
      dueDate: dueDate.toISOString().split('T')[0],
      principal: Math.round(principalPerInstallment * 100) / 100,
      interest: Math.round(monthlyInterest * 100) / 100,
      fees: feesPerInstallment,
      total: Math.round((principalPerInstallment + monthlyInterest + feesPerInstallment) * 100) / 100,
      status: i === 1 ? 'PENDING' : 'SCHEDULED'
    })
  }
  
  return schedule
}

/**
 * Get next payment date from a start date.
 */
function getNextPaymentDate(startDate: Date, daysToAdd: number): Date {
  const nextDate = new Date(startDate)
  nextDate.setDate(nextDate.getDate() + daysToAdd)
  return nextDate
}
