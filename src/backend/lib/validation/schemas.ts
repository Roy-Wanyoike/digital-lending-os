// ─── Shared Zod Validation Schemas ──────────────────────────────────────
//
// Reusable schemas for common API inputs. Import and compose these in
// route-specific schemas.  All schemas use .transform() or .default()
// where sensible so that parsed output is always the correct type.
//

import { z } from 'zod'

// ─── Primitives ─────────────────────────────────────────────────────────

/** Valid CUID / CUID2 identifier (at least 2 chars, alphanumeric + hyphens) */
export const idParamSchema = z
  .string()
  .min(2, 'ID is required')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format')

/** ISO 4217 3-letter uppercase currency code */
export const currencySchema = z
  .string()
  .length(3, 'Currency must be a 3-letter ISO 4217 code')
  .uppercase()
  .regex(/^[A-Z]{3}$/, 'Currency must be exactly 3 uppercase letters')

/** Positive number, max 999,999,999 (roughly $1B) */
export const amountSchema = z
  .number({ invalid_type_error: 'Amount must be a number', required_error: 'Amount is required' })
  .positive('Amount must be greater than zero')
  .max(999_999_999, 'Amount exceeds maximum allowed')

/** RFC-compliant email, max 254 chars */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(254, 'Email is too long')
  .toLowerCase()
  .trim()

// ─── Pagination ─────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z
    .string()
    .default('1')
    .transform((v) => {
      const n = parseInt(v, 10)
      return Number.isNaN(n) || n < 1 ? 1 : n
    }),
  limit: z
    .string()
    .default('20')
    .transform((v) => {
      const n = parseInt(v, 10)
      if (Number.isNaN(n) || n < 1) return 20
      return Math.min(n, 200) // hard cap at 200
    }),
  sortBy: z.string().optional(),
  sortOrder: z
    .enum(['asc', 'desc'])
    .default('desc')
    .optional(),
})

export type PaginationInput = z.infer<typeof paginationSchema>

// ─── Business ───────────────────────────────────────────────────────────

export const businessCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Business name is required')
    .max(200, 'Business name is too long')
    .trim(),
  description: z.string().max(2000).trim().default(''),
  industry: z.string().max(100).trim().default(''),
  website: z
    .string()
    .url('Invalid URL format')
    .max(2048, 'URL is too long')
    .trim()
    .default('')
    .or(z.literal('')),
  logoUrl: z
    .string()
    .url('Invalid logo URL')
    .max(2048)
    .trim()
    .default('')
    .or(z.literal('')),
  country: z.string().length(2, 'Country must be a 2-letter ISO code').toUpperCase().default('US'),
})

export type BusinessCreateInput = z.infer<typeof businessCreateSchema>

// ─── Invoice ────────────────────────────────────────────────────────────

export const invoiceCreateSchema = z.object({
  businessId: idParamSchema,
  amount: amountSchema,
  currency: currencySchema.default('USD'),
  description: z.string().max(2000).trim().default(''),
  dueDate: z
    .string()
    .datetime({ offset: true })
    .or(z.literal(''))
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
})

export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>

// ─── Deposit ────────────────────────────────────────────────────────────

export const depositCreateSchema = z.object({
  walletId: idParamSchema,
  amount: amountSchema,
  paymentMethod: z.enum(['bank_transfer', 'mobile_money', 'card', 'external'], {
    required_error: 'paymentMethod is required',
  }),
  provider: z.string().max(50).trim().optional(),
  bankName: z.string().max(200).trim().optional(),
  notes: z.string().max(1000).trim().optional(),
})

export type DepositCreateInput = z.infer<typeof depositCreateSchema>
