/**
 * B2C Disbursement Callback Handler
 * POST /api/payments/disburse/callback
 * 
 * This endpoint is called by M-Pesa after a B2C transaction
 * is processed (success or failure).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  type B2CCallbackBody,
  processB2CCallback,
  getB2CStatus,
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
        endpoint: '/api/payments/disburse/callback',
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
        endpoint: '/api/payments/disburse/callback',
        method: 'POST',
        sourceIP,
        userAgent,
        isValid: false,
        validationErrors: verification.errors,
        requestBody: body as Record<string, unknown>,
        processingTimeMs: Date.now() - startTime,
        responseStatus: 403,
      });
      
      console.warn('Suspicious B2C callback rejected:', verification.errors);
      
      if (process.env.MPESA_ENVIRONMENT === 'production') {
        return createErrorResponse('Verification failed', 403);
      }
    }
    
    // Parse callback data
    const callbackBody = body as B2CCallbackBody;
    
    if (!callbackBody.Body?.Result) {
      logWebhook({
        endpoint: '/api/payments/disburse/callback',
        method: 'POST',
        sourceIP,
        userAgent,
        isValid: false,
        validationErrors: ['Missing Result in body'],
        requestBody: body as Record<string, unknown>,
        processingTimeMs: Date.now() - startTime,
        responseStatus: 400,
      });
      
      return createErrorResponse('Invalid callback structure', 400);
    }
    
    const { Result } = callbackBody.Body;
    const { 
      OriginatorConversationID, 
      ResultCode, 
      ResultDesc,
      ResultParameters 
    } = Result;
    
    console.log(`B2C Callback received:`);
    console.log(`- OriginatorConversationID: ${OriginatorConversationID}`);
    console.log(`- ResultCode: ${ResultCode}`);
    console.log(`- ResultDesc: ${ResultDesc}`);
    
    // Check if this is a known pending transaction
    const existingStatus = getB2CStatus(OriginatorConversationID);
    
    if (!existingStatus.exists) {
      console.warn(`Unknown OriginatorConversationID: ${OriginatorConversationID}`);
      
      logWebhook({
        endpoint: '/api/payments/disburse/callback',
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
    
    // Process based on result
    if (ResultCode === 0 && ResultParameters?.ResultItem) {
      await handleSuccessfulDisbursement(OriginatorConversationID, ResultParameters.ResultItem);
    } else {
      await handleFailedDisbursement(OriginatorConversationID, ResultCode, ResultDesc);
    }
    
    // Log successful processing
    logWebhook({
      endpoint: '/api/payments/disburse/callback',
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
    console.error('B2C callback processing error:', error);
    
    logWebhook({
      endpoint: '/api/payments/disburse/callback',
      method: 'POST',
      sourceIP: 'unknown',
      isValid: false,
      validationErrors: ['Internal server error'],
      processingTimeMs: Date.now() - startTime,
      responseStatus: 500,
    });
    
    return createSuccessResponse(); // Always acknowledge to prevent retries
  }
}

/**
 * Handle successful disbursement
 */
async function handleSuccessfulDisbursement(
  originatorConversationID: string,
  resultItems: Array<{ Name: string; Value: string | number }>
): Promise<void> {
  // Extract result details
  const getValue = (name: string): string | number | undefined =>
    resultItems.find(item => item.Name === name)?.Value;
  
  const amount = getValue('TransactionAmount');
  const receiptNumber = getValue('TransactionReceipt');
  const recipientName = getValue('ReceiverPartyPublicName');
  const transactionDate = getValue('TransactionCompletedDateTime');
  
  console.log(`✅ Disbursement successful:`);
  console.log(`   Amount: KSh ${amount}`);
  console.log(`   Receipt: ${receiptNumber}`);
  console.log(`   Recipient: ${recipientName}`);
  console.log(`   Time: ${transactionDate}`);
  
  // In production, here you would:
  // 1. Update loan status to DISBURSED
  // 2. Create transaction entries (double-entry)
  // 3. Update customer outstanding balance
  // 4. Send SMS notification to customer with receipt
  // 5. Trigger post-disbursement workflows
  // 6. Update settlement queue
  
  // For now, mpesa-service.ts handles in-memory updates
}

/**
 * Handle failed disbursement
 */
async function handleFailedDisbursement(
  originatorConversationID: string,
  resultCode: number,
  resultDesc: string
): Promise<void> {
  console.log(`❌ Disbursement failed:`);
  console.log(`   ResultCode: ${resultCode}`);
  console.log(`   Reason: ${resultDesc}`);
  
  // In production, here you would:
  // 1. Update loan status to DISBURSEMENT_FAILED
  // 2. Notify operations team
  // 3. Log for retry queue if applicable
  // 4. Notify customer of delay
}

// Handle GET for checking B2C status
export async function GET(request: NextRequest) {
  const originatorConversationID = request.nextUrl.searchParams.get('originatorConversationID');
  
  if (!originatorConversationID) {
    return NextResponse.json(
      { error: 'Missing originatorConversationID parameter' },
      { status: 400 }
    );
  }
  
  const status = getB2CStatus(originatorConversationID);
  
  if (!status.exists) {
    return NextResponse.json(
      { error: 'Transaction not found', originatorConversationID },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    originatorConversationID,
    status: status.status,
    initiatedAt: status.data?.initiatedAt.toISOString(),
    phone: status.data?.request.phone,
    amount: status.data?.request.amount,
    commandID: status.data?.request.commandID,
  });
}
