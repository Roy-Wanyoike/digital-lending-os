import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/customer/notifications - Get customer's notifications
export async function GET(request: NextRequest) {
  try {
    const customerId = request.nextUrl.searchParams.get('customerId')
    const unreadOnly = request.nextUrl.searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20')
    const type = request.nextUrl.searchParams.get('type')

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    // Mock notifications data
    const notifications = [
      {
        id: 'notif_001',
        type: 'loan_approved',
        title: 'Loan Approved! 🎉',
        message: 'Your application for KSh 50,000 has been approved. The funds will be disbursed to your M-Pesa account within 24 hours.',
        amount: 50000,
        read: false,
        priority: 'high',
        channel: 'IN_APP',
        actionLabel: 'View Loan',
        actionUrl: '/loans/LN-2026-0050',
        createdAt: '2026-08-20T10:30:00Z',
        metadata: {
          loanId: 'LN-2026-0050',
          applicationId: 'app_010'
        }
      },
      {
        id: 'notif_002',
        type: 'payment_received',
        title: 'Payment Received 💰',
        message: 'We received your payment of KSh 4,200. Thank you for your timely payment!',
        amount: 4200,
        read: false,
        priority: 'medium',
        channel: ['IN_APP', 'SMS'],
        actionLabel: 'View Receipt',
        actionUrl: '/payments/pay_001/receipt',
        createdAt: '2026-08-20T09:15:00Z',
        metadata: {
          paymentId: 'pay_001',
          referenceNumber: 'MP20260820001'
        }
      },
      {
        id: 'notif_003',
        type: 'payment_reminder',
        title: 'Payment Reminder ⏰',
        message: 'Your payment of KSh 4,200 is due in 3 days. Please ensure sufficient funds in your account.',
        amount: 4200,
        read: false,
        priority: 'high',
        channel: ['IN_APP', 'SMS', 'EMAIL'],
        actionLabel: 'Pay Now',
        actionUrl: '/payments/new?loanId=LN-2026-0042',
        dueDate: '2026-08-28T23:59:59Z',
        createdAt: '2026-08-19T14:00:00Z',
        metadata: {
          loanId: 'LN-2026-0042',
          installmentNumber: 5
        }
      },
      {
        id: 'notif_004',
        type: 'kyc_required',
        title: 'KYC Verification Required 📋',
        message: 'Please upload your National ID to continue with your loan application. This is required for regulatory compliance.',
        read: true,
        priority: 'high',
        channel: ['IN_APP', 'SMS'],
        actionLabel: 'Upload Now',
        actionUrl: '/documents/upload?type=NATIONAL_ID',
        createdAt: '2026-08-17T11:30:00Z',
        metadata: {
          documentType: 'NATIONAL_ID',
          applicationId: 'app_012'
        }
      },
      {
        id: 'notif_005',
        type: 'disbursement',
        title: 'Loan Disbursed 📱',
        message: 'KSh 20,000 has been sent to your M-Pesa account (0712****678). You should receive confirmation shortly.',
        amount: 20000,
        read: true,
        priority: 'medium',
        channel: ['IN_APP', 'SMS'],
        actionLabel: 'View Details',
        actionUrl: '/loans/LN-2026-0042',
        createdAt: '2026-08-10T16:45:00Z',
        metadata: {
          loanId: 'LN-2026-0042',
          disbursementReference: 'MPDISB123456'
        }
      },
      {
        id: 'notif_006',
        type: 'promotion',
        title: 'Special Offer! 🎁',
        message: 'Refer a friend and earn KSh 500 credit towards your next loan payment! Limited time offer.',
        read: true,
        priority: 'low',
        channel: 'IN_APP',
        actionLabel: 'Learn More',
        actionUrl: '/referral',
        expiresAt: '2026-09-30T23:59:59Z',
        createdAt: '2026-08-15T09:00:00Z'
      },
      {
        id: 'notif_007',
        type: 'system',
        title: 'Account Security Update 🔒',
        message: "We've updated our security features. Please review your security settings to ensure your account is protected.",
        read: true,
        priority: 'low',
        channel: 'IN_APP',
        actionLabel: 'Review Settings',
        actionUrl: '/profile/security',
        createdAt: '2026-08-12T12:00:00Z'
      }
    ]

    // Apply filters
    let filteredNotifications = notifications
    if (unreadOnly) {
      filteredNotifications = filteredNotifications.filter(n => !n.read)
    }
    if (type) {
      filteredNotifications = filteredNotifications.filter(n => n.type === type)
    }

    // Sort by date (newest first)
    filteredNotifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Calculate unread count
    const unreadCount = notifications.filter(n => !n.read).length

    return NextResponse.json({
      success: true,
      data: {
        notifications: filteredNotifications.slice(0, limit),
        summary: {
          total: notifications.length,
          unread: unreadCount,
          read: notifications.length - unreadCount
        }
      }
    })

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// PUT /api/customer/notifications - Update notification(s) status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { notificationIds, action, allRead } = body

    // Mark specific notifications as read
    if (notificationIds && Array.isArray(notificationIds)) {
      // In real app: await db.notification.updateMany(...)
      
      return NextResponse.json({
        success: true,
        message: `${notificationIds.length} notification(s) marked as ${action || 'read'}`,
        data: {
          updatedCount: notificationIds.length,
          action: action || 'mark_read'
        }
      })
    }

    // Mark all as read
    if (allRead) {
      // In real app: await db.notification.updateMany({ where: { ... }, data: { readAt: new Date() } })
      
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
        data: {
          updatedCount: 'all',
          action: 'mark_all_read'
        }
      })
    }

    return NextResponse.json(
      { error: 'No valid action specified. Provide notificationIds or set allRead to true.' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}

// DELETE /api/customer/notifications - Delete a notification
export async function DELETE(request: NextRequest) {
  try {
    const notificationId = request.nextUrl.searchParams.get('id')

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      )
    }

    // In real app: await db.notification.delete({ where: { id: notificationId } })

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    )
  }
}
