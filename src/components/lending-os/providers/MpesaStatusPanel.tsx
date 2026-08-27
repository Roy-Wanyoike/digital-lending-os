"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Smartphone,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Wallet,
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  AlertCircle,
  Timer,
  CreditCard,
  Send,
  ArrowDownLeft,
  Filter,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";

// Types
interface STKPushMetrics {
  successRate: number;
  avgCompletionTime: number; // seconds
  timeoutRate: number;
  totalToday: number;
  completed: number;
  failed: number;
  timedOut: number;
}

interface B2CMetrics {
  successRate: number;
  failedTransactions: number;
  avgProcessingTime: number; // seconds
  totalDisbursed: number;
  totalAmount: number; // KES
}

interface C2BMetrics {
  paymentsReceived: number;
  pendingConfirmation: number;
  totalAmount: number; // KES
  avgConfirmationTime: number; // seconds
}

interface MpesaBalance {
  workingAccount: number; // KES
  utilityAccount: number; // KES
  chargesPaid: number; // KES
  lastUpdated: Date;
}

interface RateLimitStatus {
  used: number;
  available: number;
  quota: number;
  resetTime: Date;
}

interface Transaction {
  id: string;
  type: "STK_PUSH" | "B2C" | "C2B" | "BALANCE_QUERY" | "REVERSAL";
  phoneNumber: string;
  amount?: number;
  status: "SUCCESS" | "FAILED" | "PENDING" | "TIMEOUT";
  errorCode?: string;
  timestamp: Date;
  duration: number; // ms
  reference: string;
}

interface ErrorAnalysis {
  code: string;
  description: string;
  count: number;
  percentage: number;
  lastOccurrence: Date;
}

interface MpesaStatusPanelProps {
  className?: string;
}

// Mock Data Generators
const generateSTKPushMetrics = (): STKPushMetrics => ({
  successRate: 94.7,
  avgCompletionTime: 18.5,
  timeoutRate: 3.2,
  totalToday: 1247,
  completed: 1181,
  failed: 44,
  timedOut: 40,
});

const generateB2CMetrics = (): B2CMetrics => ({
  successRate: 98.3,
  failedTransactions: 8,
  avgProcessingTime: 4.2,
  totalDisbursed: 456,
  totalAmount: 28475000, // ~28.5M KES
});

const generateC2BMetrics = (): C2BMetrics => ({
  paymentsReceived: 389,
  pendingConfirmation: 12,
  totalAmount: 15670000, // ~15.7M KES
  avgConfirmationTime: 8.3,
});

const generateMpesaBalance = (): MpesaBalance => ({
  workingAccount: 4523800.50,
  utilityAccount: 150000,
  chargesPaid: 23450,
  lastUpdated: new Date(),
});

const generateRateLimitStatus = (): RateLimitStatus => ({
  used: 1847,
  available: 1153,
  quota: 3000,
  resetTime: new Date(Date.now() + 3600000), // 1 hour from now
});

const generateRecentTransactions = (): Transaction[] => [
  {
    id: "TXN001",
    type: "STK_PUSH",
    phoneNumber: "254712***456",
    amount: 5000,
    status: "SUCCESS",
    timestamp: new Date(Date.now() - 120000),
    duration: 15234,
    reference: "LON-2026-00892",
  },
  {
    id: "TXN002",
    type: "B2C",
    phoneNumber: "254700***789",
    amount: 25000,
    status: "SUCCESS",
    timestamp: new Date(Date.now() - 300000),
    duration: 3890,
    reference: "DIS-2026-00341",
  },
  {
    id: "TXN003",
    type: "STK_PUSH",
    phoneNumber: "254733***123",
    amount: 10000,
    status: "FAILED",
    errorCode: "MPESA-5001",
    timestamp: new Date(Date.now() - 480000),
    duration: 5200,
    reference: "LON-2026-00891",
  },
  {
    id: "TXN004",
    type: "C2B",
    phoneNumber: "254711***567",
    amount: 8500,
    status: "SUCCESS",
    timestamp: new Date(Date.now() - 600000),
    duration: 4200,
    reference: "PAY-2026-00218",
  },
  {
    id: "TXN005",
    type: "STK_PUSH",
    phoneNumber: "254798***234",
    amount: 3500,
    status: "TIMEOUT",
    errorCode: "MPESA-TIMEOUT",
    timestamp: new Date(Date.now() - 720000),
    duration: 30000,
    reference: "LON-2026-00890",
  },
  {
    id: "TXN006",
    type: "B2C",
    phoneNumber: "254722***890",
    amount: 50000,
    status: "SUCCESS",
    timestamp: new Date(Date.now() - 900000),
    duration: 4150,
    reference: "DIS-2026-00340",
  },
  {
    id: "TXN007",
    type: "STK_PUSH",
    phoneNumber: "254745***678",
    amount: 7500,
    status: "PENDING",
    timestamp: new Date(Date.now() - 1020000),
    duration: 0,
    reference: "LON-2026-00889",
  },
  {
    id: "TXN008",
    type: "REVERSAL",
    phoneNumber: "254712***456",
    amount: 5000,
    status: "SUCCESS",
    errorCode: "MPESA-REV-001",
    timestamp: new Date(Date.now() - 1140000),
    duration: 6500,
    reference: "REV-2026-00042",
  },
  {
    id: "TXN009",
    type: "C2B",
    phoneNumber: "254706***321",
    amount: 12500,
    status: "SUCCESS",
    timestamp: new Date(Date.now() - 1260000),
    duration: 3900,
    reference: "PAY-2026-00217",
  },
  {
    id: "TXN010",
    type: "STK_PUSH",
    phoneNumber: "254777***654",
    amount: 2000,
    status: "FAILED",
    errorCode: "MPESA-INSUFFICIENT",
    timestamp: new Date(Date.now() - 1380000),
    duration: 2100,
    reference: "LON-2026-00888",
  },
];

const generateErrorAnalysis = (): ErrorAnalysis[] => [
  {
    code: "MPESA-5001",
    description: "Internal Server Error (Safaricom)",
    count: 23,
    percentage: 35.4,
    lastOccurrence: new Date(Date.now() - 1800000),
  },
  {
    code: "MPESA-TIMEOUT",
    description: "Request Timeout",
    count: 18,
    percentage: 27.7,
    lastOccurrence: new Date(Date.now() - 720000),
  },
  {
    code: "MPESA-INSUFFICIENT",
    description: "Insufficient Funds",
    count: 12,
    percentage: 18.5,
    lastOccurrence: new Date(Date.now() - 2400000),
  },
  {
    code: "MPESA-CANCELLED",
    description: "User Cancelled Request",
    count: 8,
    percentage: 12.3,
    lastOccurrence: new Date(Date.now() - 3600000),
  },
  {
    code: "MPESA-INVALID",
    description: "Invalid Phone Number",
    count: 4,
    percentage: 6.1,
    lastOccurrence: new Date(Date.now() - 7200000),
  },
];

// Hourly transaction data for charts
const hourlyTransactionData = [
  { hour: "00:00", stkPush: 12, b2c: 5, c2b: 3 },
  { hour: "01:00", stkPush: 8, b2c: 2, c2b: 1 },
  { hour: "02:00", stkPush: 5, b2c: 1, c2b: 0 },
  { hour: "03:00", stkPush: 3, b2c: 0, c2b: 0 },
  { hour: "04:00", stkPush: 7, b2c: 2, c2b: 1 },
  { hour: "05:00", stkPush: 15, b2c: 8, c2b: 5 },
  { hour: "06:00", stkPush: 45, b2c: 22, c2b: 18 },
  { hour: "07:00", stkPush: 98, b2c: 45, c2b: 38 },
  { hour: "08:00", stkPush: 145, b2c: 68, c2b: 52 },
  { hour: "09:00", stkPush: 178, b2c: 82, c2b: 67 },
  { hour: "10:00", stkPush: 165, b2c: 75, c2b: 58 },
  { hour: "11:00", stkPush: 142, b2c: 64, c2b: 49 },
  { hour: "12:00", stkPush: 98, b2c: 42, c2b: 35 },
  { hour: "13:00", stkPush: 85, b2c: 38, c2b: 29 },
  { hour: "14:00", stkPush: 112, b2c: 52, c2b: 41 },
  { hour: "15:00", stkPush: 128, b2c: 58, c2b: 46 },
  { hour: "16:00", stkPush: 135, b2c: 62, c2b: 48 },
  { hour: "17:00", stkPush: 118, b2c: 54, c2b: 42 },
  { hour: "18:00", stkPush: 95, b2c: 44, c2b: 36 },
  { hour: "19:00", stkPush: 72, b2c: 32, c2b: 26 },
  { hour: "20:00", stkPush: 58, b2c: 26, c2b: 21 },
  { hour: "21:00", stkPush: 42, b2c: 18, c2b: 14 },
  { hour: "22:00", stkPush: 28, b2c: 12, c2b: 8 },
  { hour: "23:00", stkPush: 18, b2c: 8, c2b: 5 },
];

export function MpesaStatusPanel({ className }: MpesaStatusPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "transactions" | "errors"
  >("overview");
  const [transactionFilter, setTransactionFilter] = useState<string>("all");

  // Generate mock data
  const stkMetrics = useMemo(() => generateSTKPushMetrics(), []);
  const b2cMetrics = useMemo(() => generateB2CMetrics(), []);
  const c2bMetrics = useMemo(() => generateC2BMetrics(), []);
  const balance = useMemo(() => generateMpesaBalance(), []);
  const rateLimit = useMemo(() => generateRateLimitStatus(), []);
  const transactions = useMemo(() => generateRecentTransactions(), []);
  const errorAnalysis = useMemo(() => generateErrorAnalysis(), []);

  const filteredTransactions = useMemo(() => {
    if (transactionFilter === "all") return transactions;
    return transactions.filter((t) => t.type === transactionFilter);
  }, [transactions, transactionFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDuration = (ms: number) => {
    if (ms === 0) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusBadge = (
    status: Transaction["status"]
  ) => {
    switch (status) {
      case "SUCCESS":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case "FAILED":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "TIMEOUT":
        return (
          <Badge className="bg-orange-100 text-orange-700 border-orange-200">
            <Timer className="h-3 w-3 mr-1" />
            Timeout
          </Badge>
        );
    }
  };

  const getTransactionTypeIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "STK_PUSH":
        return <Smartphone className="h-4 w-4 text-green-600" />;
      case "B2C":
        return <Send className="h-4 w-4 text-blue-600" />;
      case "C2B":
        return <ArrowDownLeft className="h-4 w-4 text-purple-600" />;
      case "REVERSAL":
        return <RefreshCw className="h-4 w-4 text-orange-600" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className={className}>
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <Smartphone className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl">M-Pesa / Daraja API Monitor</CardTitle>
                <CardDescription>
                  Safaricom M-Pesa integration health and performance metrics
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Operational
              </Badge>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* STK Push Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">
                STK Push Success Rate
              </span>
              <Smartphone className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold">{stkMetrics.successRate}%</span>
              <span className="flex items-center text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                <TrendingUp className="h-3 w-3 mr-0.5" />
                +0.3%
              </span>
            </div>
            <Progress value={stkMetrics.successRate} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {stkMetrics.completed.toLocaleString()} of{" "}
              {stkMetrics.totalToday.toLocaleString()} successful today
            </p>
          </CardContent>
        </Card>

        {/* B2C Disbursement Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">
                B2C Disbursements
              </span>
              <Send className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold">{b2cMetrics.successRate}%</span>
              <span className="flex items-center text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                <TrendingUp className="h-3 w-3 mr-0.5" />
                +0.1%
              </span>
            </div>
            <Progress value={b2cMetrics.successRate} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {b2cMetrics.failedTransactions} failed • Avg:{" "}
              {b2cMetrics.avgProcessingTime}s processing
            </p>
          </CardContent>
        </Card>

        {/* C2B Repayments Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">
                C2B Repayments Today
              </span>
              <ArrowDownLeft className="h-4 w-4 text-purple-500" />
            </div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold">{c2bMetrics.paymentsReceived}</span>
              <span className="text-lg text-muted-foreground">payments</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              {formatCurrency(c2bMetrics.totalAmount)} received
            </div>
            <p className="text-xs text-amber-600 mt-1">
              {c2bMetrics.pendingConfirmation} pending confirmation
            </p>
          </CardContent>
        </Card>

        {/* Account Balance Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">
                Working Account
              </span>
              <Wallet className="h-4 w-4 text-amber-500" />
            </div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-2xl font-bold">
                {formatCurrency(balance.workingAccount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Utility: {formatCurrency(balance.utilityAccount)}</span>
              <span>Updated just now</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs for switching views */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-4 border-b pb-3">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === "overview"
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BarChart3 className="h-4 w-4 inline mr-2" />
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab("transactions")}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === "transactions"
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Activity className="h-4 w-4 inline mr-2" />
                  Transactions
                </button>
                <button
                  onClick={() => setActiveTab("errors")}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === "errors"
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  Errors
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Transaction Volume Chart */}
                  <div>
                    <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Today's Transaction Volume by Hour
                    </h4>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={hourlyTransactionData}>
                          <defs>
                            <linearGradient
                              id="colorStk"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#22c55e"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="#22c55e"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="hour"
                            tick={{ fontSize: 11 }}
                            interval={2}
                          />
                          <YAxis tick={{ fontSize: 11 }} />
                          <RechartsTooltip
                            contentStyle={{
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="stkPush"
                            name="STK Push"
                            stroke="#22c55e"
                            fillOpacity={1}
                            fill="url(#colorStk)"
                            strokeWidth={2}
                          />
                          <Line
                            type="monotone"
                            dataKey="b2c"
                            name="B2C"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="c2b"
                            name="C2B"
                            stroke="#a855f7"
                            strokeWidth={2}
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Detailed Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* STK Push Details */}
                    <Card>
                      <CardContent className="p-4">
                        <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-green-500" />
                          STK Push Details
                        </h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Completion</span>
                            <span className="font-medium">
                              {stkMetrics.avgCompletionTime}s
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Timeout Rate</span>
                            <span className={`font-medium ${stkMetrics.timeoutRate > 5 ? 'text-red-600' : 'text-amber-600'}`}>
                              {stkMetrics.timeoutRate}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Completed</span>
                            <span className="font-medium">
                              {stkMetrics.completed.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Failed</span>
                            <span className="font-medium text-red-600">
                              {stkMetrics.failed}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* B2C Details */}
                    <Card>
                      <CardContent className="p-4">
                        <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
                          <Send className="h-4 w-4 text-blue-500" />
                          B2C Disbursement Details
                        </h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Disbursed</span>
                            <span className="font-medium">
                              {b2cMetrics.totalDisbursed.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Amount</span>
                            <span className="font-medium">
                              {(b2cMetrics.totalAmount / 1000000).toFixed(1)}M
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Processing</span>
                            <span className="font-medium">
                              {b2cMetrics.avgProcessingTime}s
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Failed Txns</span>
                            <span className="font-medium text-red-600">
                              {b2cMetrics.failedTransactions}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* C2B Details */}
                    <Card>
                      <CardContent className="p-4">
                        <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
                          <ArrowDownLeft className="h-4 w-4 text-purple-500" />
                          C2B Repayment Details
                        </h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Received</span>
                            <span className="font-medium">
                              {formatCurrency(c2bMetrics.totalAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Pending Conf.</span>
                            <span className="font-medium text-amber-600">
                              {c2bMetrics.pendingConfirmation}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Confirm Time</span>
                            <span className="font-medium">
                              {c2bMetrics.avgConfirmationTime}s
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Success Rate</span>
                            <span className="font-medium text-emerald-600">
                              99.2%
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === "transactions" && (
                <div className="space-y-4">
                  {/* Filter Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    {["all", "STK_PUSH", "B2C", "C2B", "REVERSAL"].map(
                      (filter) => (
                        <Button
                          key={filter}
                          variant={
                            transactionFilter === filter ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setTransactionFilter(filter)}
                          className="text-xs"
                        >
                          {filter === "all"
                            ? "All"
                            : filter.replace("_", " ")}
                        </Button>
                      )
                    )}
                  </div>

                  {/* Transactions Table */}
                  <div className="border rounded-lg overflow-hidden max-h-[450px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((txn) => (
                          <TableRow key={txn.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getTransactionTypeIcon(txn.type)}
                                <span className="text-xs font-medium">
                                  {txn.type.replace("_", " ")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {txn.reference}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {txn.phoneNumber}
                            </TableCell>
                            <TableCell>
                              {txn.amount
                                ? formatCurrency(txn.amount)
                                : "-"}
                            </TableCell>
                            <TableCell>{getStatusBadge(txn.status)}</TableCell>
                            <TableCell className="text-xs">
                              {formatDuration(txn.duration)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(txn.timestamp).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {activeTab === "errors" && (
                <div className="space-y-4">
                  {/* Error Summary Chart */}
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={errorAnalysis} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis
                          dataKey="code"
                          type="category"
                          tick={{ fontSize: 11 }}
                          width={120}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                          }}
                          formatter={(value: number, name: string) => [
                            `${value} occurrences`,
                            "Count",
                          ]}
                        />
                        <Bar
                          dataKey="count"
                          fill="#ef4444"
                          radius={[0, 4, 4, 0]}
                          name="Occurrences"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Error Details Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Error Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">% Share</TableHead>
                          <TableHead>Last Occurred</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {errorAnalysis.map((error) => (
                          <TableRow key={error.code}>
                            <TableCell>
                              <Badge variant="destructive" className="font-mono">
                                {error.code}
                              </Badge>
                            </TableCell>
                            <TableCell>{error.description}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {error.count}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Progress
                                  value={error.percentage}
                                  className="w-16 h-2"
                                />
                                <span className="text-sm w-10">
                                  {error.percentage}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(error.lastOccurrence).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Status Cards */}
        <div className="space-y-6">
          {/* Rate Limiting Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                API Rate Limiting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Quota Used</span>
                    <span className="font-medium">
                      {rateLimit.used.toLocaleString()} /{" "}
                      {rateLimit.quota.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={(rateLimit.used / rateLimit.quota) * 100}
                    className="h-3"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {rateLimit.available.toLocaleString()} requests remaining
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>
                    Resets in{" "}
                    {Math.round(
                      (rateLimit.resetTime.getTime() - Date.now()) / 60000
                    )}{" "}
                    minutes
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Peak RPM</p>
                    <p className="text-lg font-bold">47</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Current RPM</p>
                    <p className="text-lg font-bold">32</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Today's Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-muted-foreground">
                    Total Transactions
                  </span>
                  <span className="font-bold">
                    {(stkMetrics.totalToday +
                      b2cMetrics.totalDisbursed +
                      c2bMetrics.paymentsReceived).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-muted-foreground">
                    Total Volume
                  </span>
                  <span className="font-bold">
                    {formatCurrency(
                      b2cMetrics.totalAmount + c2bMetrics.totalAmount
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-emerald-50 rounded">
                  <span className="text-sm text-emerald-700">
                    Overall Success Rate
                  </span>
                  <span className="font-bold text-emerald-700">97.8%</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <span className="text-sm text-red-700">
                    Total Failures
                  </span>
                  <span className="font-bold text-red-700">
                    {stkMetrics.failed +
                      b2cMetrics.failedTransactions}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connection Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-purple-500" />
                API Endpoints Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  {
                    name: "STK Push",
                    status: "healthy",
                    latency: "245ms",
                  },
                  { name: "B2C Payment", status: "healthy", latency: "1.2s" },
                  { name: "C2B Register", status: "healthy", latency: "180ms" },
                  { name: "Transaction Status", status: "degraded", latency: "890ms" },
                  { name: "Reversal", status: "healthy", latency: "2.1s" },
                  { name: "Account Balance", status: "healthy", latency: "320ms" },
                ].map((endpoint) => (
                  <div
                    key={endpoint.name}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          endpoint.status === "healthy"
                            ? "bg-emerald-500"
                            : "bg-amber-500 animate-pulse"
                        }`}
                      />
                      <span className="text-sm">{endpoint.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {endpoint.latency}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default MpesaStatusPanel;
