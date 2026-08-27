/**
 * STK Push Callback Handler
 * POST /api/payments/stkpush/callback
 * 
 * This endpoint is called by M-Pesa (Safaricom) after a customer
 * enters their PIN or when the transaction times out.
 * 
 * In production, Safaricom calls this URL automatically.
 * In simulation mode, it can be triggered by the simulator component.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  type StkPushCallbackBody,
  processStkCallback,
  getStkPushStatus,
  getPaymentHistory,
} from '@/lib/mpesa-service';
import {
  verifyWebhook,
  logWebhook,
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/webhook-verification';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get client info for logging
    const sourceIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;
    
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (e) {
      logWebhook({
        endpoint: '/api/payments/stkpush/callback',
        method: 'POST',
        sourceIP,
        userAgent,
        isValid: false,
        validationErrors: ['Invalid JSON body'],
        processingTimeMs: Date.now() - startTime,
        responseStatus: 400,
      });
      
      return createErrorResponse('Invalid JSON body', 400);
    }
    
    // Verify webhook authenticity
    const verification = verifyWebhook(body, request.headers);
    
    if (!verification.valid && verification.riskScore > 50) {
      logWebhook({
        endpoint: '/api/payments/stkpush/callback',
        method: 'POST',
        sourceIP,
        userAgent,
        isValid: false,
        validationErrors: verification.errors,
        requestBody: body as Record<string, unknown>,
        processingTimeMs: Date.now() - startTime,
        responseStatus: 403,
      });
      
      console.warn('Suspicious STK callback rejected:', verification.errors);
      
      // In strict mode, reject suspicious requests
      // In sandbox mode, allow with warning
      if (process.env.MPESA_ENVIRONMENT === 'production') {
        return createErrorResponse('Verification failed', 403);
      }
    }
    
    // Parse callback data
    const callbackBody = body as StkPushCallbackBody;
    
    if (!callbackBody.Body?.stkCallback) {
      logWebhook({
        endpoint: '/api/payments/stkpush/callback',
        method: 'POST',
        sourceIP,
        userAgent,
        isValid: false,
        validationErrors: ['Missing stkCallback in body'],
        requestBody: body as Record<string, unknown>,
        processingTimeMs: Date.now() - startTime,
        responseStatus: 400,
      });
      
      return createErrorResponse('Invalid callback structure', 400);
    }
    
    const { stkCallback } = callbackBody.Body;
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;
    
    console.log(`STK Callback received:`);
    console.log(`- CheckoutRequestID: ${CheckoutRequestID}`);
    console.log(`- ResultCode: ${ResultCode}`);
    console.log(`- ResultDesc: ${ResultDesc}`);
    
    // Check if this is a known pending transaction
    const existingStatus = getStkPushStatus(CheckoutRequestID);
    
    if (!existingStatus.exists) {
      console.warn(`Unknown CheckoutRequestID: ${CheckoutRequestID}`);
      
      // Log and accept anyway (M-Pesa may retry)
      logWebhook({
        endpoint: '/api/payments/stkpush/callback',
        method: 'POST',
        sourceIP,
        userAgent,
        isValid: true,
        validationErrors: verification.warnings,
        requestBody: body as Record<string, unknown>,
        processingTimeMs: Date.now() - startTime,
        responseStatus: 200,
      });
      
      return createSuccessResponse();
    }
    
    // Process successful payment
    if (ResultCode === 0 && CallbackMetadata?.Item) {
      await handleSuccessfulPayment(CheckoutRequestID, CallbackMetadata.Item);
    } else {
      await handleFailedPayment(CheckoutRequestID, ResultCode, ResultDesc);
    }
    
    // Log successful processing
    logWebhook({
      endpoint: '/api/payments/stkpush/callback',
      method: 'POST',
      sourceIP,
      userAgent,
      isValid: true,
      validationErrors: verification.warnings,
      requestBody: body as Record<string, unknown>,
      processingTimeMs: Date.now() - startTime,
      responseStatus: 200,
    });
    
    // Always return success to acknowledge receipt
    return createSuccessResponse();
    
  } catch (error) {
    console.error('STK callback processing error:', error);
    
    logWebhook({
      endpoint: '/api/payments/stkpush/callback',
      method: 'POST',
      sourceIP: 'unknown',
      isValid: false,
      validationErrors: ['Internal server error'],
      processingTimeMs: Date.now() - startTime,
      responseStatus: 500,
    });
    
    // Still return success to prevent M-Pesa retries on our errors
    return createSuccessResponse();
  }
}

/**
 * Handle successful STK Push payment
 */
async function handleSuccessfulPayment(
  checkoutRequestID: string,
  metadata: Array<{ Name: string; Value: string | number }>
): Promise<void> {
  // Extract metadata
  const getMetaValue = (name: string): string | number | undefined => 
    metadata.find(item => item.Name === name)?.Value;
  
  const amount = getMetaValue('Amount');
  const mpesaReceiptNumber = getMetaValue('MpesaReceiptNumber');
  const phoneNumber = getMetaValue('PhoneNumber');
  const transactionDate = getMetaValue('TransactionDate');
  
  console.log(`✅ Payment successful:`);
  console.log(`   Amount: KSh ${amount}`);
  console.log(`   Receipt: ${mpesaReceiptNumber}`);
  console.log(`   Phone: ${phoneNumber}`);
  
  // In production, here you would:
  // 1. Update repayment record in database
  // 2. Update loan outstanding balance
  // 3. Create double-entry transactions
  // 4. Send confirmation SMS to customer
  // 5. Trigger any automated workflows
  
  // For now, the mpesa-service.ts handles in-memory updates
}

/**
 * Handle failed/declined STK Push payment
 */
async function handleFailedPayment(
  checkoutRequestID: string,
  resultCode: number,
  resultDesc: string
): Promise<void> {
  console.log(`❌ Payment failed:`);
  console.log(`   ResultCode: ${resultCode}`);
  console.log(`   Reason: ${resultDesc}`);
  
  // In production, here you would:
  // 1. Update payment status to FAILED
  // 2. Notify customer of failure
  // 3. Trigger retry logic if applicable
  // 4. Log for analytics
}

// Handle GET for status checking (alternative to dedicated status endpoint)
export async function GET(request: NextRequest) {
  const checkoutRequestID = request.nextUrl.searchParams.get('checkoutRequestID');
  
  if (!checkoutRequestID) {
    return NextResponse.json(
      { error: 'Missing checkoutRequestID parameter' },
      { status: 400 }
    );
  }
  
  const status = getStkPushStatus(checkoutRequestID);
  
  if (!status.exists) {
    return NextResponse.json(
      { error: 'Transaction not found', checkoutRequestID },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    checkoutRequestID,
    status: status.status,
    initiatedAt: status.data?.initiatedAt.toISOString(),
    phone: status.data?.request.phone,
    amount: status.data?.request.amount,
  });
}
