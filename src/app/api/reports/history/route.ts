import { NextRequest, NextResponse } from 'next/server'

// In-memory store for report jobs (in production, use database)
const reportJobs = new Map<string, {
  id: string
  reportId: string
  format: 'pdf' | 'excel' | 'csv'
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  requestedBy: string
  createdAt: Date
  completedAt?: Date
  estimatedCompletion: Date
  downloadUrl?: string
  error?: string
  fileSize?: number
}>()

// Initialize with some sample data for demo purposes
function initializeSampleData() {
  if (reportJobs.size === 0) {
    const now = new Date()
    
    // Add some sample completed reports
    reportJobs.set('job-sample-1', {
      id: 'job-sample-1',
      reportId: 'portfolio-overview',
      format: 'pdf',
      status: 'COMPLETED',
      requestedBy: 'user-1',
      createdAt: new Date(now.getTime() - 3600000), // 1 hour ago
      completedAt: new Date(now.getTime() - 3550000),
      estimatedCompletion: new Date(now.getTime() - 3500000),
      downloadUrl: '/api/reports/download/job-sample-1',
      fileSize: 2457600, // ~2.4MB
    })
    
    reportJobs.set('job-sample-2', {
      id: 'job-sample-2',
      reportId: 'par-analysis',
      format: 'excel',
      status: 'COMPLETED',
      requestedBy: 'user-1',
      createdAt: new Date(now.getTime() - 86400000), // 1 day ago
      completedAt: new Date(now.getTime() - 86350000),
      estimatedCompletion: new Date(now.getTime() - 86340000),
      downloadUrl: '/api/reports/download/job-sample-2',
      fileSize: 1887000, // ~1.8MB
    })
    
    reportJobs.set('job-sample-3', {
      id: 'job-sample-3',
      reportId: 'customer-segmentation',
      format: 'pdf',
      status: 'COMPLETED',
      requestedBy: 'user-1',
      createdAt: new Date(now.getTime() - 172800000), // 2 days ago
      completedAt: new Date(now.getTime() - 172750000),
      estimatedCompletion: new Date(now.getTime() - 172740000),
      downloadUrl: '/api/reports/download/job-sample-3',
      fileSize: 3100000, // ~3.1MB
    })
  }
}

// GET /api/reports/history - Get report generation history
export async function GET(request: NextRequest) {
  try {
    initializeSampleData()
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // Get all jobs sorted by creation date (newest first)
    const history = Array.from(reportJobs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
    
    return NextResponse.json({
      success: true,
      data: {
        history,
        total: history.length
      }
    })
  } catch (error) {
    console.error('Report history error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch report history' },
      { status: 500 }
    )
  }
}

// POST /api/reports/history - Create a new report job entry (used internally)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reportId, format, requestedBy } = body
    
    if (!reportId || !format) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: reportId, format' },
        { status: 400 }
      )
    }
    
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const now = new Date()
    
    const job = {
      id: jobId,
      reportId,
      format,
      status: 'QUEUED' as const,
      requestedBy: requestedBy || 'anonymous',
      createdAt: now,
      estimatedCompletion: new Date(now.getTime() + 300000) // 5 minutes from now
    }
    
    reportJobs.set(jobId, job)
    
    return NextResponse.json({
      success: true,
      data: job
    }, { status: 201 })
  } catch (error) {
    console.error('Create report job error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create report job' },
      { status: 500 }
    )
  }
}

// Export for use in other routes
export { reportJobs }
