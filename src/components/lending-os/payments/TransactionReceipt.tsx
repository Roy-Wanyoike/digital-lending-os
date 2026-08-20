'use client';

/**
 * Transaction Receipt Component
 * Digital Lending OS - Professional Receipt Display
 * 
 * Displays a professional receipt for completed M-Pesa transactions
 * with QR code, print, and share options.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Receipt,
  Download,
  Printer,
  Share2,
  Copy,
  CheckCircle2,
  QrCode,
  Smartphone,
  Building2,
  Calendar,
  Clock,
  User,
  FileText,
  X,
} from 'lucide-react';

export interface TransactionReceiptProps {
  /** Transaction data */
  transaction: TransactionData;
  /** Show print button */
  showPrint?: boolean;
  /** Show download button */
  showDownload?: boolean;
  /** Show share button */
  showShare?: boolean;
  /** Trigger as dialog */
  asDialog?: boolean;
  /** Custom class name */
  className?: string;
}

export interface TransactionData {
  id: string;
  receiptNumber?: string;
  referenceNumber: string;
  type: 'STK_PUSH' | 'B2C' | 'B2B' | 'C2B';
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  amount: number;
  currency?: string;
  phoneNumber?: string;
  customerName?: string;
  accountNumber?: string;
  description?: string;
  transactionDate?: string;
  createdAt?: string;
  merchantName?: string;
  merchantTill?: string;
  fees?: number;
  totalAmount?: number;
  loanId?: string;
  loanNumber?: string;
}

export function TransactionReceipt({
  transaction,
  showPrint = true,
  showDownload = true,
  showShare = true,
  asDialog = false,
  className = '',
}: TransactionReceiptProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: transaction.currency || 'KES',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-KE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Mask phone
  const maskPhone = (phone?: string): string => {
    if (!phone) return '-';
    if (phone.length >= 9) {
      return phone.substring(0, 5) + '***' + phone.slice(-3);
    }
    return phone;
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Print receipt
  const handlePrint = () => {
    window.print();
  };

  // Download as PDF (simplified - would use a library in production)
  const handleDownload = () => {
    alert('PDF download would be implemented with jsPDF or similar library');
  };

  // Share
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `M-Pesa Receipt - ${transaction.receiptNumber || transaction.referenceNumber}`,
          text: `Payment of ${formatCurrency(transaction.amount)} - ${transaction.description || 'M-Pesa Transaction'}`,
        });
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    } else {
      copyToClipboard(`Receipt: ${transaction.receiptNumber}\nAmount: ${formatCurrency(transaction.amount)}\nDate: ${formatDate(transaction.transactionDate || transaction.createdAt)}`);
    }
  };

  // Get transaction type label
  const getTypeLabel = (): string => {
    switch (transaction.type) {
      case 'STK_PUSH': return 'M-Pesa STK Push Payment';
      case 'B2C': return 'M-Pesa Disbursement (B2C)';
      case 'B2B': return 'Business Transfer (B2B)';
      case 'C2B': return 'Customer Payment (C2B)';
      default: return 'M-Pesa Transaction';
    }
  };

  // Generate simple QR code placeholder (would use library in production)
  const generateQRContent = (): string => {
    return JSON.stringify({
      type: 'mpesa_receipt',
      receipt: transaction.receiptNumber,
      amount: transaction.amount,
      currency: transaction.currency || 'KES',
      date: transaction.transactionDate || transaction.createdAt,
      ref: transaction.referenceNumber,
    });
  };

  const receiptContent = (
    <div className={`receipt-container bg-white ${className}`} id="receipt-content">
      {/* Header */}
      <div className="text-center pb-4 border-b-2 border-dashed border-gray-300">
        <div className="flex justify-center mb-3">
          <div className="p-3 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white">
            <Receipt className="h-8 w-8" />
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-gray-900">PAYMENT RECEIPT</h2>
        <p className="text-sm text-gray-600 mt-1">{getTypeLabel()}</p>
        
        {/* Status Badge */}
        <div className="flex justify-center mt-3">
          <Badge 
            variant={transaction.status === 'COMPLETED' ? 'default' : 'destructive'}
            className={transaction.status === 'COMPLETED' ? 'bg-green-100 text-green-800 hover:bg-green-100 px-4 py-1' : ''}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            {transaction.status === 'COMPLETED' ? 'COMPLETED' : transaction.status}
          </Badge>
        </div>
      </div>

      {/* Main Details */}
      <div className="py-6 space-y-4">
        {/* Amount */}
        <div className="text-center py-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
          <p className="text-sm text-gray-600 uppercase tracking-wide">Amount Paid</p>
          <p className="text-4xl font-bold text-green-700 mt-1">
            {formatCurrency(transaction.amount)}
          </p>
          {(transaction.fees && transaction.fees > 0) && (
            <p className="text-xs text-gray-500 mt-1">
              Fees: {formatCurrency(transaction.fees)}
              {transaction.totalAmount && ` • Total: ${formatCurrency(transaction.totalAmount)}`}
            </p>
          )}
        </div>

        {/* Receipt Number */}
        {transaction.receiptNumber && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-gray-600">M-Pesa Receipt No.</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-blue-600">{transaction.receiptNumber}</span>
              <button
                onClick={() => copyToClipboard(transaction.receiptNumber!)}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="Copy"
              >
                <Copy className={`h-4 w-4 ${copied ? 'text-green-500' : 'text-gray-400'}`} />
              </button>
            </div>
          </div>
        )}

        <Separator />

        {/* Transaction Details */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Transaction Details
          </h4>
          
          <DetailRow
            icon={<Calendar className="h-4 w-4" />}
            label="Date & Time"
            value={formatDate(transaction.transactionDate || transaction.createdAt)}
          />
          
          <DetailRow
            icon={<QrCode className="h-4 w-4" />}
            label="Reference Number"
            value={transaction.referenceNumber}
            monospace
            copyable
            onCopy={() => copyToClipboard(transaction.referenceNumber)}
          />

          {transaction.phoneNumber && (
            <DetailRow
              icon={<Smartphone className="h-4 w-4" />}
              label="Phone Number"
              value={maskPhone(transaction.phoneNumber)}
            />
          )}

          {transaction.customerName && (
            <DetailRow
              icon={<User className="h-4 w-4" />}
              label="Customer Name"
              value={transaction.customerName}
            />
          )}

          {transaction.loanNumber && (
            <DetailRow
              icon={<FileText className="h-4 w-4" />}
              label="Loan Reference"
              value={transaction.loanNumber}
            />
          )}

          {transaction.description && (
            <DetailRow
              icon={<FileText className="h-4 w-4" />}
              label="Description"
              value={transaction.description}
            />
          )}
        </div>

        <Separator />

        {/* Merchant Info */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Merchant Information
          </h4>
          
          <DetailRow
            icon={<Building2 className="h-4 w-4" />}
            label="Merchant"
            value={transaction.merchantName || 'Digital Lending OS'}
          />
          
          {transaction.merchantTill && (
            <DetailRow
              icon={<Smartphone className="h-4 w-4" />}
              label="Till / Paybill"
              value={transaction.merchantTill}
              monospace
            />
          )}
        </div>
      </div>

      {/* QR Code Section */}
      <div className="py-4 border-t-2 border-dashed border-gray-300">
        <button
          onClick={() => setShowQR(!showQR)}
          className="w-full flex items-center justify-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <QrCode className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            {showQR ? 'Hide' : 'Show'} Verification QR Code
          </span>
        </button>
        
        {showQR && (
          <div className="mt-4 flex justify-center">
            <div className="p-4 bg-white border-2 border-dashed border-gray-300 rounded-lg">
              {/* In production, use a QR code library like qrcode.react */}
              <div className="w-40 h-40 bg-gray-100 rounded flex items-center justify-center">
                <div className="text-center">
                  <QrCode className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-xs text-gray-500">QR Code</p>
                  <p className="text-[10px] text-gray-400">(Use library)</p>
                </div>
              </div>
              <p className="text-xs text-center text-gray-500 mt-2">
                Scan to verify this receipt
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t-2 border-dashed border-gray-300 text-center">
        <p className="text-xs text-gray-500">
          This is an official payment receipt generated by Digital Lending OS
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Powered by Safaricom M-Pesa • {new Date().getFullYear()}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t">
        {showPrint && (
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        )}
        
        {showDownload && (
          <Button variant="outline" size="sm" onClick={handleDownload} className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        )}
        
        {showShare && (
          <Button variant="outline" size="sm" onClick={handleShare} className="flex-1">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        )}
      </div>
    </div>
  );

  // Render as dialog or inline
  if (asDialog) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Receipt className="mr-2 h-4 w-4" />
            View Receipt
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Receipt</DialogTitle>
          </DialogHeader>
          {receiptContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        {receiptContent}
      </CardContent>
    </Card>
  );
}

// Detail Row Component
function DetailRow({ 
  icon, 
  label, 
  value, 
  monospace, 
  copyable, 
  onCopy 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  monospace?: boolean;
  copyable?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-gray-400 flex-shrink-0">{icon}</span>
        <span className="text-sm text-gray-600 whitespace-nowrap">{label}</span>
      </div>
      <div className="flex items-center gap-2 min-w-0 justify-end">
        <span className={`text-sm text-right break-all ${monospace ? 'font-mono font-medium' : 'font-medium text-gray-900'}`}>
          {value}
        </span>
        {copyable && onCopy && (
          <button
            onClick={onCopy}
            className="p-1 hover:bg-muted rounded transition-colors flex-shrink-0"
            title="Copy to clipboard"
          >
            <Copy className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );
}

// Sample data for demo
export const SAMPLE_RECEIPT: TransactionData = {
  id: 'pay_001',
  receiptNumber: 'QIK3ABC123',
  referenceNumber: 'TXN-2026-0820-00123',
  type: 'STK_PUSH',
  status: 'COMPLETED',
  amount: 4200,
  currency: 'KES',
  phoneNumber: '254712345678',
  customerName: 'John Kamau',
  description: 'Loan repayment - LN-2026-00042',
  transactionDate: '20260820153045',
  createdAt: '2026-08-20T15:30:45Z',
  merchantName: 'Quick Credit Ltd',
  merchantTill: '174379',
  fees: 0,
  totalAmount: 4200,
  loanId: 'loan_001',
  loanNumber: 'LN-2026-00042',
};

export default TransactionReceipt;
