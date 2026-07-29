import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit-logger'
import { rateLimit } from '@/backend/middleware/rate-limiter'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email.toLowerCase()

        // Rate-limit login attempts per email (5 per minute)
        const rl = rateLimit(`login:${email}`, 5, 60 * 1000)
        if (!rl.allowed) {
          logAudit('login.rate_limited', 'anonymous', `Rate-limited login for ${email}`, { email, retryAfterMs: rl.retryAfterMs })
          throw new Error(`Too many login attempts. Try again in ${Math.ceil((rl.retryAfterMs ?? 60000) / 1000)} seconds.`)
        }

        // Find account by email — may be multiple tenants, take first active one
        const account = await db.account.findFirst({
          where: { email, isActive: true },
        })

        if (!account) {
          logAudit('login.failed', 'anonymous', `Failed login for ${email} — account not found`, { email })
          return null
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          account.passwordHash
        )

        if (!isValidPassword) {
          logAudit('login.failed', account.id, `Failed login for ${email} — invalid password`, { email, accountId: account.id })
          return null
        }

        // Update last login
        await db.account.update({
          where: { id: account.id },
          data: { lastLoginAt: new Date() },
        })

        logAudit('login.success', account.id, `User ${email} signed in`, { email, accountId: account.id, tenantId: account.tenantId })

        return {
          id: account.id,
          email: account.email,
          name: account.name,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // On first sign-in, fetch account details to enrich token
        const account = await db.account.findUnique({ where: { id: user.id } })
        if (account) {
          // Use nested object to avoid property name collisions with
          // NextAuth internals in production minified builds
          token.youngsend = {
            accountId: account.id,
            tenantId: account.tenantId,
            role: account.role,
            businessId: account.businessId || null,
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const ys = (token as any).youngsend || {}
        // NextAuth v4 doesn't expose user.id by default — add it from token.sub
        ;(session.user as any).id = token.sub
        ;(session.user as any).accountId = ys.accountId
        ;(session.user as any).tenantId = ys.tenantId
        ;(session.user as any).role = ys.role
        ;(session.user as any).businessId = ys.businessId
      }
      return session
    },
  },
}

import { getServerSession } from 'next-auth'

export { getServerSession }

export async function auth() {
  try {
    return await getServerSession(authOptions)
  } catch {
    return null
  }
}
