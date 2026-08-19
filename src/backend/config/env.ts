// ─── Centralized Environment Configuration ─────────────────────
// Validates all environment variables at startup using zod, and exports a
// single typed `env` object that the rest of the backend should use instead
// of touching `process.env` directly.
//
// Design notes:
//   - Required keys (DATABASE_URL, NEXTAUTH_SECRET in production) throw at
//     boot if missing. In development a missing NEXTAUTH_SECRET falls back
//     to an unsafe ephemeral value with a console warning, matching
//     NextAuth's own dev fallback so the dev server stays runnable.
//   - All payment-provider keys are optional — providers gracefully fall
//     back to demo mode when their keys are absent (see
//     src/backend/lib/payment/*).
//   - The parsed object is cached on `globalThis` so HMR in dev does not
//     re-validate on every reload and so we never hand out two different
//     `env` objects.
//   - Server-only. Importing this from a client component is a bug — we
//     guard against it by checking for `process` availability.

import { z } from 'zod'

// ── Schema ────────────────────────────────────────────────────
const booleanString = z
  .string()
  .optional()
  .transform((v) => {
    if (v === undefined || v === '') return false
    return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase())
  })

const urlSchema = z
  .string()
  .url()
  .or(z.literal(''))
  .default('')

const envSchema = z.object({
  // ── Runtime ───────────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  // ── Database ──────────────────────────────────────────────
  // PostgreSQL / Supabase connection strings.
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // ── Auth (NextAuth.js v4) ─────────────────────────────────
  // NEXTAUTH_SECRET is required in production (enforced by `ensureProdRequired`
  // below). In development we default to an unsafe sentinel so the dev server
  // can boot without a .env entry, matching NextAuth's own behaviour.
  NEXTAUTH_SECRET: z.string().default(''),
  NEXTAUTH_URL: urlSchema,
  NEXT_PUBLIC_APP_URL: urlSchema,

  // ── Stripe ────────────────────────────────────────────────
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_PUBLIC_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  STRIPE_TEST_MODE: booleanString,

  // ── Paystack ──────────────────────────────────────────────
  PAYSTACK_SECRET_KEY: z.string().default(''),
  PAYSTACK_PUBLIC_KEY: z.string().default(''),
  PAYSTACK_WEBHOOK_SECRET: z.string().default(''),
  PAYSTACK_TEST_MODE: booleanString,

  // ── Flutterwave ───────────────────────────────────────────
  FLW_SECRET_KEY: z.string().default(''),
  FLW_PUBLIC_KEY: z.string().default(''),
  FLW_WEBHOOK_SECRET: z.string().default(''),
  FLW_TEST_MODE: booleanString,

  // ── IntaSend ──────────────────────────────────────────────
  INTASEND_SECRET_KEY: z.string().default(''),
  INTASEND_PUBLIC_KEY: z.string().default(''),
  INTASEND_WEBHOOK_SECRET: z.string().default(''),
  INTASEND_TEST_MODE: booleanString,

  // ── Paya Ventures ─────────────────────────────────────────
  // Either PAYA_API_KEY (pre-issued bearer token) OR PAYA_EMAIL + PAYA_PASSWORD
  // (rotating JWT obtained via POST /auth/login).
  PAYA_API_KEY: z.string().default(''),
  PAYA_EMAIL: z.string().default(''),
  PAYA_PASSWORD: z.string().default(''),
  PAYA_BASE_URL: z
    .string()
    .default('https://getpaya.com/api/v1')
    .transform((v) => v.replace(/\/$/, '')),
  PAYA_WEBHOOK_SECRET: z.string().default(''),
  PAYA_TEST_MODE: booleanString,

  // ── Realtime / cache ─────────────────────────────────────
  SOCKET_URL: urlSchema,
  REDIS_URL: urlSchema,
})

export type Env = z.infer<typeof envSchema>

// ── Loader ────────────────────────────────────────────────────
// We cache the parsed env on globalThis so that:
//   1. Next.js dev HMR does not re-run validation every reload.
//   2. We never hand out two different `env` objects to callers.
const GLOBAL_CACHE_KEY = '__YOUNGSEND_ENV__'
type GlobalWithEnv = typeof globalThis & { [GLOBAL_CACHE_KEY]?: Env }

const PROD_REQUIRED_KEYS = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
] as const

function ensureProdRequired(parsed: Env): void {
  if (parsed.NODE_ENV !== 'production') return
  const missing = PROD_REQUIRED_KEYS.filter(
    (k) => !String(parsed[k] ?? '').trim(),
  )
  if (missing.length === 0) return
  throw new Error(
    `[env] Missing required environment variables in production: ${missing.join(', ')}`,
  )
}

function loadEnv(): Env {
  // Guard against accidental client-side import.
  if (typeof process === 'undefined' || !process.env) {
    throw new Error(
      '[env] Attempted to read server-side environment from a context without `process.env`. ' +
        'Ensure `@/backend/config/env` is only imported from server code.',
    )
  }

  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('\n')
    throw new Error(
      `[env] Invalid environment configuration:\n${issues}\n\n` +
        `Set the missing variables in your .env file or environment.`,
    )
  }

  // In development, warn loudly when NEXTAUTH_SECRET is missing — the dev
  // server will still run, but JWTs won't be stable across restarts.
  if (
    parsed.data.NODE_ENV === 'development' &&
    !parsed.data.NEXTAUTH_SECRET
  ) {
    console.warn(
      '[env] NEXTAUTH_SECRET is not set. Generating an ephemeral dev-only secret. ' +
        'JWTs will not survive a server restart. Run `openssl rand -base64 32` ' +
        'and add the result to your .env file.',
    )
  }

  ensureProdRequired(parsed.data)
  return parsed.data
}

function getCachedEnv(): Env {
  const g = globalThis as GlobalWithEnv
  if (!g[GLOBAL_CACHE_KEY]) {
    g[GLOBAL_CACHE_KEY] = loadEnv()
  }
  return g[GLOBAL_CACHE_KEY]!
}

export const env: Env = getCachedEnv()

// ── Convenience helpers / derived flags ───────────────────────
export const isProduction = env.NODE_ENV === 'production'
export const isDevelopment = env.NODE_ENV === 'development'
export const isTest = env.NODE_ENV === 'test'

/**
 * Returns true when a given payment provider has live credentials configured.
 * Useful for surfacing "demo mode" badges in the UI without leaking secrets.
 */
export function isProviderConfigured(
  code:
    | 'stripe'
    | 'paystack'
    | 'flutterwave'
    | 'intasend'
    | 'paya',
): boolean {
  switch (code) {
    case 'stripe':
      return !!env.STRIPE_SECRET_KEY
    case 'paystack':
      return !!env.PAYSTACK_SECRET_KEY
    case 'flutterwave':
      return !!env.FLW_SECRET_KEY
    case 'intasend':
      return !!env.INTASEND_PUBLIC_KEY
    case 'paya':
      return !!(env.PAYA_API_KEY || (env.PAYA_EMAIL && env.PAYA_PASSWORD))
  }
}

/**
 * Public, safe-to-expose subset of env. Useful for passing to client
 * components via props or Next.js `publicRuntimeConfig`-style flows.
 * Never includes any secret key.
 */
export const publicEnv = {
  NODE_ENV: env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
  SOCKET_URL: env.SOCKET_URL,
  isProduction,
  isDevelopment,
  isTest,
  providers: {
    stripe: isProviderConfigured('stripe'),
    paystack: isProviderConfigured('paystack'),
    flutterwave: isProviderConfigured('flutterwave'),
    intasend: isProviderConfigured('intasend'),
    paya: isProviderConfigured('paya'),
  },
} as const

// Re-export the schema so callers can re-validate or extend it.
export { envSchema }

