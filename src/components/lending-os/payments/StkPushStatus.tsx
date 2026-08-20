'use client';

/**
 * STK Push Status Component
 * Digital Lending OS - Payment Status Tracker
 * 
 * Polls for STK Push payment status and displays
 * success/failure states with receipt information.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Receipt,
  AlertTriangle,
  Smartphone,
  Copy,
  ExternalLink,
} from 'lucide-react';

export interface StkPushStatusProps {
  /** CheckoutRequestID to track */
  checkoutRequestID: string;
  /** Auto-start polling */
  autoStart?: boolean;
  /** Polling interval in milliseconds (default: 3000) */
  pollInterval?: number;
  /** Maximum polling duration in ms (default: 180000 = 3 min) */
  maxPollDuration?: number;
  /** Callback on status change */
  onStatusChange?: (status: PaymentStatus, data?: StatusData) => void;
  /** Callback when payment is confirmed */
  onPaymentComplete?: (data: StatusData) => void;
  /** Show retry button on failure */
  showRetry?: boolean;
  /** Custom class name */
  className?: string;
}

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'timeout' | 'error';

export interface StatusData {
  checkoutRequestID: string;
  merchantRequestID?: string;
  resultCode: number;
  resultDesc: string;
  amount?: number;
  mpesaReceiptNumber?: string;
  phoneNumber?: string;
  transactionDate?: string;
}

interface PollResponse {
  exists: boolean;
  status: 'pending' | 'completed' | 'failed' | 'timeout' | 'not_found';
  data?: {
    initiatedAt: string;
    request: {
      phone: string;
      amount: number;
    };
    callbackData?: StatusData & {
      MerchantRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value: string | number }>;
      };
    };
  };
}

export function StkPushStatus({
  checkoutRequestID,
  autoStart = true,
  pollInterval = 3000,
  maxPollDuration = 180000,
  onStatusChange,
  onPaymentComplete,
  showRetry = true,
  className = '',
}: StkPushStatusProps) {
  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Poll for status updates
  const pollStatus = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/payments/stkpush/callback?checkoutRequestID=${checkoutRequestID}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }
      
      const data: PollResponse = await response.json();
      
      if (!data.exists || data.status === 'not_found') {
        setStatus('error');
        setError('Transaction not found');
        return false;
      }
      
      // Map API status to component status
      let newStatus: PaymentStatus;
      
      switch (data.status) {
        case 'pending':
          newStatus = 'processing';
          break;
        case 'completed':
          newStatus = 'completed';
          break;
        case 'failed':
          // Determine specific failure type
          if (data.data?.callbackData?.ResultCode === 1032) {
            newStatus = 'failed'; // Cancelled
          } else if (data.data?.callbackData?.ResultCode === 1017) {
            newStatus = 'timeout';
          } else {
            newStatus = 'failed';
          }
          break;
        case 'timeout':
          newStatus = 'timeout';
          break;
        default:
          newStatus = 'pending';
      }
      
      // Extract status data if available
      if (data.data?.callbackData) {
        const cb = data.data.callbackData;
        const metadata = cb.CallbackMetadata?.Item || [];
        
        const newData: StatusData = {
          checkoutRequestID,
          merchantRequestID: cb.MerchantRequestID,
          resultCode: cb.ResultCode,
          resultDesc: cb.ResultDesc,
          amount: metadata.find(i => i.Name === 'Amount')?.Value as number,
          mpesaReceiptNumber: metadata.find(i => i.Name === 'MpesaReceiptNumber')?.Value as string,
          phoneNumber: metadata.find(i => i.Name === 'PhoneNumber')?.Value as string,
          transactionDate: metadata.find(i => i.Name === 'TransactionDate')?.Value as string,
        };
        
        setStatusData(newData);
        
        // Trigger callbacks
        if (newStatus === 'completed') {
          onPaymentComplete?.(newData);
        }
      }
      
      // Update status
      if (newStatus !== status) {
        setStatus(newStatus);
        onStatusChange?.(newStatus, statusData || undefined);
      }
      
      setPollCount(prev => prev + 1);
      
      // Continue polling if still pending/processing
      return newStatus === 'pending' || newStatus === 'processing';
      
    } catch (err) {
      console.error('Poll error:', err);
      setError('Failed to check status');
      return false;
    }
  }, [checkoutRequestID, status, statusData, onStatusChange, onPaymentComplete]);

  // Start polling
  useEffect(() => {
    if (!autoStart) return;
    
    setIsPolling(true);
    
    const doPoll = async () => {
      const shouldContinue = await pollStatus();
      
      if (shouldContinue && Date.now() - startTime < maxPollDuration) {
        setTimeout(doPoll, pollInterval);
      } else {
        setIsPolling(false);
        
        // Auto-timeout if exceeded max duration
        if (Date.now() - startTime >= maxPollDuration && 
            (status === 'pending' || status === 'processing')) {
          setStatus('timeout');
        }
      }
    };
    
    doPoll();
    
    return () => {
      setIsPolling(false);
    };
  }, [autoStart, pollStatus, pollInterval, maxPollDuration, startTime, status]);

  // Manual refresh
  const handleRefresh = async () => {
    setIsPolling(true);
    setError(null);
    await pollStatus();
    setIsPolling(false);
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get status display info
  const getStatusDisplay = (): {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
    bgColor: string;
  } => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="h-6 w-6" />,
          title: 'Waiting for Payment',
          description: 'Please enter your M-Pesa PIN to complete',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 border-yellow-200',
        };
      case 'processing':
        return {
          icon: <Loader2 className="h-6 w-6 animate-spin" />,
          title: 'Processing...',
          description: `Checking payment status (${pollCount})`,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200',
        };
      case 'completed':
        return {
          icon: <CheckCircle2 className="h-6 w-6" />,
          title: 'Payment Successful!',
          description: 'Your payment has been received and confirmed',
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
        };
      case 'failed':
        return {
          icon: <XCircle className="h-6 w-6" />,
          title: 'Payment Failed',
          description: statusData?.resultDesc || 'The payment could not be completed',
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
        };
      case 'timeout':
        return {
          icon: <AlertTriangle className="h-6 w-6" />,
          title: 'Payment Timed Out',
          description: 'You did not enter your PIN in time. Please try again.',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 border-orange-200',
        };
      case 'error':
        return {
          icon: <XCircle className="h-6 w-6" />,
          title: 'Error',
          description: error || 'An unexpected error occurred',
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
        };
      default:
        return {
          icon: <Clock className="h-6 w-6" />,
          title: 'Unknown Status',
          description: 'Unable to determine payment status',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200',
        };
    }
  };

  const displayInfo = getStatusDisplay();

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            Payment Status
          </CardTitle>
          
          {/* Manual Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isPolling}
            className="gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isPolling ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Status Display */}
        <div className={`p-4 rounded-lg border ${displayInfo.bgColor}`}>
          <div className="flex items-start gap-3">
            <div className={displayInfo.color}>
              {displayInfo.icon}
            </div>
            <div className="flex-1">
              <p className={`font-semibold ${displayInfo.color}`}>
                {displayInfo.title}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {displayInfo.description}
              </p>
              
              {/* Result Code for failures */}
              {(status === 'failed' || status === 'timeout') && statusData && (
                <Badge variant="outline" className="mt-2 text-xs">
                  Code: {statusData.resultCode}
                </Badge>
              )}
            </div>
            
            {/* Status Badge */}
            <Badge 
              variant={status === 'completed' ? 'default' : 'secondary'}
              className={
                status === 'completed' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''
              }
            >
              {status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Transaction Details */}
        {statusData && (
          <>
            <Separator />
            
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Transaction Details
              </h4>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-3 font-mono text-sm">
                {/* Reference */}
                <DetailRow
                  label="Reference ID"
                  value={checkoutRequestID}
                  copyable
                  onCopy={() => copyToClipboard(checkoutRequestID)}
                  copied={copied}
                />
                
                {/* Amount */}
                {statusData.amount && (
                  <DetailRow
                    label="Amount"
                    value={`KSh ${Number(statusData.amount).toLocaleString()}`}
                    highlight
                  />
                )}
                
                {/* M-Pesa Receipt */}
                {statusData.mpesaReceiptNumber && (
                  <DetailRow
                    label="M-Pesa Receipt"
                    value={statusData.mpesaReceiptNumber}
                    copyable
                    onCopy={() => copyToClipboard(statusData.mpesaReceiptNumber!)}
                    copied={copied}
                    success
                  />
                )}
                
                {/* Phone Number */}
                {statusData.phoneNumber && (
                  <DetailRow
                    label="Phone Number"
                    value={maskPhone(statusData.phoneNumber)}
                  />
                )}
                
                {/* Transaction Date */}
                {statusData.transactionDate && (
                  <DetailRow
                    label="Transaction Date"
                    value={formatMpesaDate(statusData.transactionDate)}
                  />
                )}
                
                {/* Merchant Request ID */}
                {statusData.merchantRequestID && (
                  <DetailRow
                    label="Merchant Ref"
                    value={statusData.merchantRequestID}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Retry on failure */}
          {(status === 'failed' || status === 'timeout' || status === 'error') && showRetry && (
            <Button onClick={handleRefresh} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
          
          {/* View Receipt on success */}
          {status === 'completed' && statusData?.mpesaReceiptNumber && (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => window.open(`/api/payments/status/query?transactionID=${statusData.mpesaReceiptNumber}`, '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Full Receipt
            </Button>
          )}
        </div>

        {/* Polling Indicator */}
        {isPolling && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking status every {(pollInterval / 1000)}s...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Sub-components
function DetailRow({ 
  label, 
  value, 
  copyable, 
  onCopy, 
  copied, 
  highlight, 
  success 
}: {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: () => void;
  copied?: boolean;
  highlight?: boolean;
  success?: boolean;
}) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`${highlight ? 'font-bold text-lg text-green-600' : success ? 'text-green-600 font-medium' : ''}`}>
          {value}
        </span>
        {copyable && (
          <button
            onClick={onCopy}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Copy to clipboard"
          >
            <Copy className={`h-3.5 w-3.5 ${copied ? 'text-green-500' : 'text-gray-400'}`} />
          </button>
        )}
      </div>
    </div>
  );
}

function maskPhone(phone: string): string {
  if (phone.length >= 9) {
    return phone.substring(0, 5) + '***' + phone.slice(-3);
  }
  return phone;
}

function formatMpesaDate(dateStr: string): string {
  // Parse YYYYMMDDHHmmss format
  if (/^\d{14}$/.test(dateStr)) {
    const date = new Date(
      parseInt(dateStr.substring(0, 4)),
      parseInt(dateStr.substring(4, 6)) - 1,
      parseInt(dateStr.substring(6, 8)),
      parseInt(dateStr.substring(8, 10)),
      parseInt(dateStr.substring(10, 12)),
      parseInt(dateStr.substring(12, 14))
    );
    return date.toLocaleString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  
  // Try ISO format
  try {
    return new Date(dateStr).toLocaleString('en-KE');
  } catch {
    return dateStr;
  }
}

export default StkPushStatus;
