'use client';

/**
 * Payment History List Component
 * Digital Lending OS - Transaction History Viewer
 * 
 * Displays a list of all payment transactions with
 * filtering, search, and export capabilities.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  History,
  Download,
  Filter,
  Search,
  RefreshCw,
  Eye,
  Receipt,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Smartphone,
  ArrowUpRight,
  ArrowDownLeft,
  XCircle,
  CheckCircle2,
  Clock,
  Loader2,
  FileText,
} from 'lucide-react';

export interface PaymentHistoryListProps {
  /** Pre-filter by loan ID */
  loanId?: string;
  /** Pre-filter by customer ID */
  customerId?: string;
  /** Show filters panel */
  showFilters?: boolean;
  /** Show export button */
  showExport?: boolean;
  /** Custom class name */
  className?: string;
}

export interface PaymentRecord {
  id: string;
  transactionId: string;
  referenceNumber: string;
  type: 'STK_PUSH' | 'B2C' | 'B2B' | 'C2B' | 'REVERSAL';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';
  phone: string;
  amount: number;
  currency: string;
  description: string;
  mpesaReceiptNumber?: string;
  loanId?: string;
  customerId?: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
  formattedAmount?: string;
  maskedPhone?: string;
  timeAgo?: string;
}

interface PaymentHistoryResponse {
  success: boolean;
  records: PaymentRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    totalPages: number;
    currentPage: number;
  };
  summary: {
    totalRecords: number;
    totalAmount: number;
    formattedTotalAmount: string;
    successfulCount: number;
    failedCount: number;
    pendingCount: number;
    successRate: string;
  };
  filters: Record<string, unknown>;
}

export function PaymentHistoryList({
  loanId,
  customerId,
  showFilters = true,
  showExport = true,
  className = '',
}: PaymentHistoryListProps) {
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 10;

  // Fetch payment history
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (loanId) params.set('loanId', loanId);
      if (customerId) params.set('customerId', customerId);
      if (filterType) params.set('type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      params.set('limit', String(pageSize));
      params.set('offset', String((currentPage - 1) * pageSize));
      
      const response = await fetch(`/api/payments/history?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }
      
      const data: PaymentHistoryResponse = await response.json();
      
      if (data.success) {
        setRecords(data.records);
        setTotalPages(data.pagination.totalPages);
        setTotalRecords(data.pagination.total);
      } else {
        setError('Failed to load payment history');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [loanId, customerId, filterType, filterStatus, currentPage]);

  // Initial fetch and on filter/page change
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Handle refresh
  const handleRefresh = () => {
    setCurrentPage(1);
    fetchHistory();
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Status', 'Phone', 'Amount', 'Receipt', 'Reference'];
    const csvRows = records.map(r => [
      new Date(r.createdAt).toLocaleString(),
      r.type,
      r.status,
      r.phone,
      r.amount.toString(),
      r.mpesaReceiptNumber || '',
      r.referenceNumber,
    ]);
    
    const csv = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  // Get type icon and color
  const getTypeDisplay = (type: PaymentRecord['type']): { icon: React.ReactNode; color: string; label: string } => {
    switch (type) {
      case 'STK_PUSH':
        return { icon: <Smartphone className="h-4 w-4" />, color: 'text-green-600', label: 'STK Push' };
      case 'B2C':
        return { icon: <ArrowDownLeft className="h-4 w-4" />, color: 'text-blue-600', label: 'Disbursement' };
      case 'B2B':
        return { icon: <ArrowUpDown className="h-4 w-4" />, color: 'text-purple-600', label: 'B2B' };
      case 'C2B':
        return { icon: <ArrowUpRight className="h-4 w-4" />, color: 'text-orange-600', label: 'C2B' };
      case 'REVERSAL':
        return { icon: <XCircle className="h-4 w-4" />, color: 'text-red-600', label: 'Reversal' };
      default:
        return { icon: <FileText className="h-4 w-4" />, color: 'text-gray-600', label: type };
    }
  };

  // Get status badge variant
  const getStatusBadge = (status: PaymentRecord['status']): { variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string } => {
    switch (status) {
      case 'COMPLETED':
        return { variant: 'default', color: 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200' };
      case 'PENDING':
        return { variant: 'secondary', color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200' };
      case 'FAILED':
        return { variant: 'destructive', color: '' };
      case 'CANCELLED':
        return { variant: 'outline', color: 'text-gray-600' };
      case 'TIMEOUT':
        return { variant: 'outline', color: 'text-orange-600' };
      default:
        return { variant: 'secondary', color: '' };
    }
  };

  // Filter records by search query
  const filteredRecords = searchQuery
    ? records.filter(r =>
        r.phone.includes(searchQuery) ||
        r.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.mpesaReceiptNumber && r.mpesaReceiptNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : records;

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <History className="h-5 w-5 text-indigo-600" />
              Payment History
            </CardTitle>
            <CardDescription>
              View all M-Pesa transactions and disbursements
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Refresh */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            
            {/* Export */}
            {showExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    Print Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/30 rounded-lg">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by phone, receipt, or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Type Filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="STK_PUSH">STK Push</SelectItem>
                <SelectItem value="B2C">Disbursement</SelectItem>
                <SelectItem value="B2B">B2B</SelectItem>
                <SelectItem value="C2B">C2B</SelectItem>
                <SelectItem value="REVERSAL">Reversal</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="TIMEOUT">Timeout</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="ml-auto">
              Retry
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && !records.length ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            <p>Loading payment history...</p>
          </div>
        ) : (
          <>
            {/* Results Summary */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Showing {filteredRecords.length} of {totalRecords} transactions
              </span>
              
              {/* Quick Stats */}
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-green-700 border-green-300">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Success
                </Badge>
                <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
                <Badge variant="outline" className="text-red-700 border-red-300">
                  <XCircle className="h-3 w-3 mr-1" />
                  Failed
                </Badge>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>No transactions found</p>
                        <p className="text-sm mt-1">Try adjusting your filters or search criteria</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => {
                      const typeInfo = getTypeDisplay(record.type);
                      const statusInfo = getStatusBadge(record.status);
                      
                      return (
                        <TableRow key={record.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="font-medium text-sm">
                                {new Date(record.createdAt).toLocaleDateString('en-KE', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(record.createdAt).toLocaleTimeString('en-KE', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={typeInfo.color}>{typeInfo.icon}</span>
                              <span className="text-sm font-medium">{typeInfo.label}</span>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <Badge 
                              variant={statusInfo.variant}
                              className={statusInfo.color || ''}
                            >
                              {record.status.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          
                          <TableCell>
                            <span className="font-mono text-sm">
                              {maskPhone(record.phone)}
                            </span>
                          </TableCell>
                          
                          <TableCell className="text-right">
                            <span className="font-semibold text-green-700">
                              KSh {record.amount.toLocaleString()}
                            </span>
                          </TableCell>
                          
                          <TableCell>
                            {record.mpesaReceiptNumber ? (
                              <span className="font-mono text-sm font-medium text-blue-600">
                                {record.mpesaReceiptNumber}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`/api/payments/status/query?transactionID=${record.transactionId || record.referenceNumber}`, '_blank')}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </p>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Helper functions
function maskPhone(phone: string): string {
  if (phone.length >= 9) {
    return phone.substring(0, 5) + '***' + phone.slice(-3);
  }
  return phone;
}

export default PaymentHistoryList;
