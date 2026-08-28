/**
 * Validation Middleware
 * 
 * Request validation using Zod schemas.
 */

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError, z } from 'zod';
import { validationErrorResponse, badRequestResponse } from '../utils/response';

type ValidationTarget = 'body' | 'query' | 'params';

interface ValidateOptions {
  target?: ValidationTarget;
  abortEarly?: boolean;
}

/**
 * Validate request using Zod schema
 */
export function validate(schema: AnyZodObject, options: ValidateTarget | ValidateOptions = 'body') {
  const target: ValidationTarget = typeof options === 'string' ? options : (options.target || 'body');
  const abortEarly = typeof options === 'object' ? (options.abortEarly ?? true) : true;

  return (req: Request, res: Response, next: NextFunction): Response | void => {
    try {
      let data: unknown;

      switch (target) {
        case 'body':
          data = req.body;
          break;
        case 'query':
          data = req.query;
          break;
        case 'params':
          data = req.params;
          break;
      }

      const result = schema.parse(data, { abortEarly });

      // Replace request data with validated/transformed data
      switch (target) {
        case 'body':
          req.body = result;
          break;
        case 'query':
          req.query = result as Record<string, string>;
          break;
        case 'params':
          req.params = result as Record<string, string>;
          break;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        }));
        return validationErrorResponse(res, errors);
      }
      
      return badRequestResponse(res, 'Validation failed', 'VALIDATION_ERROR');
    }
  };
}

// =============================================================================
// COMMON VALIDATION SCHEMAS
// =============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const dateRangeSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const tenantIdSchema = z.object({
  tenantId: z.string().uuid().optional(),
});

// Customer validation schemas
export const createCustomerSchema = z.object({
  tenantId: z.string().uuid(),
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().regex(/^2547\d{8}$/, 'Phone must be in format 2547XXXXXXXX'),
  alternativePhone: z.string().regex(/^2547\d{8}$/).optional().or(z.literal('')),
  dateOfBirth: z.coerce.date().max(new Date()).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  nationalId: z.string().min(5).max(20).optional(),
  kraPin: z.string().regex(/^[A-Z]\d{9}[A-Z]$/).optional(), // KRA PIN format
  employmentStatus: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'UNEMPLOYED', 'STUDENT', 'RETIRED']).optional(),
  employerName: z.string().max(200).optional(),
  incomeAmount: z.number().nonnegative().optional(),
  incomeFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL']).optional(),
  businessName: z.string().max(200).optional(),
  county: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  bankName: z.string().max(100).optional(),
  bankAccount: z.string().max(30).optional(),
  mpesaPhone: z.string().regex(/^2547\d{8}$/).optional(),
});

// Loan validation schemas
export const createLoanSchema = z.object({
  tenantId: z.string().uuid(),
  customerId: z.string().uuid(),
  applicationId: z.string().uuid().optional(),
  productId: z.string().uuid(),
  principal: z.number().positive().min(500).max(150000),
  approvedAmount: z.number().positive().optional(),
  interestRate: z.number().positive().min(1).max(50),
  interestType: z.enum(['FLAT_RATE', 'REDUCING_BALANCE', 'DIMINISHING']).default('FLAT_RATE'),
  termDays: z.number().int().positive().min(7).max(180),
  processingFee: z.number().nonnegative().default(0),
  insuranceFee: z.number().nonnegative().default(0),
  disbursementMethod: z.enum(['MPESA', 'BANK_TRANSFER', 'CHEQUE']).default('MPESA'),
  disbursementAccount: z.string().optional(),
});

// Payment schemas
export const stkPushSchema = z.object({
  phone: z.string().regex(/^2547\d{8}$/, 'Phone must be in format 2547XXXXXXXX'),
  amount: z.number().positive().min(10).max(150000),
  accountReference: z.string().max(100).optional(),
  transactionDesc: z.string().max(255).optional(),
  callbackUrl: z.string().url().optional(),
  loanId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
});

// Tenant schemas
export const createTenantSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  companyName: z.string().min(2).max(200),
  licenseNumber: z.string().max(50).optional(),
  phone: z.string().regex(/^2547\d{8}$/),
  email: z.string().email(),
  physicalAddress: z.string().max(500).optional(),
  website: z.string().url().optional(),
  plan: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM']).default('STARTER'),
  branding: z.record(z.unknown()).optional(),
  config: z.record(z.unknown()).optional(),
});
