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
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Send,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Zap,
  Wifi,
  WifiOff,
  Inbox,
  DollarSign,
  PieChart as PieChartIcon,
  Filter,
  Phone,
  Shield,
  Megaphone,
  KeyRound,
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
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

// Types
interface SMSMetrics {
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  totalCost: number; // KES
}

interface DeliveryTrendData {
  date: string;
  delivered: number;
  failed: number;
  sent: number;
}

interface MessageTypeBreakdown {
  type: string;
  count: number;
  percentage: number;
  color: string;
  icon: React.ReactNode;
}

interface SMSMessage {
  id: string;
  recipient: string; // masked phone number
  messagePreview: string;
  messageType: "notification" | "otp" | "collection" | "marketing" | "transactional";
  status: "delivered" | "failed" | "pending" | "sent";
  cost: number; // KES
  timestamp: Date;
  provider?: string;
}

interface GatewayBalance {
  remainingCredits: number;
  monthlyQuota: number;
  percentageUsed: number;
  resetDate: Date;
}

interface ThroughputData {
  currentMPM: number; // messages per minute
  peakToday: number;
  averageToday: number;
}

interface FailureReason {
  reason: string;
  count: number;
  percentage: string;
  description: string;
}

interface SMSGatewayMonitorProps {
  className?: string;
}

// Colors for pie chart
const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#ec4899"];

// Mock Data Generators
const generateSMSMetrics = (): SMSMetrics => ({
  sent: 4521,
  delivered: 4389,
  failed: 89,
  pending: 43,
  totalCost: 68235.50,
});

const generateDeliveryTrend = (): DeliveryTrendData[] => [
  { date: "Mon", delivered: 3850, failed: 72, sent: 3980 },
  { date: "Tue", delivered: 4120, failed: 85, sent: 4280 },
  { date: "Wed", delivered: 3980, failed: 68, sent: 4120 },
  { date: "Thu", delivered: 4420, failed: 92, sent: 4580 },
  { date: "Fri", delivered: 4680, failed: 78, sent: 4820 },
  { date: "Sat", delivered: 2890, failed: 45, sent: 2980 },
  { date: "Sun", delivered: 2150, failed: 32, sent: 2220 },
];

const generateMessageTypeBreakdown = (): MessageTypeBreakdown[] => [
  {
    type: "Notifications",
    count: 1856,
    percentage: 41.1,
    color: "#22c55e",
    icon: <Inbox className="h-4 w-4" />,
  },
  {
    type: "OTP Verification",
    count: 1234,
    percentage: 27.3,
    color: "#3b82f6",
    icon: <KeyRound className="h-4 w-4" />,
  },
  {
    type: "Collection Reminders",
    count: 892,
    percentage: 19.7,
    color: "#f59e0b",
    icon: <Megaphone className="h-4 w-4" />,
  },
  {
    type: "Marketing",
    count: 389,
    percentage: 8.6,
    color: "#a855f7",
    icon: <Phone className="h-4 w-4" />,
  },
  {
    type: "Transactional",
    count: 150,
    percentage: 3.3,
    color: "#ec4899",
    icon: <Activity className="h-4 w-4" />,
  },
];

const generateRecentMessages = (): SMSMessage[] => [
  {
    id: "SMS001",
    recipient: "254712***456",
    messagePreview: "Your loan application LN-2026-0892 has been approved...",
    messageType: "notification",
    status: "delivered",
    cost: 1.25,
    timestamp: new Date(Date.now() - 120000),
    provider: "AfricaTalking",
  },
  {
    id: "SMS002",
    recipient: "254700***789",
    messagePreview: "Your OTP code is 847291. Valid for 5 minutes.",
    messageType: "otp",
    status: "delivered",
    cost: 1.25,
    timestamp: new Date(Date.now() - 300000),
    provider: "AfricaTalking",
  },
  {
    id: "SMS003",
    recipient: "254733***123",
    messagePreview: "Reminder: Your loan repayment of KES 5,000 is due today.",
    messageType: "collection",
    status: "failed",
    cost: 1.25,
    timestamp: new Date(Date.now() - 480000),
    provider: "Twilio",
  },
  {
    id: "SMS004",
    recipient: "254711***567",
    messagePreview: "Welcome to QuickCash! Your account has been created...",
    messageType: "notification",
    status: "delivered",
    cost: 1.25,
    timestamp: new Date(Date.now() - 600000),
    provider: "AfricaTalking",
  },
  {
    id: "SMS005",
    recipient: "254798***234",
    messagePreview: "Get up to KES 50,000 instantly! Apply now at...",
    messageType: "marketing",
    status: "pending",
    cost: 1.50,
    timestamp: new Date(Date.now() - 720000),
    provider: "BulkSMS",
  },
  {
    id: "SMS006",
    recipient: "254722***890",
    messagePreview: "Payment of KES 2,500 received. Ref: PAY-2026-0218",
    messageType: "transactional",
    status: "delivered",
    cost: 1.25,
    timestamp: new Date(Date.now() - 900000),
    provider: "AfricaTalking",
  },
  {
    id: "SMS007",
    recipient: "254745***678",
    messagePreview: "Your OTP code is 392847. Valid for 5 minutes.",
    messageType: "otp",
    status: "delivered",
    cost: 1.25,
    timestamp: new Date(Date.now() - 1020000),
    provider: "AfricaTalking",
  },
  {
    id: "SMS008",
    recipient: "254706***321",
    messagePreview: "URGENT: Your account is 15 days overdue. Pay now to avoid...",
    messageType: "collection",
    status: "delivered",
    cost: 1.25,
    timestamp: new Date(Date.now() - 1140000),
    provider: "Twilio",
  },
  {
    id: "SMS009",
    recipient: "254777***654",
    messagePreview: "Your loan disbursement of KES 25,000 is processing...",
    messageType: "notification",
    status: "sent",
    cost: 1.25,
    timestamp: new Date(Date.now() - 1260000),
    provider: "AfricaTalking",
  },
  {
    id: "SMS010",
    recipient: "254799***987",
    messagePreview: "Your OTP code is 102938. Valid for 5 minutes.",
    messageType: "otp",
    status: "failed",
    cost: 0,
    timestamp: new Date(Date.now() - 1380000),
    provider: "AfricaTalking",
  },
  {
    id: "SMS011",
    recipient: "254720***111",
    messagePreview: "Special offer! Get reduced interest rates this month only...",
    messageType: "marketing",
    status: "delivered",
    cost: 1.50,
    timestamp: new Date(Date.now() - 1500000),
    provider: "BulkSMS",
  },
  {
    id: "SMS012",
    recipient: "254714***222",
    messagePreview: "Your statement for January 2026 is ready. Download at...",
    messageType: "notification",
    status: "pending",
    cost: 1.25,
    timestamp: new Date(Date.now() - 1620000),
    provider: "AfricaTalking",
  },
  {
    id: "SMS013",
    recipient: "254735***333",
    messagePreview: "Final notice: Account will be reported to CRB in 3 days...",
    messageType: "collection",
    status: "delivered",
    cost: 1.25,
    timestamp: new Date(Date.now() - 1740000),
    provider: "Twilio",
  },
  {
    id: "SMS014",
    recipient: "254748***444",
    messagePreview: "Password reset requested. If this wasn't you, contact support.",
    messageType: "otp",
    status: "delivered",
    cost: 1.25,
    timestamp: new Date(Date.now() - 1860000),
    provider: "AfricaTalking",
  },
  {
    id: "SMS015",
    recipient: "254751***555",
    messagePreview: "Congratulations! You're pre-approved for KES 100,000...",
    messageType: "marketing",
    status: "failed",
    cost: 0,
    timestamp: new Date(Date.now() - 1980000),
    provider: "BulkSMS",
  },
  {
    id: "SMS016",
    recipient: "254762***666",
    messagePreview: "Your repayment schedule has been updated. New due date:...",
    messageType: "transactional",
    status: "delivered",
    cost: 1.25,
    timestamp: new Date(Date.now() - 2100000),
    provider: "AfricaTalking",
  },
  {
    id: "SMS017",
    recipient: "254773***777",
    messagePreview: "Welcome back! We missed you. Login to check your new offers...",
    messageType: "marketing",
    status: "delivered",
    cost: 1.50,
    timestamp: new Date(Date.now() - 2220000),
    provider: "BulkSMS",
  },
  {
    id: "SMS018",
    recipient: "254784***888",
    messagePreview: "Your profile has been verified successfully.",
    messageType: "notification",
    status: "delivered",
    cost: 1.25,
    timestamp: new Date(Date.now() - 2340000),
    provider: "AfricaTalking",
  },
  {
    id: "SMS019",
    recipient: "254795***999",
    messagePreview: "OTP code: 567890. Do not share with anyone.",
    messageType: "otp",
    status: "pending",
    cost: 1.25,
    timestamp: new Date(Date.now() - 2460000),
    provider: "AfricaTalking",
  },
  {
    id: "SMS020",
    recipient: "254708***000",
    messagePreview: "Loan application approved! Accept terms within 24 hours...",
    messageType: "notification",
    status: "delivered",
    cost: 1.25,
    timestamp: new Date(Date.now() - 2580000),
    provider: "AfricaTalking",
  },
];

const generateGatewayBalance = (): GatewayBalance => ({
  remainingCredits: 45280,
  monthlyQuota: 75000,
  percentageUsed: 39.6,
  resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
});

const generateThroughput = (): ThroughputData => ({
  currentMPM: 28,
  peakToday: 52,
  averageToday: 35,
});

const generateFailureReasons = (): FailureReason[] => [
  {
    reason: "Invalid Number",
    count: 34,
    percentage: "38.2%",
    description: "Phone number format incorrect or doesn't exist",
  },
  {
    reason: "Network Error",
    count: 22,
    percentage: "24.7%",
    description: "Telco network temporarily unavailable",
  },
  {
    reason: "Blocked by User",
    count: 18,
    percentage: "20.2%",
    description: "Recipient has opted out or blocked sender",
  },
  {
    reason: "Insufficient Balance",
    count: 10,
    percentage: "11.2%",
    description: "Gateway balance too low to send",
  },
  {
    reason: "Content Filtered",
    count: 5,
    percentage: "5.6%",
    description: "Message content flagged as spam",
  },
];

export function SMSGatewayMonitor({ className }: SMSGatewayMonitorProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "messages" | "failures"
  >("overview");
  const [messageFilter, setMessageFilter] = useState<string>("all");

  // Generate mock data
  const metrics = useMemo(() => generateSMSMetrics(), []);
  const deliveryTrend = useMemo(() => generateDeliveryTrend(), []);
  const messageTypeBreakdown = useMemo(
    () => generateMessageTypeBreakdown(),
    []
  );
  const messages = useMemo(() => generateRecentMessages(), []);
  const gatewayBalance = useMemo(() => generateGatewayBalance(), []);
  const throughput = useMemo(() => generateThroughput(), []);
  const failureReasons = useMemo(() => generateFailureReasons(), []);

  const filteredMessages = useMemo(() => {
    if (messageFilter === "all") return messages;
    if (messageFilter === "status-delivered")
      return messages.filter((m) => m.status === "delivered");
    if (messageFilter === "status-failed")
      return messages.filter((m) => m.status === "failed");
    if (messageFilter === "status-pending")
      return messages.filter((m) => m.status === "pending");
    return messages.filter((m) => m.messageType === messageFilter);
  }, [messages, messageFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status: SMSMessage["status"]) => {
    switch (status) {
      case "delivered":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Delivered
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "sent":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            <Send className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        );
    }
  };

  const getMessageTypeIcon = (type: SMSMessage["messageType"]) => {
    switch (type) {
      case "notification":
        return <Inbox className="h-4 w-4 text-green-500" />;
      case "otp":
        return <KeyRound className="h-4 w-4 text-blue-500" />;
      case "collection":
        return <Megaphone className="h-4 w-4 text-amber-500" />;
      case "marketing":
        return <Phone className="h-4 w-4 text-purple-500" />;
      case "transactional":
        return <Activity className="h-4 w-4 text-pink-500" />;
    }
  };

  const deliveryRate =
    metrics.sent > 0 ? ((metrics.delivered / metrics.sent) * 100).toFixed(1) : "0";

  return (
    <div className={className}>
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-teal-100 rounded-xl">
                <MessageSquare className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-xl">SMS Gateway Monitor</CardTitle>
                <CardDescription>
                  Real-time SMS delivery tracking and gateway health
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                <Wifi className="h-4 w-4" />
                <span className="font-medium">Connected</span>
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              </div>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Sent Today
              </span>
              <Send className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{metrics.sent.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              +12% vs yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Delivered
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {metrics.delivered.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {deliveryRate}% delivery rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Failed
              </span>
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">{metrics.failed}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {((metrics.failed / metrics.sent) * 100).toFixed(2)}% fail rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Pending
              </span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {metrics.pending}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting delivery</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Total Cost
              </span>
              <DollarSign className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xl font-bold">{formatCurrency(metrics.totalCost)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              ~{formatCurrency(metrics.totalCost / metrics.sent)} per SMS
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts & Main Content */}
        <div className="lg:col-span-2 space-y-6">
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
                  onClick={() => setActiveTab("messages")}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === "messages"
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Inbox className="h-4 w-4 inline mr-2" />
                  Messages
                </button>
                <button
                  onClick={() => setActiveTab("failures")}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === "failures"
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 inline mr-2" />
                  Failures
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Delivery Rate Trend Chart */}
                  <div>
                    <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      7-Day Delivery Rate Trend
                    </h4>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={deliveryTrend}>
                          <defs>
                            <linearGradient
                              id="colorDelivered"
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
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <RechartsTooltip
                            contentStyle={{
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="delivered"
                            name="Delivered"
                            stroke="#22c55e"
                            fillOpacity={1}
                            fill="url(#colorDelivered)"
                            strokeWidth={2}
                          />
                          <Line
                            type="monotone"
                            dataKey="failed"
                            name="Failed"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Message Types & Balance Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Message Type Breakdown */}
                    <div>
                      <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                        <PieChartIcon className="h-4 w-4" />
                        Message Types Breakdown
                      </h4>
                      <div className="flex items-center gap-4">
                        <div className="h-[180px] w-[180px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={messageTypeBreakdown}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={3}
                                dataKey="count"
                              >
                                {messageTypeBreakdown.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                  />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(value: number, name: string) => [
                                  `${value.toLocaleString()} (${messageTypeBreakdown.find(m => m.count === value)?.percentage}%)`,
                                  messageTypeBreakdown.find(m => m.count === value)?.type || name,
                                ]}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-2">
                          {messageTypeBreakdown.map((type) => (
                            <div
                              key={type.type}
                              className="flex items-center gap-2 text-sm"
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: type.color }}
                              />
                              <span className="flex-1">{type.type}</span>
                              <span className="font-medium">
                                {type.percentage}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Gateway Balance & Throughput */}
                    <div className="space-y-4">
                      {/* Gateway Balance */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Gateway Balance
                        </h4>
                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">
                              Credits Used
                            </span>
                            <span className="font-medium">
                              {gatewayBalance.percentageUsed}%
                            </span>
                          </div>
                          <Progress
                            value={gatewayBalance.percentageUsed}
                            className="h-3"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Remaining</p>
                            <p className="font-bold text-lg">
                              {gatewayBalance.remainingCredits.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Monthly Quota</p>
                            <p className="font-bold text-lg">
                              {gatewayBalance.monthlyQuota.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Resets:{" "}
                          {gatewayBalance.resetDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>

                      {/* Throughput */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Throughput
                        </h4>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Current
                            </p>
                            <p className="font-bold text-lg text-blue-600">
                              {throughput.currentMPM}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              msg/min
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Peak</p>
                            <p className="font-bold text-lg text-emerald-600">
                              {throughput.peakToday}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              msg/min
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Avg</p>
                            <p className="font-bold text-lg">
                              {throughput.averageToday}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              msg/min
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "messages" && (
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    {[
                      { value: "all", label: "All" },
                      { value: "notification", label: "Notifications" },
                      { value: "otp", label: "OTP" },
                      { value: "collection", label: "Collections" },
                      { value: "marketing", label: "Marketing" },
                      { value: "status-delivered", label: "✓ Delivered" },
                      { value: "status-failed", label: "✗ Failed" },
                      { value: "status-pending", label: "⏳ Pending" },
                    ].map((filter) => (
                      <Button
                        key={filter.value}
                        variant={
                          messageFilter === filter.value ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setMessageFilter(filter.value)}
                        className="text-xs h-7"
                      >
                        {filter.label}
                      </Button>
                    ))}
                  </div>

                  {/* Messages Table */}
                  <div className="border rounded-lg overflow-hidden max-h-[450px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Recipient</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMessages.slice(0, 20).map((msg) => (
                          <TableRow key={msg.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getMessageTypeIcon(msg.messageType)}
                                <span className="text-xs capitalize">
                                  {msg.messageType}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {msg.recipient}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm">
                              {msg.messagePreview}
                            </TableCell>
                            <TableCell>{getStatusBadge(msg.status)}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {msg.cost > 0 ? formatCurrency(msg.cost) : "-"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(msg.timestamp).toLocaleTimeString(
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
                  <p className="text-xs text-muted-foreground text-right">
                    Showing {Math.min(filteredMessages.length, 20)} of{" "}
                    {filteredMessages.length} messages
                  </p>
                </div>
              )}

              {activeTab === "failures" && (
                <div className="space-y-6">
                  {/* Failure Reasons Chart */}
                  <div>
                    <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Failure Reasons Breakdown
                    </h4>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={failureReasons}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis
                            dataKey="reason"
                            type="category"
                            tick={{ fontSize: 11 }}
                            width={130}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                            }}
                          />
                          <Bar
                            dataKey="count"
                            fill="#ef4444"
                            radius={[0, 4, 4, 0]}
                            name="Failures"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Failure Details Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reason</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">% Share</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {failureReasons.map((failure) => (
                          <TableRow key={failure.reason}>
                            <TableCell>
                              <Badge variant="destructive" className="font-normal">
                                {failure.reason}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[250px]">
                              {failure.description}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {failure.count}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-medium text-red-600">
                                {failure.percentage}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h5 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Recommendations
                    </h5>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li>• Implement phone validation before sending to reduce invalid numbers</li>
                      <li>• Consider adding a secondary SMS provider for redundancy</li>
                      <li>• Review marketing list for opted-out numbers</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Status & Providers */}
        <div className="space-y-6">
          {/* Connection Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wifi className="h-4 w-4 text-teal-500" />
                Provider Connections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  {
                    name: "Africa's Talking",
                    status: "connected",
                    latency: "85ms",
                    priority: "Primary",
                  },
                  {
                    name: "Twilio",
                    status: "connected",
                    latency: "142ms",
                    priority: "Backup",
                  },
                  {
                    name: "BulkSMS Kenya",
                    status: "degraded",
                    latency: "340ms",
                    priority: "Marketing",
                  },
                ].map((provider) => (
                  <div
                    key={provider.name}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      provider.status === "degraded"
                        ? "border-amber-200 bg-amber-50/30"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          provider.status === "connected"
                            ? "bg-emerald-500"
                            : "bg-amber-500 animate-pulse"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium">{provider.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {provider.priority}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono text-muted-foreground">
                        {provider.latency}
                      </p>
                      <Badge
                        variant="outline"
                        className={
                          provider.status === "connected"
                            ? "border-emerald-300 text-emerald-700 text-xs"
                            : "border-amber-300 text-amber-700 text-xs"
                        }
                      >
                        {provider.status === "connected" ? "Active" : "Slow"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">
                    Avg Delivery Time
                  </span>
                  <span className="font-medium">4.2 seconds</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">
                    Success Rate (7d avg)
                  </span>
                  <span className="font-medium text-emerald-600">97.1%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">
                    Cost per Delivered SMS
                  </span>
                  <span className="font-medium">
                    {formatCurrency(metrics.totalCost / metrics.delivered)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">
                    Peak Hour Today
                  </span>
                  <span className="font-medium">10:00 - 11:00 AM</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      BulkSMS Kenya Slow Response
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Latency above threshold for 15 minutes
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Credit Usage Notice
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      40% of monthly quota used with 12 days remaining
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Info icon component
function Info(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export default SMSGatewayMonitor;
