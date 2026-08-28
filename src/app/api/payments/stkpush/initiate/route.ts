/**
 * STK Push Initiation API
 * POST /api/payments/stkpush/initiate
 * 
 * Initiates an M-Pesa STK Push payment request.
 * This sends a prompt to the customer's phone to enter their M-Pesa PIN.
 * 
 * Enhanced with:
 * - Rate limiting (30 req/min for payment endpoints)
 * - Input validation using Zod schemas
 * - Standardized API responses
 * - Security utilities for sanitization
 * - Amount validation for financial compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initiateStkPush,
  type StkPushRequest,
  type StkPushResponse,
} from '@/lib/mpesa-service';
import {
  withRateLimit,
  createRateLimiter,
} from '@/lib/rate-limit';
import {
  stkPushRequestSchema,
  kenyanPhoneSchema,
  stkPushAmountSchema,
  formatValidationErrors,
} from '@/lib/validation';
import {
  sanitizeInput,
  sanitizeObject,
  validateAmount,
  isValidPhoneNumber,
  normalizePhoneNumber,
  maskPhone,
  hashSensitiveData,
  extractClientIP as getSecurityIP,
} from '@/lib/security';
import {
  ApiResponse,
  generateRequestId,
  createCorsHeaders,
  corsPreflightResponse,
} from '@/lib/api-response';

// ============================================
// RATE LIMITING CONFIGURATION
// ============================================

/**
 * Payment-specific rate limiter.
 * Stricter limits for financial operations.
 */
const paymentLimiter = createRateLimiter('payment', {
  prefix: 'payment-stk',
  skipInDevelopment: false, // Always enforce on payment routes
});

// ============================================
// ERROR SUGGESTIONS
// ============================================

/**
 * Get user-friendly suggestions based on error code.
 */
function getErrorSuggestions(errorCode?: string): string[] {
  switch (errorCode) {
    case 'INVALID_PHONE_NUMBER':
      return [
        'Ensure phone number starts with +2547... or +2541...',
        'Format examples: +254712345678 or +254112345678',
      ];
    case 'INVALID_AMOUNT':
      return [
        'Enter a valid payment amount',
        'Amount must be greater than zero',
      ];
    case 'AMOUNT_TOO_LOW':
      return [
        'Minimum M-Pesa STK Push is KSh 10',
        'Please enter a larger amount',
      ];
    case 'AMOUNT_TOO_HIGH':
      return [
        `Maximum STK Push amount is KSh 150,000`,
        'For larger amounts, consider bank transfer',
      ];
    default:
      return [
        'Please try again later',
        'Contact support if the issue persists',
      ];
  }
}

/**
 * Extract client IP securely.
 */
function getClientIP(request: NextRequest): string {
  return getSecurityIP(request.headers);
}

// ============================================
// POST /api/payments/stkpush/initiate
// ============================================

export const POST = withRateLimit('payment', async (request: NextRequest) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    // Parse request body with error handling
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      return ApiResponse.error('Invalid JSON in request body', {
        statusCode: 400,
        code: 'BAD_REQUEST',
        requestId,
        originalError: parseError,
      });
    }
    
    // Sanitize input object to prevent XSS/injection
    const sanitizedBody = sanitizeObject(body as Record<string, unknown>);
    
    // Validate against STK Push schema
    const validationResult = stkPushRequestSchema.safeParse(sanitizedBody);
    
    if (!validationResult.success) {
      return ApiResponse.zodError(validationResult.error, { requestId });
    }

    const data = validationResult.data;
    
    // Additional security validation
    const clientIP = getClientIP(request);

    // Log payment initiation attempt (without sensitive data)
    console.log(`[STK Push] Payment initiation`, {
      requestId,
      phone: maskPhone(data.phone),
      amount: data.amount,
      ip: hashSensitiveData(clientIP),
      timestamp: new Date().toISOString(),
    });

    // Build STK Push request with validated data
    const stkPushRequest: StkPushRequest = {
      phone: data.phone, // Already normalized by schema
      amount: data.amount, // Already validated by schema
      accountReference: data.accountReference || `PAY-${Date.now()}`,
      transactionDesc: data.transactionDesc || `Payment of KSh ${data.amount.toLocaleString()}`,
      callbackUrl: data.callbackUrl,
    };

    // Add optional metadata if provided
    if (data.loanId) {
      stkPushRequest.accountReference = data.loanId;
    }

    // Initiate STK Push via M-Pesa service
    const result: StkPushResponse = await initiateStkPush(stkPushRequest);
    
    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Return appropriate response based on result
    if (result.success) {
      return ApiResponse.success(
        {
          message: result.customerMessage || 'STK Push initiated. Please enter your M-Pesa PIN.',
          checkoutRequestID: result.checkoutRequestID,
          merchantRequestID: result.merchantRequestID,
          responseCode: result.responseCode,
          responseDescription: result.responseDescription,
          instructions: {
            step1: 'Check your phone for the M-Pesa prompt',
            step2: 'Enter your M-Pesa PIN to confirm',
            step3: 'Do not share your PIN with anyone',
          },
          estimatedWaitTime: '30 seconds - 3 minutes',
          pollingEndpoint: `/api/payments/stkpush/status?checkoutRequestID=${result.checkoutRequestID}`,
        },
        {
          message: 'STK Push initiated successfully',
          requestId,
          processingTimeMs: processingTime,
        }
      );
    } else {
      // Payment failed - return detailed error
      return ApiResponse.paymentFailed({
        reason: result.errorMessage || result.responseDescription || 'Failed to initiate STK Push',
        errorCode: result.errorCode,
        customerMessage: result.customerMessage,
        suggestions: getErrorSuggestions(result.errorCode),
        requestId,
      });
    }
    
  } catch (error) {
    console.error('[STK Push] Initiation error:', error);
    
    return ApiResponse.internalError({
      message: 'An unexpected error occurred while initiating the payment',
      originalError: error,
      requestId,
    });
  }
});

// ============================================
// OPTIONS /api/payments/stkpush/initiate - CORS PREFLIGHT
// ============================================

export async function OPTIONS() {
  return corsPreflightResponse();
}
