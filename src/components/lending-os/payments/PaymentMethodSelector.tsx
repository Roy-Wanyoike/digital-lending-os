'use client';

/**
 * Payment Method Selector Component
 * Digital Lending OS - Multi-Method Payment Interface
 * 
 * Allows users to select from multiple payment methods
 * and renders the appropriate payment form.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Smartphone,
  Building2,
  CreditCard,
  Banknote,
  Check,
  ChevronRight,
  Loader2,
} from 'lucide-react';

export interface PaymentMethodSelectorProps {
  /** Available payment methods */
  availableMethods?: PaymentMethod[];
  /** Pre-selected method */
  defaultMethod?: PaymentMethod;
  /** Amount to pay */
  amount?: number;
  /** Callback when method is selected */
  onMethodChange?: (method: PaymentMethod) => void;
  /** Callback to initiate payment */
  onPayment?: (method: PaymentMethod, data?: Record<string, unknown>) => void;
  /** Show amount display */
  showAmount?: boolean;
  /** Custom class name */
  className?: string;
}

export type PaymentMethod = 'mpesa' | 'bank_transfer' | 'card' | 'cash';

export interface PaymentMethodInfo {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  features: string[];
  processingTime: string;
  fee?: string;
  minAmount?: number;
  maxAmount?: number;
  enabled: boolean;
}

const PAYMENT_METHODS: Record<PaymentMethod, PaymentMethodInfo> = {
  mpesa: {
    id: 'mpesa',
    name: 'M-Pesa',
    description: 'Pay with Safaricom mobile money',
    icon: <Smartphone className="h-6 w-6" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    features: ['Instant confirmation', 'Secure PIN entry', 'Available 24/7'],
    processingTime: 'Instant',
    fee: 'Free',
    minAmount: 10,
    maxAmount: 150000,
    enabled: true,
  },
  bank_transfer: {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    description: 'Direct bank account transfer',
    icon: <Building2 className="h-6 w-6" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    features: ['Large amounts supported', 'Business payments', '1-3 business days'],
    processingTime: '1-3 days',
    fee: 'KSh 50-500',
    minAmount: 1000,
    maxAmount: 5000000,
    enabled: true,
  },
  card: {
    id: 'card',
    name: 'Card Payment',
    description: 'Visa / Mastercard / Debit Cards',
    icon: <CreditCard className="h-6 w-6" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    features: ['International cards', 'Instant processing', '3D Secure'],
    processingTime: 'Instant',
    fee: '1.5% + KSh 20',
    minAmount: 100,
    maxAmount: 1000000,
    enabled: false, // Not yet implemented
  },
  cash: {
    id: 'cash',
    name: 'Cash Deposit',
    description: 'Pay at any branch or agent',
    icon: <Banknote className="h-6 w-6" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    features: ['Physical deposit', 'Receipt provided', 'Branch locations'],
    processingTime: 'Same day',
    fee: 'KSh 100',
    minAmount: 50,
    maxAmount: 10000000,
    enabled: false, // Requires branch visit
  },
};

export function PaymentMethodSelector({
  availableMethods,
  defaultMethod = 'mpesa',
  amount,
  onMethodChange,
  onPayment,
  showAmount = true,
  className = '',
}: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(defaultMethod);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter methods if specified
  const methods = availableMethods
    ? Object.values(PAYMENT_METHODS).filter(m => availableMethods.includes(m.id))
    : Object.values(PAYMENT_METHODS).filter(m => m.enabled);

  // Handle method selection
  const handleSelectMethod = useCallback((method: PaymentMethod) => {
    setSelectedMethod(method);
    onMethodChange?.(method);
  }, [onMethodChange]);

  // Handle continue/payment
  const handleContinue = async () => {
    setIsProcessing(true);
    
    // Simulate brief loading
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setIsProcessing(false);
    onPayment?.(selectedMethod);
  };

  const selectedInfo = PAYMENT_METHODS[selectedMethod];

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Select Payment Method</CardTitle>
            <CardDescription>Choose how you would like to pay</CardDescription>
          </div>
          
          {/* Amount Display */}
          {showAmount && amount !== undefined && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Amount Due</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(amount)}</p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Payment Methods Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {methods.map((method) => (
            <button
              key={method.id}
              onClick={() => handleSelectMethod(method.id)}
              disabled={!method.enabled}
              className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                selectedMethod === method.id
                  ? `${method.borderColor} ${method.bgColor} shadow-md`
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              } ${!method.enabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {/* Selected Indicator */}
              {selectedMethod === method.id && (
                <div className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center ${method.color.replace('text-', 'bg-')} text-white`}>
                  <Check className="h-3 w-3" />
                </div>
              )}

              {/* Disabled Badge */}
              {!method.enabled && (
                <Badge variant="secondary" className="absolute top-3 right-3 text-xs">
                  Coming Soon
                </Badge>
              )}

              <div className={`${method.color} mb-3`}>
                {method.icon}
              </div>

              <h3 className="font-semibold text-gray-900">{method.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{method.description}</p>

              {/* Quick Info */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Processing time</span>
                  <span className="font-medium text-gray-700">{method.processingTime}</span>
                </div>
                {method.fee && (
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-gray-500">Fee</span>
                    <span className="font-medium text-gray-700">{method.fee}</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Selected Method Details */}
        {selectedInfo && (
          <>
            <Separator />
            
            <div className={`p-4 rounded-lg ${selectedInfo.bgColor} border ${selectedInfo.borderColor}`}>
              <div className="flex items-start gap-4">
                <div className={selectedInfo.color}>
                  {selectedInfo.icon}
                </div>
                
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">
                    Pay with {selectedInfo.name}
                  </h4>
                  
                  <ul className="mt-2 space-y-1">
                    {selectedInfo.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                        <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {(selectedInfo.minAmount || selectedInfo.maxAmount) && (
                    <p className="text-xs text-gray-600 mt-3">
                      Limits: {selectedInfo.minAmount && `Min ${formatCurrency(selectedInfo.minAmount)}`}
                      {selectedInfo.minAmount && selectedInfo.maxAmount && ' • '}
                      {selectedInfo.maxAmount && `Max ${formatCurrency(selectedInfo.maxAmount)}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Continue Button */}
        <Button
          size="lg"
          className="w-full h-12 text-base font-semibold"
          onClick={handleContinue}
          disabled={!selectedInfo.enabled || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Continue with {selectedInfo.name}
              <ChevronRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>

        {/* Security Note */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-2">
          <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Secure payment powered by industry-standard encryption</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Export types and constants
export type { PaymentMethodInfo };
export { PAYMENT_METHODS };

export default PaymentMethodSelector;
