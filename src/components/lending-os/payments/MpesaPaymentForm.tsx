'use client';

/**
 * M-Pesa Payment Form Component
 * Digital Lending OS - Customer Payment Interface
 * 
 * Provides a form for initiating M-Pesa STK Push payments.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Smartphone,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Shield,
  Phone,
  Banknote,
} from 'lucide-react';

export interface MpesaPaymentFormProps {
  /** Pre-filled amount */
  defaultAmount?: number;
  /** Loan ID for reference */
  loanId?: string;
  /** Account ID for reference */
  accountId?: string;
  /** Callback after successful initiation */
  onInitiated?: (checkoutRequestID: string) => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Show loan selector (for admin) */
  showLoanSelector?: boolean;
  /** Available loans for selection */
  availableLoans?: Array<{ id: string; number: string; amount: number; customerName: string }>;
  /** Custom class name */
  className?: string;
}

type FormStatus = 'idle' | 'loading' | 'success' | 'error' | 'waiting';

interface FormData {
  phone: string;
  amount: string;
  selectedLoanId?: string;
}

interface InitiateResponse {
  success: boolean;
  message?: string;
  checkoutRequestID?: string;
  customerMessage?: string;
  error?: string;
  errorCode?: string;
}

export function MpesaPaymentForm({
  defaultAmount = 0,
  loanId,
  accountId,
  onInitiated,
  onError,
  showLoanSelector = false,
  availableLoans = [],
  className = '',
}: MpesaPaymentFormProps) {
  const [formData, setFormData] = useState<FormData>({
    phone: '',
    amount: defaultAmount ? defaultAmount.toString() : '',
    selectedLoanId: loanId,
  });
  
  const [status, setStatus] = useState<FormStatus>('idle');
  const [message, setMessage] = useState<string>('');
  const [checkoutRequestID, setCheckoutRequestID] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(180); // 3 minutes timeout

  // Format phone number as user types
  const formatPhoneNumber = useCallback((value: string): string => {
    // Remove non-digits
    let digits = value.replace(/\D/g, '');
    
    // Handle different formats
    if (digits.startsWith('2547') && digits.length > 9) {
      return digits.substring(0, 12);
    }
    
    if (digits.startsWith('0') && digits.length > 1) {
      digits = '254' + digits.substring(1);
      return digits.substring(0, 12);
    }
    
    if (digits.startsWith('7') || digits.startsWith('1')) {
      if (digits.length === 1 && value.startsWith('0')) {
        return '0' + digits;
      }
      if (!value.includes('254')) {
        return digits.length <= 9 ? digits : '254' + digits;
      }
    }
    
    return digits.substring(0, 12);
  }, []);

  // Display formatted phone
  const displayPhone = (phone: string): string => {
    if (phone.startsWith('2547') && phone.length >= 10) {
      return `+${phone.substring(0, 4)} ${phone.substring(4, 7)} ${phone.substring(7)}`;
    }
    if (phone.startsWith('07') && phone.length === 10) {
      return `+254${phone.substring(1, 4)} ${phone.substring(4, 7)} ${phone.substring(7)}`;
    }
    return phone;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.phone || formData.phone.length < 10) {
      setStatus('error');
      setMessage('Please enter a valid M-Pesa phone number');
      onError?.('Invalid phone number');
      return;
    }
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount < 10) {
      setStatus('error');
      setMessage('Minimum payment amount is KSh 10');
      onError?.('Invalid amount');
      return;
    }
    
    if (amount > 150000) {
      setStatus('error');
      setMessage('Maximum STK Push amount is KSh 150,000');
      onError?.('Amount exceeds limit');
      return;
    }
    
    // Format phone to standard format
    let formattedPhone = formData.phone;
    if (formattedPhone.startsWith('07')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    setStatus('loading');
    setMessage('Initiating M-Pesa STK Push...');
    
    try {
      const response = await fetch('/api/payments/stkpush/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formattedPhone,
          amount,
          loanId: formData.selectedLoanId || loanId,
          accountId,
          accountReference: formData.selectedLoanId || loanId || `PAY-${Date.now()}`,
          transactionDesc: `Payment of KSh ${amount.toLocaleString()}`,
        }),
      });
      
      const data: InitiateResponse = await response.json();
      
      if (data.success && data.checkoutRequestID) {
        setStatus('success');
        setMessage(data.message || data.customerMessage || 'STK Push initiated successfully!');
        setCheckoutRequestID(data.checkoutRequestID);
        
        // Start waiting state
        setTimeout(() => setStatus('waiting'), 2000);
        
        onInitiated?.(data.checkoutRequestID);
        
        // Start countdown
        startCountdown();
      } else {
        setStatus('error');
        setMessage(data.error || data.customerMessage || 'Failed to initiate payment');
        onError?.(data.error || 'Unknown error');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
      onError?.('Network error');
    }
  };

  // Countdown timer for waiting state
  const startCountdown = useCallback(() => {
    setCountdown(180);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setStatus('error');
          setMessage('Transaction timed out. Please try again.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Format countdown time
  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset form
  const handleReset = () => {
    setStatus('idle');
    setMessage('');
    setCheckoutRequestID('');
    setCountdown(180);
    setFormData(prev => ({
      ...prev,
      phone: '',
      amount: defaultAmount ? defaultAmount.toString() : '',
    }));
  };

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-3">
          <div className="p-3 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white">
            <Smartphone className="h-8 w-8" />
          </div>
        </div>
        <CardTitle className="text-xl font-bold">Pay with M-Pesa</CardTitle>
        <CardDescription>
          Secure mobile money payment via Safaricom M-Pesa
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Success State */}
        {(status === 'success' || status === 'waiting') && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-3 mb-2">
              {status === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0 animate-pulse" />
              )}
              <span className="font-medium text-green-800">
                {status === 'success' ? 'STK Push Sent!' : 'Waiting for Payment'}
              </span>
            </div>
            <p className="text-sm text-green-700">{message}</p>
            
            {checkoutRequestID && (
              <p className="text-xs text-green-600 mt-2 font-mono">
                Ref: {checkoutRequestID}
              </p>
            )}
            
            {status === 'waiting' && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-yellow-700">Time remaining</span>
                  <Badge variant="outline" className="font-mono text-yellow-700 border-yellow-300">
                    {formatCountdown(countdown)}
                  </Badge>
                </div>
                <div className="w-full bg-yellow-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${(countdown / 180) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800">Payment Error</p>
                <p className="text-sm text-red-700">{message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {status === 'loading' && (
          <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-blue-600 flex-shrink-0 animate-spin" />
              <div>
                <p className="font-medium text-blue-800">Processing...</p>
                <p className="text-sm text-blue-700">{message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Form */}
        {status !== 'waiting' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Amount Field */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Amount to Pay
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  KSh
                </span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  disabled={status === 'loading'}
                  className="pl-14 text-lg font-semibold"
                  min={10}
                  max={150000}
                  step={100}
                  required
                />
              </div>
              <p className="text-xs text-gray-500">
                Min: KSh 10 • Max: KSh 150,000
              </p>
            </div>

            {/* Phone Number Field */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                M-Pesa Number
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  +254
                </span>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="7XX XXX XXX"
                  value={displayPhone(formData.phone)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[\s+\-]/g, '');
                    setFormData({ ...formData, phone: formatPhoneNumber(raw) });
                  }}
                  disabled={status === 'loading'}
                  className="pl-16"
                  maxLength={12}
                  required
                />
              </div>
              <p className="text-xs text-gray-500">
                Format: 07XX XXX XXX or 2547XX XXX XXX
              </p>
            </div>

            {/* Loan Selector (Optional) */}
            {showLoanSelector && availableLoans.length > 0 && (
              <div className="space-y-2">
                <Label>Select Loan (Optional)</Label>
                <Select
                  value={formData.selectedLoanId}
                  onValueChange={(value) => setFormData({ ...formData, selectedLoanId: value })}
                  disabled={status === 'loading'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a loan to pay" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLoans.map((loan) => (
                      <SelectItem key={loan.id} value={loan.id}>
                        {loan.number} - {loan.customerName} (KSh {loan.amount.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            {/* Instructions */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Smartphone className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-gray-900">You will receive an STK Push prompt</p>
                  <p className="text-gray-600">Enter your M-Pesa PIN to complete the payment</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Secure & Encrypted</p>
                  <p className="text-gray-600">Your PIN is never stored or shared</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Smartphone className="mr-2 h-5 w-5" />
                  Pay Now
                </>
              )}
            </Button>
          </form>
        )}

        {/* Waiting State Actions */}
        {status === 'waiting' && (
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={() => {
                // Trigger status check
                window.location.href = `/api/payments/stkpush/callback?checkoutRequestID=${checkoutRequestID}`;
              }}
              className="w-full"
            >
              <Clock className="mr-2 h-4 w-4" />
              Check Status
            </Button>
            
            <Button
              variant="ghost"
              onClick={handleReset}
              className="w-full"
            >
              Make Another Payment
            </Button>
          </div>
        )}

        {/* Error State Retry */}
        {status === 'error' && (
          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full"
          >
            Try Again
          </Button>
        )}

        {/* Security Note */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <Shield className="h-3 w-3" />
            <span>Secured by Safaricom M-Pesa API</span>
            <Badge variant="secondary" className="text-xs ml-2">
              Demo Mode
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MpesaPaymentForm;
