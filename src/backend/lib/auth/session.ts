/**
 * @deprecated Use `getApiUser` from `@/lib/auth/api-helpers` instead.
 *             This module is kept for backward compatibility only.
 *
 * Session helpers for server components and React Server Component pages.
 * API routes MUST use api-helpers.ts which includes CSRF protection.
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Get the current user from the session.
 * Returns null if not authenticated or if JWT decryption fails.
 *
 * BUG FIX: Previously read `accountId` which was never set on the session
 * user object. Now correctly reads `id` (set by the session callback in auth.ts).
 */
export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return null

    const user = session.user as any
    if (!user?.id) return null

    return {
      id: user.id,
      email: session.user.email,
      name: session.user.name,
      role: user.role || 'USER',
      tenantId: user.tenantId || '',
      businessId: user.businessId || '',
    }
  } catch (err: any) {
    // Gracefully handle JWT decryption failures
    console.warn('[session] Failed to retrieve session:', err.message)
    return null
  }
}

/**
 * @deprecated Use `requireAuth(req)` from `@/lib/auth/api-helpers` instead.
 */
export function requireAuth() {
  return getCurrentUser().then(user => {
    if (!user) throw new Error('Unauthorized')
    return user
  })
}

/**
 * @deprecated Use `requireRole(req, roles)` from `@/lib/auth/api-helpers` instead.
 */
export function requireRole(...roles: string[]) {
  return requireAuth().then(user => {
    if (!roles.includes(user.role)) throw new Error('Forbidden')
    return user
  })
}
