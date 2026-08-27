/**
 * M-Pesa Balance Query API
 * GET /api/payments/balance
 * 
 * Checks the M-Pesa working account balance.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  queryBalance,
  type BalanceQueryResponse,
} from '@/lib/mpesa-service';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const accountType = request.nextUrl.searchParams.get('accountType') || 'working';
    
    // Validate account type
    const validAccountTypes = ['working', 'utility', 'settlement', 'charges'];
    
    if (!validAccountTypes.includes(accountType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid account type',
          message: `accountType must be one of: ${validAccountTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }
    
    // Query balance (simulated)
    const result: BalanceQueryResponse = await queryBalance();
    
    const processingTime = Date.now() - startTime;
    
    if (result.success && result.accountBalance) {
      const account = result.accountBalance[0];
      
      return NextResponse.json({
        success: true,
        
        // Account info
        accountType: `${account.accountName}`,
        balance: account.balance,
        formattedBalance: formatCurrency(account.balance),
        currency: 'KES',
        
        // Additional details
        asOfDate: new Date().toISOString(),
        responseCode: result.responseCode,
        responseDescription: result.responseDescription,
        
        // Account summary
        availableBalance: Math.round(account.balance * 0.95), // 5% reserve
        reservedAmount: Math.round(account.balance * 0.05),
        
        meta: {
          processingTimeMs: processingTime,
          timestamp: new Date().toISOString(),
          conversationID: result.conversationID,
          environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
          note: 'This is simulated data for demo purposes',
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.responseDescription || 'Failed to query balance',
        responseCode: result.responseCode,
        meta: {
          processingTimeMs: processingTime,
          timestamp: new Date().toISOString(),
        },
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Balance query error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while querying balance',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
  }).format(amount);
}

// Handle POST for balance query with additional options
export async function POST(request: NextRequest) {
  // Reuse GET logic for POST requests
  return GET(request);
}
