import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, createAuditLog, getClientIP } from '@/lib/auth-utils'
import type { AuthContext } from '@/lib/auth-utils'

// GET /api/collections/loans - List overdue loans with filters
// Supports: status, daysInArrears, assignedCollector, amountRange, pagination, sorting
export const GET = withAuth(async (request: Request, _ctx: unknown, authContext: AuthContext) => {
  try {
    const { user } = authContext
    const { searchParams } = new URL(request.url)
    
    // Query parameters
    const tenantId = searchParams.get('tenantId') || user.tenantId
    const status = searchParams.get('status') // ACTIVE, IN_ARREARS, DEFAULTED, etc.
    const arrearsStatus = searchParams.get('arrearsStatus') // DAYS_1_7, DAYS_8_30, etc.
    const daysInArrearsMin = searchParams.get('daysInArrearsMin')
    const daysInArrearsMax = searchParams.get('daysInArrearsMax')
    const assignedCollector = searchParams.get('assignedCollector') // User ID or 'unassigned' or 'mine'
    const amountMin = searchParams.get('amountMin')
    const amountMax = searchParams.get('amountMax')
    const customerId = searchParams.get('customerId')
    const search = searchParams.get('search') // Search by loan number or customer name
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // Sorting
    const sortBy = searchParams.get('sortBy') || 'daysInArrears'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    // Validate tenant access
    if (user.role !== 'SUPER_ADMIN' && tenantId !== user.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Cannot access other tenant data' },
        { status: 403 }
      )
    }

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId is required' },
        { status: 400 }
      )
    }

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId,
      outstandingBalance: { gt: 0 },
      status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] }
    }

    // Filter by loan status
    if (status) {
      where.status = status
    }

    // Filter by arrears status (enum value)
    if (arrearsStatus) {
      where.arrearsStatus = arrearsStatus
    }

    // Filter by days in arrears range
    if (daysInArrearsMin || daysInArrearsMax) {
      const daysFilter: Record<string, unknown> = {}
      if (daysInArrearsMin) {
        daysFilter.gte = parseInt(daysInArrearsMin)
      }
      if (daysInArrearsMax) {
        daysFilter.lte = parseInt(daysInArrearsMax)
      }
      where.daysInArrears = daysFilter
    }

    // Filter by assigned collector
    if (assignedCollector) {
      if (assignedCollector === 'unassigned') {
        where.assignedCollector = null
      } else if (assignedCollector === 'mine') {
        where.assignedCollector = user.id
      } else {
        where.assignedCollector = assignedCollector
      }
    }

    // Filter by outstanding balance range
    if (amountMin || amountMax) {
      const amountFilter: Record<string, unknown> = {}
      if (amountMin) {
        amountFilter.gte = parseFloat(amountMin)
      }
      if (amountMax) {
        amountFilter.lte = parseFloat(amountMax)
      }
      where.outstandingBalance = amountFilter
    }

    // Filter by customer
    if (customerId) {
      where.customerId = customerId
    }

    // Build orderBy clause
    const validSortFields = ['loanNumber', 'principal', 'outstandingBalance', 'daysInArrears', 'nextPaymentDue', 'createdAt', 'updatedAt']
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'daysInArrears'
    const orderBy = { [orderByField]: sortOrder }

    // Execute query with includes
    const [loans, total] = await Promise.all([
      db.loan.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              alternativePhone: true,
              email: true,
              riskLevel: true
            }
          },
          collector: {
            select: {
              id: true,
              name: true,
              email: true,
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

    // If search term provided, filter results client-side (for loan number and customer name)
    let filteredLoans = loans
    if (search) {
      const searchLower = search.toLowerCase()
      filteredLoans = loans.filter(loan => 
        loan.loanNumber.toLowerCase().includes(searchLower) ||
        `${loan.customer.firstName} ${loan.customer.lastName}`.toLowerCase().includes(searchLower) ||
        loan.customer.phone.includes(search)
      )
    }

    // Audit log
    await createAuditLog({
      userId: user.id,
      tenantId: user.tenantId,
      action: 'collections:loans_list',
      entityType: 'Loan',
      ipAddress: getClientIP(request),
      metadata: {
        filters: { status, arrearsStatus, assignedCollector, amountMin, amountMax, search },
        page,
        limit,
        sortBy,
        sortOrder
      }
    })

    return NextResponse.json({
      success: true,
      data: filteredLoans,
      pagination: {
        page,
        limit,
        total: search ? filteredLoans.length : total,
        pages: Math.ceil((search ? filteredLoans.length : total) / limit)
      },
      filters: {
        status,
        arrearsStatus,
        daysInArrearsMin,
        daysInArrearsMax,
        assignedCollector,
        amountMin,
        amountMax,
        search
      }
    })
  } catch (error) {
    console.error('Error fetching collection loans:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch collection loans' },
      { status: 500 }
    )
  }
})
