// Server-side helpers for API route authentication
// Use these in API routes to get the current user from the JWT

import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'

export interface ApiUser {
  id: string
  email: string
  name: string
  role: string
  tenantId: string
  businessId: string | null
}

/**
 * Extract and validate the JWT token from the request.
 * Returns the user info or throws an error.
 */
export async function getApiUser(req: NextRequest): Promise<ApiUser> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token) {
    throw new AuthError('Unauthorized', 401)
  }

  return {
    id: token.accountId as string,
    email: token.email as string,
    name: token.name as string,
    role: (token.role as string) || 'viewer',
    tenantId: token.tenantId as string,
    businessId: (token.businessId as string) || null,
  }
}

/**
 * Get the current user's tenant ID from the request JWT.
 * Useful for filtering queries by tenant.
 */
export async function getTenantId(req: NextRequest): Promise<string> {
  const user = await getApiUser(req)
  return user.tenantId
}

/**
 * Require a specific role. Throws 403 if user doesn't have the required role.
 */
export async function requireRole(req: NextRequest, ...roles: string[]): Promise<ApiUser> {
  const user = await getApiUser(req)
  if (!roles.includes(user.role)) {
    throw new AuthError('Forbidden: insufficient permissions', 403)
  }
  return user
}

/**
 * Require admin role.
 */
export async function requireAdmin(req: NextRequest): Promise<ApiUser> {
  return requireRole(req, 'admin')
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'AuthError'
  }
}

/**
 * Build a tenant-scoped where clause for Prisma queries.
 * All business-related queries should be scoped to the user's tenant.
 */
export function tenantScope(tenantId: string) {
  return { tenantId }
}
