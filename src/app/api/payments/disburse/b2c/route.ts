/**
 * B2C Disbursement API
 * POST /api/payments/disburse/b2c
 * 
 * Initiates a Business to Customer (B2C) payment via M-Pesa.
 * Used for loan disbursements, refunds, salary payments, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initiateB2C,
  type B2CRequest,
  type B2CResponse,
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
    const { phone, amount, loanId, commandID, occasion, remarks } = data;
    
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: phone',
          message: 'Recipient phone number is required',
        },
        { status: 400 }
      );
    }
    
    if (!amount || typeof amount !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: amount',
          message: 'Disbursement amount is required',
        },
        { status: 400 }
      );
    }
    
    if (!loanId && !remarks) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing reference information',
          message: 'Either loanId or remarks must be provided',
        },
        { status: 400 }
      );
    }
    
    // Build B2C request
    const b2cRequest: B2CRequest = {
      phone: phone as string,
      amount: amount as number,
      occasion: (occasion || `Loan Disbursement - ${loanId || 'N/A'}`) as string,
      remarks: (remarks || `Disbursement for ${loanId || 'general purpose'}`) as string,
      commandID: (commandID || 'SalaryPayment') as 'SalaryPayment' | 'BusinessPayment' | 'PromotionPayment',
    };
    
    // Validate command ID
    const validCommandIDs = ['SalaryPayment', 'BusinessPayment', 'PromotionPayment'];
    if (!validCommandIDs.includes(b2cRequest.commandID!)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid commandID',
          message: `commandID must be one of: ${validCommandIDs.join(', ')}`,
        },
        { status: 400 }
      );
    }
    
    // Initiate B2C disbursement
    const result: B2CResponse = await initiateB2C(b2cRequest);
    
    const processingTime = Date.now() - startTime;
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Disbursement initiated successfully',
        conversationID: result.conversationID,
        originatorConversationID: result.originatorConversationID,
        responseCode: result.responseCode,
        responseDescription: result.responseDescription,
        
        // Customer/recipient info
        recipient: {
          phone: phone,
          amount: amount,
          currency: 'KES',
        },
        
        // Timeline info
        estimatedTime: 'Instant - 5 minutes',
        maxWaitTime: '30 minutes',
        
        // Status tracking
        statusEndpoint: `/api/payments/disburse/status?originatorConversationID=${result.originatorConversationID}`,
        callbackEndpoint: '/api/payments/disburse/callback',
        
        // Loan update info (if applicable)
        loanUpdate: loanId ? {
          loanId,
          expectedStatusChange: 'DISBURSED',
          disbursementMethod: 'MPESA',
        } : undefined,
        
        meta: {
          processingTimeMs: processingTime,
          timestamp: new Date().toISOString(),
          environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.errorMessage || result.responseDescription || 'Failed to initiate disbursement',
        responseCode: result.responseCode,
        responseDescription: result.responseDescription,
        suggestions: getB2CErrorsSuggestions(result.responseCode),
        meta: {
          processingTimeMs: processingTime,
          timestamp: new Date().toISOString(),
        },
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('B2C disbursement error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while initiating the disbursement',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Get user-friendly suggestions based on error code
 */
function getB2CErrorsSuggestions(responseCode?: string): string[] {
  switch (responseCode) {
    case '400.002.01':
      return ['Invalid phone number format', 'Use format: 2547XXXXXXXX'];
    case '400.002.02':
      return ['Amount below minimum', 'Minimum B2C amount is KSh 50'];
    case '400.002.03':
      return ['Amount exceeds limit', 'Maximum B2C amount is KSh 300,000'];
    case '500.001.01':
      return ['Internal M-Pesa error', 'Please retry after some time'];
    default:
      return [
        'Please verify all details and try again',
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
