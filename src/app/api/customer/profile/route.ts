import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/customer/profile - Get customer profile
export async function GET(request: NextRequest) {
  try {
    const customerId = request.nextUrl.searchParams.get('customerId')
    const phone = request.nextUrl.searchParams.get('phone')

    if (!customerId && !phone) {
      return NextResponse.json(
        { error: 'Customer ID or phone number is required' },
        { status: 400 }
      )
    }

    // Mock customer data (in real app, fetch from database)
    const customer = {
      id: 'cust_001',
      firstName: 'John',
      lastName: 'Mwangi',
      email: 'john.mwangi@email.com',
      phone: '0712345678',
      alternativePhone: '',
      dateOfBirth: '1990-05-15',
      nationalId: '12345678',
      kraPin: 'A123456789X',
      gender: 'MALE',
      nationality: 'Kenyan',
      
      // Employment
      employmentStatus: 'EMPLOYED',
      employerName: 'Tech Solutions Ltd',
      incomeAmount: 85000,
      incomeFrequency: 'MONTHLY',
      
      // Address
      county: 'Nairobi',
      city: 'Nairobi',
      physicalAddress: 'Westlands Area, Parklands Road',
      
      // Banking
      bankName: 'Equity Bank Kenya',
      bankAccount: '0123456789012',
      mpesaPhone: '0712345678',
      
      // Credit Info
      creditScore: 720,
      totalBorrowed: 85000,
      totalRepaid: 82500,
      outstandingBalance: 18400,
      crbStatus: 'CLEAN',
      
      // Status
      status: 'ACTIVE',
      riskLevel: 'LOW',
      
      // Dates
      createdAt: '2026-07-15T10:00:00Z',
      updatedAt: '2026-08-20T09:30:00Z',
      lastLoginAt: '2026-08-20T08:15:00Z',

      // Notification preferences
      notificationPreferences: {
        sms: true,
        email: true,
        whatsapp: false,
        push: true,
        paymentReminders: true,
        promotions: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00'
      },

      // Linked accounts
      bankAccounts: [
        {
          id: 'ba_001',
          bankName: 'Equity Bank Kenya',
          accountNumber: '0123456789012',
          accountType: 'current',
          isDefault: true
        },
        {
          id: 'ba_002',
          bankName: 'KCB Bank',
          accountNumber: '9876543210987',
          accountType: 'savings',
          isDefault: false
        }
      ]
    }

    return NextResponse.json({
      success: true,
      data: customer
    })

  } catch (error) {
    console.error('Error fetching customer profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer profile' },
      { status: 500 }
    )
  }
}

// PUT /api/customer/profile - Update customer profile
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const customerId = body.customerId || request.nextUrl.searchParams.get('customerId')

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    // Fields that can be updated
    const updatableFields = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'alternativePhone',
      'dateOfBirth',
      'nationalId',
      'kraPin',
      'county',
      'city',
      'physicalAddress',
      'employerName',
      'employmentStatus',
      'incomeAmount',
      'bankName',
      'bankAccount',
      'mpesaPhone',
      'notificationPreferences'
    ]

    // Extract only updatable fields
    const updates: Record<string, any> = {}
    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Validate email format if provided
    if (updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(updates.email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
    }

    // Validate phone format if provided (Kenyan format)
    if (updates.phone) {
      const phoneRegex = /^(?:0|254|\+254)?(7\d{8})$/
      if (!phoneRegex.test(updates.phone.replace(/\s/g, ''))) {
        return NextResponse.json(
          { error: 'Invalid phone number format. Use format: 07XX XXX XXX' },
          { status: 400 }
        )
      }
    }

    // In real application:
    // await db.customer.update({
    //   where: { id: customerId },
    //   data: { ...updates, updatedAt: new Date() }
    // })

    console.log('Profile updated:', { customerId, updates })

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        updatedAt: new Date().toISOString(),
        updatedFields: Object.keys(updates)
      }
    })

  } catch (error) {
    console.error('Error updating customer profile:', error)
    
    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'This email or phone number is already in use' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update profile. Please try again.' },
      { status: 500 }
    )
  }
}

// PATCH /api/customer/profile - Partial update (e.g., notification preferences)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const customerId = body.customerId

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    // Handle specific partial updates
    if (body.notificationPreferences !== undefined) {
      // Update notification preferences
      console.log('Updating notification preferences for', customerId)
      
      return NextResponse.json({
        success: true,
        message: 'Notification preferences updated',
        data: {
          notificationPreferences: body.notificationPreferences
        }
      })
    }

    if (body.passwordChange !== undefined) {
      // Handle password change (in real app, verify old password first)
      const { currentPassword, newPassword } = body.passwordChange
      
      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { error: 'Current and new passwords are required' },
          { status: 400 }
        )
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters long' },
          { status: 400 }
        )
      }

      // In real app: hash new password and update
      
      return NextResponse.json({
        success: true,
        message: 'Password changed successfully'
      })
    }

    return NextResponse.json(
      { error: 'No valid update operation specified' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error in partial profile update:', error)
    return NextResponse.json(
      { error: 'Update failed. Please try again.' },
      { status: 500 }
    )
  }
}
