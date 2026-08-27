import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/customer/applications - Submit a new loan application
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { personalInfo, employmentInfo, loanRequest, documents } = body

    // Validate required fields
    if (!personalInfo?.firstName || !personalInfo?.lastName || !personalInfo?.phone) {
      return NextResponse.json(
        { error: 'Missing required personal information' },
        { status: 400 }
      )
    }

    if (!loanRequest?.amount || !loanRequest?.termDays) {
      return NextResponse.json(
        { error: 'Missing required loan request details' },
        { status: 400 }
      )
    }

    // Generate reference number
    const now = new Date()
    const year = now.getFullYear()
    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
    const referenceNumber = `LA-${year}-${randomNum}`

    // In a real application, you would:
    // 1. Create or find the customer by phone/ID
    // 2. Find the appropriate loan product
    // 3. Create the loan application with all details
    
    // For demo purposes, we'll simulate creating an application
    const applicationData = {
      id: `app_${Date.now()}`,
      referenceNumber,
      personalInfo: {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        email: personalInfo.email || null,
        phone: personalInfo.phone,
        dateOfBirth: personalInfo.dateOfBirth || null,
        nationalId: personalInfo.nationalId || null
      },
      employmentInfo: {
        employmentStatus: employmentInfo.employmentStatus || null,
        employerName: employmentInfo.employerName || null,
        monthlyIncome: employmentInfo.monthlyIncome || null
      },
      loanRequest: {
        amount: loanRequest.amount,
        purpose: loanRequest.purpose || 'Personal',
        termDays: loanRequest.termDays
      },
      documents: documents || [],
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString(),
      estimatedDecisionTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      createdAt: new Date().toISOString()
    }

    // Simulate database save (in real app, use Prisma)
    console.log('Application created:', applicationData)

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        applicationId: applicationData.id,
        referenceNumber: applicationData.referenceNumber,
        status: applicationData.status,
        estimatedDecisionTime: applicationData.estimatedDecisionTime,
        nextSteps: [
          'Your application is being reviewed',
          'You will receive SMS notification once decision is made',
          'Expected response time: 2 hours'
        ]
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error submitting application:', error)
    return NextResponse.json(
      { error: 'Failed to submit application. Please try again.' },
      { status: 500 }
    )
  }
}

// GET /api/customer/applications - Get customer's applications
export async function GET(request: NextRequest) {
  try {
    // In real app, get customer ID from auth token/session
    const customerId = request.nextUrl.searchParams.get('customerId')
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    // Mock data for demonstration
    const applications = [
      {
        id: 'app_001',
        referenceNumber: 'LA-2026-0842',
        amount: 50000,
        purpose: 'Personal Expenses',
        termDays: 30,
        status: 'UNDER_REVIEW',
        submittedAt: '2026-08-20T10:30:00Z',
        estimatedDecision: '2026-08-20T12:30:00Z'
      },
      {
        id: 'app_002',
        referenceNumber: 'LA-2026-0715',
        amount: 20000,
        purpose: 'Emergency',
        termDays: 30,
        status: 'APPROVED',
        submittedAt: '2026-07-15T09:00:00Z',
        approvedAt: '2026-07-15T14:00:00Z',
        loanId: 'LN-2026-0042'
      },
      {
        id: 'app_003',
        referenceNumber: 'LA-2026-0610',
        amount: 15000,
        purpose: 'School Fees',
        termDays: 60,
        status: 'COMPLETED',
        submittedAt: '2026-06-10T11:00:00Z',
        completedAt: '2026-08-10T00:00:00Z'
      }
    ]

    return NextResponse.json({
      success: true,
      data: applications,
      total: applications.length
    })

  } catch (error) {
    console.error('Error fetching applications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}
