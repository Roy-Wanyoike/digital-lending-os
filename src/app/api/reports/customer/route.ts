import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Kenya counties for geographic distribution
const KENYA_COUNTIES = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kiambu', 
  'Machakos', 'Kakuamega', 'Nyeri', 'Meru', 'Kilifi', 'Uasin Gishu',
  'Embu', 'Tharaka Nithi', 'Murang\'a', 'Bungoma', 'Trans Nzoia',
  'Kisii', 'Nyamira', 'Vihiga', 'Bomet', 'Kericho', 'Nandi', 'Laikipia'
]

function generateAcquisitionData(months: number) {
  const data = []
  const now = new Date()
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setMonth(date.getMonth() - i)
    const baseCustomers = 150 + Math.floor(Math.random() * 100)
    const acquisitionCost = baseCustomers * (350 + Math.random() * 200)
    
    data.push({
      month: date.toISOString().slice(0, 7),
      newCustomers: baseCustomers,
      acquisitionCost: Math.round(acquisitionCost)
    })
  }
  
  return data
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId') || 'default-tenant'

    // Try to get real customer data
    let customers: any[] = []
    let totalCustomers = 0

    try {
      customers = await db.customer.findMany({
        where: { tenantId },
        select: {
          id: true,
          riskLevel: true,
          totalBorrowed: true,
          createdAt: true,
          county: true,
          status: true,
          loans: { select: { id: true } }
        }
      })

      totalCustomers = customers.length
    } catch (dbError) {
      console.log('Using mock data for customer report')
    }

    const hasRealData = customers.length > 0

    // Calculate date ranges
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Customer Overview
    const overview = {
      totalCustomers: hasRealData ? totalCustomers : 12458,
      newCustomersThisMonth: hasRealData
        ? customers.filter(c => new Date(c.createdAt) >= startOfMonth).length
        : 187,
      activeBorrowers: hasRealData
        ? customers.filter(c => c.loans && c.loans.length > 0).length
        : 3847,
      repeatBorrowerRate: 42.3, // % of customers with 2+ loans
      churnRate: 8.7, // Monthly churn rate
      retentionRate: 91.3, // Customer retention rate
      periodOverPeriodChange: {
        totalCustomers: { value: 15.2, direction: 'up' as const },
        newCustomersThisMonth: { value: 12.8, direction: 'up' as const },
        activeBorrowers: { value: 9.4, direction: 'up' as const }
      }
    }

    // Acquisition Trends (12 months)
    const acquisition = generateAcquisitionData(12)

    // Segmentation Data
    const segmentation = {
      byRiskLevel: hasRealData ? (() => {
        const riskCounts: Record<string, number> = {}
        customers.forEach(c => {
          riskCounts[c.riskLevel] = (riskCounts[c.riskLevel] || 0) + 1
        })
        return Object.entries(riskCounts).map(([segment, count]) => ({
          segment,
          count,
          percentage: Math.round((count / totalCustomers) * 1000) / 10
        }))
      })() : [
        { segment: 'Low', count: 3421, percentage: 27.5 },
        { segment: 'Medium', count: 5234, percentage: 42.0 },
        { segment: 'High', count: 2867, percentage: 23.0 },
        { segment: 'Very High', count: 936, percentage: 7.5 }
      ],
      
      byLoanCount: [
        { segment: 'First-time', count: 5189, description: '1 loan' },
        { segment: 'Repeat', count: 4234, description: '2-3 loans' },
        { segment: 'Frequent', count: 2134, description: '4-6 loans' },
        { segment: 'VIP', count: 901, description: '7+ loans' }
      ],
      
      byValue: [
        { segment: 'Low Value (<10K)', count: 5678, totalVolume: 42000000 },
        { segment: 'Medium Value (10K-50K)', count: 4823, totalVolume: 156000000 },
        { segment: 'High Value (50K+)', count: 1957, totalVolume: 198000000 }
      ]
    }

    // Behavior Metrics
    const behavior = {
      averageLoansPerCustomer: 2.34,
      averageLifetimeValue: 48500, // Total revenue per customer
      averageLoanSize: 20750,
      churnRate: 8.7,
      retentionRate: 91.3,
      averageCustomerAgeMonths: 14.2,
      repeatPurchaseCycleDays: 45 // Average days between loans
    }

    // Geographic Distribution (Kenya Counties)
    const geography = KENYA_COUNTIES.slice(0, 15).map(county => ({
      county,
      customerCount: Math.floor(100 + Math.random() * 2500),
      loanVolume: Math.round((500000 + Math.random() * 15000000))
    })).sort((a, b) => b.customerCount - a.customerCount)

    // Cohort Retention Analysis
    const cohortRetention = [
      { cohort: 'Jan 2026', acquired: 187, retainedM1: 165, retainedM3: 142, retainedM6: 118 },
      { cohort: 'Dec 2025', acquired: 172, retainedM1: 153, retainedM3: 134, retainedM6: null },
      { cohort: 'Nov 2025', acquired: 158, retainedM1: 141, retainedM3: 121, retainedM6: null },
      { cohort: 'Oct 2025', acquired: 164, retainedM1: 148, retainedM3: 128, retainedM6: 105 },
      { cohort: 'Sep 2025', acquired: 149, retainedM1: 135, retainedM3: 117, retainedM6: 98 }
    ]

    // Customer Lifetime Value Distribution
    const clvDistribution = [
      { range: '0 - 10K', count: 2847, percentage: 22.9 },
      { range: '10K - 25K', count: 3521, percentage: 28.3 },
      { range: '25K - 50K', count: 3234, percentage: 26.0 },
      { range: '50K - 100K', count: 1892, percentage: 15.2 },
      { range: '100K+', count: 964, percentage: 7.7 }
    ]

    // Acquisition Channels
    const acquisitionChannels = [
      { channel: 'Mobile App', customers: 4521, costPerAcquisition: 280, conversionRate: 24.5 },
      { channel: 'USSD', customers: 3234, costPerAcquisition: 45, conversionRate: 32.1 },
      { channel: 'Web Portal', customers: 2187, costPerAcquisition: 320, conversionRate: 18.7 },
      { channel: 'Agent Referral', customers: 1567, costPerAcquisition: 500, conversionRate: 45.2 },
      { channel: 'Walk-in', customers: 949, costPerAcquisition: 150, conversionRate: 67.8 }
    ]

    return NextResponse.json({
      success: true,
      data: {
        overview,
        acquisition,
        segmentation,
        behavior,
        geography,
        cohortRetention,
        clvDistribution,
        acquisitionChannels,
        metadata: {
          generatedAt: new Date().toISOString(),
          tenantId,
          dataSource: hasRealData ? 'database' : 'demo'
        }
      }
    })
  } catch (error) {
    console.error('Customer report error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate customer report' },
      { status: 500 }
    )
  }
}
