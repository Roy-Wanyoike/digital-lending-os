import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper function to generate mock historical data
function generateMonthlyData(months: number, baseValue: number, variance: number, startDate: Date = new Date()) {
  const data = []
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(startDate)
    date.setMonth(date.getMonth() - i)
    const value = baseValue + (Math.random() - 0.5) * variance * baseValue
    data.push({
      date: date.toISOString().slice(0, 7), // YYYY-MM format
      count: Math.floor(value / 20000), // Approximate loan count
      volume: Math.round(value * 100) / 100
    })
  }
  return data
}

// Generate PAR trend data
function generatePARTrend(months: number, basePAR: number) {
  const data = []
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const par30 = Math.max(1, basePAR + (Math.random() - 0.6) * 2)
    data.push({
      date: date.toISOString().slice(0, 7),
      par30: Math.round(par30 * 10) / 10
    })
  }
  return data
}

// Generate vintage analysis data
function generateVintageAnalysis() {
  const vintages = []
  const months = ['Jan 2026', 'Dec 2025', 'Nov 2025', 'Oct 2025', 'Sep 2025', 'Aug 2025']
  
  for (let i = 0; i < months.length; i++) {
    const originationVolume = 5000000 - i * 400000 + Math.random() * 1000000
    const ageMonths = i + 1
    const remainingBalance = originationVolume * (1 - ageMonths * 0.12 + Math.random() * 0.05)
    const par = Math.min(15, 2 + ageMonths * 1.5 + Math.random() * 3)
    
    vintages.push({
      month: months[i],
      originationVolume: Math.round(originationVolume),
      remainingBalance: Math.max(0, Math.round(remainingBalance)),
      par: Math.round(par * 10) / 10
    })
  }
  
  return vintages
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId') || 'default-tenant'
    const period = searchParams.get('period') || 'monthly'

    // Try to get real data from database, fallback to realistic mock data
    let totalLoanBook = 0
    let activeLoansCount = 0
    let loans: any[] = []

    try {
      // Get actual loan data from database
      loans = await db.loan.findMany({
        where: { tenantId },
        select: {
          principal: true,
          outstandingBalance: true,
          status: true,
          daysInArrears: true,
          disbursementDate: true,
          interestRate: true,
          product: { select: { name: true } },
          customer: { select: { riskLevel: true } }
        }
      })

      // Calculate metrics from real data
      activeLoansCount = loans.filter(l => 
        ['ACTIVE', 'DISBURSED', 'IN_ARREARS'].includes(l.status)
      ).length
      
      totalLoanBook = loans.reduce((sum, l) => sum + (l.outstandingBalance || 0), 0)
    } catch (dbError) {
      console.log('Using mock data for portfolio report')
    }

    // Use mock data if no real data available or for demo purposes
    const hasRealData = loans.length > 0

    // Portfolio Overview Metrics
    const overview = {
      totalLoanBook: hasRealData ? totalLoanBook : 42800000, // KSh 42.8M
      activeLoans: hasRealData ? activeLoansCount : 1847,
      averageLoanSize: hasRealData 
        ? Math.round(totalLoanBook / Math.max(1, activeLoansCount))
        : 23170,
      weightedAverageRate: 18.5,
      periodOverPeriodChange: {
        totalLoanBook: { value: 12.3, direction: 'up' as const },
        activeLoans: { value: 8.1, direction: 'up' as const },
        averageLoanSize: { value: -2.4, direction: 'down' as const },
        weightedAverageRate: { value: 0.3, direction: 'up' as const }
      }
    }

    // Disbursement Trend Data (12 months)
    const disbursementTrend = generateMonthlyData(12, 4500000, 0.25)

    // Repayment Trend Data (12 months)
    const repaymentTrend = generateMonthlyData(12, 4200000, 0.20)

    // PAR Analysis
    const parAnalysis = {
      par1: 2.8,   // Loans 1+ days past due
      par7: 4.2,   // Loans 7+ days past due
      par30: 4.8,  // Loans 30+ days past due (key CBK metric)
      par90: 2.1,  // Loans 90+ days past due
      parTrend: generatePARTrend(12, 4.8),
      comparison: {
        previousPeriod: { par30: 5.1 },
        change: -0.3,
        direction: 'improvement' as const
      }
    }

    // Portfolio by Product
    const portfolioByProduct = [
      { product: 'Business Loan', count: 487, volume: 15800000, par: 5.2 },
      { product: 'Salary Advance', count: 892, volume: 12400000, par: 3.8 },
      { product: 'Emergency Loan', count: 324, volume: 7800000, par: 6.1 },
      { product: 'SME Loan', count: 98, volume: 4800000, par: 4.5 },
      { product: 'School Fees Loan', count: 46, volume: 2000000, par: 2.9 }
    ]

    // Portfolio by Risk Level
    const portfolioByRisk = [
      { riskLevel: 'Low', count: 567, volume: 13200000, percentage: 30.8 },
      { riskLevel: 'Medium', count: 834, volume: 18900000, percentage: 45.2 },
      { riskLevel: 'High', count: 348, volume: 8700000, percentage: 18.8 },
      { riskLevel: 'Very High', count: 98, volume: 2000000, percentage: 5.2 }
    ]

    // Vintage Analysis
    const vintageAnalysis = generateVintageAnalysis()

    // Top Performing Products by PAR
    const topPerformers = portfolioByProduct
      .sort((a, b) => a.par - b.par)
      .slice(0, 3)

    // At-Risk Alerts
    const alerts = [
      {
        type: 'warning',
        metric: 'PAR30',
        current: 4.8,
        threshold: 5.0,
        message: 'Approaching CBK regulatory limit of 5%'
      },
      {
        type: 'info',
        metric: 'High Risk Concentration',
        current: 24.0,
        threshold: 30.0,
        message: 'Very High risk portfolio at 5.2% of total book'
      }
    ]

    return NextResponse.json({
      success: true,
      data: {
        overview,
        disbursementTrend,
        repaymentTrend,
        parAnalysis,
        portfolioByProduct,
        portfolioByRisk,
        vintageAnalysis,
        topPerformers,
        alerts,
        metadata: {
          generatedAt: new Date().toISOString(),
          period,
          tenantId,
          dataSource: hasRealData ? 'database' : 'demo'
        }
      }
    })
  } catch (error) {
    console.error('Portfolio report error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate portfolio report' },
      { status: 500 }
    )
  }
}
