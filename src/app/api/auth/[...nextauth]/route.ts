import { NextRequest, NextResponse } from 'next/server'
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimit } from '@/backend/middleware/rate-limiter'

const nextAuthHandler = NextAuth(authOptions)

export async function GET(req: NextRequest) {
  return nextAuthHandler(req)
}

export async function POST(req: NextRequest) {
  // ── Rate-limit credential sign-in attempts ──────────────────
  // We only rate-limit the POST path (sign-in).  Non-credential flows
  // (session, CSRF, callbacks) are untouched.
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  const result = rateLimit(ip, 5, 60 * 1000)

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Too many sign-in attempts. Please try again later.',
        retryAfterMs: result.retryAfterMs,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.retryAfterMs ?? 60000) / 1000)),
        },
      },
    )
  }

  return nextAuthHandler(req)
}
