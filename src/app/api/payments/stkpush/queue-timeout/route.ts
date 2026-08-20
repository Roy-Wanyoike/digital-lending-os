/**
 * STK Push Queue Timeout Handler
 * POST /api/payments/stkpush/queue-timeout
 * 
 * This endpoint is called by M-Pesa when a customer does not enter
 * their PIN within the timeout period (usually 30 minutes).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getStkPushStatus,
  processStkCallback,
} from '@/lib/mpesa-service';
import {
  logWebhook,
  createSuccessResponse,
} from '@/lib/webhook-verification';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const sourceIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    
    const data = body as Record<string, unknown>;
    const checkoutRequestID = data.CheckoutRequestID as string;
    
    if (!checkoutRequestID) {
      logWebhook({
        endpoint: '/api/payments/stkpush/queue-timeout',
        method: 'POST',
        sourceIP,
        isValid: false,
        validationErrors: ['Missing CheckoutRequestID'],
        processingTimeMs: Date.now() - startTime,
        responseStatus: 400,
      });
      
      return NextResponse.json(
        { error: 'Missing CheckoutRequestID' },
        { status: 400 }
      );
    }
    
    console.log(`Queue timeout received for: ${checkoutRequestID}`);
    
    // Check if transaction exists and is still pending
    const status = getStkPushStatus(checkoutRequestID);
    
    if (!status.exists) {
      console.log(`Unknown transaction: ${checkoutRequestID}`);
      return createSuccessResponse();
    }
    
    if (status.status !== 'pending') {
      console.log(`Transaction already ${status.status}: ${checkoutRequestID}`);
      return createSuccessResponse();
    }
    
    // Process as timeout
    await processStkCallback(checkoutRequestID, 'timeout');
    
    console.log(`Transaction marked as timed out: ${checkoutRequestID}`);
    
    // Log the event
    logWebhook({
      endpoint: '/api/payments/stkpush/queue-timeout',
      method: 'POST',
      sourceIP,
      isValid: true,
      validationErrors: [],
      requestBody: body as Record<string, unknown>,
      processingTimeMs: Date.now() - startTime,
      responseStatus: 200,
    });
    
    return createSuccessResponse();
    
  } catch (error) {
    console.error('Queue timeout processing error:', error);
    return createSuccessResponse(); // Always acknowledge to prevent retries
  }
}

// Handle GET for checking pending transactions near timeout
export async function GET() {
  const pendingTransactions = getPendingTransactionsNearTimeout();
  
  return NextResponse.json({
    count: pendingTransactions.length,
    transactions: pendingTransactions,
  });
}

/**
 * Get transactions that are close to timing out
 */
function getPendingTransactionsNearTimeout(): Array<{
  checkoutRequestID: string;
  phone: string;
  amount: number;
  initiatedAt: string;
  remainingTimeMs: number;
}> {
  // This would query actual pending transactions in production
  return [];
}
