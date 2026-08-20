'use client';

/**
 * Disbursement Panel Component
 * Digital Lending OS - Admin Loan Disbursement Interface
 * 
 * Allows administrators to initiate B2C (Business to Customer)
 * disbursements to customer M-Pesa accounts.
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowRightLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Phone,
  Banknote,
  User,
  FileText,
  Shield,
  Copy,
} from 'lucide-react';

export interface DisbursementPanelProps {
  /** Pre-selected loan for disbursement */
  preselectedLoan?: LoanOption;
  /** Available loans awaiting disbursement */
  pendingLoans?: LoanOption[];
  /** Callback on successful disbursement initiation */
  onDisbursed?: (data: DisbursementResult) => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Show confirmation dialog before submitting */
  requireConfirmation?: boolean;
  /** Custom class name */
  className?: string;
}

export interface LoanOption {
  id: string;
  loanNumber: string;
  customerName: string;
  customerPhone?: string;
  approvedAmount: number;
  product: string;
  applicationDate: string;
  status: 'APPROVED' | 'PENDING_DISBURSEMENT';
}

interface DisbursementResult {
  success: boolean;
  conversationID?: string;
  originatorConversationID?: string;
  message?: string;
  error?: string;
}

type PanelState = 'idle' | 'confirming' | 'processing' | 'success' | 'error';

interface FormData {
  selectedLoanId: string;
  phone: string;
  amount: string;
  commandID: string;
  remarks: string;
  occasion: string;
}

const COMMAND_OPTIONS = [
  { value: 'SalaryPayment', label: 'Salary Payment', description: 'Loan disbursement to individual' },
  { value: 'BusinessPayment', label: 'Business Payment', description: 'Payment to business entity' },
  { value: 'PromotionPayment', label: 'Promotion Payment', description: 'Promotional/welfare payment' },
];

export function DisbursementPanel({
  preselectedLoan,
  pendingLoans = [],
  onDisbursed,
  onError,
  requireConfirmation = true,
  className = '',
}: DisbursementPanelProps) {
  const [state, setState] = useState<PanelState>('idle');
  const [message, setMessage] = useState<string>('');
  const [result, setResult] = useState<DisbursementResult | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    selectedLoanId: preselectedLoan?.id || '',
    phone: preselectedLoan?.customerPhone || '',
    amount: preselectedLoan?.approvedAmount.toString() || '',
    commandID: 'SalaryPayment',
    remarks: `Loan disbursement - ${preselectedLoan?.loanNumber || ''}`,
    occasion: 'Loan Disbursement',
  });
  
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Update form when loan is selected
  const handleLoanSelect = useCallback((loanId: string) => {
    const loan = [...(preselectedLoan ? [preselectedLoan] : []), ...pendingLoans].find(l => l.id === loanId);
    
    if (loan) {
      setFormData(prev => ({
        ...prev,
        selectedLoanId: loanId,
        phone: loan.customerPhone || prev.phone,
        amount: loan.approvedAmount.toString(),
        remarks: `Loan disbursement - ${loan.loanNumber}`,
      }));
    }
  }, [preselectedLoan, pendingLoans]);

  // Format phone number
  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('2547')) return digits.substring(0, 12);
    if (digits.startsWith('07') && digits.length > 1) return '254' + digits.substring(1).substring(0, 9);
    if ((digits.startsWith('7') || digits.startsWith('1')) && digits.length <= 9) return digits;
    return digits.substring(0, 12);
  };

  const displayPhone = (phone: string): string => {
    if (phone.startsWith('2547') && phone.length >= 10) {
      return `+${phone.substring(0, 4)} ${phone.substring(4, 7)} ${phone.substring(7)}`;
    }
    return phone;
  };

  // Validate form
  const validateForm = (): string | null => {
    if (!formData.selectedLoanId && !preselectedLoan) {
      return 'Please select a loan to disburse';
    }
    if (!formData.phone || formData.phone.length < 10) {
      return 'Please enter a valid recipient phone number';
    }
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount < 50) {
      return 'Minimum disbursement amount is KSh 50';
    }
    if (amount > 300000) {
      return 'Maximum B2C amount is KSh 300,000 per transaction';
    }
    return null;
  };

  // Handle submit
  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setState('error');
      setMessage(validationError);
      onError?.(validationError);
      return;
    }

    if (requireConfirmation) {
      setShowConfirmDialog(true);
      return;
    }

    await processDisbursement();
  };

  // Process the disbursement
  const processDisbursement = async () => {
    setShowConfirmDialog(false);
    setState('processing');
    setMessage('Initiating disbursement via M-Pesa...');

    try {
      let formattedPhone = formData.phone;
      if (formattedPhone.startsWith('07')) {
        formattedPhone = '254' + formattedPhone.substring(1);
      } else if (formattedPhone.startsWith('+254')) {
        formattedPhone = formattedPhone.substring(1);
      }

      const response = await fetch('/api/payments/disburse/b2c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formattedPhone,
          amount: parseFloat(formData.amount),
          loanId: formData.selectedLoanId || preselectedLoan?.id,
          commandID: formData.commandID,
          occasion: formData.occasion,
          remarks: formData.remarks,
        }),
      });

      const data: DisbursementResult = await response.json();

      if (data.success) {
        setState('success');
        setMessage(data.message || 'Disbursement initiated successfully!');
        setResult(data);
        onDisbursed?.(data);
      } else {
        setState('error');
        setMessage(data.error || 'Failed to initiate disbursement');
        setResult(data);
        onError?.(data.error || 'Unknown error');
      }
    } catch (err) {
      setState('error');
      setMessage('Network error. Please check your connection.');
      onError?.('Network error');
    }
  };

  // Reset form
  const handleReset = () => {
    setState('idle');
    setMessage('');
    setResult(null);
    setShowConfirmDialog(false);
  };

  // Get selected loan info
  const getSelectedLoan = (): LoanOption | undefined => {
    if (preselectedLoan) return preselectedLoan;
    return pendingLoans.find(l => l.id === formData.selectedLoanId);
  };

  const selectedLoan = getSelectedLoan();

  return (
    <Card className={`w-full max-w-2xl mx-auto ${className}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <ArrowRightLeft className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-xl">Loan Disbursement</CardTitle>
            <CardDescription>
              Send funds directly to customer&apos;s M-Pesa account
            </CardDescription>
          </div>
        </div>
        
        {/* Status Badge */}
        <Badge 
          variant="outline" 
          className="ml-auto"
        >
          <Shield className="h-3 w-3 mr-1" />
          Admin Only
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Success State */}
        {state === 'success' && result && (
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-green-800">Disbursement Initiated!</p>
                <p className="text-sm text-green-700 mt-1">{message}</p>
                
                <div className="mt-3 p-3 bg-white rounded-lg space-y-2 font-mono text-sm">
                  <DetailRow label="Conversation ID" value={result.conversationID!} />
                  <DetailRow 
                    label="Originator ID" 
                    value={result.originatorConversationID!}
                    copyable
                  />
                </div>
                
                <p className="text-xs text-green-600 mt-3">
                  ⏱ Estimated completion: Instant - 5 minutes
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Disbursement Failed</p>
                <p className="text-sm text-red-700">{message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Processing State */}
        {state === 'processing' && (
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <div>
                <p className="font-medium text-blue-800">Processing...</p>
                <p className="text-sm text-blue-700">{message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        {(state === 'idle' || state === 'error') && (
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-5">
            
            {/* Loan Selection */}
            {!preselectedLoan && pendingLoans.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Select Loan to Disburse
                </Label>
                <Select
                  value={formData.selectedLoanId}
                  onValueChange={handleLoanSelect}
                  disabled={state === 'processing'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a loan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingLoans.map((loan) => (
                      <SelectItem key={loan.id} value={loan.id}>
                        <div className="flex flex-col">
                          <span>{loan.loanNumber} - {loan.customerName}</span>
                          <span className="text-xs text-muted-foreground">
                            KSh {loan.approvedAmount.toLocaleString()} • {loan.product}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {pendingLoans.length === 0 && (
                  <p className="text-sm text-gray-500">No loans pending disbursement</p>
                )}
              </div>
            )}

            {/* Selected Loan Info */}
            {selectedLoan && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{selectedLoan.loanNumber}</p>
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <User className="h-3 w-3" />
                      {selectedLoan.customerName}
                    </p>
                  </div>
                  <Badge variant={selectedLoan.status === 'PENDING_DISBURSEMENT' ? 'default' : 'secondary'}>
                    {selectedLoan.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
            )}

            <Separator />

            {/* Recipient Phone */}
            <div className="space-y-2">
              <Label htmlFor="disburse-phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Recipient M-Pesa Number
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  +254
                </span>
                <Input
                  id="disburse-phone"
                  type="tel"
                  placeholder="7XX XXX XXX"
                  value={displayPhone(formData.phone)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[\s+\-]/g, '');
                    setFormData({ ...formData, phone: formatPhone(raw) });
                  }}
                  disabled={state === 'processing'}
                  className="pl-16"
                  maxLength={12}
                  required
                />
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="disburse-amount" className="flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Disbursement Amount
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  KSh
                </span>
                <Input
                  id="disburse-amount"
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  disabled={state === 'processing'}
                  className="pl-14 text-lg font-semibold"
                  min={50}
                  max={300000}
                  required
                />
              </div>
              <p className="text-xs text-gray-500">
                Min: KSh 50 • Max: KSh 300,000
              </p>
            </div>

            {/* Command ID */}
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <Select
                value={formData.commandID}
                onValueChange={(value) => setFormData({ ...formData, commandID: value })}
                disabled={state === 'processing'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMAND_OPTIONS.map((cmd) => (
                    <SelectItem key={cmd.value} value={cmd.value}>
                      <div className="flex flex-col">
                        <span>{cmd.label}</span>
                        <span className="text-xs text-muted-foreground">{cmd.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks / Notes</Label>
              <Input
                id="remarks"
                placeholder="Internal notes about this disbursement..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                disabled={state === 'processing'}
              />
            </div>

            <Separator />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              disabled={state === 'processing'}
            >
              {state === 'processing' ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Initiating Disbursement...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="mr-2 h-5 w-5" />
                  Initiate Disbursement
                </>
              )}
            </Button>
          </form>
        )}

        {/* Actions after success/error */}
        {state !== 'idle' && state !== 'processing' && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              {state === 'success' ? 'Disburse Another' : 'Try Again'}
            </Button>
            
            {state === 'success' && (
              <Button 
                variant="outline"
                onClick={() => window.open('/api/payments/disburse/callback?originatorConversationID=' + result?.originatorConversationID)}
              >
                Check Status
              </Button>
            )}
          </div>
        )}

        {/* Security Notice */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <Shield className="h-3 w-3" />
            <span>Secure B2C transaction via Safaricom Daraja API</span>
            <Badge variant="secondary" className="text-xs ml-2">
              Demo Mode
            </Badge>
          </div>
        </div>
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Disbursement</DialogTitle>
            <DialogDescription>
              Please review the details below before initiating this disbursement.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <DetailRow 
                label="Recipient" 
                value={`${selectedLoan?.customerName || 'Customer'} (${displayPhone(formData.phone)})`}
              />
              <DetailRow 
                label="Amount" 
                value={`KSh ${parseFloat(formData.amount || 0).toLocaleString()}`}
                highlight
              />
              <DetailRow label="Type" value={formData.commandID.replace(/([A-Z])/g, ' $1').trim()} />
              {selectedLoan && <DetailRow label="Loan" value={selectedLoan.loanNumber} />}
            </div>
            
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                This action will initiate a real money transfer. Please ensure all details are correct.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={processDisbursement}>
              Confirm & Disburse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Helper component
function DetailRow({ 
  label, 
  value, 
  copyable, 
  highlight 
}: { 
  label: string; 
  value: string; 
  copyable?: boolean;
  highlight?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-gray-500 text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`font-mono text-sm ${highlight ? 'font-bold text-green-600 text-base' : ''}`}>
          {value}
        </span>
        {copyable && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="p-1 hover:bg-muted rounded"
          >
            <Copy className={`h-3.5 w-3.5 ${copied ? 'text-green-500' : 'text-gray-400'}`} />
          </button>
        )}
      </div>
    </div>
  );
}

export default DisbursementPanel;
