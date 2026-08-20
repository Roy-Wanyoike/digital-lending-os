import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper to get start of today
function getStartOfDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// Helper to get end of today
function getEndOfDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

// Helper to get start of current month
function getStartOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

// GET /api/dashboard/stats - Get dashboard statistics
// - No tenantId (or "platform"/"superadmin"): Returns platform-wide aggregated stats
// - With tenantId: Returns tenant-specific stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    // Check if this is a platform-wide request
    const isPlatformWide = !tenantId || tenantId === 'platform' || tenantId === 'superadmin'

    if (isPlatformWide) {
      return await getPlatformStats()
    }

    // Tenant-specific stats
    return await getTenantStats(tenantId)
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
}

// ============================================
// PLATFORM-WIDE STATISTICS (Super Admin View)
// ============================================
async function getPlatformStats() {
  // Get all tenants for reference
  const allTenants = await db.tenant.findMany({
    select: { id: true, name: true, slug: true, plan: true, status: true, createdAt: true }
  })
  
  const tenantIds = allTenants.map(t => t.id)
  const now = new Date()
  const todayStart = getStartOfDay(now)
  const todayEnd = getEndOfDay(now)
  const monthStart = getStartOfMonth(now)

  // Run all aggregation queries in parallel for platform-wide data
  const [
    totalCustomers,
    totalLoans,
    loanBookAggregation,
    activeLoans,
    loansInArrears,
    fullyPaidLoans,
    defaultedLoans,
    par30Loans,
    collectionsTodayAgg,
    collectionsThisMonthAgg,
    pendingApplications,
    approvedTodayApps,
    rejectedTodayApps,
    disbursedThisMonthAgg,
    planDistribution,
    statusDistribution,
    loanStatusDistribution,
    topTenantsByVolumeRaw,
    recentActivityRaw
  ] = await Promise.all([
    // Total customers across all tenants
    db.customer.count({
      where: { 
        tenantId: { in: tenantIds },
        status: 'ACTIVE'
      }
    }),
    
    // Total loans across all tenants
    db.loan.count({
      where: { tenantId: { in: tenantIds } }
    }),
    
    // Total loan book value (sum of principal)
    db.loan.aggregate({
      where: { 
        tenantId: { in: tenantIds },
        status: { in: ['ACTIVE', 'DISBURSED', 'IN_ARREARS', 'PENDING_DISBURSEMENT'] }
      },
      _sum: { principal: true, outstandingBalance: true, approvedAmount: true }
    }),
    
    // Active loans count
    db.loan.count({
      where: {
        tenantId: { in: tenantIds },
        status: { in: ['ACTIVE', 'DISBURSED', 'PENDING_DISBURSEMENT'] }
      }
    }),
    
    // Loans in arrears
    db.loan.count({
      where: {
        tenantId: { in: tenantIds },
        status: { in: ['ACTIVE', 'IN_ARREARS'] },
        daysInArrears: { gt: 0 }
      }
    }),
    
    // Fully paid loans
    db.loan.count({
      where: {
        tenantId: { in: tenantIds },
        status: 'FULLY_PAID'
      }
    }),
    
    // Defaulted loans
    db.loan.count({
      where: {
        tenantId: { in: tenantIds },
        status: 'DEFAULTED'
      }
    }),
    
    // PAR30+ loans (more than 30 days in arrears)
    db.loan.count({
      where: {
        tenantId: { in: tenantIds },
        daysInArrears: { gt: 30 },
        status: { in: ['ACTIVE', 'IN_ARREARS'] }
      }
    }),
    
    // Collections today
    db.repayment.aggregate({
      where: {
        tenantId: { in: tenantIds },
        paymentDate: { gte: todayStart, lte: todayEnd },
        status: 'COMPLETED'
      },
      _sum: { amount: true },
      _count: true
    }),
    
    // Collections this month
    db.repayment.aggregate({
      where: {
        tenantId: { in: tenantIds },
        paymentDate: { gte: monthStart },
        status: 'COMPLETED'
      },
      _sum: { amount: true },
      _count: true
    }),
    
    // Pending applications (DRAFT + SUBMITTED + UNDER_REVIEW)
    db.loanApplication.count({
      where: {
        tenantId: { in: tenantIds },
        status: { in: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'] }
      }
    }),
    
    // Applications approved today
    db.loanApplication.count({
      where: {
        tenantId: { in: tenantIds },
        status: 'APPROVED',
        approvedAt: { gte: todayStart, lte: todayEnd }
      }
    }),
    
    // Applications rejected today
    db.loanApplication.count({
      where: {
        tenantId: { in: tenantIds },
        status: 'REJECTED',
        rejectedAt: { gte: todayStart, lte: todayEnd }
      }
    }),
    
    // Disbursed this month
    db.loan.aggregate({
      where: {
        tenantId: { in: tenantIds },
        disbursementDate: { gte: monthStart },
        status: { in: ['DISBURSED', 'ACTIVE'] }
      },
      _sum: { approvedAmount: true },
      _count: true
    }),
    
    // Plan distribution
    db.tenant.groupBy({
      by: ['plan'],
      _count: true
    }),
    
    // Status distribution
    db.tenant.groupBy({
      by: ['status'],
      _count: true
    }),
    
    // Loan status distribution
    db.loan.groupBy({
      by: ['status'],
      where: { tenantId: { in: tenantIds } },
      _count: true
    }),
    
    // Top tenants by loan volume (for topTenantsByVolume)
    db.loan.groupBy({
      by: ['tenantId'],
      where: { 
        tenantId: { in: tenantIds },
        status: { in: ['ACTIVE', 'DISBURSED', 'IN_ARREARS'] }
      },
      _sum: { principal: true, outstandingBalance: true },
      _count: true,
      orderBy: { _sum: { principal: 'desc' } },
      take: 10
    }),
    
    // Recent activity (recent loans and applications)
    Promise.all([
      // Recent disbursements
      db.loan.findMany({
        where: { tenantId: { in: tenantIds } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          loanNumber: true,
          principal: true,
          status: true,
          createdAt: true,
          tenantId: true,
          customer: { select: { firstName: true, lastName: true } }
        }
      }),
      // Recent applications
      db.loanApplication.findMany({
        where: { tenantId: { in: tenantIds } },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          requestedAmount: true,
          status: true,
          createdAt: true,
          tenantId: true,
          customer: { select: { firstName: true, lastName: true } }
        }
      })
    ])
  ])

  // Calculate derived metrics
  const activeTenants = allTenants.filter(t => t.status === 'ACTIVE').length
  const totalTenants = allTenants.length
  
  // Calculate PAR30 ratio safely
  const totalActiveAndInArrears = activeLoans + loansInArrears
  const par30Ratio = totalActiveAndInArrears > 0 ? (par30Loans / totalActiveAndInArrears) * 100 : 0

  // Build plan distribution object
  const planDist: Record<string, number> = {}
  for (const p of planDistribution) {
    planDist[p.plan] = p._count
  }

  // Build status distribution object
  const statusDist: Record<string, number> = {}
  for (const s of statusDistribution) {
    statusDist[s.status] = s._count
  }

  // Build loan status distribution object
  const loanStatusDist: Record<string, number> = {}
  for (const ls of loanStatusDistribution) {
    loanStatusDist[ls.status] = ls._count
  }

  // Build top tenants by volume with names
  const topTenantsByVolume = topTenantsByVolumeRaw.map(t => {
    const tenant = allTenants.find(tn => tn.id === t.tenantId)
    return {
      tenantId: t.tenantId,
      tenantName: tenant?.name || 'Unknown',
      tenantSlug: tenant?.slug || 'unknown',
      loanCount: t._count,
      totalPrincipal: t._sum.principal || 0,
      outstandingBalance: t._sum.outstandingBalance || 0
    }
  })

  // Build recent activity array
  const [recentLoans, recentApplications] = recentActivityRaw
  const recentActivity = [
    ...recentLoans.map(loan => ({
      type: 'LOAN_DISBURSED' as const,
      description: `Loan ${loan.loanNumber} disbursed to ${loan.customer?.firstName} ${loan.customer?.lastName}`,
      amount: loan.principal,
      tenantId: loan.tenantId,
      timestamp: loan.createdAt
    })),
    ...recentApplications.map(app => ({
      type: 'APPLICATION_' + app.status as const,
      description: `Loan application ${app.status.toLowerCase().replace('_', ' ')} - ${app.customer?.firstName} ${app.customer?.lastName}`,
      amount: app.requestedAmount,
      tenantId: app.tenantId,
      timestamp: app.createdAt
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10)

  // Build platform-wide response
  const stats = {
    platform: {
      totalTenants,
      activeTenants,
      trialTenants: statusDist['TRIAL'] || 0,
      suspendedTenants: statusDist['SUSPENDED'] || 0
    },
    overview: {
      totalCustomers,
      totalLoans,
      totalLoanBook: loanBookAggregation._sum.principal || 0,
      totalOutstandingBalance: loanBookAggregation._sum.outstandingBalance || 0,
      activeLoans,
      par30: par30Loans,
      par30Ratio: Math.round(par30Ratio * 100) / 100
    },
    collections: {
      today: {
        amount: collectionsTodayAgg._sum.amount || 0,
        count: collectionsTodayAgg._count
      },
      thisMonth: {
        amount: collectionsThisMonthAgg._sum.amount || 0,
        count: collectionsThisMonthAgg._count
      }
    },
    applications: {
      pending: pendingApplications,
      approvedToday: approvedTodayApps,
      rejectedToday: rejectedTodayApps
    },
    disbursements: {
      thisMonth: {
        amount: disbursedThisMonthAgg._sum.approvedAmount || 0,
        count: disbursedThisMonthAgg._count
      }
    },
    planDistribution: planDist,
    statusDistribution: statusDist,
    loanStatusDistribution: loanStatusDist,
    topTenantsByVolume,
    recentActivity,
    calculatedAt: new Date()
  }

  return NextResponse.json({ success: true, data: stats })
}

// ============================================
// TENANT-SPECIFIC STATISTICS
// ============================================
async function getTenantStats(tenantId: string) {
  // Check if tenant exists
  const tenant = await db.tenant.findUnique({ 
    where: { id: tenantId },
    select: { id: true, name: true, slug: true, plan: true, status: true }
  })
  
  if (!tenant) {
    return NextResponse.json(
      { success: false, error: 'Tenant not found' },
      { status: 404 }
    )
  }

  const now = new Date()
  const todayStart = getStartOfDay(now)
  const todayEnd = getEndOfDay(now)
  const monthStart = getStartOfMonth(now)

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
    recentDisbursements,
    pendingApplicationsCount,
    approvedTodayCount,
    rejectedTodayCount,
    recentLoans,
    repaymentPerformance
  ] = await Promise.all([
    // Total loans count
    db.loan.count({ where: { tenantId } }),
    
    // Active loans count
    db.loan.count({ 
      where: { tenantId, status: { in: ['ACTIVE', 'DISBURSED', 'PENDING_DISBURSEMENT'] } }
    }),
    
    // Loans in arrears (any arrears)
    db.loan.count({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'IN_ARREARS'] },
        daysInArrears: { gt: 0 }
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
        createdAt: { gte: monthStart }
      }
    }),
    
    // Collections today
    db.repayment.aggregate({
      where: {
        tenantId,
        paymentDate: { gte: todayStart, lte: todayEnd },
        status: 'COMPLETED'
      },
      _sum: { amount: true },
      _count: true
    }),
    
    // Collections this month
    db.repayment.aggregate({
      where: {
        tenantId,
        paymentDate: { gte: monthStart },
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
    }),

    // Pending applications count
    db.loanApplication.count({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'] }
      }
    }),

    // Approved today
    db.loanApplication.count({
      where: {
        tenantId,
        status: 'APPROVED',
        approvedAt: { gte: todayStart, lte: todayEnd }
      }
    }),

    // Rejected today
    db.loanApplication.count({
      where: {
        tenantId,
        status: 'REJECTED',
        rejectedAt: { gte: todayStart, lte: todayEnd }
      }
    }),

    // Recent loans list (last 10)
    db.loan.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        loanNumber: true,
        principal: true,
        approvedAmount: true,
        outstandingBalance: true,
        status: true,
        disbursementDate: true,
        createdAt: true,
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true }
        }
      }
    }),

    // Repayment performance metrics
    Promise.all([
      // Completed repayments this month
      db.repayment.aggregate({
        where: {
          tenantId,
          paymentDate: { gte: monthStart },
          status: 'COMPLETED'
        },
        _count: true,
        _sum: { amount: true }
      }),
      // Pending/overdue repayments this month
      db.repayment.aggregate({
        where: {
          tenantId,
          dueDate: { gte: monthStart },
          status: { in: ['PENDING'] }
        },
        _count: true,
        _sum: { amount: true }
      })
    ])
  ])

  // Calculate PAR30 ratio safely
  const activeAndArrears = activeLoansCount + loansInArrears
  const par30Ratio = activeAndArrears > 0 ? (loansInArrears / activeAndArrears) * 100 : 0

  // Also calculate specific PAR30 (30+ days)
  const par30Count = await db.loan.count({
    where: {
      tenantId,
      daysInArrears: { gt: 30 },
      status: { in: ['ACTIVE', 'IN_ARREARS'] }
    }
  })

  // Format application statuses
  const applicationStats: Record<string, number> = {}
  for (const app of applicationsByStatus) {
    applicationStats[app.status] = app._count
  }

  // Repayment performance
  const [completedRepayments, pendingRepayments] = repaymentPerformance
  const totalRepayments = completedRepayments._count + pendingRepayments._count
  const repaymentRate = totalRepayments > 0 
    ? Math.round((completedRepayments._count / totalRepayments) * 10000) / 100 
    : 0

  // Build tenant-specific response
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
      par30: par30Count,
      par30Ratio: Math.round(par30Ratio * 100) / 100,
      defaultedCount: defaultedLoans,
      fullyPaidCount: fullyPaidLoans
    },
    customers: {
      totalCount: customersCount,
      newThisMonth: newCustomersThisMonth
    },
    applications: {
      ...applicationStats,
      pending: pendingApplicationsCount,
      pendingReview: (applicationStats['DRAFT'] || 0) + (applicationStats['SUBMITTED'] || 0),
      underReview: applicationStats['UNDER_REVIEW'] || 0,
      approved: applicationStats['APPROVED'] || 0,
      approvedToday: approvedTodayCount,
      rejected: applicationStats['REJECTED'] || 0,
      rejectedToday: rejectedTodayCount
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
    repaymentPerformance: {
      completedThisMonth: completedRepayments._count,
      completedAmount: completedRepayments._sum.amount || 0,
      pendingCount: pendingRepayments._count,
      pendingAmount: pendingRepayments._sum.amount || 0,
      repaymentRate
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
    recentLoans,
    calculatedAt: new Date()
  }

  return NextResponse.json({ success: true, data: stats })
}
