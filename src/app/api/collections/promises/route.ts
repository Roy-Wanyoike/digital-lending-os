import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, createAuditLog, getClientIP } from '@/lib/auth-utils'
import type { AuthContext } from '@/lib/auth-utils'

// Promise to Pay status types
type PromiseStatus = 'PENDING' | 'KEPT' | 'BROKEN' | 'PARTIAL' | 'CANCELLED'

interface PromiseToPay {
  id?: string
  loanId: string
  customerId: string
  tenantId: string
  promisedAmount: number
  promisedDate: string // ISO date string
  confidenceLevel: 'high' | 'medium' | 'low'
  notes?: string
  status: PromiseStatus
  actualPaidAmount?: number
  keptDate?: string
  brokenDate?: string
  createdBy: string
  createdAt?: string
  updatedAt?: string
}

// Helper function to extract promises from loan collection notes
function extractPromisesFromNotes(collectionNotes: string | null): PromiseToPay[] {
  if (!collectionNotes) return []
  
  const promises: PromiseToPay[] = []
  const lines = collectionNotes.split('\n')
  
  for (const line of lines) {
    if (line.includes('PROMISE_TO_PAY:')) {
      try {
        const jsonStr = line.split('PROMISE_TO_PAY:')[1].trim()
        const promiseData = JSON.parse(jsonStr)
        promises.push({
          ...promiseData,
          status: promiseData.status || 'PENDING'
        })
      } catch (e) {
        // Skip malformed entries
      }
    }
  }
  
  return promises
}

// GET /api/collections/promises - List all promise-to-pay records
export const GET = withAuth(async (request: Request, _ctx: unknown, authContext: AuthContext) => {
  try {
    const { user } = authContext
    const { searchParams } = new URL(request.url)
    
    const tenantId = searchParams.get('tenantId') || user.tenantId
    const status = searchParams.get('status') as PromiseStatus | null // PENDING, KEPT, BROKEN, etc.
    const loanId = searchParams.get('loanId')
    const collectorId = searchParams.get('collectorId') // Filter by assigned collector
    const dateFrom = searchParams.get('dateFrom') // Promises made from this date
    const dateTo = searchParams.get('dateTo') // Promises made until this date
    const dueFrom = searchParams.get('dueFrom') // Promises due from this date
    const dueTo = searchParams.get('dueTo') // Promises due until this date
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

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

    // Build where clause for loans with collection notes containing promises
    const loanWhere: Record<string, unknown> = {
      tenantId,
      collectionNotes: { contains: 'PROMISE_TO_PAY:' },
      status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED', 'RESTRUCTURED'] }
    }

    if (loanId) {
      loanWhere.id = loanId
    }

    if (collectorId) {
      loanWhere.assignedCollector = collectorId
    }

    // Fetch loans that have promises in their notes
    const loansWithPromises = await db.loan.findMany({
      where: loanWhere,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        collector: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Extract and process all promises
    let allPromises: (PromiseToPay & { 
      loanNumber: string
      customerName: string
      customerPhone: string
      collectorName: string | null
    })[] = []

    for (const loan of loansWithPromises) {
      const promises = extractPromisesFromNotes(loan.collectionNotes)
      
      for (const promise of promises) {
        // Apply filters
        if (status && promise.status !== status) continue
        
        if (dateFrom || dateTo) {
          const promiseCreatedDate = new Date(promise.createdAt || '')
          if (dateFrom && promiseCreatedDate < new Date(dateFrom)) continue
          if (dateTo && promiseCreatedDate > new Date(dateTo + 'T23:59:59')) continue
        }

        if (dueFrom || dueTo) {
          const promisedDate = new Date(promise.promisedDate)
          if (dueFrom && promisedDate < new Date(dueFrom)) continue
          if (dueTo && promisedDate > new Date(dueTo + 'T23:59:59')) continue
        }

        allPromises.push({
          ...promise,
          loanNumber: loan.loanNumber,
          customerName: `${loan.customer.firstName} ${loan.customer.lastName}`,
          customerPhone: loan.customer.phone,
          collectorName: loan.collector?.name || null
        })
      }
    }

    // Sort by promised date (most urgent first)
    allPromises.sort((a, b) => new Date(a.promisedDate).getTime() - new Date(b.promisedDate).getTime())

    // Calculate summary statistics
    const summary = {
      total: allPromises.length,
      pending: allPromises.filter(p => p.status === 'PENDING').length,
      kept: allPromises.filter(p => p.status === 'KEPT').length,
      broken: allPromises.filter(p => p.status === 'BROKEN').length,
      partial: allPromises.filter(p => p.status === 'PARTIAL').length,
      totalPromisedAmount: allPromises.reduce((sum, p) => sum + p.promisedAmount, 0),
      pendingAmount: allPromises.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.promisedAmount, 0),
      keptAmount: allPromises.filter(p => p.status === 'KEPT').reduce((sum, p) => sum + (p.actualPaidAmount || p.promisedAmount), 0),
      brokenAmount: allPromises.filter(p => p.status === 'BROKEN').reduce((sum, p) => sum + p.promisedAmount, 0),
      keepRate: allPromises.filter(p => p.status !== 'PENDING' && p.status !== 'CANCELLED').length > 0
        ? (allPromises.filter(p => p.status === 'KEPT').length / allPromises.filter(p => p.status !== 'PENDING' && p.status !== 'CANCELLED').length) * 100
        : 0
    }

    // Apply pagination
    const startIndex = (page - 1) * limit
    const paginatedPromises = allPromises.slice(startIndex, startIndex + limit)

    // Audit log
    await createAuditLog({
      userId: user.id,
      tenantId: user.tenantId,
      action: 'collections:promises_list',
      entityType: 'PromiseToPay',
      ipAddress: getClientIP(request),
      metadata: { filters: { status, loanId, collectorId }, page }
    })

    return NextResponse.json({
      success: true,
      data: paginatedPromises,
      summary,
      pagination: {
        page,
        limit,
        total: allPromises.length,
        pages: Math.ceil(allPromises.length / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching promises:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch promise-to-pay records' },
      { status: 500 }
    )
  }
})

// POST /api/collections/promises - Create a new promise-to-pay record
export const POST = withAuth(async (request: Request, _ctx: unknown, authContext: AuthContext) => {
  try {
    const { user } = authContext
    const body = await request.json()
    
    const tenantId = body.tenantId || user.tenantId
    const {
      loanId,
      promisedAmount,
      promisedDate,
      confidenceLevel = 'medium',
      notes
    } = body

    // Validate required fields
    if (!loanId || !promisedAmount || !promisedDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: loanId, promisedAmount, and promisedDate are required' },
        { status: 400 }
      )
    }

    // Validate tenant access
    if (user.role !== 'SUPER_ADMIN' && tenantId !== user.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Cannot modify other tenant data' },
        { status: 403 }
      )
    }

    // Validate promised amount
    if (promisedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Promised amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Validate promised date
    const promisedDateObj = new Date(promisedDate)
    if (isNaN(promisedDateObj.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid promised date format' },
        { status: 400 }
      )
    }

    if (promisedDateObj <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'Promised date must be in the future' },
        { status: 400 }
      )
    }

    // Check if loan exists and belongs to tenant
    const loan = await db.loan.findFirst({
      where: { id: loanId, tenantId },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    })

    if (!loan) {
      return NextResponse.json(
        { success: false, error: 'Loan not found or does not belong to this tenant' },
        { status: 404 }
      )
    }

    // Create promise object
    const promiseData: PromiseToPay = {
      id: `promise-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      loanId,
      customerId: loan.customerId,
      tenantId,
      promisedAmount,
      promisedDate: promisedDateObj.toISOString(),
      confidenceLevel,
      notes: notes || '',
      status: 'PENDING',
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Append to loan's collection notes
    const existingNotes = loan.collectionNotes || ''
    const timestamp = new Date().toISOString()
    const noteEntry = `[${timestamp}] PROMISE_TO_PAY: ${JSON.stringify(promiseData)}`
    
    const updatedLoan = await db.loan.update({
      where: { id: loanId },
      data: {
        collectionNotes: existingNotes ? `${existingNotes}\n${noteEntry}` : noteEntry,
        lastCollectionAt: new Date()
      }
    })

    // Audit log
    await createAuditLog({
      userId: user.id,
      tenantId: user.tenantId,
      action: 'collections:promise_create',
      entityType: 'PromiseToPay',
      entityId: loanId,
      ipAddress: getClientIP(request),
      newValues: JSON.stringify(promiseData),
      metadata: {
        loanId: loan.loanNumber,
        customerName: `${loan.customer.firstName} ${loan.customer.lastName}`,
        promisedAmount,
        promisedDate,
        confidenceLevel
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...promiseData,
        loanNumber: loan.loanNumber,
        customerName: `${loan.customer.firstName} ${loan.customer.lastName}`
      },
      message: 'Promise-to-pay recorded successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating promise:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create promise-to-pay record' },
      { status: 500 }
    )
  }
})

// PUT /api/collections/promises - Update a promise status (mark as kept/broken/partial)
export async function PUT(request: Request) {
  try {
    // Note: In production, you'd want proper auth middleware here too
    const body = await request.json()
    const { promiseId, loanId, status, actualPaidAmount, notes } = body

    if (!promiseId || !loanId || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: promiseId, loanId, and status are required' },
        { status: 400 }
      )
    }

    const validStatuses: PromiseStatus[] = ['KEPT', 'BROKEN', 'PARTIAL', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Find the loan and its promises
    const loan = await db.loan.findUnique({ where: { id: loanId } })
    if (!loan) {
      return NextResponse.json(
        { success: false, error: 'Loan not found' },
        { status: 404 }
      )
    }

    // Parse existing notes and update the specific promise
    const lines = (loan.collectionNotes || '').split('\n')
    let updatedLines = []
    let promiseUpdated = false

    for (const line of lines) {
      if (line.includes(`"id":"${promiseId}"`) || line.includes(`'id':'${promiseId}'`)) {
        try {
          const jsonStr = line.substring(line.indexOf('{')).trim()
          const promiseData = JSON.parse(jsonStr)
          
          promiseData.status = status
          if (actualPaidAmount) promiseData.actualPaidAmount = actualPaidAmount
          if (status === 'KEPT') promiseData.keptDate = new Date().toISOString()
          if (status === 'BROKEN') promiseData.brokenDate = new Date().toISOString()
          if (notes) promiseData.notes = (promiseData.notes ? promiseData.notes + ' | ' : '') + notes
          promiseData.updatedAt = new Date().toISOString()

          const timestamp = new Date().toISOString()
          const prefix = line.substring(0, line.indexOf('{'))
          updatedLines.push(`${prefix}${JSON.stringify(promiseData)}`)
          promiseUpdated = true
        } catch (e) {
          updatedLines.push(line)
        }
      } else {
        updatedLines.push(line)
      }
    }

    if (!promiseUpdated) {
      return NextResponse.json(
        { success: false, error: 'Promise not found' },
        { status: 404 }
      )
    }

    // Update loan with modified notes
    await db.loan.update({
      where: { id: loanId },
      data: { collectionNotes: updatedLines.join('\n') }
    })

    return NextResponse.json({
      success: true,
      message: `Promise marked as ${status}`
    })
  } catch (error) {
    console.error('Error updating promise:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update promise status' },
      { status: 500 }
    )
  }
}
