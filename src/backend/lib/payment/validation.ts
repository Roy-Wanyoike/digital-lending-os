// ─── Payment Input Validation ──────────────────────────────────────
//
// Zod-based validation for payment initiation, webhook payloads, and
// general input sanitization. Includes provider-specific webhook
// signature verification.
//

import { z } from 'zod'
import { createHmac } from 'crypto'

// ── Constants ──────────────────────────────────────────────────────

const ALLOWED_CURRENCIES = new Set([
  'USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR', 'UGX', 'TZS',
  'RWF', 'BRL', 'INR', 'PHP', 'MXN', 'CAD', 'AUD', 'JPY', 'CNY',
])

const ALLOWED_PROVIDERS = ['stripe', 'paystack', 'flutterwave', 'intasend', 'paya'] as const

const MAX_AMOUNT = 10_000_000_00 // $100M in smallest unit

// ── Payment Initiation Schema ───────────────────────────────────────

export const PaymentInitiationSchema = z.object({
  amount: z
    .number({
      message: 'Amount is required and must be a number',
    })
    .int({ message: 'Amount must be an integer (smallest currency unit)' })
    .positive({ message: 'Amount must be greater than zero' })
    .min(1, { message: 'Minimum amount is 1 (smallest currency unit)' })
    .max(MAX_AMOUNT, { message: `Amount cannot exceed ${MAX_AMOUNT}` }),

  currency: z
    .string()
    .min(3, { message: 'Currency must be a 3-letter ISO 4217 code' })
    .max(3, { message: 'Currency must be a 3-letter ISO 4217 code' })
    .uppercase()
    .refine((c) => ALLOWED_CURRENCIES.has(c), {
      message: `Currency not supported. Allowed: ${[...ALLOWED_CURRENCIES].join(', ')}`,
    }),

  provider: z.enum(ALLOWED_PROVIDERS, {
    message: 'Provider is required',
  }),

  email: z
    .string()
    .email({ message: 'Invalid email format' })
    .max(254, { message: 'Email too long' })
    .toLowerCase()
    .trim(),

  firstName: z.string().max(100).trim().optional(),
  lastName: z.string().max(100).trim().optional(),
  phone: z.string().max(20).trim().optional(),

  reference: z
    .string()
    .min(1, { message: 'Reference is required' })
    .max(255, { message: 'Reference too long' })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: 'Reference must be alphanumeric (hyphens/underscores allowed)' }),

  callbackUrl: z.string().url({ message: 'Invalid callback URL' }).max(2048).optional(),
  redirectUrl: z.string().url({ message: 'Invalid redirect URL' }).max(2048).optional(),

  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),

  idempotencyKey: z
    .string()
    .min(1, { message: 'Idempotency key is required' })
    .max(255, { message: 'Idempotency key too long' })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: 'Idempotency key must be alphanumeric' }),
})

export type PaymentInitiationInput = z.infer<typeof PaymentInitiationSchema>

export function validatePaymentInitiation(data: unknown): PaymentInitiationInput {
  return PaymentInitiationSchema.parse(data)
}

// ── Webhook Payload Schemas (per provider) ──────────────────────────

export const PaystackWebhookSchema = z.object({
  event: z.string(),
  data: z.object({
    id: z.number(),
    domain: z.string(),
    status: z.string(),
    reference: z.string(),
    amount: z.number(),
    paid_at: z.string().optional(),
    channel: z.string().optional(),
    currency: z.string(),
    customer: z.object({
      email: z.string(),
    }).optional(),
  }),
})

export const StripeWebhookSchema = z.object({
  id: z.string(),
  object: z.literal('event'),
  type: z.string(),
  data: z.object({
    object: z.object({
      id: z.string(),
      amount: z.number(),
      currency: z.string(),
      status: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
})

export const FlutterwaveWebhookSchema = z.object({
  event: z.string(),
  data: z.object({
    id: z.number(),
    tx_ref: z.string(),
    flw_ref: z.string(),
    amount: z.number(),
    currency: z.string(),
    status: z.string(),
    customer: z.object({
      email: z.string(),
    }).optional(),
  }),
})

export const IntasendWebhookSchema = z.object({
  event_type: z.string(),
  payload: z.object({
    invoice_id: z.string(),
    state: z.string(),
    amount: z.number(),
    currency: z.string(),
    customer: z.object({
      email: z.string(),
    }).optional(),
  }),
})

export const PayaWebhookSchema = z.object({
  eventType: z.string(),
  paymentId: z.string(),
  status: z.string(),
  amount: z.number(),
  currency: z.string(),
  reference: z.string().optional(),
  timestamp: z.string().optional(),
})

export type PaystackWebhookPayload = z.infer<typeof PaystackWebhookSchema>
export type StripeWebhookPayload = z.infer<typeof StripeWebhookSchema>
export type FlutterwaveWebhookPayload = z.infer<typeof FlutterwaveWebhookSchema>
export type IntasendWebhookPayload = z.infer<typeof IntasendWebhookSchema>
export type PayaWebhookPayload = z.infer<typeof PayaWebhookSchema>

// ── Webhook Signature Verification ──────────────────────────────────

export interface SignatureVerificationResult {
  valid: boolean
  error?: string
}

/**
 * Verify a Paystack webhook signature.
 * Paystack uses HMAC-SHA512 of the raw body with the secret key.
 */
export function verifyPaystackSignature(
  rawBody: string,
  signature: string,
  secretKey: string,
): SignatureVerificationResult {
  try {
    const expected = createHmac('sha512', secretKey).update(rawBody, 'utf8').digest('hex')
    if (!timingSafeEqual(expected, signature)) {
      return { valid: false, error: 'Signature mismatch' }
    }
    const parsed = PaystackWebhookSchema.safeParse(JSON.parse(rawBody))
    if (!parsed.success) {
      return { valid: false, error: 'Payload validation failed' }
    }
    return { valid: true }
  } catch (err) {
    return { valid: false, error: `Verification error: ${err}` }
  }
}

/**
 * Verify a Stripe webhook signature.
 * Stripe uses HMAC-SHA256 with a timestamp and signed payload.
 */
export function verifyStripeSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string,
): SignatureVerificationResult {
  try {
    // Stripe signature format: t=<timestamp>,v1=<signature>
    const elements = signature.split(',')
    let timestamp = ''
    let v1Signature = ''

    for (const element of elements) {
      const [key, value] = element.split('=')
      if (key === 't') timestamp = value
      if (key === 'v1') v1Signature = value
    }

    if (!timestamp || !v1Signature) {
      return { valid: false, error: 'Invalid signature format' }
    }

    // Check timestamp freshness (reject events older than 5 minutes)
    const eventTime = parseInt(timestamp, 10) * 1000
    const now = Date.now()
    if (Math.abs(now - eventTime) > 5 * 60 * 1000) {
      return { valid: false, error: 'Signature timestamp too old' }
    }

    const signedPayload = `${timestamp}.${rawBody}`
    const expected = createHmac('sha256', webhookSecret).update(signedPayload, 'utf8').digest('hex')

    if (!timingSafeEqual(expected, v1Signature)) {
      return { valid: false, error: 'Signature mismatch' }
    }

    const parsed = StripeWebhookSchema.safeParse(JSON.parse(rawBody))
    if (!parsed.success) {
      return { valid: false, error: 'Payload validation failed' }
    }

    return { valid: true }
  } catch (err) {
    return { valid: false, error: `Verification error: ${err}` }
  }
}

/**
 * Verify a Flutterwave webhook signature.
 * Flutterwave uses HMAC-SHA256 of the raw JSON body.
 */
export function verifyFlutterwaveSignature(
  rawBody: string,
  signature: string,
  secretHash: string,
): SignatureVerificationResult {
  try {
    const expected = createHmac('sha256', secretHash).update(rawBody, 'utf8').digest('hex')
    if (!timingSafeEqual(expected, signature)) {
      return { valid: false, error: 'Signature mismatch' }
    }
    const parsed = FlutterwaveWebhookSchema.safeParse(JSON.parse(rawBody))
    if (!parsed.success) {
      return { valid: false, error: 'Payload validation failed' }
    }
    return { valid: true }
  } catch (err) {
    return { valid: false, error: `Verification error: ${err}` }
  }
}

/**
 * Verify an Intasend webhook signature.
 * Intasend uses HMAC-SHA256 of specific fields.
 */
export function verifyIntasendSignature(
  rawBody: string,
  signature: string,
  apiKey: string,
): SignatureVerificationResult {
  try {
    const expected = createHmac('sha256', apiKey).update(rawBody, 'utf8').digest('hex')
    if (!timingSafeEqual(expected, signature)) {
      return { valid: false, error: 'Signature mismatch' }
    }
    const parsed = IntasendWebhookSchema.safeParse(JSON.parse(rawBody))
    if (!parsed.success) {
      return { valid: false, error: 'Payload validation failed' }
    }
    return { valid: true }
  } catch (err) {
    return { valid: false, error: `Verification error: ${err}` }
  }
}

/**
 * Verify a Paya webhook signature.
 * Paya uses HMAC-SHA256 of the raw body.
 */
export function verifyPayaSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string,
): SignatureVerificationResult {
  try {
    const expected = createHmac('sha256', webhookSecret).update(rawBody, 'utf8').digest('hex')
    if (!timingSafeEqual(expected, signature)) {
      return { valid: false, error: 'Signature mismatch' }
    }
    const parsed = PayaWebhookSchema.safeParse(JSON.parse(rawBody))
    if (!parsed.success) {
      return { valid: false, error: 'Payload validation failed' }
    }
    return { valid: true }
  } catch (err) {
    return { valid: false, error: `Verification error: ${err}` }
  }
}

/**
 * Unified webhook signature verification dispatcher.
 */
export function verifyWebhookPayload(
  provider: string,
  rawBody: string,
  signature: string,
  secret: string,
): SignatureVerificationResult {
  switch (provider) {
    case 'paystack':
      return verifyPaystackSignature(rawBody, signature, secret)
    case 'stripe':
      return verifyStripeSignature(rawBody, signature, secret)
    case 'flutterwave':
      return verifyFlutterwaveSignature(rawBody, signature, secret)
    case 'intasend':
      return verifyIntasendSignature(rawBody, signature, secret)
    case 'paya':
      return verifyPayaSignature(rawBody, signature, secret)
    default:
      return { valid: false, error: `Unknown provider: ${provider}` }
  }
}

// ── Input Sanitization ──────────────────────────────────────────────

/**
 * Patterns that indicate potential injection attacks.
 */
const INJECTION_PATTERNS = [
  /(<\s*script[^>]*>)/gi,           // XSS: <script tags
  /(javascript\s*:\s*)/gi,         // XSS: javascript: protocol
  /(on\w+\s*=\s*["'])/gi,        // XSS: event handlers
  /(\$\{.*\})/g,                   // Template injection
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC)\b.*\b(FROM|INTO|WHERE|SET|TABLE|DATABASE)\b)/gi, // SQL injection
  /(\{\s*\$\w+\s*:\s*\{)/g,       // NoSQL injection
  /(<\s*iframe[^>]*>)/gi,           // iframe injection
  /(data\s*:\s*text\/html)/gi,     // data URI injection
  /(expression\s*\(\s*\))/gi,     // Expression injection
]

/**
 * Sanitize a string input to prevent XSS, SQL injection, and NoSQL injection.
 * Returns the sanitized string and a list of detected threats.
 */
export function sanitizeInput(input: string): {
  sanitized: string
  threats: string[]
} {
  const threats: string[] = []
  let sanitized = input

  for (const pattern of INJECTION_PATTERNS) {
    const matches = sanitized.match(pattern)
    if (matches) {
      threats.push(`Potential injection detected: ${matches[0].substring(0, 50)}`)
    }
  }

  // HTML entity encode <, >, &, ", '
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

  return { sanitized, threats }
}

/**
 * Sanitize all string values in an object recursively.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): {
  sanitized: T
  threats: string[]
} {
  const allThreats: string[] = []
  const sanitized = { ...obj } as Record<string, unknown>

  function walk(current: unknown): unknown {
    if (typeof current === 'string') {
      const result = sanitizeInput(current)
      allThreats.push(...result.threats)
      return result.sanitized
    }
    if (Array.isArray(current)) {
      return current.map(walk)
    }
    if (current !== null && typeof current === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(current)) {
        out[k] = walk(v)
      }
      return out
    }
    return current
  }

  const result = walk(obj)
  return { sanitized: result as T, threats: allThreats }
}

// ── Timing-Safe Comparison ──────────────────────────────────────────

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false

  // Use Node's timingSafeEqual
  const crypto = require('crypto') as typeof import('crypto')
  return crypto.timingSafeEqual(bufA, bufB)
}
