import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/customer/documents - Get customer's documents
export async function GET(request: NextRequest) {
  try {
    const customerId = request.nextUrl.searchParams.get('customerId')
    const type = request.nextUrl.searchParams.get('type') // Filter by document type
    const status = request.nextUrl.searchParams.get('status') // Filter by verification status

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    // Mock documents data
    const documents = [
      {
        id: 'doc_001',
        customerId,
        applicationId: null,
        type: 'NATIONAL_ID',
        typeName: 'National ID',
        fileName: 'national_id_front.jpg',
        fileUrl: '/uploads/customers/cust_001/national_id_front.jpg',
        fileSize: 2450000,
        mimeType: 'image/jpeg',
        hash: 'sha256:abc123...',
        verificationStatus: 'VERIFIED',
        verifiedAt: '2026-07-15T14:22:00Z',
        verifiedBy: 'system_auto',
        createdAt: '2026-07-15T10:30:00Z',
        updatedAt: '2026-07-15T14:22:00Z',
        required: true,
        expiryDate: '2036-05-15T23:59:59Z'
      },
      {
        id: 'doc_002',
        customerId,
        applicationId: null,
        type: 'KRA_PIN_CERTIFICATE',
        typeName: 'KRA PIN Certificate',
        fileName: 'kra_pin_certificate.pdf',
        fileUrl: '/uploads/customers/cust_001/kra_pin_certificate.pdf',
        fileSize: 890000,
        mimeType: 'application/pdf',
        hash: 'sha256:def456...',
        verificationStatus: 'VERIFIED',
        verifiedAt: '2026-07-16T09:15:00Z',
        verifiedBy: 'system_auto',
        createdAt: '2026-07-15T11:45:00Z',
        updatedAt: '2026-07-16T09:15:00Z',
        required: true
      },
      {
        id: 'doc_003',
        customerId,
        applicationId: 'app_010',
        type: 'PASSPORT_PHOTO',
        typeName: 'Passport Photo',
        fileName: 'passport_photo.png',
        fileUrl: '/uploads/customers/cust_001/passport_photo.png',
        fileSize: 1200000,
        mimeType: 'image/png',
        hash: 'sha256:ghi789...',
        verificationStatus: 'PENDING',
        createdAt: '2026-08-01T16:20:00Z',
        updatedAt: '2026-08-01T16:20:00Z',
        required: true
      },
      {
        id: 'doc_004',
        customerId,
        applicationId: null,
        type: 'PAYSLIP',
        typeName: 'Recent Payslip (Latest)',
        fileName: 'payslip_july_2026.pdf',
        fileUrl: '/uploads/customers/cust_001/payslip_july_2026.pdf',
        fileSize: 340000,
        mimeType: 'application/pdf',
        hash: 'sha256:jkl012...',
        verificationStatus: 'PENDING',
        createdAt: '2026-08-05T09:00:00Z',
        updatedAt: '2026-08-05T09:00:00Z',
        required: false
      },
      {
        id: 'doc_005',
        customerId,
        applicationId: null,
        type: 'BANK_STATEMENT',
        typeName: 'Bank Statement (3 months)',
        fileName: 'bank_statement_may_jul.pdf',
        fileUrl: '/uploads/customers/cust_001/bank_statement_may_jul.pdf',
        fileSize: 2100000,
        mimeType: 'application/pdf',
        hash: 'sha256:mno345...',
        verificationStatus: 'REJECTED',
        rejectionReason: 'Document is unclear or appears to be outdated. Please upload a clear copy of your bank statement covering the last 3 months.',
        rejectedAt: '2026-06-25T10:00:00Z',
        createdAt: '2026-06-20T14:30:00Z',
        updatedAt: '2026-06-25T10:00:00Z',
        required: false
      }
    ]

    // Apply filters
    let filteredDocuments = documents
    if (type) {
      filteredDocuments = filteredDocuments.filter(d => d.type === type.toUpperCase())
    }
    if (status) {
      filteredDocuments = filteredDocuments.filter(d => d.verificationStatus === status.toUpperCase())
    }

    // Calculate summary stats
    const totalDocs = filteredDocuments.length
    const verifiedDocs = filteredDocuments.filter(d => d.verificationStatus === 'VERIFIED').length
    const pendingDocs = filteredDocuments.filter(d => d.verificationStatus === 'PENDING').length
    const rejectedDocs = filteredDocuments.filter(d => d.verificationStatus === 'REJECTED').length
    const requiredDocs = filteredDocuments.filter(d => d.required)
    const requiredVerified = requiredDocs.filter(d => d.verificationStatus === 'VERIFIED').length

    return NextResponse.json({
      success: true,
      data: {
        documents: filteredDocuments,
        summary: {
          total: totalDocs,
          verified: verifiedDocs,
          pending: pendingDocs,
          rejected: rejectedDocs,
          requiredTotal: requiredDocs.length,
          requiredVerified,
          completionPercent: requiredDocs.length > 0 ? Math.round((requiredVerified / requiredDocs.length) * 100) : 100
        },
        requiredDocumentTypes: [
          { type: 'NATIONAL_ID', label: 'National ID', required: true, uploaded: !!documents.find(d => d.type === 'NATIONAL_ID') },
          { type: 'KRA_PIN_CERTIFICATE', label: 'KRA PIN Certificate', required: true, uploaded: !!documents.find(d => d.type === 'KRA_PIN_CERTIFICATE') },
          { type: 'PASSPORT_PHOTO', label: 'Passport Photo', required: true, uploaded: !!documents.find(d => d.type === 'PASSPORT_PHOTO') },
          { type: 'PAYSLIP', label: 'Recent Payslip', required: false, uploaded: !!documents.find(d => d.type === 'PAYSLIP') },
          { type: 'BANK_STATEMENT', label: 'Bank Statement', required: false, uploaded: !!documents.find(d => d.type === 'BANK_STATEMENT') }
        ]
      }
    })

  } catch (error) {
    console.error('Error fetching customer documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

// POST /api/customer/documents - Upload a new document
export async function POST(request: NextRequest) {
  try {
    // In a real app, you would use formidable or similar to handle multipart/form-data
    // For this demo, we'll accept JSON with base64 encoded file or metadata
    
    const contentType = request.headers.get('content-type') || ''
    
    let documentData: any
    
    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data (actual file upload)
      const formData = await request.formData()
      const file = formData.get('file') as File
      const docType = formData.get('type') as string
      const customerId = formData.get('customerId') as string
      
      if (!file || !docType || !customerId) {
        return NextResponse.json(
          { error: 'File, document type, and customer ID are required' },
          { status: 400 }
        )
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File size exceeds maximum limit of 10MB' },
          { status: 400 }
        )
      }

      // Validate file type
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf'
      ]

      if (!allowedMimeTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}` },
          { status: 400 }
        )
      }

      // In real app:
      // 1. Save file to storage (S3, local, etc.)
      // 2. Create database record
      // 3. Return document info

      documentData = {
        id: `doc_${Date.now()}`,
        customerId,
        type: docType.toUpperCase(),
        typeName: getDocumentTypeName(docType),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        fileUrl: `/uploads/customers/${customerId}/${Date.now()}_${file.name}`,
        verificationStatus: 'PENDING',
        createdAt: new Date().toISOString()
      }

    } else {
      // Handle JSON body (metadata only, for demo purposes)
      const body = await request.json()
      const { customerId, type, fileName, fileSize, mimeType } = body

      if (!customerId || !type || !fileName) {
        return NextResponse.json(
          { error: 'Customer ID, document type, and filename are required' },
          { status: 400 }
        )
      }

      documentData = {
        id: `doc_${Date.now()}`,
        customerId,
        type: type.toUpperCase(),
        typeName: getDocumentTypeName(type),
        fileName,
        fileSize: fileSize || 0,
        mimeType: mimeType || 'application/octet-stream',
        fileUrl: `/uploads/customers/${customerId}/${fileName}`,
        verificationStatus: 'PENDING',
        createdAt: new Date().toISOString()
      }
    }

    console.log('Document uploaded:', documentData)

    return NextResponse.json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        ...documentData,
        nextSteps: [
          'Your document is being reviewed',
          'You will be notified once verification is complete',
          'This usually takes within 24 hours'
        ]
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: 'Failed to upload document. Please try again.' },
      { status: 500 }
    )
  }
}

// DELETE /api/customer/documents - Delete a document
export async function DELETE(request: NextRequest) {
  try {
    const documentId = request.nextUrl.searchParams.get('id')
    const customerId = request.nextUrl.searchParams.get('customerId')

    if (!documentId || !customerId) {
      return NextResponse.json(
        { error: 'Document ID and Customer ID are required' },
        { status: 400 }
      )
    }

    // In real app:
    // 1. Verify document belongs to customer
    // 2. Delete file from storage
    // 3. Delete database record

    console.log(`Deleting document ${documentId} for customer ${customerId}`)

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}

// Helper function to get human-readable document type name
function getDocumentTypeName(type: string): string {
  const typeNames: Record<string, string> = {
    'NATIONAL_ID': 'National ID',
    'PASSPORT': 'Passport',
    'ALIEN_ID': 'Alien ID',
    'MILITARY_ID': 'Military ID',
    'DRIVERS_LICENSE': "Driver's License",
    'KRA_PIN_CERTIFICATE': 'KRA PIN Certificate',
    'PAYSLIP': 'Payslip',
    'BANK_STATEMENT': 'Bank Statement',
    'BUSINESS_REGISTRATION': 'Business Registration',
    'TAX_COMPLIANCE': 'Tax Compliance Certificate',
    'UTILITY_BILL': 'Utility Bill',
    'PASSPORT_PHOTO': 'Passport Photo',
    'SIGNATURE_SPECIMEN': 'Signature Specimen',
    'GUARANTOR_FORM': 'Guarantor Form',
    'CONSENT_FORM': 'Consent Form',
    'OTHER': 'Other Document'
  }

  return typeNames[type.toUpperCase()] || 'Unknown Document Type'
}
