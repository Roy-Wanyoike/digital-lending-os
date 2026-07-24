import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return {
    id: (session.user as any).accountId,
    email: session.user.email,
    name: session.user.name,
    role: (session.user as any).role,
    tenantId: (session.user as any).tenantId,
    businessId: (session.user as any).businessId,
  }
}

export function requireAuth() {
  return getCurrentUser().then(user => {
    if (!user) throw new Error('Unauthorized')
    return user
  })
}

export function requireRole(...roles: string[]) {
  return requireAuth().then(user => {
    if (!roles.includes(user.role)) throw new Error('Forbidden')
    return user
  })
}
