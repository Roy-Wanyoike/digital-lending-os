import { NextRequest, NextResponse } from 'next/server'

// In-memory store for report generation jobs (in production, use Redis or database)
const reportJobs = new Map<string, {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  type: string
  format: string
  createdAt: Date
  completedAt?: Date
  result?: any
  error?: string
  downloadUrl?: string
}>()

// Simulate async report generation
async function generateReport(jobId: string, config: any) {
  const job = reportJobs.get(jobId)
  if (!job) return

  job.status = 'processing'
  
  // Simulate processing time based on format and complexity
  const processingTime = config.format === 'pdf' ? 5000 : config.format === 'csv' ? 2000 : 1000
  
  setTimeout(() => {
    try {
      // Generate mock report data based on type
      let reportData: any
      
      switch (config.type) {
        case 'portfolio':
          reportData = generatePortfolioReport(config)
          break
        case 'customer':
          reportData = generateCustomerReport(config)
          break
        case 'financial':
          reportData = generateFinancialReport(config)
          break
        case 'operational':
          reportData = generateOperationalReport(config)
          break
        case 'custom':
          reportData = generateCustomReport(config)
          break
        default:
          throw new Error(`Unknown report type: ${config.type}`)
      }

      job.status = 'completed'
      job.completedAt = new Date()
      job.result = reportData
      job.downloadUrl = `/api/reports/generate/${jobId}/download`
    } catch (error: any) {
      job.status = 'failed'
      job.error = error.message
    }
  }, processingTime)
}

function generatePortfolioReport(config: any) {
  return {
    title: 'Portfolio Report',
    generatedAt: new Date().toISOString(),
    period: config.dateRange,
    summary: {
      totalLoanBook: 42800000,
      activeLoans: 1847,
      par30: 4.8,
      averageLoanSize: 23170
    },
    data: [
      { date: '2026-01', disbursements: 4200000, repayments: 3980000, par30: 4.5 },
      { date: '2026-02', disbursements: 4800000, repayments: 4520000, par30: 4.7 },
      { date: '2026-03', disbursements: 5100000, repayments: 4850000, par30: 4.8 }
    ]
  }
}

function generateCustomerReport(config: any) {
  return {
    title: 'Customer Analytics Report',
    generatedAt: new Date().toISOString(),
    period: config.dateRange,
    summary: {
      totalCustomers: 12458,
      newCustomers: 187,
      activeBorrowers: 3847,
      retentionRate: 91.3
    },
    data: []
  }
}

function generateFinancialReport(config: any) {
  return {
    title: 'Financial Report',
    generatedAt: new Date().toISOString(),
    period: config.dateRange,
    currency: 'KES',
    summary: {
      totalRevenue: 7601000,
      totalExpenses: 5660000,
      netProfit: 1941000,
      margin: 25.5
    },
    incomeStatement: [],
    data: []
  }
}

function generateOperationalReport(config: any) {
  return {
    title: 'Operational Metrics Report',
    generatedAt: new Date().toISOString(),
    period: config.dateRange,
    summary: {
      applicationsReceived: 2847,
      approvalRate: 67.5,
      kycApprovalRate: 91.9,
      paymentSuccessRate: 96.8
    },
    data: []
  }
}

function generateCustomReport(config: any) {
  return {
    title: 'Custom Report',
    generatedAt: new Date().toISOString(),
    period: config.dateRange,
    filters: config.filters,
    columns: config.columns || ['All Fields'],
    data: Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      field1: `Sample Data ${i + 1}`,
      field2: Math.round(Math.random() * 10000),
      field3: ['A', 'B', 'C'][i % 3]
    }))
  }
}

// POST - Create a new report generation job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { 
      type, 
      dateRange, 
      format = 'json',
      filters = {},
      columns,
      name,
      schedule 
    } = body

    // Validate required fields
    if (!type || !dateRange || !dateRange.start || !dateRange.end) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, dateRange (start, end)' },
        { status: 400 }
      )
    }

    // Validate report type
    const validTypes = ['portfolio', 'customer', 'financial', 'operational', 'custom']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid report type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate format
    const validFormats = ['json', 'csv', 'pdf']
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { success: false, error: `Invalid format. Must be one of: ${validFormats.join(', ')}` },
        { status: 400 }
      )
    }

    // Generate unique job ID
    const jobId = `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create job entry
    const job = {
      id: jobId,
      status: 'pending' as const,
      type,
      format,
      createdAt: new Date(),
      config: { dateRange, filters, columns, name, schedule }
    }

    reportJobs.set(jobId, job)

    // Start async generation
    generateReport(jobId, { type, dateRange, format, filters, columns })

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        status: 'pending',
        message: 'Report generation started',
        pollUrl: `/api/reports/generate?jobId=${jobId}`,
        estimatedTime: format === 'pdf' ? '5-10 seconds' : format === 'csv' ? '2-3 seconds' : '< 1 second'
      }
    })
  } catch (error) {
    console.error('Generate report error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create report generation job' },
      { status: 500 }
    )
  }
}

// GET - Check job status and retrieve results
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      // Return list of recent jobs for this session
      const recentJobs = Array.from(reportJobs.values())
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 20)
        .map(({ config, ...rest }) => rest)

      return NextResponse.json({
        success: true,
        data: { jobs: recentJobs }
      })
    }

    const job = reportJobs.get(jobId)

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    // If completed, include the result
    const response: any = {
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        type: job.type,
        format: job.format,
        createdAt: job.createdAt,
        completedAt: job.completedAt
      }
    }

    if (job.status === 'completed') {
      response.data.result = job.result
      response.data.downloadUrl = job.downloadUrl
    }

    if (job.status === 'failed') {
      response.data.error = job.error
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get report status error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get report status' },
      { status: 500 }
    )
  }
}
