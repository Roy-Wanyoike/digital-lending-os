import type { DefaultSession, NextAuthOptions } from 'next-auth'
import { getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit-logger'
import { rateLimit } from '@/backend/middleware/rate-limiter'

// ─── Augment NextAuth session types ───────────────────────────────────
//
declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      accountId: string
      tenantId: string
      role: string
      businessId: string | null
    }
  }
  interface User {
    id: string
    email: string
    name: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    youngsend?: {
      accountId: string
      tenantId: string
      role: string
      businessId: string | null
      iat: number
    }
  }
}

// ─── Runtime validation of critical env vars ───────────────────────
if (!process.env.NEXTAUTH_SECRET) {
  console.error(
    '[AUTH CRITICAL] NEXTAUTH_SECRET is not set. ' +
    'Sessions will be insecure. Set it in .env or environment variables.'
  )
}

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

        // ─── Rate-limit login attempts per email (5 per minute) ───
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

        // Null-guard: if passwordHash is missing the account is misconfigured.
        // Treat as invalid password rather than letting bcrypt crash on null/undefined.
        if (!account.passwordHash) {
          logAudit('login.failed', account.id, `Failed login for ${email} — missing password hash`, { email, accountId: account.id })
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
    // Max 24 hours — short enough to limit window of token theft,
    // long enough to not inconvenience users. Refresh via re-login.
    maxAge: 24 * 60 * 60,
    // updateAge must be <= maxAge; when equal the session is not refreshed
    // on activity. The short maxAge + re-login requirement provides equivalent
    // security to sliding expiry.
    updateAge: 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  // Secret from env — validated above at startup
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // On first sign-in, fetch account details to enrich token.
        // This runs once per session creation, not on every request.
        const account = await db.account.findUnique({ where: { id: user.id } })
        if (account) {
          token.youngsend = {
            accountId: account.id,
            tenantId: account.tenantId,
            role: account.role,
            businessId: account.businessId || null,
            // Token creation timestamp for potential rotation logic
            iat: Date.now(),
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const ys = token.youngsend
        session.user.id = token.sub!
        session.user.accountId = ys?.accountId ?? ''
        session.user.tenantId = ys?.tenantId ?? ''
        session.user.role = ys?.role ?? ''
        session.user.businessId = ys?.businessId ?? null
      }
      return session
    },
  },
}

export { getServerSession }

/**
 * Convenience wrapper that returns null on any session error.
 * Use this in RSC pages where you want graceful degradation.
 */
export async function auth() {
  try {
    return await getServerSession(authOptions)
  } catch {
    return null
  }
}
