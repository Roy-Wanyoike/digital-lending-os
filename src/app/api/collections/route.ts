import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, createAuditLog, getClientIP } from '@/lib/auth-utils'
import type { AuthContext } from '@/lib/auth-utils'

// GET /api/collections - Collections Dashboard Data
// Returns summary statistics, aging buckets, overdue loans list, and collection agents
export const GET = withAuth(async (request: Request, _ctx: unknown, authContext: AuthContext) => {
  try {
    const { user } = authContext
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId') || user.tenantId
    const status = searchParams.get('status') // 'overdue', 'all'
    const daysRange = searchParams.get('daysRange') // '1-30', '31-60', etc.
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

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

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Build base where clause for overdue loans
    const overdueWhere: Record<string, unknown> = {
      tenantId,
      status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] },
      outstandingBalance: { gt: 0 }
    }

    if (status === 'overdue') {
      overdueWhere.daysInArrears = { gt: 0 }
    }

    if (daysRange) {
      const [minDays, maxDays] = daysRange.split('-').map(Number)
      if (maxDays === undefined) {
        overdueWhere.daysInArrears = { gte: minDays }
      } else if (maxDays >= 90) {
        overdueWhere.daysInArrears = { gte: 91 }
      } else {
        overdueWhere.daysInArrears = { gte: minDays, lte: maxDays }
      }
    }

    // Fetch all data in parallel
    const [
      dueTodayResult,
      collectedTodayResult,
      totalOverdue,
      parCalculations,
      agingBucketData,
      overdueLoans,
      collectionAgents,
      totalOverdueCount
    ] = await Promise.all([
      // Due today - loans with nextPaymentDue today and still have balance
      db.loan.aggregate({
        where: {
          tenantId,
          nextPaymentDue: { gte: today, lt: tomorrow },
          outstandingBalance: { gt: 0 },
          status: { in: ['ACTIVE', 'IN_ARREARS'] }
        },
        _sum: { outstandingBalance: true },
        _count: true
      }),

      // Collected today - repayments made today
      db.repayment.aggregate({
        where: {
          tenantId,
          paymentDate: { gte: today, lt: tomorrow },
          status: 'COMPLETED'
        },
        _sum: { amount: true },
        _count: true
      }),

      // Total overdue amount
      db.loan.aggregate({
        where: {
          tenantId,
          daysInArrears: { gt: 0 },
          outstandingBalance: { gt: 0 },
          status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] }
        },
        _sum: { outstandingBalance: true },
        _count: true
      }),

      // PAR calculations (Portfolio at Risk)
      Promise.all([
        // PAR1 - Loans with 1+ days in arrears / Total outstanding portfolio
        db.loan.aggregate({
          where: { tenantId, daysInArrears: { gte: 1 }, outstandingBalance: { gt: 0 }, status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] } },
          _sum: { outstandingBalance: true }
        }),
        db.loan.aggregate({
          where: { tenantId, outstandingBalance: { gt: 0 }, status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] } },
          _sum: { outstandingBalance: true }
        }),
        // PAR7
        db.loan.aggregate({
          where: { tenantId, daysInArrears: { gte: 7 }, outstandingBalance: { gt: 0 }, status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] } },
          _sum: { outstandingBalance: true }
        }),
        // PAR30
        db.loan.aggregate({
          where: { tenantId, daysInArrears: { gte: 30 }, outstandingBalance: { gt: 0 }, status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] } },
          _sum: { outstandingBalance: true }
        }),
        // PAR90
        db.loan.aggregate({
          where: { tenantId, daysInArrears: { gte: 90 }, outstandingBalance: { gt: 0 }, status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] } },
          _sum: { outstandingBalance: true }
        })
      ]),

      // Aging bucket breakdown
      Promise.all([
        // 1-7 days
        db.loan.aggregate({
          where: { tenantId, daysInArrears: { gte: 1, lte: 7 }, outstandingBalance: { gt: 0 }, status: { in: ['ACTIVE', 'IN_ARREARS'] } },
          _sum: { outstandingBalance: true },
          _count: true
        }),
        // 8-30 days
        db.loan.aggregate({
          where: { tenantId, daysInArrears: { gte: 8, lte: 30 }, outstandingBalance: { gt: 0 }, status: { in: ['ACTIVE', 'IN_ARREARS'] } },
          _sum: { outstandingBalance: true },
          _count: true
        }),
        // 31-60 days
        db.loan.aggregate({
          where: { tenantId, daysInArrears: { gte: 31, lte: 60 }, outstandingBalance: { gt: 0 }, status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] } },
          _sum: { outstandingBalance: true },
          _count: true
        }),
        // 61-90 days
        db.loan.aggregate({
          where: { tenantId, daysInArrears: { gte: 61, lte: 90 }, outstandingBalance: { gt: 0 }, status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] } },
          _sum: { outstandingBalance: true },
          _count: true
        }),
        // 90+ days
        db.loan.aggregate({
          where: { tenantId, daysInArrears: { gte: 91 }, outstandingBalance: { gt: 0 }, status: { in: ['IN_ARREARS', 'DEFAULTED'] } },
          _sum: { outstandingBalance: true },
          _count: true
        })
      ]),

      // Paginated overdue loans list
      db.loan.findMany({
        where: overdueWhere,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { daysInArrears: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              alternativePhone: true,
              email: true
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
          }
        }
      }),

      // Collection agents (users with AGENT or MANAGER role)
      db.user.findMany({
        where: {
          tenantId,
          role: { in: ['AGENT', 'MANAGER', 'TENANT_ADMIN'] },
          isActive: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          _count: {
            select: {
              // This would need a relation to be added for assignedLoans
            }
          }
        },
        orderBy: { name: 'asc' }
      }),

      // Total count for pagination
      db.loan.count({ where: overdueWhere })
    ])

    // Calculate PAR ratios
    const totalPortfolio = parCalculations[1]._sum.outstandingBalance || 0
    const par1 = totalPortfolio > 0 ? ((parCalculations[0]._sum.outstandingBalance || 0) / totalPortfolio) * 100 : 0
    const par7 = totalPortfolio > 0 ? ((parCalculations[2]._sum.outstandingBalance || 0) / totalPortfolio) * 100 : 0
    const par30 = totalPortfolio > 0 ? ((parCalculations[3]._sum.outstandingBalance || 0) / totalPortfolio) * 100 : 0
    const par90 = totalPortfolio > 0 ? ((parCalculations[4]._sum.outstandingBalance || 0) / totalPortfolio) * 100 : 0

    // Build aging buckets array
    const agingBuckets = [
      {
        bucket: '1-7 days',
        count: agingBucketData[0]._count,
        amount: agingBucketData[0]._sum.outstandingBalance || 0,
        minDays: 1,
        maxDays: 7,
        severity: 'low' as const
      },
      {
        bucket: '8-30 days',
        count: agingBucketData[1]._count,
        amount: agingBucketData[1]._sum.outstandingBalance || 0,
        minDays: 8,
        maxDays: 30,
        severity: 'medium' as const
      },
      {
        bucket: '31-60 days',
        count: agingBucketData[2]._count,
        amount: agingBucketData[2]._sum.outstandingBalance || 0,
        minDays: 31,
        maxDays: 60,
        severity: 'high' as const
      },
      {
        bucket: '61-90 days',
        count: agingBucketData[3]._count,
        amount: agingBucketData[3]._sum.outstandingBalance || 0,
        minDays: 61,
        maxDays: 90,
        severity: 'critical' as const
      },
      {
        bucket: '90+ days',
        count: agingBucketData[4]._count,
        amount: agingBucketData[4]._sum.outstandingBalance || 0,
        minDays: 91,
        maxDays: null,
        severity: 'severe' as const
      }
    ]

    // Audit log
    await createAuditLog({
      userId: user.id,
      tenantId: user.tenantId,
      action: 'collections:dashboard_view',
      entityType: 'Collection',
      ipAddress: getClientIP(request),
      metadata: { filters: { status, daysRange }, page }
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          dueToday: {
            amount: dueTodayResult._sum.outstandingBalance || 0,
            count: dueTodayResult._count
          },
          collectedToday: {
            amount: collectedTodayResult._sum.amount || 0,
            count: collectedTodayResult._count
          },
          overdueTotal: {
            amount: totalOverdue._sum.outstandingBalance || 0,
            count: totalOverdue._count
          },
          par: {
            par1: Math.round(par1 * 100) / 100,
            par7: Math.round(par7 * 100) / 100,
            par30: Math.round(par30 * 100) / 100,
            par90: Math.round(par90 * 100) / 100
          },
          totalPortfolio
        },
        agingBuckets,
        overdueLoans,
        collectionAgents,
        pagination: {
          page,
          limit,
          total: totalOverdueCount,
          pages: Math.ceil(totalOverdueCount / limit)
        }
      }
    })
  } catch (error) {
    console.error('Error fetching collections dashboard:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch collections dashboard data' },
      { status: 500 }
    )
  }
})
