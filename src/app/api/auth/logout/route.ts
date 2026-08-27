import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================
// POST /api/auth/logout - LOGOUT
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Get Authorization header to identify user
    const authHeader = request.headers.get('authorization')
    
    let userId: string | undefined
    let tenantId: string | undefined
    let customerId: string | undefined

    // Try to decode token for audit logging
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString())
        
        userId = decoded.userId as string | undefined
        tenantId = decoded.tenantId as string | undefined
        customerId = decoded.customerId as string | undefined

        // Create logout audit log
        if (userId || customerId) {
          const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                           request.headers.get('x-real-ip') || 
                           'unknown'
          const userAgent = request.headers.get('user-agent') || undefined

          await db.auditLog.create({
            data: {
              userId: userId || null,
              tenantId: tenantId || null,
              action: customerId ? 'CUSTOMER_LOGOUT' : 'LOGOUT',
              entityType: customerId ? 'CUSTOMER' : 'USER',
              entityId: userId || customerId || null,
              ipAddress,
              userAgent
            }
          })
        }
      } catch {
        // Token invalid, but still allow logout
      }
    }

    // In a production app with JWT:
    // - Add token to blacklist/revocation list
    // - Or use short-lived tokens with refresh token rotation
    // For demo purposes, we just return success
    
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error) {
    console.error('Logout error:', error)
    // Still return success even if logging fails
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })
  }
}

// Handle other methods
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST for logout.' },
    { status: 405 }
  )
}
