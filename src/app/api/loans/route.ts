import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withRoles, createAuditLog, getClientIP } from '@/lib/auth-utils'
import type { AuthContext } from '@/lib/auth-utils'

// GET /api/loans - List loans
// Requires authentication (any DCP staff role)
export const GET = withAuth(async (request: Request, _ctx: unknown, authContext: AuthContext) => {
  try {
    const { user } = authContext
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const tenantId = searchParams.get('tenantId')
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')
    const arrearsStatus = searchParams.get('arrearsStatus')

    // Use authenticated user's tenantId if not provided
    const effectiveTenantId = tenantId || user.tenantId

    // Customers cannot access this endpoint directly
    if (user.role === 'CUSTOMER') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Customers should use /api/customers/[id]/loans', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Ensure tenant isolation
    if (user.role !== 'SUPER_ADMIN' && effectiveTenantId !== user.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Cannot access other tenant data', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}
    
    if (!effectiveTenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId query parameter is required' },
        { status: 400 }
      )
    }
    
    where.tenantId = effectiveTenantId
    
    if (status) {
      where.status = status
    }
    
    if (customerId) {
      where.customerId = customerId
    }
    
    if (arrearsStatus) {
      where.arrearsStatus = arrearsStatus
    }

    const [loans, total] = await Promise.all([
      db.loan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
    await createAuditLog({
      userId: user.id,
      tenantId: user.tenantId,
      action: 'loan:list',
      entityType: 'Loan',
      ipAddress: getClientIP(request),
      metadata: { filters: { status, customerId, arrearsStatus }, page, limit },
    })

    return NextResponse.json({
      success: true,
      data: loans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching loans:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch loans' },
      { status: 500 }
    )
  }
})

// POST /api/loans - Create a new loan (from approved application)
// Requires MANAGER or higher role for loan creation
export const POST = withRoles(['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER'])(async (
  request: Request,
  _ctx: unknown,
  authContext: AuthContext
) => {
  try {
    const { user } = authContext
    const body = await request.json()
    
    const {
      tenantId,
      customerId,
      applicationId,
      productId,
      principal,
      approvedAmount,
      interestRate,
      interestType = 'FLAT_RATE',
      termDays,
      processingFee = 0,
      insuranceFee = 0,
      disbursementMethod = 'MPESA',
      disbursementAccount
    } = body

    // Use authenticated user's tenantId if not provided
    const effectiveTenantId = tenantId || user.tenantId

    // Validate required fields
    if (!effectiveTenantId || !customerId || !productId || !principal || !termDays) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Ensure tenant access
    if (user.role !== 'SUPER_ADMIN' && effectiveTenantId !== user.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Cannot create loan for other tenant', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Check if tenant exists
    const tenant = await db.tenant.findUnique({ where: { id: effectiveTenantId } })
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Check if customer exists and belongs to tenant
    const customer = await db.customer.findFirst({ where: { id: customerId, tenantId: effectiveTenantId } })
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found or does not belong to this tenant' },
        { status: 404 }
      )
    }

    // Generate loan number
    const loanCount = await db.loan.count({ where: { tenantId: effectiveTenantId } })
    const loanNumber = `LN-${new Date().getFullYear()}-${String(loanCount + 1).padStart(6, '0')}`

    // Calculate totals
    const actualAmount = approvedAmount || principal
    const monthlyRate = interestRate / 100
    const months = Math.ceil(termDays / 30)
    const totalInterest = principal * monthlyRate * months
    const totalFees = processingFee + insuranceFee
    const totalRepayable = principal + totalInterest + totalFees

    // Generate repayment schedule
    const schedule = generateRepaymentSchedule(principal, interestRate, termDays, months)

    // Calculate maturity date
    const disbursementDate = new Date()
    const maturityDate = new Date(disbursementDate)
    maturityDate.setDate(maturityDate.getDate() + termDays)

    const loan = await db.loan.create({
      data: {
        tenantId: effectiveTenantId,
        customerId,
        applicationId: applicationId || null,
        productId,
        loanNumber,
        principal,
        approvedAmount: actualAmount,
        interestRate,
        interestType,
        processingFee,
        insuranceFee,
        otherFees: 0,
        totalInterest,
        totalFees,
        totalRepayable,
        termDays,
        disbursementDate,
        maturityDate,
        outstandingBalance: totalRepayable,
        nextPaymentDue: getNextPaymentDate(disbursementDate, 30),
        status: 'APPROVED',
        arrearsStatus: 'CURRENT',
        disbursementMethod,
        disbursementAccount: disbursementAccount || null,
        repaymentSchedule: JSON.stringify(schedule)
      }
    })

    // Audit log for loan creation (critical action)
    await createAuditLog({
      userId: user.id,
      tenantId: user.tenantId,
      action: 'loan:create',
      entityType: 'Loan',
      entityId: loan.id,
      ipAddress: getClientIP(request),
      metadata: {
        loanNumber,
        principal,
        customerId,
        productId,
        approvedBy: user.name || user.email,
      },
    })

    return NextResponse.json(
      { success: true, data: loan },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating loan:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create loan' },
      { status: 500 }
    )
  }
})

// Helper function to generate repayment schedule
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

function getNextPaymentDate(startDate: Date, daysToAdd: number): Date {
  const nextDate = new Date(startDate)
  nextDate.setDate(nextDate.getDate() + daysToAdd)
  return nextDate
}
