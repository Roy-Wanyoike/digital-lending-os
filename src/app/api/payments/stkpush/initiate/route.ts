/**
 * STK Push Initiation API
 * POST /api/payments/stkpush/initiate
 * 
 * Initiates an M-Pesa STK Push payment request.
 * This sends a prompt to the customer's phone to enter their M-Pesa PIN.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initiateStkPush,
  type StkPushRequest,
  type StkPushResponse,
} from '@/lib/mpesa-service';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON body',
          message: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }
    
    const data = body as Record<string, unknown>;
    
    // Validate required fields
    const { phone, amount, loanId, accountId, accountReference, transactionDesc, callbackUrl } = data;
    
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: phone',
          message: 'Phone number is required',
        },
        { status: 400 }
      );
    }
    
    if (!amount || typeof amount !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: amount',
          message: 'Payment amount is required',
        },
        { status: 400 }
      );
    }
    
    // Build STK Push request
    const stkPushRequest: StkPushRequest = {
      phone: phone as string,
      amount: amount as number,
      accountReference: (accountReference || loanId || accountId || `PAY-${Date.now()}`) as string,
      transactionDesc: (transactionDesc || `Payment of KSh ${amount.toLocaleString()}`) as string,
      callbackUrl: callbackUrl as string | undefined,
    };
    
    // Add optional metadata
    if (loanId) {
      stkPushRequest.accountReference = loanId as string;
    }
    
    // Initiate STK Push
    const result: StkPushResponse = await initiateStkPush(stkPushRequest);
    
    // Calculate processing time
    const processingTime = Date.now() - startTime;
    
    // Return response
    if (result.success) {
      return NextResponse.json({
        success: true,
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
        meta: {
          processingTimeMs: processingTime,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.errorMessage || result.responseDescription || 'Failed to initiate STK Push',
        errorCode: result.errorCode,
        responseCode: result.responseCode,
        customerMessage: result.customerMessage,
        suggestions: getErrorSuggestions(result.errorCode),
        meta: {
          processingTimeMs: processingTime,
          timestamp: new Date().toISOString(),
        },
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('STK Push initiation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while initiating the payment',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Get user-friendly suggestions based on error code
 */
function getErrorSuggestions(errorCode?: string): string[] {
  switch (errorCode) {
    case 'INVALID_PHONE_NUMBER':
      return [
        'Ensure phone number starts with 2547...',
        'Format: 254712345678 or 0712345678',
      ];
    case 'INVALID_AMOUNT':
      return [
        'Enter a valid payment amount',
        'Amount must be greater than zero',
      ];
    case 'AMOUNT_TOO_LOW':
      return [
        'Minimum payment is KSh 10',
        'Please enter a larger amount',
      ];
    case 'AMOUNT_TOO_HIGH':
      return [
        'Maximum STK Push amount is KSh 150,000',
        'For larger amounts, consider bank transfer',
      ];
    default:
      return [
        'Please try again later',
        'Contact support if the issue persists',
      ];
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
