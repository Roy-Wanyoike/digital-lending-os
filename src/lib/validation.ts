/**
 * Digital Lending OS - Input Validation Utilities
 * 
 * Comprehensive Zod schemas for validating all API inputs.
 * Designed for financial applications with strict validation requirements.
 * 
 * Features:
 * - Pagination parameters (page, limit, sortBy, sortOrder)
 * - Date range validation (ISO 8601)
 * - ID parameter validation (CUID format)
 * - Kenyan phone number format
 * - Monetary amount bounds
 * - Email address format
 * - KRA PIN validation
 * - Common entity schemas
 * 
 * @module validation
 */

import { z } from 'zod';

// ============================================================
// Base Types & Constants
// ============================================================

/**
 * Valid sort orders for query parameters
 */
export const SORT_ORDER_VALUES = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDER_VALUES)[number];

/**
 * Default pagination values
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;
export const MIN_LIMIT = 1;

/**
 * Monetary value constraints for Kenyan lending context
 */
export const MONETARY_CONSTRAINTS = {
  /** Minimum transaction amount (KSh) */
  MIN_AMOUNT: 0.01,
  /** Maximum single STK Push amount (KSh) - Safaricom limit */
  MAX_STK_PUSH_AMOUNT: 150000,
  /** Maximum loan amount (KSh) - configurable per product */
  MAX_LOAN_AMOUNT: 10000000, // 10M KSh
  /** Maximum daily transaction limit (KSh) */
  MAX_DAILY_TRANSACTION: 1000000,
  /** Decimal places for monetary amounts */
  DECIMAL_PLACES: 2,
} as const;

/**
 * Phone number formats accepted
 */
export const PHONE_FORMATS = {
  /** International format (+254...) */
  INTERNATIONAL: /^\+254[17]\d{8}$/,
  /** E.164 format (254...) without plus */
  E164: /^254[17]\d{8}$/,
  /** Local format starting with 0 (07xx/01xx) */
  LOCAL: /^0[17]\d{8}$/,
  /** Short code format */
  SHORT_CODE:/^\d{4,6}$/,
} as const;

// ============================================================
// Common Schemas
// ============================================================

/**
 * Pagination schema for list endpoints.
 * Validates page, limit, and sorting parameters.
 * 
 * @example
 * ```typescript
 * const query = paginationSchema.parse(Object.fromEntries(searchParams));
 * // Returns: { page: 1, limit: 50, sortBy: 'createdAt', sortOrder: 'desc' }
 * ```
 */
export const paginationSchema = z.object({
  /** Page number (1-based) */
  page: z
    .coerce.number()
    .int()
    .positive()
    .default(DEFAULT_PAGE)
    .refine((val) => val <= 100000, {
      message: 'Page number too large',
    }),
  
  /** Items per page */
  limit: z
    .coerce.number()
    .int()
    .positive()
    .default(DEFAULT_LIMIT)
    .refine((val) => val >= MIN_LIMIT && val <= MAX_LIMIT, {
      message: `Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`,
    }),
  
  /** Field to sort by */
  sortBy: z
    .string()
    .max(50)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, {
      message: 'Invalid sort field name',
    })
    .default('createdAt'),
  
  /** Sort direction */
  sortOrder: z
    .enum(SORT_ORDER_VALUES)
    .default('desc'),
  
  /** Optional cursor for cursor-based pagination */
  cursor: z.string().cuid2().optional(),
  
  /** Search/filter term */
  search: z.string().max(200).trim().optional(),
}).transform((data) => ({
  ...data,
  skip: (data.page - 1) * data.limit,
}));

/**
 * Type derived from pagination schema
 */
export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Date range schema for filtering records by date.
 * All dates must be ISO 8601 formatted strings.
 * 
 * @example
 * ```typescript
 * const { startDate, endDate } = dateRangeSchema.parse(query);
 * ```
 */
export const dateRangeSchema = z.object({
  /** Start date (inclusive) - ISO 8601 */
  startDate: z
    .string()
    .datetime({ message: 'Start date must be valid ISO 8601 datetime' })
    .optional(),
  
  /** End date (inclusive) - ISO 8601 */
  endDate: z
    .string()
    .datetime({ message: 'End date must be valid ISO 8601 datetime' })
    .optional(),
})
.refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'Start date must be before end date',
    path: ['startDate'],
  }
);

/**
 * Type derived from date range schema
 */
export type DateRangeInput = z.infer<typeof dateRangeSchema>;

/**
 * Schema for CUID/CUID2 identifiers used as primary keys.
 * Validates that the string looks like a valid CUID.
 */
export const cuidSchema = z
  .string()
  .min(10)
  .max(30)
  .regex(/^c[^\s]{8,28}$/i, {
    message: 'Invalid ID format',
  });

/**
 * Schema for CUID2 identifiers (newer format)
 */
export const cuid2Schema = z
  .string()
  .min(20)
  .max(30)
  .regex(/^[a-z][\w-]{19,29}$/, {
    message: 'Invalid ID format',
  });

/**
 * Generic ID parameter schema - accepts both CUID and CUID2
 */
export const idParamSchema = z.union([cuidSchema, cuid2Schema]);

/**
 * Type for validated IDs
 */
export type ValidatedId = z.infer<typeof idParamSchema>;

// ============================================================
// Contact Information Schemas
// ============================================================

/**
 * Kenyan phone number schema.
 * Accepts multiple formats:
 * - International: +254712345678 or +254112345678
 * - E.164: 254712345678
 * - Local: 0712345678 or 0112345678
 * 
 * Normalizes to international format (+254...) on success.
 */
export const kenyanPhoneSchema = z
  .string()
  .trim()
  .min(10)
  .max(13)
  .refine(
    (phone) => {
      const cleaned = phone.replace(/[+\s-]/g, '');
      return (
        PHONE_FORMATS.INTernational.test(phone) ||
        PHONE_FORMATS.E164.test(cleaned) ||
        PHONE_FORMATS.LOCAL.test(cleaned)
      );
    },
    {
      message:
        'Invalid Kenyan phone number. Use format: +2547XXXXXXXX, 2547XXXXXXXX, or 07XXXXXXXX',
    }
  )
  .transform((phone): string => {
    // Normalize to +254... format
    let cleaned = phone.replace(/[+\s-]/g, '');
    
    if (PHONE_FORMATS.LOCAL.test(cleaned)) {
      // Convert 07XX to +2547XX
      return '+254' + cleaned.slice(1);
    }
    
    if (PHONE_FORMATS.E164.test(cleaned)) {
      return '+' + cleaned;
    }
    
    return phone; // Already in international format
  });

/**
 * Type for normalized Kenyan phone number
 */
export type KenyanPhone = z.infer<typeof kenyanPhoneSchema>;

/**
 * Email address schema with strict validation.
 */
export const emailSchema = z
  .string()
  .email('Invalid email address format')
  .max(254, 'Email address too long')
  .toLowerCase()
  .refine(
    (email) => !email.startsWith('.') && !email.endsWith('.'),
    {
      message: 'Email cannot start or end with a dot',
    }
  )
  .refine(
    (email) => {
      // Check for common disposable email domains (optional security measure)
      const disposableDomains = [
        'tempmail.com',
        'throwaway.com',
        'guerrillamail.com',
      ];
      const domain = email.split('@')[1];
      return !disposableDomains.includes(domain);
    },
    {
      message: 'Disposable email addresses are not allowed',
    }
  );

/**
 * Type for validated email
 */
export type ValidatedEmail = z.infer<typeof emailSchema>;

// ============================================================
// Financial Schemas
// ============================================================

/**
 * Positive decimal number schema for monetary amounts.
 * Ensures values are positive numbers with proper decimal handling.
 */
export const positiveAmountSchema = z
  .number({
    required_error: 'Amount is required',
    invalid_type_error: 'Amount must be a number',
  })
  .positive('Amount must be greater than zero')
  .finite('Amount must be a finite number')
  .refine(
    (amount) => {
      // Ensure max 2 decimal places
      const decimals = amount.toString().split('.')[1]?.length || 0;
      return decimals <= MONETARY_CONSTRAINTS.DECIMAL_PLACES;
    },
    {
      message: `Amount cannot have more than ${MONETARY_CONSTRAINTS.DECIMAL_PLACES} decimal places`,
    }
  );

/**
 * Non-negative amount schema (allows zero).
 */
export const nonNegativeAmountSchema = positiveAmountSchema.or(
  z.literal(0)
);

/**
 * Loan amount schema with upper bound check.
 */
export const loanAmountSchema = positiveAmountSchema.refine(
  (amount) => amount >= 100,
  {
    message: `Minimum loan amount is KSh 100`,
  }
).refine(
  (amount) => amount <= MONETARY_CONSTRAINTS.MAX_LOAN_AMOUNT,
  {
    message: `Maximum loan amount is KSh ${MONETARY_CONSTRAINTS.MAX_LOAN_AMOUNT.toLocaleString()}`,
  }
);

/**
 * STK Push amount schema with M-Pesa limits.
 */
export const stkPushAmountSchema = positiveAmountSchema.refine(
  (amount) => amount >= 10,
  {
    message: 'Minimum M-Pesa amount is KSh 10',
  }
).refine(
  (amount) => amount <= MONETARY_CONSTRAINTS.MAX_STK_PUSH_AMOUNT,
  {
    message: `Maximum STK Push amount is KSh ${MONETARY_CONSTRAINTS.MAX_STK_PUSH_AMOUNT.toLocaleString()}`,
  }
);

/**
 * Percentage schema (0-100).
 */
export const percentageSchema = z
  .number()
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100')
  .refine(
    (pct) => {
      const decimals = pct.toString().split('.')[1]?.length || 0;
      return decimals <= 2;
    },
    {
      message: 'Percentage cannot have more than 2 decimal places',
    }
  );

/**
 * Interest rate schema (annual rate in percent).
 */
export const interestRateSchema = z
  .number()
  .min(0, 'Interest rate cannot be negative')
  .max(100, 'Interest rate cannot exceed 100%')
  .refine(
    (rate) => {
      const decimals = rate.toString().split('.')[1]?.length || 0;
      return decimals <= 1;
    },
    {
      message: 'Interest rate cannot have more than 1 decimal place',
    }
  );

/**
 * Currency code schema (ISO 4217).
 */
export const currencyCodeSchema = z
  .enum(['KES', 'USD', 'EUR', 'GBP'])
  .default('KES');

// ============================================================
// Identity & Tax Schemas
// ============================================================

/**
 * KRA PIN (Personal Identification Number) schema.
 * Format: A followed by 9 alphanumeric characters, then a letter (e.g., A123456789X)
 * New format: Can also be all digits or mixed.
 */
export const kraPinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(11, 'KRA PIN must be exactly 11 characters')
  .regex(/^[A-Z]\d{9}[A-Z]$/, {
    message: 'Invalid KRA PIN format. Expected format: A123456789X',
  });

/**
 * National ID number schema (Kenyan).
 * Typically 7-8 digits, but can vary.
 */
export const nationalIdSchema = z
  .string()
  .trim()
  .min(5, 'ID number too short')
  .max(10, 'ID number too long')
  .regex(/^\d+$/, {
    message: 'National ID must contain only digits',
  });

/**
 * Passport number schema.
 */
export const passportNumberSchema = z
  .string()
  .trim()
  .uppercase()
  .min(6, 'Passport number too short')
  .max(15, 'Passport number too long')
  .regex(/^[A-Z0-9<]+$/, {
    message: 'Invalid passport number format',
  });

// ============================================================
// Entity Schemas
// ============================================================

/**
 * Customer name schema.
 */
export const customerNameSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name too long')
    .regex(/^[a-zA-Z\s'-]+$/, {
      message: 'First name contains invalid characters',
    })
    .transform((name) => name.trim()),
  
  lastName: z
    .string()
    .trim()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name too long')
    .regex(/^[a-zA-Z\s'-]+$/, {
      message: 'Last name contains invalid characters',
    })
    .transform((name) => name.trim()),
  
  middleName: z
    .string()
    .trim()
    .max(50)
    .regex(/^[a-zA-Z\s'-]*$/, {
      message: 'Middle name contains invalid characters',
    })
    .transform((name) => name.trim() || undefined)
    .optional(),
});

/**
 * Address schema for physical addresses.
 */
export const addressSchema = z.object({
  street: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  county: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().default('Kenya'),
});

/**
 * Employment information schema.
 */
export const employmentSchema = z.object({
  status: z.enum([
    'EMPLOYED',
    'SELF_EMPLOYED',
    'UNEMPLOYED',
    'STUDENT',
    'RETIRED',
    'OTHER',
  ]),
  employerName: z.string().trim().max(100).optional(),
  incomeAmount: positiveAmountSchema.optional(),
  incomeFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'ANNUALLY']).optional(),
  yearsInEmployment: z.number().int().min(0).max(50).optional(),
  occupation: z.string().trim().max(100).optional(),
});

// ============================================================
// Authentication Schemas
// ============================================================

/**
 * Login request schema.
 */
export const loginSchema = z.object({
  portalType: z.enum(['super_admin', 'dcp_admin', 'dcp_staff', 'customer'], {
    required_error: 'Portal type is required',
  }),
  email: emailSchema.optional(),
  phone: kenyanPhoneSchema.optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  tenantSlug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z][a-z0-9-]*$/, {
      message: 'Invalid tenant slug format',
    })
    .optional(),
})
.refine(
  (data) => data.email || data.phone,
  {
    message: 'Either email or phone is required',
    path: ['email'],
  }
);

/**
 * Password change schema.
 */
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, {
      message: 'Password must contain at least one uppercase letter',
    })
    .regex(/[a-z]/, {
      message: 'Password must contain at least one lowercase letter',
    })
    .regex(/\d/, {
      message: 'Password must contain at least one digit',
    })
    .regex(/[^A-Za-z0-9]/, {
      message: 'Password must contain at least one special character',
    }),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
})
.refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ============================================================
// Payment Schemas
// ============================================================

/**
 * STK Push initiation request schema.
 */
export const stkPushRequestSchema = z.object({
  phone: kenyanPhoneSchema,
  amount: stkPushAmountSchema,
  accountReference: z
    .string()
    .min(1, 'Account reference is required')
    .max(50, 'Account reference too long')
    .default('LoanRepayment'),
  transactionDesc: z
    .string()
    .max(200)
    .optional(),
  callbackUrl: z
    .string()
    .url('Invalid callback URL format')
    .optional(),
  loanId: cuid2Schema.optional(),
  accountId: cuid2Schema.optional(),
  tenantId: cuid2Schema.optional(),
});

/**
 * B2C disbursement request schema.
 */
export const b2cDisbursementSchema = z.object({
  phone: kenyanPhoneSchema,
  amount: positiveAmountSchema.refine(
    (amt) => amt >= 10 && amt <= 150000,
    {
      message: 'B2C amount must be between KSh 10 and KSh 150,000',
    }
  ),
  occasion: z
    .enum([
      'SalaryPayment',
      'SalaryPaymentWithFee',
      'BusinessPayment',
      'BusinessPaymentWithFee',
      'PromotionPayment',
      'Other',
    ])
    .default('Other'),
  remarks: z.string().max(200).optional(),
  commandId: z
    .enum(['SalaryPayment', 'BusinessPayment', 'PromotionPayment'])
    .default('BusinessPayment'),
  loanId: cuid2Schema.optional(),
  customerId: cuid2Schema.optional(),
  tenantId: cuid2Schema.optional(),
});

// ============================================================
// Query Parameter Helpers
// ============================================================

/**
 * Parse and validate query parameters from URLSearchParams.
 * Returns typed object or throws ValidationError.
 * 
 * @param searchParams - URLSearchParams from request
 * @param schema - Zod schema to validate against
 * @returns Validated and transformed query parameters
 */
export function parseQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): T {
  const rawParams: Record<string, unknown> = {};
  
  searchParams.forEach((value, key) => {
    // Handle array parameters
    if (rawParams[key]) {
      if (Array.isArray(rawParams[key])) {
        (rawParams[key] as unknown[]).push(value);
      } else {
        rawParams[key] = [rawParams[key], value];
      }
    } else {
      rawParams[key] = value;
    }
  });
  
  return schema.parse(rawParams);
}

/**
 * Safe version of parseQueryParams that returns null on error.
 */
export function safeParseQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: z.ZodError } {
  try {
    const data = parseQueryParams(searchParams, schema);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * Extract pagination info from query params with defaults.
 */
export function getPagination(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: SortOrder;
} {
  const result = safeParseQueryParams(searchParams, paginationSchema);
  
  if (result.success) {
    return result.data;
  }
  
  // Return defaults if parsing fails
  return {
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
    skip: 0,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };
}

// ============================================================
// Validation Error Formatter
// ============================================================

/**
 * Format Zod validation errors into a user-friendly structure.
 * 
 * @param error - ZodError from validation failure
 * @returns Formatted errors object suitable for API responses
 */
export function formatValidationErrors(error: z.ZodError): Array<{
  field: string;
  message: string;
  code: string;
  received?: unknown;
}> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
    received: issue.received,
  }));
}

/**
 * Create a validation error response body.
 */
export function createValidationErrorBody(error: z.ZodError): {
  success: false;
  error: string;
  code: string;
  details: ReturnType<typeof formatValidationErrors>;
} {
  return {
    success: false,
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: formatValidationErrors(error),
  };
}

// Export all schemas and types
export type {
  PaginationInput,
  DateRangeInput,
  ValidatedId,
  KenyanPhone,
  ValidatedEmail,
};
