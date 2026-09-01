import { NextRequest, NextResponse } from 'next/server'
import { reportJobs } from '../../history/route'

// GET /api/reports/job/[jobId] - Get status of a specific report job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      )
    }
    
    const job = reportJobs.get(jobId)
    
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Report job not found' },
        { status: 404 }
      )
    }
    
    // Check if job should be marked as completed (simulate processing)
    if (job.status === 'QUEUED') {
      job.status = 'PROCESSING'
      // Simulate completion after some time
      setTimeout(() => {
        job.status = 'COMPLETED'
        job.completedAt = new Date()
        job.fileSize = Math.floor(Math.random() * 3000000) + 500000
      }, 3000)
    }
    
    return NextResponse.json({
      success: true,
      data: job
    })
  } catch (error) {
    console.error('Get job status error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get job status' },
      { status: 500 }
    )
  }
}
