/**
 * Transaction Status Query API
 * POST /api/payments/status/query
 * 
 * Checks the status of an M-Pesa transaction.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  queryTransactionStatus,
  type TransactionStatusRequest,
  type TransactionStatusResponse,
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
        },
        { status: 400 }
      );
    }
    
    const data = body as Record<string, unknown>;
    
    // Validate required fields
    const { transactionID, partyA, identifierType } = data;
    
    if (!transactionID || typeof transactionID !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: transactionID',
          message: 'M-Pesa transaction ID is required',
        },
        { status: 400 }
      );
    }
    
    // Build query request
    const queryRequest: TransactionStatusRequest = {
      transactionID: transactionID as string,
      partyA: (partyA || process.env.MPESA_SHORT_CODE || '174379') as string,
      identifierType: (identifierType || 4) as number, // 4 = Shortcode default
    };
    
    // Query status
    const result: TransactionStatusResponse = await queryTransactionStatus(queryRequest);
    
    const processingTime = Date.now() - startTime;
    
    if (result.success && result.transactionDetails) {
      const details = result.transactionDetails;
      
      // Determine user-friendly status
      let status: string;
      let statusColor: string;
      
      switch (result.resultCode) {
        case '0':
          status = 'Completed';
          statusColor = 'green';
          break;
        case 'PENDING':
        case 'Processing':
          status = 'Processing';
          statusColor = 'yellow';
          break;
        default:
          status = 'Failed';
          statusColor = 'red';
      }
      
      return NextResponse.json({
        success: true,
        status,
        statusColor,
        
        // Transaction details
        transactionID: details.ReceiptNumber || transactionID,
        amount: details.Amount,
        currency: 'KES',
        receiptNumber: details.ReceiptNumber,
        transactionDate: details.TransactionDate,
        phoneNumber: details.PhoneNumber,
        
        // Additional info
        responseCode: result.responseCode,
        responseDescription: result.responseDescription,
        resultDescription: result.resultDesc,
        
        meta: {
          processingTimeMs: processingTime,
          timestamp: new Date().toISOString(),
          conversationID: result.conversationID,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.responseDescription || 'Failed to query transaction status',
        responseCode: result.responseCode,
        resultCode: result.resultCode,
        resultDescription: result.resultDesc,
        suggestions: [
          'Verify the transaction ID is correct',
          'The transaction may not have been processed yet',
          'Contact support for assistance',
        ],
        meta: {
          processingTimeMs: processingTime,
          timestamp: new Date().toISOString(),
        },
      }, { status: 404 });
    }
    
  } catch (error) {
    console.error('Transaction status query error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while querying transaction status',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Handle GET for simple lookup by receipt number
export async function GET(request: NextRequest) {
  const transactionID = request.nextUrl.searchParams.get('transactionID') ||
                       request.nextUrl.searchParams.get('receipt');
  
  if (!transactionID) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Missing transactionID or receipt parameter',
        usage: 'GET /api/payments/status/query?transactionID=QIK3ABC123'
      },
      { status: 400 }
    );
  }
  
  // Reuse POST logic
  const mockRequest = new Request('', {
    method: 'POST',
    body: JSON.stringify({ transactionID }),
  }) as NextRequest;
  
  return POST(mockRequest);
}
