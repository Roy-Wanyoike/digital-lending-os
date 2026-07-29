-- ============================================================
-- V1__initial_postgresql.sql
-- Youngsend PostgreSQL Initial Schema
-- ============================================================
-- Creates: extensions, enum types, all 35 tables with constraints,
--          foreign keys, unique indexes, and Row Level Security
-- ============================================================

BEGIN;

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS citext;       -- Case-insensitive email
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- Trigram similarity for search
CREATE EXTENSION IF NOT EXISTS btree_gin;    -- GIN support for scalar types

-- ============================================================
-- 2. ENUM TYPES (60+)
-- ============================================================

-- Multi-Tenancy
CREATE TYPE "TenantPlan" AS ENUM ('starter', 'professional', 'enterprise');
CREATE TYPE "TenantStatus" AS ENUM ('active', 'suspended', 'trial_expired');
CREATE TYPE "AccountRole" AS ENUM ('admin', 'buyer', 'seller', 'auditor', 'viewer');

-- Commerce Passport
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

-- Trust Graph
CREATE TYPE "RelationshipType" AS ENUM ('supplier', 'buyer', 'partner', 'logistics', 'financial');
CREATE TYPE "RelationshipStatus" AS ENUM ('active', 'paused', 'terminated');
CREATE TYPE "ReviewStatus" AS ENUM ('published', 'hidden', 'flagged');

-- Escrow
CREATE TYPE "EscrowStatus" AS ENUM ('created', 'funded', 'in_escrow', 'partial_release', 'completed', 'disputed', 'refunded', 'cancelled');
CREATE TYPE "MilestoneStatus" AS ENUM ('pending', 'ready', 'released', 'disputed');
CREATE TYPE "DisbursementStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE "DisputeStatus" AS ENUM ('open', 'under_review', 'resolved', 'escalated');

-- Payments
CREATE TYPE "PaymentIntentStatus" AS ENUM ('created', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE "PaymentMethodType" AS ENUM ('bank_account', 'card', 'crypto_wallet', 'mobile_money', 'digital_wallet');
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('pending', 'processing', 'settled', 'failed', 'refunded');
CREATE TYPE "PaymentRoutingProvider" AS ENUM ('stripe', 'wise', 'paypal', 'local_bank', 'crypto_network');

-- Financial Digital Twin
CREATE TYPE "RiskAppetite" AS ENUM ('conservative', 'moderate', 'aggressive');
CREATE TYPE "GrowthTrajectory" AS ENUM ('declining', 'stable', 'growing', 'rapid_growth');
CREATE TYPE "FinancialPeriod" AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE "PredictionType" AS ENUM ('revenue', 'cash_flow', 'risk', 'default_probability', 'growth_rate');
CREATE TYPE "Timeframe" AS ENUM ('d30', 'd60', 'd90', 'm6', 'y1');
CREATE TYPE "SnapshotType" AS ENUM ('daily', 'weekly', 'event_driven');

-- Invoice
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled');

-- Wallet
CREATE TYPE "WalletStatus" AS ENUM ('active', 'frozen', 'closed');
CREATE TYPE "WalletTxType" AS ENUM ('credit', 'debit', 'transfer_in', 'transfer_out', 'conversion', 'fee', 'refund', 'deposit', 'withdrawal', 'crypto_withdrawal');
CREATE TYPE "WalletTxReferenceType" AS ENUM ('escrow', 'payment_link', 'invoice', 'transfer', 'conversion', 'deposit', 'withdrawal', 'crypto_withdrawal');
CREATE TYPE "WalletTxStatus" AS ENUM ('pending', 'completed', 'failed', 'reversed');
CREATE TYPE "DepositPaymentMethod" AS ENUM ('bank_transfer', 'card', 'mobile_money', 'payment_link', 'external');
CREATE TYPE "WithdrawalPaymentMethod" AS ENUM ('bank_transfer', 'mobile_money', 'external');
CREATE TYPE "CryptoNetwork" AS ENUM ('trc20', 'erc20', 'bsc', 'solana', 'bitcoin', 'bep2');
CREATE TYPE "ConversionStatus" AS ENUM ('pending', 'completed', 'failed', 'reversed');
CREATE TYPE "TxOperationStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'reversed');

-- Fraud
CREATE TYPE "FraudSeverity" AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE "FraudType" AS ENUM ('unusual_amount', 'velocity_breach', 'geo_mismatch', 'sanctioned_entity', 'fake_identity', 'account_takeover', 'structure_pattern');
CREATE TYPE "FraudAlertStatus" AS ENUM ('open', 'investigating', 'confirmed_fraud', 'false_positive', 'escalated', 'resolved');
CREATE TYPE "FraudRuleAction" AS ENUM ('alert', 'block', 'require_review', 'flag');

-- Business Matching
CREATE TYPE "MatchType" AS ENUM ('supplier', 'buyer', 'partner', 'logistics', 'financial');
CREATE TYPE "MatchStatus" AS ENUM ('suggested', 'contacted', 'interested', 'declined', 'engaged');

-- Collections
CREATE TYPE "AgingBucket" AS ENUM ('current', 'd1_30', 'd31_60', 'd61_90', 'd90_plus');
CREATE TYPE "Priority" AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE "CollectionStatus" AS ENUM ('active', 'paused', 'resolved', 'written_off', 'escalated');
CREATE TYPE "ReminderChannel" AS ENUM ('email', 'sms', 'whatsapp', 'in_app');
CREATE TYPE "ReminderTemplate" AS ENUM ('friendly', 'firm', 'final', 'legal');
CREATE TYPE "ReminderStatus" AS ENUM ('sent', 'delivered', 'read', 'failed');

-- Compliance
CREATE TYPE "ComplianceRuleType" AS ENUM ('sanctions_check', 'kyc_requirement', 'aml_threshold', 'transaction_limit', 'country_restriction', 'industry_restriction');
CREATE TYPE "ComplianceAction" AS ENUM ('block', 'flag_for_review', 'require_additional_doc', 'allow');
CREATE TYPE "ScreeningType" AS ENUM ('sanctions', 'pep', 'adverse_media', 'country_risk');
CREATE TYPE "ScreeningResult" AS ENUM ('clear', 'match', 'potential_match', 'alert');
CREATE TYPE "ScreeningStatus" AS ENUM ('pending', 'in_progress', 'completed', 'escalated');

-- Notifications
CREATE TYPE "NotificationType" AS ENUM ('info', 'success', 'warning', 'error', 'payment', 'escrow', 'invoice', 'system');
CREATE TYPE "NotificationCategory" AS ENUM ('payment_received', 'payment_sent', 'escrow_created', 'escrow_funded', 'escrow_released', 'invoice_created', 'invoice_paid', 'invoice_overdue', 'collection_reminder', 'fraud_alert', 'compliance_alert', 'system_maintenance', 'referral_bonus');

-- Subscriptions
CREATE TYPE "SubscriptionPlan" AS ENUM ('starter', 'professional', 'enterprise', 'custom');
CREATE TYPE "SubscriptionInterval" AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'past_due', 'cancelled', 'paused', 'trialing');

-- Referral
CREATE TYPE "ReferralBonusStatus" AS ENUM ('credited', 'pending', 'revoked');

-- Payment Links
CREATE TYPE "PaymentLinkStatus" AS ENUM ('active', 'paused', 'expired', 'depleted');
CREATE TYPE "PaymentLinkPaymentMethod" AS ENUM ('bank_transfer', 'card', 'mobile_money', 'digital_wallet', 'crypto', 'upi', 'pix', 'mpesa');
CREATE TYPE "PaymentLinkPaymentStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');

-- ============================================================
-- 3. TABLES (35 models)
-- ============================================================

-- ============================================================
-- MODULE 0: MULTI-TENANCY — Tenant & Account
-- ============================================================

CREATE TABLE "Tenant" (
    "id"            TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "slug"          TEXT NOT NULL,
    "plan"          "TenantPlan" NOT NULL DEFAULT 'starter',
    "status"        "TenantStatus" NOT NULL DEFAULT 'active',
    "maxBusinesses" INTEGER NOT NULL DEFAULT 5,
    "maxUsers"      INTEGER NOT NULL DEFAULT 10,
    "features"      JSONB NOT NULL DEFAULT '{}',
    "ownerEmail"    TEXT NOT NULL,
    "ownerName"     TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
    "id"                  TEXT NOT NULL,
    "email"               CITEXT NOT NULL,
    "passwordHash"        TEXT NOT NULL,
    "name"                TEXT NOT NULL,
    "role"                "AccountRole" NOT NULL DEFAULT 'admin',
    "tenantId"            TEXT NOT NULL,
    "businessId"          TEXT,
    "avatarUrl"           TEXT,
    "isActive"            BOOLEAN NOT NULL DEFAULT TRUE,
    "lastLoginAt"         TIMESTAMP(3),
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,
    "referralCode"        TEXT,
    "referredBy"          TEXT,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
    "twoFactorEnabled"    BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- MODULE 1: COMMERCE PASSPORT — Business Identity & Verification
-- ============================================================

CREATE TABLE "Business" (
    "id"             TEXT NOT NULL,
    "tenantId"       TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "legalName"      TEXT,
    "registrationNo" TEXT,
    "taxId"          TEXT,
    "country"        TEXT NOT NULL,
    "city"           TEXT,
    "industry"       TEXT,
    "website"        TEXT,
    "employeeCount"  INTEGER,
    "annualRevenue"  DECIMAL(18,2),
    "description"    TEXT,
    "logoUrl"        TEXT,
    "status"         "BusinessStatus" NOT NULL DEFAULT 'pending',
    "verifiedAt"     TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommercePassport" (
    "id"              TEXT NOT NULL,
    "businessId"      TEXT NOT NULL,
    "passportHash"    TEXT NOT NULL,
    "credentialLevel" "CredentialLevel" NOT NULL DEFAULT 'basic',
    "kycStatus"       "KycStatus" NOT NULL DEFAULT 'not_started',
    "kycVerifiedAt"   TIMESTAMP(3),
    "amlStatus"       "AmlStatus" NOT NULL DEFAULT 'not_started',
    "amlCheckedAt"    TIMESTAMP(3),
    "riskRating"      "RiskRating" NOT NULL DEFAULT 'medium',
    "lastAuditAt"     TIMESTAMP(3),
    "nextAuditDue"    TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommercePassport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Verification" (
    "id"              TEXT NOT NULL,
    "businessId"      TEXT NOT NULL,
    "type"            "VerificationType" NOT NULL,
    "method"          "VerificationMethod" NOT NULL,
    "status"          "VerificationStatus" NOT NULL DEFAULT 'pending',
    "submittedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt"      TIMESTAMP(3),
    "verifiedBy"      TEXT,
    "rejectionReason" TEXT,
    "metadata"        JSONB,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceDocument" (
    "id"         TEXT NOT NULL,
    "passportId" TEXT NOT NULL,
    "docType"    "DocType" NOT NULL,
    "docName"    TEXT NOT NULL,
    "docUrl"     TEXT,
    "status"     "DocStatus" NOT NULL DEFAULT 'pending',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"  TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ComplianceDocument_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- MODULE 2: TRUST GRAPH — Reputation & Relationship Network
-- ============================================================

CREATE TABLE "TrustScore" (
    "id"                 TEXT NOT NULL,
    "businessId"         TEXT NOT NULL,
    "overallScore"       DECIMAL(5,2) NOT NULL DEFAULT 50.0,
    "paymentScore"       DECIMAL(5,2) NOT NULL DEFAULT 50.0,
    "deliveryScore"      DECIMAL(5,2) NOT NULL DEFAULT 50.0,
    "qualityScore"       DECIMAL(5,2) NOT NULL DEFAULT 50.0,
    "communicationScore" DECIMAL(5,2) NOT NULL DEFAULT 50.0,
    "complianceScore"    DECIMAL(5,2) NOT NULL DEFAULT 50.0,
    "totalReviews"       INTEGER NOT NULL DEFAULT 0,
    "totalTransactions"  INTEGER NOT NULL DEFAULT 0,
    "scoreVersion"       INTEGER NOT NULL DEFAULT 1,
    "lastCalculated"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrustScore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessRelationship" (
    "id"             TEXT NOT NULL,
    "fromBusinessId" TEXT NOT NULL,
    "toBusinessId"   TEXT NOT NULL,
    "type"           "RelationshipType" NOT NULL,
    "status"         "RelationshipStatus" NOT NULL DEFAULT 'active',
    "trustLevel"     DECIMAL(5,2) NOT NULL DEFAULT 50.0,
    "totalTxVolume"  DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalTxCount"   INTEGER NOT NULL DEFAULT 0,
    "firstTxDate"    TIMESTAMP(3),
    "lastTxDate"     TIMESTAMP(3),
    "metadata"       JSONB,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BusinessRelationship_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReputationEvent" (
    "id"           TEXT NOT NULL,
    "trustScoreId" TEXT NOT NULL,
    "eventType"    TEXT NOT NULL,
    "scoreImpact"  DECIMAL(5,2) NOT NULL DEFAULT 0,
    "description"  TEXT,
    "sourceId"     TEXT,
    "metadata"     JSONB,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReputationEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Review" (
    "id"                  TEXT NOT NULL,
    "fromBusinessId"      TEXT NOT NULL,
    "toBusinessId"        TEXT NOT NULL,
    "escrowId"            TEXT,
    "rating"              DECIMAL(2,1) NOT NULL,
    "paymentRating"       DECIMAL(2,1),
    "deliveryRating"      DECIMAL(2,1),
    "qualityRating"       DECIMAL(2,1),
    "communicationRating" DECIMAL(2,1),
    "comment"             TEXT,
    "response"            TEXT,
    "respondedAt"         TIMESTAMP(3),
    "status"              "ReviewStatus" NOT NULL DEFAULT 'published',
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- MODULE 3: AI SMART ESCROW — Transaction State Machine
-- ============================================================

CREATE TABLE "EscrowTransaction" (
    "id"               TEXT NOT NULL,
    "txRef"            TEXT NOT NULL,
    "buyerId"          TEXT NOT NULL,
    "sellerId"         TEXT NOT NULL,
    "amount"           DECIMAL(18,2) NOT NULL,
    "currency"         TEXT NOT NULL DEFAULT 'USD',
    "description"      TEXT,
    "status"           "EscrowStatus" NOT NULL DEFAULT 'created',
    "currentMilestone" INTEGER NOT NULL DEFAULT 0,
    "totalMilestones"  INTEGER NOT NULL DEFAULT 1,
    "fundedAmount"     DECIMAL(18,2) NOT NULL DEFAULT 0,
    "releasedAmount"   DECIMAL(18,2) NOT NULL DEFAULT 0,
    "refundedAmount"   DECIMAL(18,2) NOT NULL DEFAULT 0,
    "feeAmount"        DECIMAL(18,2) NOT NULL DEFAULT 0,
    "feeCurrency"      TEXT NOT NULL DEFAULT 'USD',
    "aiRiskScore"      DECIMAL(5,2),
    "aiRiskLevel"      "RiskRating",
    "paymentIntentId"  TEXT,
    "expiresAt"        TIMESTAMP(3),
    "completedAt"      TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "buyerWalletId"    TEXT,
    "sellerWalletId"   TEXT,
    "releasedAt"       TIMESTAMP(3),
    CONSTRAINT "EscrowTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EscrowMilestone" (
    "id"          TEXT NOT NULL,
    "escrowId"    TEXT NOT NULL,
    "sequence"    INTEGER NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "amount"      DECIMAL(18,2) NOT NULL,
    "status"      "MilestoneStatus" NOT NULL DEFAULT 'pending',
    "evidence"    JSONB,
    "releasedAt"  TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EscrowMilestone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Disbursement" (
    "id"          TEXT NOT NULL,
    "escrowId"    TEXT NOT NULL,
    "milestoneId" TEXT,
    "amount"      DECIMAL(18,2) NOT NULL,
    "currency"    TEXT NOT NULL,
    "fromAccount" TEXT,
    "toAccount"   TEXT,
    "status"      "DisbursementStatus" NOT NULL DEFAULT 'pending',
    "paymentRef"  TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Disbursement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Dispute" (
    "id"               TEXT NOT NULL,
    "escrowId"         TEXT NOT NULL,
    "raisedBy"         TEXT NOT NULL,
    "reason"           TEXT NOT NULL,
    "description"      TEXT,
    "status"           "DisputeStatus" NOT NULL DEFAULT 'open',
    "resolution"       TEXT,
    "resolvedAt"       TIMESTAMP(3),
    "aiRecommendation" TEXT,
    "metadata"         JSONB,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EscrowAuditLog" (
    "id"        TEXT NOT NULL,
    "escrowId"  TEXT NOT NULL,
    "action"    TEXT NOT NULL,
    "actor"     TEXT,
    "details"   TEXT,
    "metadata"  JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EscrowAuditLog_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- MODULE 4: GLOBAL PAYMENT ROUTER — Multi-Currency & Routing
-- ============================================================

CREATE TABLE "PaymentIntent" (
    "id"              TEXT NOT NULL,
    "intentRef"       TEXT NOT NULL,
    "escrowId"        TEXT,
    "fromBusinessId"  TEXT NOT NULL,
    "toBusinessId"    TEXT NOT NULL,
    "sourceAmount"    DECIMAL(18,2) NOT NULL,
    "sourceCurrency"  TEXT NOT NULL,
    "targetAmount"    DECIMAL(18,2) NOT NULL,
    "targetCurrency"  TEXT NOT NULL,
    "exchangeRate"    DECIMAL(18,8),
    "status"          "PaymentIntentStatus" NOT NULL DEFAULT 'created',
    "paymentMethod"   "PaymentMethodType",
    "routingProvider" TEXT,
    "routingScore"    DECIMAL(5,2),
    "estimatedFee"    DECIMAL(18,2),
    "actualFee"       DECIMAL(18,2),
    "estimatedTime"   INTEGER,
    "completedAt"     TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentTransaction" (
    "id"           TEXT NOT NULL,
    "intentId"     TEXT NOT NULL,
    "txRef"        TEXT NOT NULL,
    "provider"     TEXT NOT NULL,
    "providerTxId" TEXT,
    "amount"       DECIMAL(18,2) NOT NULL,
    "currency"     TEXT NOT NULL,
    "status"       "PaymentTransactionStatus" NOT NULL DEFAULT 'pending',
    "fromAddress"  TEXT,
    "toAddress"    TEXT,
    "metadata"     JSONB,
    "settledAt"    TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CurrencyRate" (
    "id"           TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency"   TEXT NOT NULL,
    "rate"         DECIMAL(18,8) NOT NULL,
    "provider"     TEXT NOT NULL,
    "source"       TEXT,
    "expiresAt"    TIMESTAMP(3) NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CurrencyRate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentMethod" (
    "id"         TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type"       "PaymentMethodType" NOT NULL,
    "provider"   TEXT,
    "label"      TEXT,
    "identifier" TEXT,
    "currency"   TEXT,
    "country"    TEXT,
    "isDefault"  BOOLEAN NOT NULL DEFAULT FALSE,
    "status"     "WalletStatus" NOT NULL DEFAULT 'active',
    "metadata"   JSONB,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- MODULE 5: FINANCIAL DIGITAL TWIN — AI-Powered Financial Profile
-- ============================================================

CREATE TABLE "FinancialDigitalTwin" (
    "id"               TEXT NOT NULL,
    "businessId"       TEXT NOT NULL,
    "healthScore"      DECIMAL(5,2) NOT NULL DEFAULT 50.0,
    "cashFlowHealth"   DECIMAL(5,2) NOT NULL DEFAULT 50.0,
    "riskAppetite"     "RiskAppetite" NOT NULL DEFAULT 'moderate',
    "creditWorthiness" DECIMAL(5,2) NOT NULL DEFAULT 50.0,
    "liquidityScore"   DECIMAL(5,2) NOT NULL DEFAULT 50.0,
    "growthTrajectory" "GrowthTrajectory" NOT NULL DEFAULT 'stable',
    "aiModelVersion"   TEXT NOT NULL DEFAULT 'v1.0',
    "lastSyncAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinancialDigitalTwin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialMetric" (
    "id"                      TEXT NOT NULL,
    "twinId"                  TEXT NOT NULL,
    "period"                  "FinancialPeriod" NOT NULL,
    "periodDate"              TEXT NOT NULL,
    "revenue"                 DECIMAL(18,2),
    "expenses"                DECIMAL(18,2),
    "netIncome"               DECIMAL(18,2),
    "accountsReceivable"      DECIMAL(18,2),
    "accountsPayable"         DECIMAL(18,2),
    "totalAssets"             DECIMAL(18,2),
    "totalLiabilities"        DECIMAL(18,2),
    "cashBalance"             DECIMAL(18,2),
    "transactionCount"        INTEGER,
    "averageTransactionValue" DECIMAL(18,2),
    "paymentSuccessRate"      DECIMAL(5,4),
    "disputeRate"             DECIMAL(5,4),
    "customerCount"           INTEGER,
    "supplierCount"           INTEGER,
    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialMetric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialPrediction" (
    "id"             TEXT NOT NULL,
    "twinId"         TEXT NOT NULL,
    "predictionType" "PredictionType" NOT NULL,
    "timeframe"      "Timeframe" NOT NULL,
    "predictedValue" DECIMAL(18,2) NOT NULL,
    "confidence"     DECIMAL(5,4) NOT NULL,
    "lowerBound"     DECIMAL(18,2),
    "upperBound"     DECIMAL(18,2),
    "model"          TEXT NOT NULL DEFAULT 'ensemble',
    "metadata"       JSONB,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialPrediction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialSnapshot" (
    "id"               TEXT NOT NULL,
    "twinId"           TEXT NOT NULL,
    "snapshotType"     "SnapshotType" NOT NULL,
    "healthScore"      DECIMAL(5,2) NOT NULL,
    "cashFlowHealth"   DECIMAL(5,2) NOT NULL,
    "creditWorthiness" DECIMAL(5,2) NOT NULL,
    "liquidityScore"   DECIMAL(5,2) NOT NULL,
    "topRiskFactors"   JSONB,
    "topOpportunities" JSONB,
    "aiSummary"        TEXT,
    "metadata"         JSONB,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialSnapshot_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- SHARED: Invoice Module
-- ============================================================

CREATE TABLE "Invoice" (
    "id"             TEXT NOT NULL,
    "invoiceRef"     TEXT NOT NULL,
    "senderId"       TEXT NOT NULL,
    "receiverId"     TEXT NOT NULL,
    "escrowId"       TEXT,
    "amount"         DECIMAL(18,2) NOT NULL,
    "currency"       TEXT NOT NULL DEFAULT 'USD',
    "status"         "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "dueDate"        TIMESTAMP(3),
    "paidAmount"     DECIMAL(18,2) NOT NULL DEFAULT 0,
    "items"          JSONB,
    "notes"          TEXT,
    "paidAt"         TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    "subscriptionId" TEXT,
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- MODULE 6: USERS & ROLES — Multi-view Access Control
-- ============================================================

CREATE TABLE "User" (
    "id"          TEXT NOT NULL,
    "email"       CITEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "role"        "AccountRole" NOT NULL DEFAULT 'viewer',
    "businessId"  TEXT,
    "avatarUrl"   TEXT,
    "isActive"    BOOLEAN NOT NULL DEFAULT TRUE,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- MODULE 7: PAYMENT LINKS — Shareable Payment URLs
-- ============================================================

CREATE TABLE "PaymentLink" (
    "id"               TEXT NOT NULL,
    "linkRef"          TEXT NOT NULL,
    "businessId"       TEXT NOT NULL,
    "title"            TEXT,
    "description"      TEXT,
    "amount"           DECIMAL(18,2) NOT NULL,
    "currency"         TEXT NOT NULL DEFAULT 'USD',
    "allowedMethods"   JSONB NOT NULL DEFAULT '[]',
    "allowedCountries" JSONB,
    "maxPayments"      INTEGER NOT NULL DEFAULT 1,
    "paymentCount"     INTEGER NOT NULL DEFAULT 0,
    "totalCollected"   DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status"           "PaymentLinkStatus" NOT NULL DEFAULT 'active',
    "expiresAt"        TIMESTAMP(3),
    "metadata"         JSONB,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "createdBy"        TEXT,
    CONSTRAINT "PaymentLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentLinkPayment" (
    "id"             TEXT NOT NULL,
    "paymentLinkId"  TEXT NOT NULL,
    "payerName"      TEXT,
    "payerEmail"     TEXT,
    "payerCountry"   TEXT,
    "amount"         DECIMAL(18,2) NOT NULL,
    "currency"       TEXT NOT NULL,
    "paymentMethod"  "PaymentLinkPaymentMethod" NOT NULL,
    "provider"       TEXT,
    "status"         "PaymentLinkPaymentStatus" NOT NULL DEFAULT 'pending',
    "feeAmount"      DECIMAL(18,2),
    "netAmount"      DECIMAL(18,2),
    "providerTxId"   TEXT,
    "metadata"       JSONB,
    "completedAt"    TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentLinkPayment_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- MODULE 8: GLOBAL PAYMENT METHODS CATALOG
-- ============================================================

CREATE TABLE "GlobalPaymentMethod" (
    "id"             TEXT NOT NULL,
    "methodCode"     TEXT NOT NULL,
    "methodName"     TEXT NOT NULL,
    "provider"       TEXT NOT NULL,
    "type"           "PaymentMethodType" NOT NULL,
    "countries"      JSONB NOT NULL,
    "currencies"     JSONB NOT NULL,
    "minAmount"      DECIMAL(18,2),
    "maxAmount"      DECIMAL(18,2),
    "feePercent"     DECIMAL(5,4) NOT NULL DEFAULT 0,
    "fixedFee"       DECIMAL(18,2) NOT NULL DEFAULT 0,
    "settlementTime" INTEGER,
    "isActive"       BOOLEAN NOT NULL DEFAULT TRUE,
    "icon"           TEXT,
    "metadata"       JSONB,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GlobalPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- MODULE 9: MULTI-CURRENCY WALLET
-- ============================================================

CREATE TABLE "Wallet" (
    "id"               TEXT NOT NULL,
    "businessId"       TEXT NOT NULL,
    "currency"         TEXT NOT NULL,
    "balance"          DECIMAL(18,2) NOT NULL DEFAULT 0,
    "availableBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "pendingBalance"   DECIMAL(18,2) NOT NULL DEFAULT 0,
    "frozenBalance"    DECIMAL(18,2) NOT NULL DEFAULT 0,
    "isDefault"        BOOLEAN NOT NULL DEFAULT FALSE,
    "status"           "WalletStatus" NOT NULL DEFAULT 'active',
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "label"            TEXT,
    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletTransaction" (
    "id"             TEXT NOT NULL,
    "walletId"       TEXT NOT NULL,
    "txRef"          TEXT NOT NULL,
    "type"           "WalletTxType" NOT NULL,
    "amount"         DECIMAL(18,2) NOT NULL,
    "balanceBefore"  DECIMAL(18,2) NOT NULL,
    "balanceAfter"   DECIMAL(18,2) NOT NULL,
    "currency"       TEXT NOT NULL,
    "description"    TEXT,
    "referenceType"  "WalletTxReferenceType",
    "referenceId"    TEXT,
    "counterpartyId" TEXT,
    "status"         "WalletTxStatus" NOT NULL DEFAULT 'completed',
    "metadata"       JSONB,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Deposit" (
    "id"            TEXT NOT NULL,
    "depositRef"    TEXT NOT NULL,
    "walletId"      TEXT NOT NULL,
    "amount"        DECIMAL(18,2) NOT NULL,
    "currency"      TEXT NOT NULL,
    "paymentMethod" "DepositPaymentMethod" NOT NULL,
    "provider"      TEXT,
    "providerTxId"  TEXT,
    "status"        "TxOperationStatus" NOT NULL DEFAULT 'pending',
    "bankName"      TEXT,
    "bankRef"       TEXT,
    "cardLast4"     TEXT,
    "notes"         TEXT,
    "completedAt"   TIMESTAMP(3),
    "failedReason"  TEXT,
    "metadata"      JSONB,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Withdrawal" (
    "id"            TEXT NOT NULL,
    "withdrawalRef" TEXT NOT NULL,
    "walletId"      TEXT NOT NULL,
    "amount"        DECIMAL(18,2) NOT NULL,
    "currency"      TEXT NOT NULL,
    "paymentMethod" "WithdrawalPaymentMethod" NOT NULL,
    "provider"      TEXT,
    "providerTxId"  TEXT,
    "status"        "TxOperationStatus" NOT NULL DEFAULT 'pending',
    "bankName"      TEXT,
    "bankAccount"   TEXT,
    "bankCode"      TEXT,
    "recipientName" TEXT,
    "feeAmount"     DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netAmount"     DECIMAL(18,2),
    "notes"         TEXT,
    "completedAt"   TIMESTAMP(3),
    "failedReason"  TEXT,
    "metadata"      JSONB,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CryptoWithdrawal" (
    "id"             TEXT NOT NULL,
    "withdrawalRef"  TEXT NOT NULL,
    "walletId"       TEXT NOT NULL,
    "amount"         DECIMAL(18,2) NOT NULL,
    "cryptoAmount"   DECIMAL(18,8),
    "currency"       TEXT NOT NULL,
    "cryptoCurrency" TEXT NOT NULL,
    "network"        "CryptoNetwork" NOT NULL,
    "walletAddress"  TEXT NOT NULL,
    "status"         "TxOperationStatus" NOT NULL DEFAULT 'pending',
    "exchangeRate"   DECIMAL(18,8),
    "networkFee"     DECIMAL(18,8) NOT NULL DEFAULT 0,
    "processingFee"  DECIMAL(18,2) NOT NULL DEFAULT 0,
    "gasPrice"       TEXT,
    "txHash"         TEXT,
    "explorerUrl"    TEXT,
    "notes"          TEXT,
    "completedAt"    TIMESTAMP(3),
    "failedReason"   TEXT,
    "metadata"       JSONB,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CryptoWithdrawal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CurrencyConversion" (
    "id"            TEXT NOT NULL,
    "conversionRef" TEXT NOT NULL,
    "fromWalletId"  TEXT NOT NULL,
    "toWalletId"    TEXT NOT NULL,
    "fromCurrency"  TEXT NOT NULL,
    "toCurrency"    TEXT NOT NULL,
    "fromAmount"    DECIMAL(18,2) NOT NULL,
    "toAmount"      DECIMAL(18,2) NOT NULL,
    "exchangeRate"  DECIMAL(18,8) NOT NULL,
    "feePercent"    DECIMAL(5,4) NOT NULL DEFAULT 0.5,
    "feeAmount"     DECIMAL(18,2) NOT NULL,
    "netAmount"     DECIMAL(18,2) NOT NULL,
    "provider"      TEXT NOT NULL DEFAULT 'internal',
    "status"        "ConversionStatus" NOT NULL DEFAULT 'completed',
    "metadata"      JSONB,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CurrencyConversion_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- MODULE 10: AI FRAUD DETECTION
-- ============================================================

CREATE TABLE "FraudAlert" (
    "id"             TEXT NOT NULL,
    "alertRef"       TEXT NOT NULL,
    "businessId"     TEXT,
    "relatedType"    TEXT NOT NULL,
    "relatedId"      TEXT,
    "severity"       "FraudSeverity" NOT NULL DEFAULT 'medium',
    "fraudType"      "FraudType" NOT NULL,
    "score"          DECIMAL(5,2) NOT NULL,
    "description"    TEXT NOT NULL,
    "recommendation" TEXT,
    "status"         "FraudAlertStatus" NOT NULL DEFAULT 'open',
    "resolvedBy"     TEXT,
    "resolvedAt"     TIMESTAMP(3),
    "metadata"       JSONB,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FraudAlert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FraudRule" (
    "id"              TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "description"     TEXT,
    "condition"       JSONB NOT NULL,
    "action"          "FraudRuleAction" NOT NULL,
    "severity"        "FraudSeverity" NOT NULL DEFAULT 'medium',
    "isActive"        BOOLEAN NOT NULL DEFAULT TRUE,
    "triggerCount"    INTEGER NOT NULL DEFAULT 0,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FraudRule_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- MODULE 11: BUSINESS MATCHING — AI Buyer-Supplier Discovery
-- ============================================================

CREATE TABLE "BusinessMatch" (
    "id"                TEXT NOT NULL,
    "seekerId"          TEXT NOT NULL,
    "candidateId"       TEXT NOT NULL,
    "matchType"         "MatchType" NOT NULL,
    "matchScore"        DECIMAL(5,2) NOT NULL,
    "reasons"          JSONB,
    "status"            "MatchStatus" NOT NULL DEFAULT 'suggested',
    "seekerResponse"    TEXT,
    "candidateResponse" TEXT,
    "metadata"          JSONB,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BusinessMatch_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- MODULE 12: AI COLLECTIONS — Payment Reminders & Aging
-- ============================================================

CREATE TABLE "CollectionCase" (
    "id"                TEXT NOT NULL,
    "caseRef"           TEXT NOT NULL,
    "invoiceId"         TEXT,
    "businessId"        TEXT NOT NULL,
    "debtorId"          TEXT NOT NULL,
    "originalAmount"    DECIMAL(18,2) NOT NULL,
    "outstandingAmount" DECIMAL(18,2) NOT NULL,
    "currency"          TEXT NOT NULL,
    "agingBucket"       "AgingBucket" NOT NULL DEFAULT 'current',
    "priority"          "Priority" NOT NULL DEFAULT 'normal',
    "status"            "CollectionStatus" NOT NULL DEFAULT 'active',
    "reminderCount"     INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt"    TIMESTAMP(3),
    "nextReminderDue"   TIMESTAMP(3),
    "aiStrategy"        TEXT,
    "resolution"        TEXT,
    "resolvedAt"        TIMESTAMP(3),
    "metadata"          JSONB,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CollectionCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollectionReminder" (
    "id"          TEXT NOT NULL,
    "caseId"      TEXT NOT NULL,
    "channel"     "ReminderChannel" NOT NULL,
    "template"    "ReminderTemplate" NOT NULL,
    "status"      "ReminderStatus" NOT NULL DEFAULT 'sent',
    "sentAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response"    TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionReminder_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- MODULE 13: COMPLIANCE ENGINE — Rules & Screening
-- ============================================================

CREATE TABLE "ComplianceRule" (
    "id"             TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "description"    TEXT,
    "ruleType"       "ComplianceRuleType" NOT NULL,
    "condition"      JSONB NOT NULL,
    "action"         "ComplianceAction" NOT NULL,
    "severity"       "FraudSeverity" NOT NULL DEFAULT 'medium',
    "isActive"       BOOLEAN NOT NULL DEFAULT TRUE,
    "triggeredCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ComplianceRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceScreening" (
    "id"              TEXT NOT NULL,
    "businessId"      TEXT,
    "transactionType" TEXT,
    "transactionId"   TEXT,
    "screeningType"   "ScreeningType" NOT NULL,
    "result"          "ScreeningResult" NOT NULL,
    "riskLevel"       "RiskRating" NOT NULL,
    "details"         TEXT,
    "matchedLists"    JSONB,
    "status"          "ScreeningStatus" NOT NULL DEFAULT 'completed',
    "reviewedBy"      TEXT,
    "reviewedAt"      TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ComplianceScreening_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- MODULE 14: REFERRAL SYSTEM
-- ============================================================

CREATE TABLE "ReferralBonus" (
    "id"            TEXT NOT NULL,
    "bonusRef"      TEXT NOT NULL,
    "referrerId"    TEXT NOT NULL,
    "refereeId"     TEXT NOT NULL,
    "depositId"     TEXT NOT NULL,
    "walletId"      TEXT NOT NULL,
    "bonusAmount"   DECIMAL(18,2) NOT NULL DEFAULT 100.00,
    "bonusCurrency" TEXT NOT NULL DEFAULT 'USD',
    "status"        "ReferralBonusStatus" NOT NULL DEFAULT 'credited',
    "creditedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReferralBonus_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- MODULE 15: NOTIFICATIONS
-- ============================================================

CREATE TABLE "Notification" (
    "id"         TEXT NOT NULL,
    "accountId"  TEXT NOT NULL,
    "title"      TEXT NOT NULL,
    "body"       TEXT NOT NULL,
    "type"       "NotificationType" NOT NULL DEFAULT 'info',
    "category"   "NotificationCategory" NOT NULL DEFAULT 'general',
    "isRead"     BOOLEAN NOT NULL DEFAULT FALSE,
    "readAt"     TIMESTAMP(3),
    "actionUrl"  TEXT,
    "metadata"  JSONB,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- MODULE 16: SUBSCRIPTIONS
-- ============================================================

CREATE TABLE "Subscription" (
    "id"                   TEXT NOT NULL,
    "businessId"           TEXT NOT NULL,
    "planName"             "SubscriptionPlan" NOT NULL,
    "amount"               DECIMAL(18,2) NOT NULL,
    "currency"             TEXT NOT NULL DEFAULT 'USD',
    "interval"             "SubscriptionInterval" NOT NULL DEFAULT 'monthly',
    "status"               "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "startDate"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate"              TIMESTAMP(3),
    "trialEndsAt"          TIMESTAMP(3),
    "currentPeriodStart"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd"    TIMESTAMP(3) NOT NULL,
    "cancelledAt"          TIMESTAMP(3),
    "cancellationReason"  TEXT,
    "metadata"            JSONB,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- 4. UNIQUE CONSTRAINTS
-- ============================================================

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");
CREATE UNIQUE INDEX "Account_referralCode_key" ON "Account"("referralCode") WHERE "referralCode" IS NOT NULL;
CREATE UNIQUE INDEX "Account_tenantId_email_key" ON "Account"("tenantId", "email");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "CommercePassport_businessId_key" ON "CommercePassport"("businessId");
CREATE UNIQUE INDEX "CommercePassport_passportHash_key" ON "CommercePassport"("passportHash");
CREATE UNIQUE INDEX "TrustScore_businessId_key" ON "TrustScore"("businessId");
CREATE UNIQUE INDEX "BusinessRelationship_fromBusinessId_toBusinessId_type_key" ON "BusinessRelationship"("fromBusinessId", "toBusinessId", "type");
CREATE UNIQUE INDEX "EscrowTransaction_txRef_key" ON "EscrowTransaction"("txRef");
CREATE UNIQUE INDEX "PaymentIntent_intentRef_key" ON "PaymentIntent"("intentRef");
CREATE UNIQUE INDEX "PaymentIntent_escrowId_key" ON "PaymentIntent"("escrowId") WHERE "escrowId" IS NOT NULL;
CREATE UNIQUE INDEX "PaymentTransaction_txRef_key" ON "PaymentTransaction"("txRef");
CREATE UNIQUE INDEX "CurrencyRate_fromCurrency_toCurrency_provider_createdAt_key" ON "CurrencyRate"("fromCurrency", "toCurrency", "provider", "createdAt");
CREATE UNIQUE INDEX "GlobalPaymentMethod_methodCode_key" ON "GlobalPaymentMethod"("methodCode");
CREATE UNIQUE INDEX "FinancialDigitalTwin_businessId_key" ON "FinancialDigitalTwin"("businessId");
CREATE UNIQUE INDEX "FinancialMetric_twinId_period_periodDate_key" ON "FinancialMetric"("twinId", "period", "periodDate");
CREATE UNIQUE INDEX "Invoice_invoiceRef_key" ON "Invoice"("invoiceRef");
CREATE UNIQUE INDEX "Wallet_businessId_currency_key" ON "Wallet"("businessId", "currency");
CREATE UNIQUE INDEX "WalletTransaction_txRef_key" ON "WalletTransaction"("txRef");
CREATE UNIQUE INDEX "Deposit_depositRef_key" ON "Deposit"("depositRef");
CREATE UNIQUE INDEX "Withdrawal_withdrawalRef_key" ON "Withdrawal"("withdrawalRef");
CREATE UNIQUE INDEX "CryptoWithdrawal_withdrawalRef_key" ON "CryptoWithdrawal"("withdrawalRef");
CREATE UNIQUE INDEX "CurrencyConversion_conversionRef_key" ON "CurrencyConversion"("conversionRef");
CREATE UNIQUE INDEX "FraudAlert_alertRef_key" ON "FraudAlert"("alertRef");
CREATE UNIQUE INDEX "BusinessMatch_seekerId_candidateId_matchType_key" ON "BusinessMatch"("seekerId", "candidateId", "matchType");
CREATE UNIQUE INDEX "CollectionCase_caseRef_key" ON "CollectionCase"("caseRef");
CREATE UNIQUE INDEX "ReferralBonus_bonusRef_key" ON "ReferralBonus"("bonusRef");
CREATE UNIQUE INDEX "PaymentLink_linkRef_key" ON "PaymentLink"("linkRef");

-- ============================================================
-- 5. FOREIGN KEY CONSTRAINTS
-- ============================================================

-- Account -> Tenant
ALTER TABLE "Account" ADD CONSTRAINT "Account_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Business -> Tenant
ALTER TABLE "Business" ADD CONSTRAINT "Business_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CommercePassport -> Business
ALTER TABLE "CommercePassport" ADD CONSTRAINT "CommercePassport_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Verification -> Business
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ComplianceDocument -> CommercePassport
ALTER TABLE "ComplianceDocument" ADD CONSTRAINT "ComplianceDocument_passportId_fkey"
    FOREIGN KEY ("passportId") REFERENCES "CommercePassport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TrustScore -> Business
ALTER TABLE "TrustScore" ADD CONSTRAINT "TrustScore_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BusinessRelationship (from) -> Business
ALTER TABLE "BusinessRelationship" ADD CONSTRAINT "BusinessRelationship_fromBusinessId_fkey"
    FOREIGN KEY ("fromBusinessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BusinessRelationship (to) -> Business
ALTER TABLE "BusinessRelationship" ADD CONSTRAINT "BusinessRelationship_toBusinessId_fkey"
    FOREIGN KEY ("toBusinessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ReputationEvent -> TrustScore
ALTER TABLE "ReputationEvent" ADD CONSTRAINT "ReputationEvent_trustScoreId_fkey"
    FOREIGN KEY ("trustScoreId") REFERENCES "TrustScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EscrowTransaction (buyer) -> Business
ALTER TABLE "EscrowTransaction" ADD CONSTRAINT "EscrowTransaction_buyerId_fkey"
    FOREIGN KEY ("buyerId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EscrowTransaction (seller) -> Business
ALTER TABLE "EscrowTransaction" ADD CONSTRAINT "EscrowTransaction_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EscrowTransaction -> PaymentIntent (optional)
ALTER TABLE "EscrowTransaction" ADD CONSTRAINT "EscrowTransaction_paymentIntentId_fkey"
    FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- EscrowMilestone -> EscrowTransaction
ALTER TABLE "EscrowMilestone" ADD CONSTRAINT "EscrowMilestone_escrowId_fkey"
    FOREIGN KEY ("escrowId") REFERENCES "EscrowTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Disbursement -> EscrowTransaction
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_escrowId_fkey"
    FOREIGN KEY ("escrowId") REFERENCES "EscrowTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Dispute -> EscrowTransaction
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_escrowId_fkey"
    FOREIGN KEY ("escrowId") REFERENCES "EscrowTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EscrowAuditLog -> EscrowTransaction
ALTER TABLE "EscrowAuditLog" ADD CONSTRAINT "EscrowAuditLog_escrowId_fkey"
    FOREIGN KEY ("escrowId") REFERENCES "EscrowTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PaymentIntent (escrow) -> EscrowTransaction (optional)
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_escrowId_fkey"
    FOREIGN KEY ("escrowId") REFERENCES "EscrowTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PaymentTransaction -> PaymentIntent
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_intentId_fkey"
    FOREIGN KEY ("intentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PaymentMethod -> Business
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FinancialDigitalTwin -> Business
ALTER TABLE "FinancialDigitalTwin" ADD CONSTRAINT "FinancialDigitalTwin_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FinancialMetric -> FinancialDigitalTwin
ALTER TABLE "FinancialMetric" ADD CONSTRAINT "FinancialMetric_twinId_fkey"
    FOREIGN KEY ("twinId") REFERENCES "FinancialDigitalTwin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FinancialPrediction -> FinancialDigitalTwin
ALTER TABLE "FinancialPrediction" ADD CONSTRAINT "FinancialPrediction_twinId_fkey"
    FOREIGN KEY ("twinId") REFERENCES "FinancialDigitalTwin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FinancialSnapshot -> FinancialDigitalTwin
ALTER TABLE "FinancialSnapshot" ADD CONSTRAINT "FinancialSnapshot_twinId_fkey"
    FOREIGN KEY ("twinId") REFERENCES "FinancialDigitalTwin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invoice (sender) -> Business
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Invoice (receiver) -> Business
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_receiverId_fkey"
    FOREIGN KEY ("receiverId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Invoice -> Subscription (optional)
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Wallet -> Business
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- WalletTransaction -> Wallet
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Deposit -> Wallet
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Withdrawal -> Wallet
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CryptoWithdrawal -> Wallet
ALTER TABLE "CryptoWithdrawal" ADD CONSTRAINT "CryptoWithdrawal_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CurrencyConversion (from) -> Wallet
ALTER TABLE "CurrencyConversion" ADD CONSTRAINT "CurrencyConversion_fromWalletId_fkey"
    FOREIGN KEY ("fromWalletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CurrencyConversion (to) -> Wallet
ALTER TABLE "CurrencyConversion" ADD CONSTRAINT "CurrencyConversion_toWalletId_fkey"
    FOREIGN KEY ("toWalletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PaymentLink -> Business (implicit via businessId)
-- PaymentLinkPayment -> PaymentLink
ALTER TABLE "PaymentLinkPayment" ADD CONSTRAINT "PaymentLinkPayment_paymentLinkId_fkey"
    FOREIGN KEY ("paymentLinkId") REFERENCES "PaymentLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CollectionReminder -> CollectionCase
ALTER TABLE "CollectionReminder" ADD CONSTRAINT "CollectionReminder_caseId_fkey"
    FOREIGN KEY ("caseId") REFERENCES "CollectionCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Subscription -> Business (implicit via businessId)

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS) — Multi-Tenancy
-- ============================================================
-- All tenant-scoped tables enforce RLS so each tenant can only
-- see their own data. System-level tables (GlobalPaymentMethod,
-- CurrencyRate, FraudRule, ComplianceRule, GlobalPaymentMethod)
-- do NOT have RLS.

-- Helper: create RLS for tenant-scoped tables that have tenantId directly
-- OR for Business-scoped tables (look up via Business.tenantId)

-- Direct tenant-scoped tables (have tenantId column):
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Account"
    USING ("tenantId" = current_setting('app.tenant_id', true));
CREATE POLICY tenant_isolation_insert ON "Account"
    WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- Business-scoped tables (join through Business -> tenantId)
-- We create a helper function to resolve tenant from businessId

CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS TEXT AS $$
    SELECT current_setting('app.tenant_id', true);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION business_belongs_to_tenant(biz_id TEXT) RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM "Business" b
        WHERE b.id = biz_id AND b."tenantId" = current_setting('app.tenant_id', true)
    );
$$ LANGUAGE sql STABLE;

ALTER TABLE "Business" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Business"
    USING ("tenantId" = current_tenant_id());
CREATE POLICY tenant_isolation_insert ON "Business"
    WITH CHECK ("tenantId" = current_tenant_id());

ALTER TABLE "CommercePassport" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CommercePassport"
    USING (business_belongs_to_tenant("businessId"));
CREATE POLICY tenant_isolation_insert ON "CommercePassport"
    WITH CHECK (business_belongs_to_tenant("businessId"));

ALTER TABLE "Verification" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Verification"
    USING (business_belongs_to_tenant("businessId"));
CREATE POLICY tenant_isolation_insert ON "Verification"
    WITH CHECK (business_belongs_to_tenant("businessId"));

ALTER TABLE "ComplianceDocument" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ComplianceDocument"
    USING (
        EXISTS (
            SELECT 1 FROM "CommercePassport" cp
            JOIN "Business" b ON b.id = cp."businessId"
            WHERE cp.id = "ComplianceDocument"."passportId"
            AND b."tenantId" = current_tenant_id()
        )
    );

ALTER TABLE "TrustScore" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "TrustScore"
    USING (business_belongs_to_tenant("businessId"));

ALTER TABLE "BusinessRelationship" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "BusinessRelationship"
    USING (business_belongs_to_tenant("fromBusinessId"));

ALTER TABLE "ReputationEvent" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ReputationEvent"
    USING (
        EXISTS (
            SELECT 1 FROM "TrustScore" ts
            JOIN "Business" b ON b.id = ts."businessId"
            WHERE ts.id = "ReputationEvent"."trustScoreId"
            AND b."tenantId" = current_tenant_id()
        )
    );

ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Review"
    USING (
        business_belongs_to_tenant("fromBusinessId")
        OR business_belongs_to_tenant("toBusinessId")
    );

ALTER TABLE "EscrowTransaction" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "EscrowTransaction"
    USING (
        business_belongs_to_tenant("buyerId")
        OR business_belongs_to_tenant("sellerId")
    );

ALTER TABLE "EscrowMilestone" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "EscrowMilestone"
    USING (
        EXISTS (
            SELECT 1 FROM "EscrowTransaction" e
            JOIN "Business" b ON b.id IN (e."buyerId", e."sellerId")
            WHERE e.id = "EscrowMilestone"."escrowId"
            AND b."tenantId" = current_tenant_id()
        )
    );

ALTER TABLE "Disbursement" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Disbursement"
    USING (
        EXISTS (
            SELECT 1 FROM "EscrowTransaction" e
            JOIN "Business" b ON b.id IN (e."buyerId", e."sellerId")
            WHERE e.id = "Disbursement"."escrowId"
            AND b."tenantId" = current_tenant_id()
        )
    );

ALTER TABLE "Dispute" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Dispute"
    USING (
        EXISTS (
            SELECT 1 FROM "EscrowTransaction" e
            JOIN "Business" b ON b.id IN (e."buyerId", e."sellerId")
            WHERE e.id = "Dispute"."escrowId"
            AND b."tenantId" = current_tenant_id()
        )
    );

ALTER TABLE "EscrowAuditLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "EscrowAuditLog"
    USING (
        EXISTS (
            SELECT 1 FROM "EscrowTransaction" e
            JOIN "Business" b ON b.id IN (e."buyerId", e."sellerId")
            WHERE e.id = "EscrowAuditLog"."escrowId"
            AND b."tenantId" = current_tenant_id()
        )
    );

ALTER TABLE "PaymentIntent" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PaymentIntent"
    USING (
        business_belongs_to_tenant("fromBusinessId")
        OR business_belongs_to_tenant("toBusinessId")
    );

ALTER TABLE "PaymentTransaction" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PaymentTransaction"
    USING (
        EXISTS (
            SELECT 1 FROM "PaymentIntent" pi
            JOIN "Business" b ON b.id IN (pi."fromBusinessId", pi."toBusinessId")
            WHERE pi.id = "PaymentTransaction"."intentId"
            AND b."tenantId" = current_tenant_id()
        )
    );

ALTER TABLE "PaymentMethod" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PaymentMethod"
    USING (business_belongs_to_tenant("businessId"));
CREATE POLICY tenant_isolation_insert ON "PaymentMethod"
    WITH CHECK (business_belongs_to_tenant("businessId"));

ALTER TABLE "FinancialDigitalTwin" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "FinancialDigitalTwin"
    USING (business_belongs_to_tenant("businessId"));

ALTER TABLE "FinancialMetric" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "FinancialMetric"
    USING (
        EXISTS (
            SELECT 1 FROM "FinancialDigitalTwin" fdt
            JOIN "Business" b ON b.id = fdt."businessId"
            WHERE fdt.id = "FinancialMetric"."twinId"
            AND b."tenantId" = current_tenant_id()
        )
    );

ALTER TABLE "FinancialPrediction" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "FinancialPrediction"
    USING (
        EXISTS (
            SELECT 1 FROM "FinancialDigitalTwin" fdt
            JOIN "Business" b ON b.id = fdt."businessId"
            WHERE fdt.id = "FinancialPrediction"."twinId"
            AND b."tenantId" = current_tenant_id()
        )
    );

ALTER TABLE "FinancialSnapshot" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "FinancialSnapshot"
    USING (
        EXISTS (
            SELECT 1 FROM "FinancialDigitalTwin" fdt
            JOIN "Business" b ON b.id = fdt."businessId"
            WHERE fdt.id = "FinancialSnapshot"."twinId"
            AND b."tenantId" = current_tenant_id()
        )
    );

ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Invoice"
    USING (
        business_belongs_to_tenant("senderId")
        OR business_belongs_to_tenant("receiverId")
    );

ALTER TABLE "Wallet" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Wallet"
    USING (business_belongs_to_tenant("businessId"));

ALTER TABLE "WalletTransaction" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "WalletTransaction"
    USING (
        EXISTS (
            SELECT 1 FROM "Wallet" w
            JOIN "Business" b ON b.id = w."businessId"
            WHERE w.id = "WalletTransaction"."walletId"
            AND b."tenantId" = current_tenant_id()
        )
    );

ALTER TABLE "Deposit" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Deposit"
    USING (
        EXISTS (
            SELECT 1 FROM "Wallet" w
            JOIN "Business" b ON b.id = w."businessId"
            WHERE w.id = "Deposit"."walletId"
            AND b."tenantId" = current_tenant_id()
        )
    );

ALTER TABLE "Withdrawal" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Withdrawal"
    USING (
        EXISTS (
            SELECT 1 FROM "Wallet" w
            JOIN "Business" b ON b.id = w."businessId"
            WHERE w.id = "Withdrawal"."walletId"
            AND b."tenantId" = current_tenant_id()
        )
    );

ALTER TABLE "CryptoWithdrawal" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CryptoWithdrawal"
    USING (
        EXISTS (
            SELECT 1 FROM "Wallet" w
            JOIN "Business" b ON b.id = w."businessId"
            WHERE w.id = "CryptoWithdrawal"."walletId"
            AND b."tenantId" = current_tenant_id()
        )
    );

ALTER TABLE "CurrencyConversion" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CurrencyConversion"
    USING (
        EXISTS (
            SELECT 1 FROM "Wallet" w1
            JOIN "Business" b ON b.id = w1."businessId"
            WHERE w1.id = "CurrencyConversion"."fromWalletId"
            AND b."tenantId" = current_tenant_id()
        )
        OR EXISTS (
            SELECT 1 FROM "Wallet" w2
            JOIN "Business" b ON b.id = w2."businessId"
            WHERE w2.id = "CurrencyConversion"."toWalletId"
            AND b."tenantId" = current_tenant_id()
        )
    );

ALTER TABLE "FraudAlert" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "FraudAlert"
    USING (
        "businessId" IS NULL
        OR business_belongs_to_tenant("businessId")
    );

ALTER TABLE "BusinessMatch" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "BusinessMatch"
    USING (
        business_belongs_to_tenant("seekerId")
        OR business_belongs_to_tenant("candidateId")
    );

ALTER TABLE "CollectionCase" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CollectionCase"
    USING (
        business_belongs_to_tenant("businessId")
        OR business_belongs_to_tenant("debtorId")
    );

ALTER TABLE "CollectionReminder" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CollectionReminder"
    USING (
        EXISTS (
            SELECT 1 FROM "CollectionCase" cc
            JOIN "Business" b ON b.id IN (cc."businessId", cc."debtorId")
            WHERE cc.id = "CollectionReminder"."caseId"
            AND b."tenantId" = current_tenant_id()
        )
    );

ALTER TABLE "ComplianceScreening" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ComplianceScreening"
    USING (
        "businessId" IS NULL
        OR business_belongs_to_tenant("businessId")
    );

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Notification"
    USING (
        EXISTS (
            SELECT 1 FROM "Account" a
            WHERE a.id = "Notification"."accountId"
            AND a."tenantId" = current_tenant_id()
        )
    );

ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Subscription"
    USING (business_belongs_to_tenant("businessId"));

ALTER TABLE "PaymentLink" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PaymentLink"
    USING (business_belongs_to_tenant("businessId"));

ALTER TABLE "PaymentLinkPayment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PaymentLinkPayment"
    USING (
        EXISTS (
            SELECT 1 FROM "PaymentLink" pl
            JOIN "Business" b ON b.id = pl."businessId"
            WHERE pl.id = "PaymentLinkPayment"."paymentLinkId"
            AND b."tenantId" = current_tenant_id()
        )
    );

ALTER TABLE "ReferralBonus" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ReferralBonus"
    USING (
        EXISTS (
            SELECT 1 FROM "Account" ref
            WHERE ref.id = "ReferralBonus"."referrerId"
            AND ref."tenantId" = current_tenant_id()
        )
        OR EXISTS (
            SELECT 1 FROM "Account" ref2
            WHERE ref2.id = "ReferralBonus"."refereeId"
            AND ref2."tenantId" = current_tenant_id()
        )
    );

-- ============================================================
-- 7. BASIC B-TREE INDEXES (from Prisma @@index directives)
-- ============================================================

-- Tenant
CREATE INDEX idx_tenant_slug ON "Tenant"("slug");
CREATE INDEX idx_tenant_status ON "Tenant"("status");

-- Account
CREATE INDEX idx_account_tenantId ON "Account"("tenantId");
CREATE INDEX idx_account_email ON "Account"("email");
CREATE INDEX idx_account_role ON "Account"("role");
CREATE INDEX idx_account_isActive ON "Account"("isActive");

-- Business
CREATE INDEX idx_business_tenantId ON "Business"("tenantId");
CREATE INDEX idx_business_country ON "Business"("country");
CREATE INDEX idx_business_industry ON "Business"("industry");
CREATE INDEX idx_business_status ON "Business"("status");

-- CommercePassport
CREATE INDEX idx_commercepassport_credentialLevel ON "CommercePassport"("credentialLevel");
CREATE INDEX idx_commercepassport_riskRating ON "CommercePassport"("riskRating");

-- Verification
CREATE INDEX idx_verification_type ON "Verification"("type");
CREATE INDEX idx_verification_status ON "Verification"("status");

-- ComplianceDocument
CREATE INDEX idx_compliancedocument_docType ON "ComplianceDocument"("docType");
CREATE INDEX idx_compliancedocument_status ON "ComplianceDocument"("status");

-- TrustScore
CREATE INDEX idx_trustscore_overallScore ON "TrustScore"("overallScore");

-- BusinessRelationship
CREATE INDEX idx_bizrel_type ON "BusinessRelationship"("type");
CREATE INDEX idx_bizrel_trustLevel ON "BusinessRelationship"("trustLevel");

-- ReputationEvent
CREATE INDEX idx_reputationevent_eventType ON "ReputationEvent"("eventType");
CREATE INDEX idx_reputationevent_createdAt ON "ReputationEvent"("createdAt");

-- Review
CREATE INDEX idx_review_toBusinessId ON "Review"("toBusinessId");
CREATE INDEX idx_review_rating ON "Review"("rating");
CREATE INDEX idx_review_createdAt ON "Review"("createdAt");

-- EscrowTransaction
CREATE INDEX idx_escrow_status ON "EscrowTransaction"("status");
CREATE INDEX idx_escrow_buyerId ON "EscrowTransaction"("buyerId");
CREATE INDEX idx_escrow_sellerId ON "EscrowTransaction"("sellerId");
CREATE INDEX idx_escrow_currency ON "EscrowTransaction"("currency");
CREATE INDEX idx_escrow_createdAt ON "EscrowTransaction"("createdAt");

-- EscrowMilestone
CREATE INDEX idx_escrowmilestone_escrowId ON "EscrowMilestone"("escrowId");
CREATE INDEX idx_escrowmilestone_status ON "EscrowMilestone"("status");

-- Disbursement
CREATE INDEX idx_disbursement_escrowId ON "Disbursement"("escrowId");
CREATE INDEX idx_disbursement_status ON "Disbursement"("status");

-- Dispute
CREATE INDEX idx_dispute_escrowId ON "Dispute"("escrowId");
CREATE INDEX idx_dispute_status ON "Dispute"("status");

-- EscrowAuditLog
CREATE INDEX idx_escrowauditlog_escrowId ON "EscrowAuditLog"("escrowId");
CREATE INDEX idx_escrowauditlog_action ON "EscrowAuditLog"("action");
CREATE INDEX idx_escrowauditlog_createdAt ON "EscrowAuditLog"("createdAt");

-- PaymentIntent
CREATE INDEX idx_paymentintent_status ON "PaymentIntent"("status");
CREATE INDEX idx_paymentintent_fromBusinessId ON "PaymentIntent"("fromBusinessId");
CREATE INDEX idx_paymentintent_toBusinessId ON "PaymentIntent"("toBusinessId");
CREATE INDEX idx_paymentintent_paymentMethod ON "PaymentIntent"("paymentMethod");
CREATE INDEX idx_paymentintent_createdAt ON "PaymentIntent"("createdAt");

-- PaymentTransaction
CREATE INDEX idx_paymenttx_intentId ON "PaymentTransaction"("intentId");
CREATE INDEX idx_paymenttx_status ON "PaymentTransaction"("status");
CREATE INDEX idx_paymenttx_provider ON "PaymentTransaction"("provider");
CREATE INDEX idx_paymenttx_createdAt ON "PaymentTransaction"("createdAt");

-- CurrencyRate
CREATE INDEX idx_currencyrate_pair ON "CurrencyRate"("fromCurrency", "toCurrency");

-- PaymentMethod
CREATE INDEX idx_paymentmethod_businessId ON "PaymentMethod"("businessId");
CREATE INDEX idx_paymentmethod_type ON "PaymentMethod"("type");
CREATE INDEX idx_paymentmethod_status ON "PaymentMethod"("status");

-- FinancialDigitalTwin
CREATE INDEX idx_financialdigitaltwin_healthScore ON "FinancialDigitalTwin"("healthScore");
CREATE INDEX idx_financialdigitaltwin_growthTrajectory ON "FinancialDigitalTwin"("growthTrajectory");

-- FinancialMetric
CREATE INDEX idx_financialmetric_twinId ON "FinancialMetric"("twinId");
CREATE INDEX idx_financialmetric_period ON "FinancialMetric"("period");

-- FinancialPrediction
CREATE INDEX idx_financialprediction_twinId ON "FinancialPrediction"("twinId");
CREATE INDEX idx_financialprediction_predictionType ON "FinancialPrediction"("predictionType");

-- FinancialSnapshot
CREATE INDEX idx_financialsnapshot_twinId ON "FinancialSnapshot"("twinId");
CREATE INDEX idx_financialsnapshot_snapshotType ON "FinancialSnapshot"("snapshotType");
CREATE INDEX idx_financialsnapshot_createdAt ON "FinancialSnapshot"("createdAt");

-- Invoice
CREATE INDEX idx_invoice_senderId ON "Invoice"("senderId");
CREATE INDEX idx_invoice_receiverId ON "Invoice"("receiverId");
CREATE INDEX idx_invoice_status ON "Invoice"("status");
CREATE INDEX idx_invoice_dueDate ON "Invoice"("dueDate");

-- User
CREATE INDEX idx_user_role ON "User"("role");
CREATE INDEX idx_user_businessId ON "User"("businessId");
CREATE INDEX idx_user_isActive ON "User"("isActive");

-- PaymentLink
CREATE INDEX idx_paymentlink_businessId ON "PaymentLink"("businessId");
CREATE INDEX idx_paymentlink_status ON "PaymentLink"("status");
CREATE INDEX idx_paymentlink_currency ON "PaymentLink"("currency");
CREATE INDEX idx_paymentlink_createdAt ON "PaymentLink"("createdAt");

-- PaymentLinkPayment
CREATE INDEX idx_paymentlinkpayment_paymentLinkId ON "PaymentLinkPayment"("paymentLinkId");
CREATE INDEX idx_paymentlinkpayment_status ON "PaymentLinkPayment"("status");
CREATE INDEX idx_paymentlinkpayment_payerCountry ON "PaymentLinkPayment"("payerCountry");
CREATE INDEX idx_paymentlinkpayment_paymentMethod ON "PaymentLinkPayment"("paymentMethod");
CREATE INDEX idx_paymentlinkpayment_createdAt ON "PaymentLinkPayment"("createdAt");

-- GlobalPaymentMethod
CREATE INDEX idx_globalpaymentmethod_type ON "GlobalPaymentMethod"("type");
CREATE INDEX idx_globalpaymentmethod_isActive ON "GlobalPaymentMethod"("isActive");

-- Wallet
CREATE INDEX idx_wallet_businessId ON "Wallet"("businessId");
CREATE INDEX idx_wallet_currency ON "Wallet"("currency");
CREATE INDEX idx_wallet_status ON "Wallet"("status");

-- WalletTransaction
CREATE INDEX idx_wallettx_walletId ON "WalletTransaction"("walletId");
CREATE INDEX idx_wallettx_type ON "WalletTransaction"("type");
CREATE INDEX idx_wallettx_referenceType ON "WalletTransaction"("referenceType");
CREATE INDEX idx_wallettx_status ON "WalletTransaction"("status");
CREATE INDEX idx_wallettx_createdAt ON "WalletTransaction"("createdAt");

-- Deposit
CREATE INDEX idx_deposit_walletId ON "Deposit"("walletId");
CREATE INDEX idx_deposit_status ON "Deposit"("status");
CREATE INDEX idx_deposit_paymentMethod ON "Deposit"("paymentMethod");
CREATE INDEX idx_deposit_provider ON "Deposit"("provider");
CREATE INDEX idx_deposit_createdAt ON "Deposit"("createdAt");

-- Withdrawal
CREATE INDEX idx_withdrawal_walletId ON "Withdrawal"("walletId");
CREATE INDEX idx_withdrawal_status ON "Withdrawal"("status");
CREATE INDEX idx_withdrawal_paymentMethod ON "Withdrawal"("paymentMethod");
CREATE INDEX idx_withdrawal_createdAt ON "Withdrawal"("createdAt");

-- CryptoWithdrawal
CREATE INDEX idx_cryptowithdrawal_walletId ON "CryptoWithdrawal"("walletId");
CREATE INDEX idx_cryptowithdrawal_status ON "CryptoWithdrawal"("status");
CREATE INDEX idx_cryptowithdrawal_cryptoCurrency ON "CryptoWithdrawal"("cryptoCurrency");
CREATE INDEX idx_cryptowithdrawal_network ON "CryptoWithdrawal"("network");
CREATE INDEX idx_cryptowithdrawal_createdAt ON "CryptoWithdrawal"("createdAt");

-- CurrencyConversion
CREATE INDEX idx_currencyconversion_fromWalletId ON "CurrencyConversion"("fromWalletId");
CREATE INDEX idx_currencyconversion_toWalletId ON "CurrencyConversion"("toWalletId");
CREATE INDEX idx_currencyconversion_pair ON "CurrencyConversion"("fromCurrency", "toCurrency");
CREATE INDEX idx_currencyconversion_status ON "CurrencyConversion"("status");
CREATE INDEX idx_currencyconversion_createdAt ON "CurrencyConversion"("createdAt");

-- FraudAlert
CREATE INDEX idx_fraudalert_businessId ON "FraudAlert"("businessId");
CREATE INDEX idx_fraudalert_severity ON "FraudAlert"("severity");
CREATE INDEX idx_fraudalert_fraudType ON "FraudAlert"("fraudType");
CREATE INDEX idx_fraudalert_status ON "FraudAlert"("status");
CREATE INDEX idx_fraudalert_score ON "FraudAlert"("score");
CREATE INDEX idx_fraudalert_createdAt ON "FraudAlert"("createdAt");

-- FraudRule
CREATE INDEX idx_fraudrule_isActive ON "FraudRule"("isActive");
CREATE INDEX idx_fraudrule_severity ON "FraudRule"("severity");

-- BusinessMatch
CREATE INDEX idx_businessmatch_seekerId ON "BusinessMatch"("seekerId");
CREATE INDEX idx_businessmatch_candidateId ON "BusinessMatch"("candidateId");
CREATE INDEX idx_businessmatch_matchScore ON "BusinessMatch"("matchScore");
CREATE INDEX idx_businessmatch_status ON "BusinessMatch"("status");

-- CollectionCase
CREATE INDEX idx_collectioncase_businessId ON "CollectionCase"("businessId");
CREATE INDEX idx_collectioncase_debtorId ON "CollectionCase"("debtorId");
CREATE INDEX idx_collectioncase_agingBucket ON "CollectionCase"("agingBucket");
CREATE INDEX idx_collectioncase_priority ON "CollectionCase"("priority");
CREATE INDEX idx_collectioncase_status ON "CollectionCase"("status");

-- CollectionReminder
CREATE INDEX idx_collectionreminder_caseId ON "CollectionReminder"("caseId");
CREATE INDEX idx_collectionreminder_channel ON "CollectionReminder"("channel");
CREATE INDEX idx_collectionreminder_status ON "CollectionReminder"("status");

-- ComplianceRule
CREATE INDEX idx_compliancerule_ruleType ON "ComplianceRule"("ruleType");
CREATE INDEX idx_compliancerule_isActive ON "ComplianceRule"("isActive");
CREATE INDEX idx_compliancerule_severity ON "ComplianceRule"("severity");

-- ComplianceScreening
CREATE INDEX idx_compliancescreening_businessId ON "ComplianceScreening"("businessId");
CREATE INDEX idx_compliancescreening_screeningType ON "ComplianceScreening"("screeningType");
CREATE INDEX idx_compliancescreening_result ON "ComplianceScreening"("result");
CREATE INDEX idx_compliancescreening_riskLevel ON "ComplianceScreening"("riskLevel");
CREATE INDEX idx_compliancescreening_status ON "ComplianceScreening"("status");
CREATE INDEX idx_compliancescreening_createdAt ON "ComplianceScreening"("createdAt");

-- ReferralBonus
CREATE INDEX idx_referralbonus_referrerId ON "ReferralBonus"("referrerId");
CREATE INDEX idx_referralbonus_refereeId ON "ReferralBonus"("refereeId");
CREATE INDEX idx_referralbonus_status ON "ReferralBonus"("status");
CREATE INDEX idx_referralbonus_creditedAt ON "ReferralBonus"("creditedAt");

-- Notification
CREATE INDEX idx_notification_accountId ON "Notification"("accountId");
CREATE INDEX idx_notification_type ON "Notification"("type");
CREATE INDEX idx_notification_category ON "Notification"("category");
CREATE INDEX idx_notification_isRead ON "Notification"("isRead");
CREATE INDEX idx_notification_createdAt ON "Notification"("createdAt");

-- Subscription
CREATE INDEX idx_subscription_businessId ON "Subscription"("businessId");
CREATE INDEX idx_subscription_status ON "Subscription"("status");
CREATE INDEX idx_subscription_planName ON "Subscription"("planName");
CREATE INDEX idx_subscription_interval ON "Subscription"("interval");
CREATE INDEX idx_subscription_currentPeriodEnd ON "Subscription"("currentPeriodEnd");

-- ============================================================
-- 8. UPDATED AT TRIGGERS
-- ============================================================

-- Create a reusable trigger function for updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updatedAt triggers to all tables that have an updatedAt column
CREATE TRIGGER update_Tenant_updatedAt BEFORE UPDATE ON "Tenant"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_Account_updatedAt BEFORE UPDATE ON "Account"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_Business_updatedAt BEFORE UPDATE ON "Business"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_CommercePassport_updatedAt BEFORE UPDATE ON "CommercePassport"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_Verification_updatedAt BEFORE UPDATE ON "Verification"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ComplianceDocument_updatedAt BEFORE UPDATE ON "ComplianceDocument"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_TrustScore_updatedAt BEFORE UPDATE ON "TrustScore"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_BusinessRelationship_updatedAt BEFORE UPDATE ON "BusinessRelationship"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_Review_updatedAt BEFORE UPDATE ON "Review"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_EscrowTransaction_updatedAt BEFORE UPDATE ON "EscrowTransaction"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_EscrowMilestone_updatedAt BEFORE UPDATE ON "EscrowMilestone"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_Disbursement_updatedAt BEFORE UPDATE ON "Disbursement"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_Dispute_updatedAt BEFORE UPDATE ON "Dispute"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_PaymentIntent_updatedAt BEFORE UPDATE ON "PaymentIntent"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_PaymentTransaction_updatedAt BEFORE UPDATE ON "PaymentTransaction"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_PaymentMethod_updatedAt BEFORE UPDATE ON "PaymentMethod"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_FinancialDigitalTwin_updatedAt BEFORE UPDATE ON "FinancialDigitalTwin"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_Invoice_updatedAt BEFORE UPDATE ON "Invoice"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_User_updatedAt BEFORE UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_PaymentLink_updatedAt BEFORE UPDATE ON "PaymentLink"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_PaymentLinkPayment_updatedAt BEFORE UPDATE ON "PaymentLinkPayment"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_GlobalPaymentMethod_updatedAt BEFORE UPDATE ON "GlobalPaymentMethod"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_Wallet_updatedAt BEFORE UPDATE ON "Wallet"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_Deposit_updatedAt BEFORE UPDATE ON "Deposit"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_Withdrawal_updatedAt BEFORE UPDATE ON "Withdrawal"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_CryptoWithdrawal_updatedAt BEFORE UPDATE ON "CryptoWithdrawal"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_FraudAlert_updatedAt BEFORE UPDATE ON "FraudAlert"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_FraudRule_updatedAt BEFORE UPDATE ON "FraudRule"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_BusinessMatch_updatedAt BEFORE UPDATE ON "BusinessMatch"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_CollectionCase_updatedAt BEFORE UPDATE ON "CollectionCase"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ComplianceRule_updatedAt BEFORE UPDATE ON "ComplianceRule"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ComplianceScreening_updatedAt BEFORE UPDATE ON "ComplianceScreening"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ReferralBonus_updatedAt BEFORE UPDATE ON "ReferralBonus"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_Subscription_updatedAt BEFORE UPDATE ON "Subscription"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
