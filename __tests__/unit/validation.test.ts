/**
 * Unit tests for payment validation — no server required.
 * Tests amount, email, and currency validation via Zod schemas.
 */
import { describe, it, expect } from 'vitest'
import { PaymentInitiationSchema } from '@/backend/lib/payment/validation'

describe('Payment Validation', () => {
  // ── Valid payment amount ────────────────────────────────────────
  describe('valid amounts', () => {
    const base = {
      currency: 'USD',
      provider: 'stripe',
      email: 'user@example.com',
      reference: 'order-123',
      idempotencyKey: 'idem-001',
    }

    it('accepts a valid positive integer amount', () => {
      const result = PaymentInitiationSchema.safeParse({ ...base, amount: 1000 })
      expect(result.success).toBe(true)
    })

    it('accepts amount = 1 (minimum)', () => {
      const result = PaymentInitiationSchema.safeParse({ ...base, amount: 1 })
      expect(result.success).toBe(true)
    })

    it('accepts large valid amount', () => {
      const result = PaymentInitiationSchema.safeParse({ ...base, amount: 9_999_999_99 })
      expect(result.success).toBe(true)
    })
  })

  // ── Invalid amounts ─────────────────────────────────────────────
  describe('invalid amounts', () => {
    const base = {
      currency: 'USD',
      provider: 'stripe',
      email: 'user@example.com',
      reference: 'order-123',
      idempotencyKey: 'idem-002',
    }

    it('rejects negative amount', () => {
      const result = PaymentInitiationSchema.safeParse({ ...base, amount: -100 })
      expect(result.success).toBe(false)
    })

    it('rejects zero amount', () => {
      const result = PaymentInitiationSchema.safeParse({ ...base, amount: 0 })
      expect(result.success).toBe(false)
    })

    it('rejects amount that is too large', () => {
      const result = PaymentInitiationSchema.safeParse({ ...base, amount: 10_000_000_01 })
      expect(result.success).toBe(false)
    })

    it('rejects non-integer (float) amount', () => {
      const result = PaymentInitiationSchema.safeParse({ ...base, amount: 10.5 })
      expect(result.success).toBe(false)
    })

    it('rejects string amount', () => {
      const result = PaymentInitiationSchema.safeParse({ ...base, amount: '100' as unknown as number })
      expect(result.success).toBe(false)
    })
  })

  // ── Email validation ────────────────────────────────────────────
  describe('email validation', () => {
    const base = {
      amount: 1000,
      currency: 'USD',
      provider: 'stripe',
      reference: 'order-email',
      idempotencyKey: 'idem-email',
    }

    it('accepts valid email', () => {
      const result = PaymentInitiationSchema.safeParse({ ...base, email: 'user@example.com' })
      expect(result.success).toBe(true)
    })

    it('accepts email with subdomain', () => {
      const result = PaymentInitiationSchema.safeParse({ ...base, email: 'user@mail.example.co.uk' })
      expect(result.success).toBe(true)
    })

    it('rejects missing @ sign', () => {
      const result = PaymentInitiationSchema.safeParse({ ...base, email: 'userexample.com' })
      expect(result.success).toBe(false)
    })

    it('rejects empty string email', () => {
      const result = PaymentInitiationSchema.safeParse({ ...base, email: '' })
      expect(result.success).toBe(false)
    })

    it('rejects email with leading/trailing spaces (Zod v4 trim is a validator)', () => {
      const result = PaymentInitiationSchema.safeParse({ ...base, email: '  User@Example.COM  ' })
      // Zod v4: .trim() validates no whitespace, does not transform
      expect(result.success).toBe(false)
    })

    it('lowercases email via Zod v4 toLowerCase transform', () => {
      const result = PaymentInitiationSchema.parse({ ...base, email: 'User@Example.COM' })
      // Zod v4: .toLowerCase() transforms the value to lowercase
      expect(result.email).toBe('user@example.com')
    })
  })

  // ── Currency validation ─────────────────────────────────────────
  describe('currency validation', () => {
    const base = {
      amount: 1000,
      provider: 'stripe',
      email: 'user@example.com',
      reference: 'order-curr',
      idempotencyKey: 'idem-curr',
    }

    it('accepts USD', () => {
      const result = PaymentInitiationSchema.safeParse({ ...base, currency: 'USD' })
      expect(result.success).toBe(true)
    })

    it('accepts NGN', () => {
      const result = PaymentInitiationSchema.safeParse({ ...base, currency: 'NGN' })
      expect(result.success).toBe(true)
    })

    it('accepts EUR, GBP, KES, GHS', () => {
      for (const c of ['EUR', 'GBP', 'KES', 'GHS'] as const) {
        const result = PaymentInitiationSchema.safeParse({ ...base, currency: c })
        expect(result.success).toBe(true)
      }
    })

    it('rejects lowercase currency (Zod v4 uppercase is a validator, not transform)', () => {
      const result = PaymentInitiationSchema.safeParse({ ...base, currency: 'usd' })
      // Zod v4: .uppercase() validates no lowercase chars, does not transform
      expect(result.success).toBe(false)
    })

    it('rejects unsupported currency XYZ', () => {
      const result = PaymentInitiationSchema.safeParse({ ...base, currency: 'XYZ' })
      expect(result.success).toBe(false)
    })

    it('rejects 2-letter currency code', () => {
      const result = PaymentInitiationSchema.safeParse({ ...base, currency: 'US' })
      expect(result.success).toBe(false)
    })

    it('rejects 4-letter currency code', () => {
      const result = PaymentInitiationSchema.safeParse({ ...base, currency: 'USDD' })
      expect(result.success).toBe(false)
    })
  })
})
