-- ============================================================
-- Digital Lending OS — Supabase (PostgreSQL) Schema
-- Generated from Prisma schema — 34 tables, 14 modules
-- Paste this into the Supabase SQL Editor and run it.
-- ============================================================

-- NOTE: Prisma uses cuid() for IDs. We use gen_random_uuid() + TEXT here
-- so that existing cuid values from seed data can be inserted.
-- All ID columns are TEXT to match Prisma's String type.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- MODULE 0: MULTI-TENANCY — Tenant & Account
-- ============================================================

CREATE TABLE "Tenant" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "name"          TEXT NOT NULL,
  "slug"          TEXT NOT NULL UNIQUE,
  "plan"          TEXT NOT NULL DEFAULT 'starter',
  "status"        TEXT NOT NULL DEFAULT 'active',
  "maxBusinesses" INTEGER NOT NULL DEFAULT 5,
  "maxUsers"      INTEGER NOT NULL DEFAULT 10,
  "features"      TEXT NOT NULL DEFAULT '{}',
  "ownerEmail"    TEXT NOT NULL,
  "ownerName"     TEXT NOT NULL,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Account" (
  "id"                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "email"               TEXT NOT NULL,
  "passwordHash"        TEXT NOT NULL,
  "name"                TEXT NOT NULL,
  "role"                TEXT NOT NULL DEFAULT 'admin',
  "tenantId"            TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "businessId"          TEXT,
  "avatarUrl"           TEXT,
  "isActive"            BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt"         TIMESTAMPTZ,
  "referralCode"        TEXT UNIQUE,
  "referredBy"          TEXT,
  "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "twoFactorEnabled"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("tenantId", "email")
);

-- ============================================================
-- MODULE 1: COMMERCE PASSPORT — Business Identity & Verification
-- ============================================================

CREATE TABLE "Business" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "tenantId"       TEXT NOT NULL REFERENCES "Tenant"("id"),
  "name"           TEXT NOT NULL,
  "legalName"      TEXT,
  "registrationNo" TEXT,
  "taxId"          TEXT,
  "country"        TEXT NOT NULL,
  "city"           TEXT,
  "industry"       TEXT,
  "website"        TEXT,
  "employeeCount"  INTEGER,
  "annualRevenue"  DOUBLE PRECISION,
  "description"    TEXT,
  "logoUrl"        TEXT,
  "status"         TEXT NOT NULL DEFAULT 'pending',
  "verifiedAt"     TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "CommercePassport" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "businessId"      TEXT NOT NULL UNIQUE REFERENCES "Business"("id") ON DELETE CASCADE,
  "passportHash"    TEXT NOT NULL UNIQUE,
  "credentialLevel" TEXT NOT NULL DEFAULT 'basic',
  "kycStatus"       TEXT NOT NULL DEFAULT 'not_started',
  "kycVerifiedAt"   TIMESTAMPTZ,
  "amlStatus"       TEXT NOT NULL DEFAULT 'not_started',
  "amlCheckedAt"    TIMESTAMPTZ,
  "riskRating"      TEXT NOT NULL DEFAULT 'medium',
  "lastAuditAt"     TIMESTAMPTZ,
  "nextAuditDue"    TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Verification" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "businessId"      TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "type"            TEXT NOT NULL,
  "method"          TEXT NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'pending',
  "submittedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "verifiedAt"      TIMESTAMPTZ,
  "verifiedBy"      TEXT,
  "rejectionReason" TEXT,
  "metadata"        TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "ComplianceDocument" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "passportId" TEXT NOT NULL REFERENCES "CommercePassport"("id") ON DELETE CASCADE,
  "docType"    TEXT NOT NULL,
  "docName"    TEXT NOT NULL,
  "docUrl"     TEXT,
  "status"     TEXT NOT NULL DEFAULT 'pending',
  "uploadedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expiresAt"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MODULE 2: TRUST GRAPH — Reputation & Relationship Network
-- ============================================================

CREATE TABLE "TrustScore" (
  "id"                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "businessId"         TEXT NOT NULL UNIQUE REFERENCES "Business"("id") ON DELETE CASCADE,
  "overallScore"       DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  "paymentScore"       DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  "deliveryScore"      DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  "qualityScore"       DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  "communicationScore" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  "complianceScore"    DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  "totalReviews"       INTEGER NOT NULL DEFAULT 0,
  "totalTransactions"  INTEGER NOT NULL DEFAULT 0,
  "scoreVersion"       INTEGER NOT NULL DEFAULT 1,
  "lastCalculated"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "BusinessRelationship" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "fromBusinessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "toBusinessId"   TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "type"           TEXT NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'active',
  "trustLevel"     DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  "totalTxVolume"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalTxCount"   INTEGER NOT NULL DEFAULT 0,
  "firstTxDate"    TIMESTAMPTZ,
  "lastTxDate"     TIMESTAMPTZ,
  "metadata"       TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("fromBusinessId", "toBusinessId", "type")
);

CREATE TABLE "ReputationEvent" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "trustScoreId" TEXT NOT NULL REFERENCES "TrustScore"("id") ON DELETE CASCADE,
  "eventType"    TEXT NOT NULL,
  "scoreImpact"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "description"  TEXT,
  "sourceId"     TEXT,
  "metadata"     TEXT,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Review" (
  "id"                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "fromBusinessId"      TEXT NOT NULL,
  "toBusinessId"        TEXT NOT NULL,
  "escrowId"            TEXT,
  "rating"              DOUBLE PRECISION NOT NULL,
  "paymentRating"       DOUBLE PRECISION,
  "deliveryRating"      DOUBLE PRECISION,
  "qualityRating"       DOUBLE PRECISION,
  "communicationRating" DOUBLE PRECISION,
  "comment"             TEXT,
  "response"            TEXT,
  "respondedAt"         TIMESTAMPTZ,
  "status"              TEXT NOT NULL DEFAULT 'published',
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MODULE 3: AI SMART ESCROW — Transaction State Machine
-- ============================================================

CREATE TABLE "EscrowTransaction" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "txRef"            TEXT NOT NULL UNIQUE,
  "buyerId"          TEXT NOT NULL REFERENCES "Business"("id"),
  "sellerId"         TEXT NOT NULL REFERENCES "Business"("id"),
  "amount"           DOUBLE PRECISION NOT NULL,
  "currency"         TEXT NOT NULL DEFAULT 'USD',
  "description"      TEXT,
  "status"           TEXT NOT NULL DEFAULT 'created',
  "currentMilestone" INTEGER NOT NULL DEFAULT 0,
  "totalMilestones"  INTEGER NOT NULL DEFAULT 1,
  "fundedAmount"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "releasedAmount"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "refundedAmount"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "feeAmount"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "feeCurrency"      TEXT NOT NULL DEFAULT 'USD',
  "aiRiskScore"      DOUBLE PRECISION,
  "aiRiskLevel"      TEXT,
  "paymentIntentId"  TEXT UNIQUE REFERENCES "PaymentIntent"("id"),
  "expiresAt"        TIMESTAMPTZ,
  "completedAt"      TIMESTAMPTZ,
  "buyerWalletId"    TEXT,
  "sellerWalletId"   TEXT,
  "releasedAt"       TIMESTAMPTZ,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "EscrowMilestone" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "escrowId"    TEXT NOT NULL REFERENCES "EscrowTransaction"("id") ON DELETE CASCADE,
  "sequence"    INTEGER NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "amount"      DOUBLE PRECISION NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'pending',
  "evidence"    TEXT,
  "releasedAt"  TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Disbursement" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "escrowId"    TEXT NOT NULL REFERENCES "EscrowTransaction"("id") ON DELETE CASCADE,
  "milestoneId" TEXT REFERENCES "EscrowMilestone"("id"),
  "amount"      DOUBLE PRECISION NOT NULL,
  "currency"    TEXT NOT NULL,
  "fromAccount" TEXT,
  "toAccount"   TEXT,
  "status"      TEXT NOT NULL DEFAULT 'pending',
  "paymentRef"  TEXT,
  "completedAt" TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Dispute" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "escrowId"         TEXT NOT NULL REFERENCES "EscrowTransaction"("id") ON DELETE CASCADE,
  "raisedBy"         TEXT NOT NULL,
  "reason"           TEXT NOT NULL,
  "description"      TEXT,
  "status"           TEXT NOT NULL DEFAULT 'open',
  "resolution"       TEXT,
  "resolvedAt"       TIMESTAMPTZ,
  "aiRecommendation" TEXT,
  "metadata"         TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "EscrowAuditLog" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "escrowId"  TEXT NOT NULL REFERENCES "EscrowTransaction"("id") ON DELETE CASCADE,
  "action"    TEXT NOT NULL,
  "actor"     TEXT,
  "details"   TEXT,
  "metadata"  TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MODULE 4: GLOBAL PAYMENT ROUTER — Multi-Currency & Routing
-- ============================================================

CREATE TABLE "PaymentIntent" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "intentRef"       TEXT NOT NULL UNIQUE,
  "escrowId"        TEXT UNIQUE REFERENCES "EscrowTransaction"("id"),
  "fromBusinessId"  TEXT NOT NULL,
  "toBusinessId"    TEXT NOT NULL,
  "sourceAmount"    DOUBLE PRECISION NOT NULL,
  "sourceCurrency"  TEXT NOT NULL,
  "targetAmount"    DOUBLE PRECISION NOT NULL,
  "targetCurrency"  TEXT NOT NULL,
  "exchangeRate"    DOUBLE PRECISION,
  "status"          TEXT NOT NULL DEFAULT 'created',
  "paymentMethod"   TEXT,
  "routingProvider" TEXT,
  "routingScore"    DOUBLE PRECISION,
  "estimatedFee"    DOUBLE PRECISION,
  "actualFee"       DOUBLE PRECISION,
  "estimatedTime"   INTEGER,
  "completedAt"     TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fix: add deferred FK for EscrowTransaction.paymentIntentId (created above with forward ref)
ALTER TABLE "EscrowTransaction" DROP CONSTRAINT IF EXISTS "EscrowTransaction_paymentIntentId_fkey";
ALTER TABLE "EscrowTransaction" ADD CONSTRAINT "EscrowTransaction_paymentIntentId_fkey"
  FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id");

CREATE TABLE "PaymentTransaction" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "intentId"     TEXT NOT NULL REFERENCES "PaymentIntent"("id") ON DELETE CASCADE,
  "txRef"        TEXT NOT NULL UNIQUE,
  "provider"     TEXT NOT NULL,
  "providerTxId" TEXT,
  "amount"       DOUBLE PRECISION NOT NULL,
  "currency"     TEXT NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'pending',
  "fromAddress"  TEXT,
  "toAddress"    TEXT,
  "metadata"     TEXT,
  "settledAt"    TIMESTAMPTZ,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "CurrencyRate" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "fromCurrency" TEXT NOT NULL,
  "toCurrency"   TEXT NOT NULL,
  "rate"         DOUBLE PRECISION NOT NULL,
  "provider"     TEXT NOT NULL,
  "source"       TEXT,
  "expiresAt"    TIMESTAMPTZ NOT NULL,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("fromCurrency", "toCurrency", "provider", "createdAt")
);

CREATE TABLE "PaymentMethod" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "businessId" TEXT NOT NULL,
  "type"       TEXT NOT NULL,
  "provider"   TEXT,
  "label"      TEXT,
  "identifier" TEXT,
  "currency"   TEXT,
  "country"    TEXT,
  "isDefault"  BOOLEAN NOT NULL DEFAULT false,
  "status"     TEXT NOT NULL DEFAULT 'active',
  "metadata"   TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MODULE 5: FINANCIAL DIGITAL TWIN
-- ============================================================

CREATE TABLE "FinancialDigitalTwin" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "businessId"       TEXT NOT NULL UNIQUE REFERENCES "Business"("id") ON DELETE CASCADE,
  "healthScore"      DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  "cashFlowHealth"   DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  "riskAppetite"     TEXT NOT NULL DEFAULT 'moderate',
  "creditWorthiness" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  "liquidityScore"   DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  "growthTrajectory" TEXT NOT NULL DEFAULT 'stable',
  "aiModelVersion"   TEXT NOT NULL DEFAULT 'v1.0',
  "lastSyncAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "FinancialMetric" (
  "id"                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "twinId"                  TEXT NOT NULL REFERENCES "FinancialDigitalTwin"("id") ON DELETE CASCADE,
  "period"                  TEXT NOT NULL,
  "periodDate"              TEXT NOT NULL,
  "revenue"                 DOUBLE PRECISION,
  "expenses"                DOUBLE PRECISION,
  "netIncome"               DOUBLE PRECISION,
  "accountsReceivable"      DOUBLE PRECISION,
  "accountsPayable"         DOUBLE PRECISION,
  "totalAssets"             DOUBLE PRECISION,
  "totalLiabilities"        DOUBLE PRECISION,
  "cashBalance"             DOUBLE PRECISION,
  "transactionCount"        INTEGER,
  "averageTransactionValue" DOUBLE PRECISION,
  "paymentSuccessRate"      DOUBLE PRECISION,
  "disputeRate"             DOUBLE PRECISION,
  "customerCount"           INTEGER,
  "supplierCount"           INTEGER,
  "createdAt"               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("twinId", "period", "periodDate")
);

CREATE TABLE "FinancialPrediction" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "twinId"         TEXT NOT NULL REFERENCES "FinancialDigitalTwin"("id") ON DELETE CASCADE,
  "predictionType" TEXT NOT NULL,
  "timeframe"      TEXT NOT NULL,
  "predictedValue" DOUBLE PRECISION NOT NULL,
  "confidence"     DOUBLE PRECISION NOT NULL,
  "lowerBound"     DOUBLE PRECISION,
  "upperBound"     DOUBLE PRECISION,
  "model"          TEXT NOT NULL DEFAULT 'ensemble',
  "metadata"       TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "FinancialSnapshot" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "twinId"           TEXT NOT NULL REFERENCES "FinancialDigitalTwin"("id") ON DELETE CASCADE,
  "snapshotType"     TEXT NOT NULL,
  "healthScore"      DOUBLE PRECISION NOT NULL,
  "cashFlowHealth"   DOUBLE PRECISION NOT NULL,
  "creditWorthiness" DOUBLE PRECISION NOT NULL,
  "liquidityScore"   DOUBLE PRECISION NOT NULL,
  "topRiskFactors"   TEXT,
  "topOpportunities" TEXT,
  "aiSummary"        TEXT,
  "metadata"         TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SHARED: Invoice Module
-- ============================================================

CREATE TABLE "Invoice" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "invoiceRef"   TEXT NOT NULL UNIQUE,
  "senderId"     TEXT NOT NULL REFERENCES "Business"("id"),
  "receiverId"   TEXT NOT NULL REFERENCES "Business"("id"),
  "escrowId"     TEXT,
  "amount"       DOUBLE PRECISION NOT NULL,
  "currency"     TEXT NOT NULL DEFAULT 'USD',
  "status"       TEXT NOT NULL DEFAULT 'draft',
  "dueDate"      TIMESTAMPTZ,
  "paidAmount"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "items"        TEXT,
  "notes"        TEXT,
  "subscriptionId" TEXT,
  "paidAt"       TIMESTAMPTZ,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MODULE 6: USERS & ROLES
-- ============================================================

CREATE TABLE "User" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "email"       TEXT NOT NULL UNIQUE,
  "name"        TEXT NOT NULL,
  "role"        TEXT NOT NULL DEFAULT 'viewer',
  "businessId"  TEXT,
  "avatarUrl"   TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MODULE 7: PAYMENT LINKS
-- ============================================================

CREATE TABLE "PaymentLink" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "linkRef"        TEXT NOT NULL UNIQUE,
  "businessId"     TEXT NOT NULL,
  "title"          TEXT,
  "description"    TEXT,
  "amount"         DOUBLE PRECISION NOT NULL,
  "currency"       TEXT NOT NULL DEFAULT 'USD',
  "allowedMethods" TEXT NOT NULL DEFAULT '[]',
  "allowedCountries" TEXT,
  "maxPayments"    INTEGER NOT NULL DEFAULT 1,
  "paymentCount"   INTEGER NOT NULL DEFAULT 0,
  "totalCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status"         TEXT NOT NULL DEFAULT 'active',
  "expiresAt"      TIMESTAMPTZ,
  "metadata"       TEXT,
  "createdBy"      TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "PaymentLinkPayment" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "paymentLinkId" TEXT NOT NULL REFERENCES "PaymentLink"("id") ON DELETE CASCADE,
  "payerName"     TEXT,
  "payerEmail"    TEXT,
  "payerCountry"  TEXT,
  "amount"        DOUBLE PRECISION NOT NULL,
  "currency"      TEXT NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "provider"      TEXT,
  "status"        TEXT NOT NULL DEFAULT 'pending',
  "feeAmount"     DOUBLE PRECISION,
  "netAmount"     DOUBLE PRECISION,
  "providerTxId"  TEXT,
  "metadata"      TEXT,
  "completedAt"   TIMESTAMPTZ,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MODULE 8: GLOBAL PAYMENT METHODS CATALOG
-- ============================================================

CREATE TABLE "GlobalPaymentMethod" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "methodCode"     TEXT NOT NULL UNIQUE,
  "methodName"     TEXT NOT NULL,
  "provider"       TEXT NOT NULL,
  "type"           TEXT NOT NULL,
  "countries"      TEXT NOT NULL,
  "currencies"     TEXT NOT NULL,
  "minAmount"      DOUBLE PRECISION,
  "maxAmount"      DOUBLE PRECISION,
  "feePercent"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "fixedFee"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "settlementTime" INTEGER,
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "icon"           TEXT,
  "metadata"       TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MODULE 9: MULTI-CURRENCY WALLET
-- ============================================================

CREATE TABLE "Wallet" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "businessId"       TEXT NOT NULL REFERENCES "Business"("id"),
  "currency"         TEXT NOT NULL,
  "balance"          DOUBLE PRECISION NOT NULL DEFAULT 0,
  "availableBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "pendingBalance"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "frozenBalance"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isDefault"        BOOLEAN NOT NULL DEFAULT false,
  "status"           TEXT NOT NULL DEFAULT 'active',
  "label"            TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("businessId", "currency")
);

CREATE TABLE "WalletTransaction" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "walletId"       TEXT NOT NULL REFERENCES "Wallet"("id") ON DELETE CASCADE,
  "txRef"          TEXT NOT NULL UNIQUE,
  "type"           TEXT NOT NULL,
  "amount"         DOUBLE PRECISION NOT NULL,
  "balanceBefore"  DOUBLE PRECISION NOT NULL,
  "balanceAfter"   DOUBLE PRECISION NOT NULL,
  "currency"       TEXT NOT NULL,
  "description"    TEXT,
  "referenceType"  TEXT,
  "referenceId"    TEXT,
  "counterpartyId" TEXT,
  "status"         TEXT NOT NULL DEFAULT 'completed',
  "metadata"       TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Deposit" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "depositRef"    TEXT NOT NULL UNIQUE,
  "walletId"      TEXT NOT NULL REFERENCES "Wallet"("id") ON DELETE CASCADE,
  "amount"        DOUBLE PRECISION NOT NULL,
  "currency"      TEXT NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "provider"      TEXT,
  "providerTxId"  TEXT,
  "status"        TEXT NOT NULL DEFAULT 'pending',
  "bankName"      TEXT,
  "bankRef"       TEXT,
  "cardLast4"     TEXT,
  "notes"         TEXT,
  "completedAt"   TIMESTAMPTZ,
  "failedReason"  TEXT,
  "metadata"      TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Withdrawal" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "withdrawalRef" TEXT NOT NULL UNIQUE,
  "walletId"      TEXT NOT NULL REFERENCES "Wallet"("id") ON DELETE CASCADE,
  "amount"        DOUBLE PRECISION NOT NULL,
  "currency"      TEXT NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "provider"      TEXT,
  "providerTxId"  TEXT,
  "status"        TEXT NOT NULL DEFAULT 'pending',
  "bankName"      TEXT,
  "bankAccount"   TEXT,
  "bankCode"      TEXT,
  "recipientName" TEXT,
  "feeAmount"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "netAmount"     DOUBLE PRECISION,
  "notes"         TEXT,
  "completedAt"   TIMESTAMPTZ,
  "failedReason"  TEXT,
  "metadata"      TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "CryptoWithdrawal" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "withdrawalRef"  TEXT NOT NULL UNIQUE,
  "walletId"       TEXT NOT NULL REFERENCES "Wallet"("id") ON DELETE CASCADE,
  "amount"         DOUBLE PRECISION NOT NULL,
  "cryptoAmount"   DOUBLE PRECISION,
  "currency"       TEXT NOT NULL,
  "cryptoCurrency" TEXT NOT NULL,
  "network"        TEXT NOT NULL,
  "walletAddress"  TEXT NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'pending',
  "exchangeRate"   DOUBLE PRECISION,
  "networkFee"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "processingFee"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "gasPrice"       TEXT,
  "txHash"         TEXT,
  "explorerUrl"    TEXT,
  "notes"          TEXT,
  "completedAt"    TIMESTAMPTZ,
  "failedReason"   TEXT,
  "metadata"       TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "CurrencyConversion" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "conversionRef" TEXT NOT NULL UNIQUE,
  "fromWalletId"  TEXT NOT NULL REFERENCES "Wallet"("id") ON DELETE CASCADE,
  "toWalletId"    TEXT NOT NULL REFERENCES "Wallet"("id") ON DELETE CASCADE,
  "fromCurrency"  TEXT NOT NULL,
  "toCurrency"    TEXT NOT NULL,
  "fromAmount"    DOUBLE PRECISION NOT NULL,
  "toAmount"      DOUBLE PRECISION NOT NULL,
  "exchangeRate"  DOUBLE PRECISION NOT NULL,
  "feePercent"    DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "feeAmount"     DOUBLE PRECISION NOT NULL,
  "netAmount"     DOUBLE PRECISION NOT NULL,
  "provider"      TEXT NOT NULL DEFAULT 'internal',
  "status"        TEXT NOT NULL DEFAULT 'completed',
  "metadata"      TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MODULE 10: AI FRAUD DETECTION
-- ============================================================

CREATE TABLE "FraudAlert" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "alertRef"       TEXT NOT NULL UNIQUE,
  "businessId"     TEXT,
  "relatedType"    TEXT NOT NULL,
  "relatedId"      TEXT,
  "severity"       TEXT NOT NULL DEFAULT 'medium',
  "fraudType"      TEXT NOT NULL,
  "score"          DOUBLE PRECISION NOT NULL,
  "description"    TEXT NOT NULL,
  "recommendation" TEXT,
  "status"         TEXT NOT NULL DEFAULT 'open',
  "resolvedBy"     TEXT,
  "resolvedAt"     TIMESTAMPTZ,
  "metadata"       TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "FraudRule" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "name"            TEXT NOT NULL,
  "description"     TEXT,
  "condition"       TEXT NOT NULL,
  "action"          TEXT NOT NULL,
  "severity"        TEXT NOT NULL DEFAULT 'medium',
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "triggerCount"    INTEGER NOT NULL DEFAULT 0,
  "lastTriggeredAt" TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MODULE 11: BUSINESS MATCHING
-- ============================================================

CREATE TABLE "BusinessMatch" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "seekerId"          TEXT NOT NULL,
  "candidateId"       TEXT NOT NULL,
  "matchType"         TEXT NOT NULL,
  "matchScore"        DOUBLE PRECISION NOT NULL,
  "reasons"           TEXT,
  "status"            TEXT NOT NULL DEFAULT 'suggested',
  "seekerResponse"    TEXT,
  "candidateResponse" TEXT,
  "metadata"          TEXT,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("seekerId", "candidateId", "matchType")
);

-- ============================================================
-- MODULE 12: AI COLLECTIONS
-- ============================================================

CREATE TABLE "CollectionCase" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "caseRef"           TEXT NOT NULL UNIQUE,
  "invoiceId"         TEXT,
  "businessId"        TEXT NOT NULL,
  "debtorId"          TEXT NOT NULL,
  "originalAmount"    DOUBLE PRECISION NOT NULL,
  "outstandingAmount" DOUBLE PRECISION NOT NULL,
  "currency"          TEXT NOT NULL,
  "agingBucket"       TEXT NOT NULL DEFAULT 'current',
  "priority"          TEXT NOT NULL DEFAULT 'normal',
  "status"            TEXT NOT NULL DEFAULT 'active',
  "reminderCount"     INTEGER NOT NULL DEFAULT 0,
  "lastReminderAt"    TIMESTAMPTZ,
  "nextReminderDue"   TIMESTAMPTZ,
  "aiStrategy"        TEXT,
  "resolution"        TEXT,
  "resolvedAt"        TIMESTAMPTZ,
  "metadata"          TEXT,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "CollectionReminder" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "caseId"      TEXT NOT NULL REFERENCES "CollectionCase"("id") ON DELETE CASCADE,
  "channel"     TEXT NOT NULL,
  "template"    TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'sent',
  "sentAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "response"    TEXT,
  "respondedAt" TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MODULE 13: COMPLIANCE ENGINE
-- ============================================================

CREATE TABLE "ComplianceRule" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "name"           TEXT NOT NULL,
  "description"    TEXT,
  "ruleType"       TEXT NOT NULL,
  "condition"      TEXT NOT NULL,
  "action"         TEXT NOT NULL,
  "severity"       TEXT NOT NULL DEFAULT 'medium',
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "triggeredCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "ComplianceScreening" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "businessId"      TEXT,
  "transactionType" TEXT,
  "transactionId"   TEXT,
  "screeningType"   TEXT NOT NULL,
  "result"          TEXT NOT NULL,
  "riskLevel"       TEXT NOT NULL,
  "details"         TEXT,
  "matchedLists"    TEXT,
  "status"          TEXT NOT NULL DEFAULT 'completed',
  "reviewedBy"      TEXT,
  "reviewedAt"      TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MODULE 14: REFERRAL SYSTEM
-- ============================================================

CREATE TABLE "ReferralBonus" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "bonusRef"      TEXT NOT NULL UNIQUE,
  "referrerId"    TEXT NOT NULL,
  "refereeId"     TEXT NOT NULL,
  "depositId"     TEXT NOT NULL,
  "walletId"      TEXT NOT NULL,
  "bonusAmount"   DOUBLE PRECISION NOT NULL DEFAULT 100.00,
  "bonusCurrency" TEXT NOT NULL DEFAULT 'USD',
  "status"        TEXT NOT NULL DEFAULT 'credited',
  "creditedAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES — Performance & Query Optimization
-- ============================================================

-- Tenant
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- Account
CREATE INDEX "Account_tenantId_idx" ON "Account"("tenantId");
CREATE INDEX "Account_email_idx" ON "Account"("email");
CREATE INDEX "Account_role_idx" ON "Account"("role");
CREATE INDEX "Account_isActive_idx" ON "Account"("isActive");

-- Business
CREATE INDEX "Business_tenantId_idx" ON "Business"("tenantId");
CREATE INDEX "Business_country_idx" ON "Business"("country");
CREATE INDEX "Business_industry_idx" ON "Business"("industry");
CREATE INDEX "Business_status_idx" ON "Business"("status");

-- CommercePassport
CREATE INDEX "CommercePassport_credentialLevel_idx" ON "CommercePassport"("credentialLevel");
CREATE INDEX "CommercePassport_riskRating_idx" ON "CommercePassport"("riskRating");

-- Verification
CREATE INDEX "Verification_type_idx" ON "Verification"("type");
CREATE INDEX "Verification_status_idx" ON "Verification"("status");

-- ComplianceDocument
CREATE INDEX "ComplianceDocument_docType_idx" ON "ComplianceDocument"("docType");
CREATE INDEX "ComplianceDocument_status_idx" ON "ComplianceDocument"("status");

-- TrustScore
CREATE INDEX "TrustScore_overallScore_idx" ON "TrustScore"("overallScore");

-- BusinessRelationship
CREATE INDEX "BusinessRelationship_type_idx" ON "BusinessRelationship"("type");
CREATE INDEX "BusinessRelationship_trustLevel_idx" ON "BusinessRelationship"("trustLevel");

-- ReputationEvent
CREATE INDEX "ReputationEvent_eventType_idx" ON "ReputationEvent"("eventType");
CREATE INDEX "ReputationEvent_createdAt_idx" ON "ReputationEvent"("createdAt");

-- Review
CREATE INDEX "Review_toBusinessId_idx" ON "Review"("toBusinessId");
CREATE INDEX "Review_rating_idx" ON "Review"("rating");
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");

-- EscrowTransaction
CREATE INDEX "EscrowTransaction_status_idx" ON "EscrowTransaction"("status");
CREATE INDEX "EscrowTransaction_buyerId_idx" ON "EscrowTransaction"("buyerId");
CREATE INDEX "EscrowTransaction_sellerId_idx" ON "EscrowTransaction"("sellerId");
CREATE INDEX "EscrowTransaction_currency_idx" ON "EscrowTransaction"("currency");
CREATE INDEX "EscrowTransaction_createdAt_idx" ON "EscrowTransaction"("createdAt");

-- EscrowMilestone
CREATE INDEX "EscrowMilestone_escrowId_idx" ON "EscrowMilestone"("escrowId");
CREATE INDEX "EscrowMilestone_status_idx" ON "EscrowMilestone"("status");

-- Disbursement
CREATE INDEX "Disbursement_escrowId_idx" ON "Disbursement"("escrowId");
CREATE INDEX "Disbursement_status_idx" ON "Disbursement"("status");

-- Dispute
CREATE INDEX "Dispute_escrowId_idx" ON "Dispute"("escrowId");
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- EscrowAuditLog
CREATE INDEX "EscrowAuditLog_escrowId_idx" ON "EscrowAuditLog"("escrowId");
CREATE INDEX "EscrowAuditLog_action_idx" ON "EscrowAuditLog"("action");
CREATE INDEX "EscrowAuditLog_createdAt_idx" ON "EscrowAuditLog"("createdAt");

-- PaymentIntent
CREATE INDEX "PaymentIntent_status_idx" ON "PaymentIntent"("status");
CREATE INDEX "PaymentIntent_fromBusinessId_idx" ON "PaymentIntent"("fromBusinessId");
CREATE INDEX "PaymentIntent_toBusinessId_idx" ON "PaymentIntent"("toBusinessId");
CREATE INDEX "PaymentIntent_paymentMethod_idx" ON "PaymentIntent"("paymentMethod");
CREATE INDEX "PaymentIntent_createdAt_idx" ON "PaymentIntent"("createdAt");

-- PaymentTransaction
CREATE INDEX "PaymentTransaction_intentId_idx" ON "PaymentTransaction"("intentId");
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");
CREATE INDEX "PaymentTransaction_provider_idx" ON "PaymentTransaction"("provider");
CREATE INDEX "PaymentTransaction_createdAt_idx" ON "PaymentTransaction"("createdAt");

-- CurrencyRate
CREATE INDEX "CurrencyRate_fromCurrency_toCurrency_idx" ON "CurrencyRate"("fromCurrency", "toCurrency");

-- PaymentMethod
CREATE INDEX "PaymentMethod_businessId_idx" ON "PaymentMethod"("businessId");
CREATE INDEX "PaymentMethod_type_idx" ON "PaymentMethod"("type");
CREATE INDEX "PaymentMethod_status_idx" ON "PaymentMethod"("status");

-- FinancialDigitalTwin
CREATE INDEX "FinancialDigitalTwin_healthScore_idx" ON "FinancialDigitalTwin"("healthScore");
CREATE INDEX "FinancialDigitalTwin_growthTrajectory_idx" ON "FinancialDigitalTwin"("growthTrajectory");

-- FinancialMetric
CREATE INDEX "FinancialMetric_twinId_idx" ON "FinancialMetric"("twinId");
CREATE INDEX "FinancialMetric_period_idx" ON "FinancialMetric"("period");

-- FinancialPrediction
CREATE INDEX "FinancialPrediction_twinId_idx" ON "FinancialPrediction"("twinId");
CREATE INDEX "FinancialPrediction_predictionType_idx" ON "FinancialPrediction"("predictionType");

-- FinancialSnapshot
CREATE INDEX "FinancialSnapshot_twinId_idx" ON "FinancialSnapshot"("twinId");
CREATE INDEX "FinancialSnapshot_snapshotType_idx" ON "FinancialSnapshot"("snapshotType");
CREATE INDEX "FinancialSnapshot_createdAt_idx" ON "FinancialSnapshot"("createdAt");

-- Invoice
CREATE INDEX "Invoice_senderId_idx" ON "Invoice"("senderId");
CREATE INDEX "Invoice_receiverId_idx" ON "Invoice"("receiverId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- User
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_businessId_idx" ON "User"("businessId");
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- PaymentLink
CREATE INDEX "PaymentLink_businessId_idx" ON "PaymentLink"("businessId");
CREATE INDEX "PaymentLink_status_idx" ON "PaymentLink"("status");
CREATE INDEX "PaymentLink_currency_idx" ON "PaymentLink"("currency");
CREATE INDEX "PaymentLink_createdAt_idx" ON "PaymentLink"("createdAt");

-- PaymentLinkPayment
CREATE INDEX "PaymentLinkPayment_paymentLinkId_idx" ON "PaymentLinkPayment"("paymentLinkId");
CREATE INDEX "PaymentLinkPayment_status_idx" ON "PaymentLinkPayment"("status");
CREATE INDEX "PaymentLinkPayment_payerCountry_idx" ON "PaymentLinkPayment"("payerCountry");
CREATE INDEX "PaymentLinkPayment_paymentMethod_idx" ON "PaymentLinkPayment"("paymentMethod");
CREATE INDEX "PaymentLinkPayment_createdAt_idx" ON "PaymentLinkPayment"("createdAt");

-- GlobalPaymentMethod
CREATE INDEX "GlobalPaymentMethod_type_idx" ON "GlobalPaymentMethod"("type");
CREATE INDEX "GlobalPaymentMethod_isActive_idx" ON "GlobalPaymentMethod"("isActive");

-- Wallet
CREATE INDEX "Wallet_businessId_idx" ON "Wallet"("businessId");
CREATE INDEX "Wallet_currency_idx" ON "Wallet"("currency");
CREATE INDEX "Wallet_status_idx" ON "Wallet"("status");

-- WalletTransaction
CREATE INDEX "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");
CREATE INDEX "WalletTransaction_referenceType_idx" ON "WalletTransaction"("referenceType");
CREATE INDEX "WalletTransaction_status_idx" ON "WalletTransaction"("status");
CREATE INDEX "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");

-- Deposit
CREATE INDEX "Deposit_walletId_idx" ON "Deposit"("walletId");
CREATE INDEX "Deposit_status_idx" ON "Deposit"("status");
CREATE INDEX "Deposit_paymentMethod_idx" ON "Deposit"("paymentMethod");
CREATE INDEX "Deposit_provider_idx" ON "Deposit"("provider");
CREATE INDEX "Deposit_createdAt_idx" ON "Deposit"("createdAt");

-- Withdrawal
CREATE INDEX "Withdrawal_walletId_idx" ON "Withdrawal"("walletId");
CREATE INDEX "Withdrawal_status_idx" ON "Withdrawal"("status");
CREATE INDEX "Withdrawal_paymentMethod_idx" ON "Withdrawal"("paymentMethod");
CREATE INDEX "Withdrawal_createdAt_idx" ON "Withdrawal"("createdAt");

-- CryptoWithdrawal
CREATE INDEX "CryptoWithdrawal_walletId_idx" ON "CryptoWithdrawal"("walletId");
CREATE INDEX "CryptoWithdrawal_status_idx" ON "CryptoWithdrawal"("status");
CREATE INDEX "CryptoWithdrawal_cryptoCurrency_idx" ON "CryptoWithdrawal"("cryptoCurrency");
CREATE INDEX "CryptoWithdrawal_network_idx" ON "CryptoWithdrawal"("network");
CREATE INDEX "CryptoWithdrawal_createdAt_idx" ON "CryptoWithdrawal"("createdAt");

-- CurrencyConversion
CREATE INDEX "CurrencyConversion_fromWalletId_idx" ON "CurrencyConversion"("fromWalletId");
CREATE INDEX "CurrencyConversion_toWalletId_idx" ON "CurrencyConversion"("toWalletId");
CREATE INDEX "CurrencyConversion_fromCurrency_toCurrency_idx" ON "CurrencyConversion"("fromCurrency", "toCurrency");
CREATE INDEX "CurrencyConversion_status_idx" ON "CurrencyConversion"("status");
CREATE INDEX "CurrencyConversion_createdAt_idx" ON "CurrencyConversion"("createdAt");

-- FraudAlert
CREATE INDEX "FraudAlert_businessId_idx" ON "FraudAlert"("businessId");
CREATE INDEX "FraudAlert_severity_idx" ON "FraudAlert"("severity");
CREATE INDEX "FraudAlert_fraudType_idx" ON "FraudAlert"("fraudType");
CREATE INDEX "FraudAlert_status_idx" ON "FraudAlert"("status");
CREATE INDEX "FraudAlert_score_idx" ON "FraudAlert"("score");
CREATE INDEX "FraudAlert_createdAt_idx" ON "FraudAlert"("createdAt");

-- FraudRule
CREATE INDEX "FraudRule_isActive_idx" ON "FraudRule"("isActive");
CREATE INDEX "FraudRule_severity_idx" ON "FraudRule"("severity");

-- BusinessMatch
CREATE INDEX "BusinessMatch_seekerId_idx" ON "BusinessMatch"("seekerId");
CREATE INDEX "BusinessMatch_candidateId_idx" ON "BusinessMatch"("candidateId");
CREATE INDEX "BusinessMatch_matchScore_idx" ON "BusinessMatch"("matchScore");
CREATE INDEX "BusinessMatch_status_idx" ON "BusinessMatch"("status");

-- CollectionCase
CREATE INDEX "CollectionCase_businessId_idx" ON "CollectionCase"("businessId");
CREATE INDEX "CollectionCase_debtorId_idx" ON "CollectionCase"("debtorId");
CREATE INDEX "CollectionCase_agingBucket_idx" ON "CollectionCase"("agingBucket");
CREATE INDEX "CollectionCase_priority_idx" ON "CollectionCase"("priority");
CREATE INDEX "CollectionCase_status_idx" ON "CollectionCase"("status");

-- CollectionReminder
CREATE INDEX "CollectionReminder_caseId_idx" ON "CollectionReminder"("caseId");
CREATE INDEX "CollectionReminder_channel_idx" ON "CollectionReminder"("channel");
CREATE INDEX "CollectionReminder_status_idx" ON "CollectionReminder"("status");

-- ComplianceRule
CREATE INDEX "ComplianceRule_ruleType_idx" ON "ComplianceRule"("ruleType");
CREATE INDEX "ComplianceRule_isActive_idx" ON "ComplianceRule"("isActive");
CREATE INDEX "ComplianceRule_severity_idx" ON "ComplianceRule"("severity");

-- ComplianceScreening
CREATE INDEX "ComplianceScreening_businessId_idx" ON "ComplianceScreening"("businessId");
CREATE INDEX "ComplianceScreening_screeningType_idx" ON "ComplianceScreening"("screeningType");
CREATE INDEX "ComplianceScreening_result_idx" ON "ComplianceScreening"("result");
CREATE INDEX "ComplianceScreening_riskLevel_idx" ON "ComplianceScreening"("riskLevel");
CREATE INDEX "ComplianceScreening_status_idx" ON "ComplianceScreening"("status");
CREATE INDEX "ComplianceScreening_createdAt_idx" ON "ComplianceScreening"("createdAt");

-- ReferralBonus
CREATE INDEX "ReferralBonus_referrerId_idx" ON "ReferralBonus"("referrerId");
CREATE INDEX "ReferralBonus_refereeId_idx" ON "ReferralBonus"("refereeId");
CREATE INDEX "ReferralBonus_status_idx" ON "ReferralBonus"("status");
CREATE INDEX "ReferralBonus_creditedAt_idx" ON "ReferralBonus"("creditedAt");

-- ============================================================
-- UPDATED AT TRIGGERS — Auto-update `updatedAt` on every row change
-- ============================================================

CREATE OR REPLACE FUNCTION "update_updatedAt_column"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE
  t TEXT;
  r RECORD;
BEGIN
  FOR t IN
    SELECT table_name::TEXT FROM information_schema.columns
    WHERE column_name = 'updatedAt' AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER "%s_updatedAt" BEFORE UPDATE ON "%s" FOR EACH ROW EXECUTE FUNCTION "update_updatedAt_column"()',
      t, t
    );
  END LOOP;
END $$;
