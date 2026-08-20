import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/dashboard/stats - Get aggregated dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId query parameter is required' },
        { status: 400 }
      )
    }

    // Check if tenant exists
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Run all aggregation queries in parallel
    const [
      totalLoansCount,
      activeLoansCount,
      loansInArrears,
      defaultedLoans,
      fullyPaidLoans,
      loanBookAggregations,
      applicationsByStatus,
      customersCount,
      newCustomersThisMonth,
      collectionsToday,
      collectionsThisMonth,
      productsCount,
      recentDisbursements
    ] = await Promise.all([
      // Total loans count
      db.loan.count({ where: { tenantId } }),
      
      // Active loans count
      db.loan.count({ 
        where: { tenantId, status: { in: ['ACTIVE', 'DISBURSED', 'PENDING_DISBURSEMENT'] } }
      }),
      
      // Loans in arrears (PAR30+)
      db.loan.count({
        where: {
          tenantId,
          daysInArrears: { gt: 30 },
          status: { in: ['ACTIVE', 'IN_ARREARS'] }
        }
      }),
      
      // Defaulted loans
      db.loan.count({ where: { tenantId, status: 'DEFAULTED' } }),
      
      // Fully paid loans
      db.loan.count({ where: { tenantId, status: 'FULLY_PAID' } }),
      
      // Loan book aggregations (principal, outstanding balance)
      db.loan.aggregate({
        where: { tenantId, status: { in: ['ACTIVE', 'DISBURSED', 'IN_ARREARS', 'PENDING_DISBURSEMENT'] } },
        _sum: {
          principal: true,
          approvedAmount: true,
          outstandingBalance: true,
          totalInterest: true,
          totalRepayable: true
        }
      }),
      
      // Applications by status
      db.loanApplication.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true
      }),
      
      // Customer counts
      db.customer.count({ where: { tenantId, status: 'ACTIVE' } }),
      
      // New customers this month
      db.customer.count({
        where: {
          tenantId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      
      // Collections today
      db.repayment.aggregate({
        where: {
          tenantId,
          paymentDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999))
          },
          status: 'COMPLETED'
        },
        _sum: { amount: true },
        _count: true
      }),
      
      // Collections this month
      db.repayment.aggregate({
        where: {
          tenantId,
          paymentDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          },
          status: 'COMPLETED'
        },
        _sum: { amount: true },
        _count: true
      }),
      
      // Active products count
      db.loanProduct.count({ where: { tenantId, isActive: true } }),
      
      // Recent disbursements (last 7 days)
      db.loan.aggregate({
        where: {
          tenantId,
          disbursementDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          },
          status: { in: ['DISBURSED', 'ACTIVE'] }
        },
        _sum: { approvedAmount: true },
        _count: true
      })
    ])

    // Calculate PAR30 ratio
    const activeAndArrears = activeLoansCount + loansInArrears
    const par30Ratio = activeAndArrears > 0 ? (loansInArrears / activeAndArrears) * 100 : 0

    // Format application statuses
    const applicationStats = {}
    for (const app of applicationsByStatus) {
      applicationStats[app.status] = app._count
    }

    // Get portfolio distribution by product category
    const portfolioByCategory = await db.loan.groupBy({
      by: ['productId'],
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'DISBURSED', 'IN_ARREARS'] }
      },
      _sum: { principal: true, outstandingBalance: true },
      _count: true
    })

    // Build response
    const stats = {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        status: tenant.status
      },
      overview: {
        totalLoanBook: loanBookAggregations._sum.principal || 0,
        totalOutstandingBalance: loanBookAggregations._sum.outstandingBalance || 0,
        totalRepayable: loanBookAggregations._sum.totalRepayable || 0,
        totalInterestAccrued: loanBookAggregations._sum.totalInterest || 0
      },
      loans: {
        totalCount: totalLoansCount,
        activeCount: activeLoansCount,
        inArrearsCount: loansInArrears,
        defaultedCount: defaultedLoans,
        fullyPaidCount: fullyPaidLoans,
        par30Ratio: Math.round(par30Ratio * 100) / 100
      },
      applications: {
        ...applicationStats,
        pendingReview: (applicationStats['DRAFT'] || 0) + (applicationStats['SUBMITTED'] || 0),
        underReview: applicationStats['UNDER_REVIEW'] || 0,
        approved: applicationStats['APPROVED'] || 0,
        rejected: applicationStats['REJECTED'] || 0
      },
      customers: {
        totalCount: customersCount,
        newThisMonth: newCustomersThisMonth
      },
      collections: {
        today: {
          amount: collectionsToday._sum.amount || 0,
          count: collectionsToday._count
        },
        thisMonth: {
          amount: collectionsThisMonth._sum.amount || 0,
          count: collectionsThisMonth._count
        }
      },
      products: {
        activeCount: productsCount
      },
      disbursements: {
        last7Days: {
          amount: recentDisbursements._sum.approvedAmount || 0,
          count: recentDisbursements._count
        }
      },
      calculatedAt: new Date()
    }

    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
}
