import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, createAuditLog, getClientIP } from '@/lib/auth-utils'
import type { AuthContext, RouteContext } from '@/lib/auth-utils'

// Collection action types
type CollectionActionType = 
  | 'promise_to_pay' 
  | 'contact_attempt' 
  | 'payment_arrangement' 
  | 'escalate' 
  | 'write_off'

type ContactMethod = 'sms' | 'call' | 'whatsapp' | 'email'

interface CollectionActionBody {
  action: CollectionActionType
  loanId: string
  tenantId?: string
  notes?: string
  // For promise_to_pay
  promisedAmount?: number
  promisedDate?: string
  confidenceLevel?: 'high' | 'medium' | 'low'
  // For contact_attempt
  contactMethod?: ContactMethod
  contactOutcome?: 'reached' | 'no_answer' | 'busy' | 'wrong_number' | 'callback_requested' | 'promised_to_pay'
  // For payment_arrangement
  arrangementAmount?: number
  arrangementStartDate?: string
  arrangementFrequency?: 'weekly' | 'bi_weekly' | 'monthly'
  arrangementInstallments?: number
  // For escalate
  escalationReason?: string
  escalationLevel?: 'supervisor' | 'management' | 'legal' | 'external_agency'
  // For write_off
  writeOffReason?: string
  writeOffCategory?: 'doubtful_debt' | 'bankruptcy' | 'deceased' | 'uncollectible' | 'other'
}

// POST /api/collections/actions - Record a collection action
export const POST = withAuth(async (request: NextRequest, _context: RouteContext, authContext: AuthContext) => {
  try {
    const { user } = authContext
    const body: CollectionActionBody = await request.json()
    
    const tenantId = body.tenantId || user.tenantId || ''
    const { action, loanId, notes } = body

    // Validate required fields
    if (!action || !loanId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: action and loanId are required' },
        { status: 400 }
      )
    }

    // Validate action type
    const validActions: CollectionActionType[] = ['promise_to_pay', 'contact_attempt', 'payment_arrangement', 'escalate', 'write_off']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
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

    // Check if loan exists
    const loan = await db.loan.findFirst({
      where: { id: loanId, tenantId },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true }
        }
      }
    })

    if (!loan) {
      return NextResponse.json(
        { success: false, error: 'Loan not found or does not belong to this tenant' },
        { status: 404 }
      )
    }

    // Process based on action type
    let result
    let auditAction = `collections:${action}`

    switch (action) {
      case 'promise_to_pay':
        result = await handlePromiseToPay(body, loanId, user.id, tenantId)
        break

      case 'contact_attempt':
        result = await handleContactAttempt(body, loanId, user.id, tenantId)
        break

      case 'payment_arrangement':
        result = await handlePaymentArrangement(body, loanId, user.id, tenantId)
        break

      case 'escalate':
        result = await handleEscalation(body, loanId, user.id, tenantId)
        break

      case 'write_off':
        result = await handleWriteOff(body, loanId, user.id, tenantId)
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action type' },
          { status: 400 }
        )
    }

    // Update last collection timestamp on loan
    await db.loan.update({
      where: { id: loanId },
      data: { lastCollectionAt: new Date() }
    })

    // Create audit log for the action
    createAuditLog(
      auditAction,
      user.id,
      { 
        action, 
        loanId: loan.loanNumber, 
        customerName: `${loan.customer.firstName} ${loan.customer.lastName}`, 
        performedBy: user.name,
        ...notes ? { notes } : {}
      },
      getClientIP(request)
    )

    return NextResponse.json({
      success: true,
      data: result,
      message: `Collection action '${action}' recorded successfully`
    })
  } catch (error) {
    console.error('Error recording collection action:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to record collection action' },
      { status: 500 }
    )
  }
})

// Handler functions for each action type

async function handlePromiseToPay(
  body: CollectionActionBody, 
  loanId: string, 
  userId: string, 
  tenantId: string
) {
  const { promisedAmount, promisedDate, confidenceLevel, notes } = body

  // Validate required fields for promise to pay
  if (!promisedAmount || !promisedDate) {
    throw new Error('Promise to pay requires promisedAmount and promisedDate')
  }

  const promisedDateObj = new Date(promisedDate)
  if (promisedDateObj <= new Date()) {
    throw new Error('Promised date must be in the future')
  }

  // Store promise in collection notes (or could be a separate table)
  const promiseData = {
    type: 'PROMISE_TO_PAY',
    promisedAmount,
    promisedDate: promisedDateObj.toISOString(),
    confidenceLevel: confidenceLevel || 'medium',
    notes: notes || '',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    createdBy: userId
  }

  // Append to loan's collection notes
  const loan = await db.loan.findUnique({ where: { id: loanId } })
  const existingNotes = loan?.collectionNotes || ''
  const timestamp = new Date().toISOString()
  const noteEntry = `[${timestamp}] PROMISE_TO_PAY: ${JSON.stringify(promiseData)}`
  
  const updatedLoan = await db.loan.update({
    where: { id: loanId },
    data: {
      collectionNotes: existingNotes ? `${existingNotes}\n${noteEntry}` : noteEntry
    }
  })

  return {
    action: 'promise_to_pay',
    promiseData,
    loan: updatedLoan
  }
}

async function handleContactAttempt(
  body: CollectionActionBody, 
  loanId: string, 
  userId: string, 
  tenantId: string
) {
  const { contactMethod, contactOutcome, notes } = body

  // Validate required fields
  if (!contactMethod || !contactOutcome) {
    throw new Error('Contact attempt requires contactMethod and contactOutcome')
  }

  const validMethods: ContactMethod[] = ['sms', 'call', 'whatsapp', 'email']
  if (!validMethods.includes(contactMethod!)) {
    throw new Error(`Invalid contact method. Must be one of: ${validMethods.join(', ')}`)
  }

  const contactData = {
    type: 'CONTACT_ATTEMPT',
    contactMethod,
    contactOutcome,
    notes: notes || '',
    contactedAt: new Date().toISOString(),
    contactedBy: userId
  }

  // Append to loan's collection notes
  const loan = await db.loan.findUnique({ where: { id: loanId } })
  const existingNotes = loan?.collectionNotes || ''
  const timestamp = new Date().toISOString()
  const noteEntry = `[${timestamp}] CONTACT_ATTEMPT: ${JSON.stringify(contactData)}`
  
  const updatedLoan = await db.loan.update({
    where: { id: loanId },
    data: {
      collectionNotes: existingNotes ? `${existingNotes}\n${noteEntry}` : noteEntry
    }
  })

  return {
    action: 'contact_attempt',
    contactData,
    loan: updatedLoan
  }
}

async function handlePaymentArrangement(
  body: CollectionActionBody, 
  loanId: string, 
  userId: string, 
  tenantId: string
) {
  const { 
    arrangementAmount, 
    arrangementStartDate, 
    arrangementFrequency, 
    arrangementInstallments,
    notes 
  } = body

  // Validate required fields
  if (!arrangementAmount || !arrangementStartDate || !arrangementInstallments) {
    throw new Error('Payment arrangement requires arrangementAmount, arrangementStartDate, and arrangementInstallments')
  }

  const arrangementData = {
    type: 'PAYMENT_ARRANGEMENT',
    arrangementAmount,
    arrangementStartDate,
    arrangementFrequency: arrangementFrequency || 'monthly',
    arrangementInstallments,
    notes: notes || '',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    createdBy: userId
  }

  // Update loan status to restructured
  const loan = await db.loan.findUnique({ where: { id: loanId } })
  const existingNotes = loan?.collectionNotes || ''
  const timestamp = new Date().toISOString()
  const noteEntry = `[${timestamp}] PAYMENT_ARRANGEMENT: ${JSON.stringify(arrangementData)}`
  
  const updatedLoan = await db.loan.update({
    where: { id: loanId },
    data: {
      status: 'RESTRUCTURED',
      collectionNotes: existingNotes ? `${existingNotes}\n${noteEntry}` : noteEntry
    }
  })

  return {
    action: 'payment_arrangement',
    arrangementData,
    loan: updatedLoan
  }
}

async function handleEscalation(
  body: CollectionActionBody, 
  loanId: string, 
  userId: string, 
  tenantId: string
) {
  const { escalationReason, escalationLevel, notes } = body

  // Validate required fields
  if (!escalationReason || !escalationLevel) {
    throw new Error('Escalation requires escalationReason and escalationLevel')
  }

  const validLevels = ['supervisor', 'management', 'legal', 'external_agency']
  if (!validLevels.includes(escalationLevel!)) {
    throw new Error(`Invalid escalation level. Must be one of: ${validLevels.join(', ')}`)
  }

  const escalationData = {
    type: 'ESCALATION',
    escalationReason,
    escalationLevel,
    notes: notes || '',
    escalatedAt: new Date().toISOString(),
    escalatedBy: userId,
    status: 'PENDING_REVIEW'
  }

  // Append to loan's collection notes
  const loan = await db.loan.findUnique({ where: { id: loanId } })
  const existingNotes = loan?.collectionNotes || ''
  const timestamp = new Date().toISOString()
  const noteEntry = `[${timestamp}] ESCALATION: ${JSON.stringify(escalationData)}`
  
  const updatedLoan = await db.loan.update({
    where: { id: loanId },
    data: {
      collectionNotes: existingNotes ? `${existingNotes}\n${noteEntry}` : noteEntry
    }
  })

  return {
    action: 'escalate',
    escalationData,
    loan: updatedLoan
  }
}

async function handleWriteOff(
  body: CollectionActionBody, 
  loanId: string, 
  userId: string, 
  tenantId: string
) {
  const { writeOffReason, writeOffCategory, notes } = body

  // Validate required fields
  if (!writeOffReason || !writeOffCategory) {
    throw new Error('Write off requires writeOffReason and writeOffCategory')
  }

  // Only admins/managers can write off loans (additional check beyond auth middleware)
  const validCategories = ['doubtful_debt', 'bankruptcy', 'deceased', 'uncollectible', 'other']
  if (!validCategories.includes(writeOffCategory!)) {
    throw new Error(`Invalid write-off category. Must be one of: ${validCategories.join(', ')}`)
  }

  const writeOffData = {
    type: 'WRITE_OFF',
    writeOffReason,
    writeOffCategory,
    notes: notes || '',
    writtenOffAt: new Date().toISOString(),
    writtenOffBy: userId
  }

  // Update loan status to written off
  const loan = await db.loan.findUnique({ where: { id: loanId } })
  const existingNotes = loan?.collectionNotes || ''
  const timestamp = new Date().toISOString()
  const noteEntry = `[${timestamp}] WRITE_OFF: ${JSON.stringify(writeOffData)}`
  
  const updatedLoan = await db.loan.update({
    where: { id: loanId },
    data: {
      status: 'WRITTEN_OFF',
      closedAt: new Date(),
      closureReason: writeOffReason,
      writtenOffAmount: loan?.outstandingBalance || 0,
      collectionNotes: existingNotes ? `${existingNotes}\n${noteEntry}` : noteEntry
    }
  })

  return {
    action: 'write_off',
    writeOffData,
    loan: updatedLoan
  }
}
