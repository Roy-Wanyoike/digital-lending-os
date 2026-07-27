import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit-logger'

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
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // On first sign-in, fetch account details to enrich token
        const account = await db.account.findUnique({ where: { id: user.id } })
        if (account) {
          token.accountId = account.id
          token.tenantId = account.tenantId
          token.role = account.role
          token.businessId = account.businessId || null
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).accountId = token.accountId
        (session.user as any).tenantId = token.tenantId
        (session.user as any).role = token.role
        (session.user as any).businessId = token.businessId
      }
      return session
    },
  },
}

import { getServerSession } from 'next-auth'

export { getServerSession }

export async function auth() {
  return getServerSession(authOptions)
}
