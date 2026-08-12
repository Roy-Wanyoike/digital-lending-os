/**
 * @deprecated Import types/formatters from `@/frontend/lib/formatters` and components from `@/frontend/components/dashboard/dashboard-components` instead.
 * This module re-exports for backward compatibility.
 */

// Types, constants, formatters, navigation config
export {
  CURRENCY_FLAGS, CHART_COLORS, ESCROW_STATUSES, FRAUD_SEVERITIES, FRAUD_STATUSES,
  MATCHING_STATUSES, AGING_BUCKETS, PRIORITY_LEVELS, PAYMENT_METHOD_TYPES,
  type Role, type NavItem, type DashboardStats, type Business, type EscrowTransaction,
  type PaymentIntent, type ExchangeRate, type PaymentMethod, type Verification,
  type PaymentLink, type WalletData, type FraudAlert, type FraudRule,
  type MatchingRecord, type CollectionRecord, type ComplianceRule, type Screening,
  ROLE_LABELS, ROLE_TABS,
  formatCurrency, formatCurrencyCompact, abbreviateNumber, formatDate, getCountryFlag,
  getStatusBadgeVariant, getStatusColor, getTrustScoreColor, getTrustScoreBg,
  getRiskColor, getRiskBg, truncate,
} from '@/frontend/lib/formatters'

// React components (NAV_ITEMS lives here too)
export {
  NAV_ITEMS, ErrorState, LoadingSkeleton, KPICard, PipelineCard, ScoreBar, CircularScore,
} from '@/frontend/components/dashboard/dashboard-components'

// useApi re-export
export { useApi } from '@/hooks/use-api'
