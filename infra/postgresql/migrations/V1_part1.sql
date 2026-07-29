-- ============================================================
-- V1: Initial PostgreSQL Schema
-- ============================================================
-- Creates: extensions, enum types, tables, constraints, indexes, RLS policies
-- ============================================================

BEGIN;

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- ============================================================
-- 2. ENUM TYPES (60+)
-- ============================================================

CREATE TYPE "TenantPlan" AS ENUM ('starter', 'professional', 'enterprise');
CREATE TYPE "TenantStatus" AS ENUM ('active', 'suspended', 'trial_expired');
CREATE TYPE "AccountRole" AS ENUM ('admin', 'buyer', 'seller', 'auditor', 'viewer');
CREATE TYPE "BusinessStatus" AS ENUM ('pending', 'verified', 'suspended', 'deactivated');
CREATE TYPE "CredentialLevel" AS ENUM ('basic', 'standard', 'enhanced', 'premium');
CREATE TYPE "KycStatus" AS ENUM ('not_started', 'in_progress', 'verified', 'rejected');
CREATE TYPE "AmlStatus" AS ENUM ('not_started', 'cleared', 'flagged', 'rejected');
CREATE TYPE "RiskRating" AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE "VerificationType" AS ENUM ('identity', 'business_registration', 'tax', 'bank_account', 'address');
CREATE TYPE "VerificationMethod" AS ENUM ('document', 'api', 'manual', 'third_party');
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'in_progress', 'approved', 'rejected', 'expired');
CREATE TYPE "DocType" AS ENUM ('certificate_of_incorporation', 'tax_registration', 'bank_statement', 'proof_of_address', 'license');
CREATE TYPE "DocStatus" AS ENUM ('pending', 'approved', 'rejected', 'expired');
CREATE TYPE "RelationshipType" AS ENUM ('supplier', 'buyer', 'partner', 'logistics', 'financial');
CREATE TYPE "RelationshipStatus" AS ENUM ('active', 'paused', 'terminated');
CREATE TYPE "ReviewStatus" AS ENUM ('published', 'hidden', 'flagged');
CREATE TYPE "EscrowStatus" AS ENUM ('created', 'funded', 'in_escrow', 'partial_release', 'completed', 'disputed', 'refunded', 'cancelled');
CREATE TYPE "MilestoneStatus" AS ENUM ('pending', 'ready', 'released', 'disputed');
CREATE TYPE "DisbursementStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE "DisputeStatus" AS ENUM ('open', 'under_review', 'resolved', 'escalated');
CREATE TYPE "PaymentIntentStatus" AS ENUM ('created', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE "PaymentMethodType" AS ENUM ('bank_account', 'card', 'crypto_wallet', 'mobile_money', 'digital_wallet');
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('pending', 'processing', 'settled', 'failed', 'refunded');
CREATE TYPE "RiskAppetite" AS ENUM ('conservative', 'moderate', 'aggressive');
CREATE TYPE "GrowthTrajectory" AS ENUM ('declining', 'stable', 'growing', 'rapid_growth');
CREATE TYPE "FinancialPeriod" AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE "PredictionType" AS ENUM ('revenue', 'cash_flow', 'risk', 'default_probability', 'growth_rate');
CREATE TYPE "Timeframe" AS ENUM ('d30', 'd60', 'd90', 'm6', 'y1');
CREATE TYPE "SnapshotType" AS ENUM ('daily', 'weekly', 'event_driven');
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled');
CREATE TYPE "WalletStatus" AS ENUM ('active', 'frozen', 'closed');
CREATE TYPE "WalletTxType" AS ENUM ('credit', 'debit', 'transfer_in', 'transfer_out', 'conversion', 'fee', 'refund', 'deposit', 'withdrawal', 'crypto_withdrawal');
CREATE TYPE "WalletTxReferenceType" AS ENUM ('escrow', 'payment_link', 'invoice', 'transfer', 'conversion', 'deposit', 'withdrawal', 'crypto_withdrawal');
CREATE TYPE "WalletTxStatus" AS ENUM ('pending', 'completed', 'failed', 'reversed');
CREATE TYPE "DepositPaymentMethod" AS ENUM ('bank_transfer', 'card', 'mobile_money', 'payment_link', 'external');
CREATE TYPE "TxOperationStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'reversed');
CREATE TYPE "CryptoNetwork" AS ENUM ('trc20', 'erc20', 'bsc', 'solana', 'bitcoin', 'bep2');
CREATE TYPE "ConversionStatus" AS ENUM ('pending', 'completed', 'failed', 'reversed');
CREATE TYPE "FraudSeverity" AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE "FraudType" AS ENUM ('unusual_amount', 'velocity_breach', 'geo_mismatch', 'sanctioned_entity', 'fake_identity', 'account_takeover', 'structure_pattern');
CREATE TYPE "FraudAlertStatus" AS ENUM ('open', 'investigating', 'confirmed_fraud', 'false_positive', 'escalated', 'resolved');
CREATE TYPE "FraudRuleAction" AS ENUM ('alert', 'block', 'require_review', 'flag');
CREATE TYPE "MatchType" AS ENUM ('supplier', 'buyer', 'partner', 'logistics', 'financial');
CREATE TYPE "MatchStatus" AS ENUM ('suggested', 'contacted', 'interested', 'declined', 'engaged');
CREATE TYPE "AgingBucket" AS ENUM ('current', 'd1_30', 'd31_60', 'd61_90', 'd90_plus');
CREATE TYPE "Priority" AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE "CollectionStatus" AS ENUM ('active', 'paused', 'resolved', 'written_off', 'escalated');
CREATE TYPE "ReminderChannel" AS ENUM ('email', 'sms', 'whatsapp', 'in_app');
CREATE TYPE "ReminderTemplate" AS ENUM ('friendly', 'firm', 'final', 'legal');
CREATE TYPE "ReminderStatus" AS ENUM ('sent', 'delivered', 'read', 'failed');
CREATE TYPE "ComplianceRuleType" AS ENUM ('sanctions_check', 'kyc_requirement', 'aml_threshold', 'transaction_limit', 'country_restriction', 'industry_restriction');
CREATE TYPE "ComplianceAction" AS ENUM ('block', 'flag_for_review', 'require_additional_doc', 'allow');
CREATE TYPE "ScreeningType" AS ENUM ('sanctions', 'pep', 'adverse_media', 'country_risk');
CREATE TYPE "ScreeningResult" AS ENUM ('clear', 'match', 'potential_match', 'alert');
CREATE TYPE "ScreeningStatus" AS ENUM ('pending', 'in_progress', 'completed', 'escalated');
CREATE TYPE "NotificationType" AS ENUM ('info', 'success', 'warning', 'error', 'payment', 'escrow', 'invoice', 'system');
CREATE TYPE "NotificationCategory" AS ENUM ('payment_received', 'payment_sent', 'escrow_created', 'escrow_funded', 'escrow_released', 'invoice_created', 'invoice_paid', 'invoice_overdue', 'collection_reminder', 'fraud_alert', 'compliance_alert', 'system_maintenance', 'referral_bonus');
CREATE TYPE "SubscriptionPlan" AS ENUM ('starter', 'professional', 'enterprise', 'custom');
CREATE TYPE "SubscriptionInterval" AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'past_due', 'cancelled', 'paused', 'trialing');
CREATE TYPE "ReferralBonusStatus" AS ENUM ('credited', 'pending', 'revoked');
CREATE TYPE "PaymentLinkStatus" AS ENUM ('active', 'paused', 'expired', 'depleted');
CREATE TYPE "PaymentLinkPaymentMethod" AS ENUM ('bank_transfer', 'card', 'mobile_money', 'digital_wallet', 'crypto', 'upi', 'pix', 'mpesa');
CREATE TYPE "PaymentLinkPaymentStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
