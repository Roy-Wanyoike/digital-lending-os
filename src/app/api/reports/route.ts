import { NextResponse } from 'next/server'

// Catalog of available reports with metadata
export async function GET() {
  const reports = [
    // Portfolio Reports
    {
      id: 'portfolio-overview',
      name: 'Portfolio Overview',
      category: 'portfolio',
      description: 'Complete portfolio performance summary including loan book metrics, disbursement trends, and PAR analysis',
      endpoint: '/api/reports/portfolio',
      parameters: ['tenantId', 'period'],
      permissions: ['reports:read'],
      refreshInterval: 'hourly'
    },
    {
      id: 'portfolio-disbursement-trend',
      name: 'Disbursement Trend Analysis',
      category: 'portfolio',
      description: 'Historical disbursement patterns by volume and count over time',
      endpoint: '/api/reports/portfolio',
      parameters: ['tenantId', 'period', 'productId'],
      permissions: ['reports:read'],
      refreshInterval: 'daily'
    },
    {
      id: 'portfolio-par-analysis',
      name: 'PAR (Portfolio at Risk) Analysis',
      category: 'portfolio',
      description: 'Detailed PAR breakdown by aging bucket (PAR1, PAR7, PAR30, PAR90)',
      endpoint: '/api/reports/portfolio',
      parameters: ['tenantId', 'period'],
      permissions: ['reports:read'],
      refreshInterval: 'daily'
    },
    {
      id: 'portfolio-vintage-analysis',
      name: 'Vintage Analysis',
      category: 'portfolio',
      description: 'Cohort-based performance analysis tracking loan performance by origination month',
      endpoint: '/api/reports/portfolio',
      parameters: ['tenantId', 'period'],
      permissions: ['reports:read'],
      refreshInterval: 'monthly'
    },

    // Customer Reports
    {
      id: 'customer-overview',
      name: 'Customer Overview',
      category: 'customer',
      description: 'Customer base analytics including acquisition trends, segmentation, and behavior metrics',
      endpoint: '/api/reports/customer',
      parameters: ['tenantId'],
      permissions: ['reports:read'],
      refreshInterval: 'daily'
    },
    {
      id: 'customer-segmentation',
      name: 'Customer Segmentation',
      category: 'customer',
      description: 'Customer segmentation by risk level, loan count, and value tier',
      endpoint: '/api/reports/customer',
      parameters: ['tenantId', 'segmentBy'],
      permissions: ['reports:read'],
      refreshInterval: 'weekly'
    },
    {
      id: 'customer-geographic',
      name: 'Geographic Distribution',
      category: 'customer',
      description: 'Customer distribution across Kenyan counties with lending activity',
      endpoint: '/api/reports/customer',
      parameters: ['tenantId'],
      permissions: ['reports:read'],
      refreshInterval: 'weekly'
    },

    // Financial Reports
    {
      id: 'financial-pnl',
      name: 'Profit & Loss Statement',
      category: 'financial',
      description: 'Comprehensive P&L statement showing revenue, expenses, and profitability metrics',
      endpoint: '/api/reports/financial',
      parameters: ['tenantId', 'period'],
      permissions: ['financial:read'],
      refreshInterval: 'daily'
    },
    {
      id: 'financial-revenue-mix',
      name: 'Revenue Mix Analysis',
      category: 'financial',
      description: 'Breakdown of revenue sources including interest, fees, and penalties',
      endpoint: '/api/reports/financial',
      parameters: ['tenantId', 'period'],
      permissions: ['financial:read'],
      refreshInterval: 'daily'
    },
    {
      id: 'financial-ratios',
      name: 'Financial Ratios & KPIs',
      category: 'financial',
      description: 'Key financial ratios including yield on portfolio, cost of funds, ROA, and operational efficiency',
      endpoint: '/api/reports/financial',
      parameters: ['tenantId', 'period'],
      permissions: ['financial:read'],
      refreshInterval: 'daily'
    },

    // Operational Reports
    {
      id: 'operational-applications',
      name: 'Application Pipeline',
      category: 'operational',
      description: 'Application funnel from receipt to disbursement with processing metrics',
      endpoint: '/api/reports/operational',
      parameters: ['tenantId'],
      permissions: ['operations:read'],
      refreshInterval: 'realtime'
    },
    {
      id: 'operational-kyc',
      name: 'KYC Processing Metrics',
      category: 'operational',
      description: 'KYC verification statistics including success rates and processing times',
      endpoint: '/api/reports/operational',
      parameters: ['tenantId'],
      permissions: ['operations:read'],
      refreshInterval: 'realtime'
    },
    {
      id: 'operational-staff-performance',
      name: 'Staff Performance Leaderboard',
      category: 'operational',
      description: 'Individual staff member performance metrics for applications processed and collections achieved',
      endpoint: '/api/reports/operational',
      parameters: ['tenantId'],
      permissions: ['operations:read', 'staff:read'],
      refreshInterval: 'daily'
    },

    // Compliance Reports
    {
      id: 'compliance-cbk-reporting',
      name: 'CBK Regulatory Report',
      category: 'compliance',
      description: 'Central Bank of Kenya required regulatory reporting data',
      endpoint: null, // Special handling required
      parameters: ['tenantId', 'reportingPeriod'],
      permissions: ['compliance:read'],
      refreshInterval: 'monthly'
    },
    {
      id: 'compliance-audit-trail',
      name: 'Audit Trail Report',
      category: 'compliance',
      description: 'Complete audit trail of system actions and user activities',
      endpoint: null, // Special handling required
      parameters: ['tenantId', 'dateRange', 'userIds'],
      permissions: ['compliance:read'],
      refreshInterval: 'on-demand'
    }
  ]

  const categories = [
    { 
      id: 'portfolio', 
      name: 'Portfolio Analytics', 
      icon: 'BarChart3',
      description: 'Loan book performance, disbursements, PAR analysis, vintage reports' 
    },
    { 
      id: 'customer', 
      name: 'Customer Analytics', 
      icon: 'Users',
      description: 'Customer acquisition, segmentation, behavior, geographic distribution' 
    },
    { 
      id: 'financial', 
      name: 'Financial Reports', 
      icon: 'DollarSign',
      description: 'P&L statements, revenue mix, expense analysis, key ratios' 
    },
    { 
      id: 'operational', 
      name: 'Operational Metrics', 
      icon: 'Activity',
      description: 'Application pipeline, KYC metrics, payments, staff performance' 
    },
    { 
      id: 'compliance', 
      name: 'Compliance & Audit', 
      icon: 'Shield',
      description: 'CBK reporting, audit trails, regulatory compliance' 
    }
  ]

  return NextResponse.json({
    success: true,
    data: {
      reports,
      categories,
      totalReports: reports.length,
      lastUpdated: new Date().toISOString()
    }
  })
}
