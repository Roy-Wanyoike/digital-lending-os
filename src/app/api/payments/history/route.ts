/**
 * Payment History API
 * GET /api/payments/history
 * 
 * Retrieves payment/transaction history with optional filters.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getPaymentHistory,
  type PaymentRecord,
} from '@/lib/mpesa-service';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Extract query parameters
    const loanId = request.nextUrl.searchParams.get('loanId') || undefined;
    const customerId = request.nextUrl.searchParams.get('customerId') || undefined;
    const type = request.nextUrl.searchParams.get('type') as PaymentRecord['type'] | undefined;
    const status = request.nextUrl.searchParams.get('status') as PaymentRecord['status'] | undefined;
    const dateFrom = request.nextUrl.searchParams.get('dateFrom') || undefined;
    const dateTo = request.nextUrl.searchParams.get('dateTo') || undefined;
    
    // Pagination parameters
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');
    
    // Validate pagination
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid limit parameter',
          message: 'Limit must be between 1 and 100',
        },
        { status: 400 }
      );
    }
    
    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid offset parameter',
          message: 'Offset must be a non-negative integer',
        },
        { status: 400 }
      );
    }
    
    // Validate type if provided
    const validTypes: PaymentRecord['type'][] = ['STK_PUSH', 'B2C', 'B2B', 'C2B', 'REVERSAL'];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid type parameter',
          message: `Type must be one of: ${validTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }
    
    // Validate status if provided
    const validStatuses: PaymentRecord['status'][] = ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid status parameter',
          message: `Status must be one of: ${validStatuses.join(', ')}`,
        },
        { status: 400 }
      );
    }
    
    // Query payment history
    const result = getPaymentHistory({
      loanId,
      customerId,
      type,
      status,
      dateFrom,
      dateTo,
      limit,
      offset,
    });
    
    const processingTime = Date.now() - startTime;
    
    // Calculate summary statistics
    const summary = calculateSummary(result.records);
    
    return NextResponse.json({
      success: true,
      
      // Data
      records: result.records.map(formatRecord),
      
      // Pagination
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + limit < result.total,
        totalPages: Math.ceil(result.total / limit),
        currentPage: Math.floor(offset / limit) + 1,
      },
      
      // Summary statistics
      summary,
      
      // Applied filters
      filters: {
        loanId,
        customerId,
        type,
        status,
        dateFrom,
        dateTo,
      },
      
      meta: {
        processingTimeMs: processingTime,
        timestamp: new Date().toISOString(),
        note: 'This is simulated data for demo purposes',
      },
    });
    
  } catch (error) {
    console.error('Payment history error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching payment history',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Format a payment record for API response
 */
function formatRecord(record: PaymentRecord): Record<string, unknown> {
  return {
    ...record,
    formattedAmount: formatCurrency(record.amount),
    maskedPhone: maskPhone(record.phone),
    timeAgo: getTimeAgo(new Date(record.createdAt)),
  };
}

/**
 * Calculate summary statistics from records
 */
function calculateSummary(records: PaymentRecord[]) {
  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
  const successfulCount = records.filter(r => r.status === 'COMPLETED').length;
  const failedCount = records.filter(r => r.status === 'FAILED').length;
  const pendingCount = records.filter(r => r.status === 'PENDING').length;
  
  return {
    totalRecords: records.length,
    totalAmount,
    formattedTotalAmount: formatCurrency(totalAmount),
    successfulCount,
    failedCount,
    pendingCount,
    successRate: records.length > 0 ? ((successfulCount / records.length) * 100).toFixed(1) + '%' : 'N/A',
    averageAmount: records.length > 0 ? Math.round(totalAmount / records.length) : 0,
    formattedAverageAmount: formatCurrency(records.length > 0 ? Math.round(totalAmount / records.length) : 0),
  };
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Mask phone number for privacy
 */
function maskPhone(phone: string): string {
  if (phone.length >= 9) {
    return phone.substring(0, 5) + '***' + phone.slice(-3);
  }
  return '***';
}

/**
 * Get human-readable time ago
 */
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
