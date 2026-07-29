-- ============================================================
-- V2__indexes_and_partitions.sql
-- Youngsend PostgreSQL Performance Indexes & Table Partitioning
-- ============================================================
-- 1. BRIN indexes on timestamp columns (time-series)
-- 2. Partial indexes for active/open records
-- 3. Covering indexes for common API query patterns
-- 4. GIN indexes for JSONB metadata and full-text search
-- 5. Monthly table partitioning for WalletTransaction & EscrowAuditLog
-- ============================================================

BEGIN;

-- ============================================================
-- 1. BRIN INDEXES — Block Range Index for time-series data
-- ============================================================
-- BRIN indexes are ~99% smaller than B-tree and ideal for
-- columns with natural physical ordering (append-only, timestamped).
-- pages_per_range=32 means one BRIN entry per 256KB (32 pages).

-- WalletTransaction — highest volume table (~100M+ rows/year)
CREATE INDEX idx_wallettx_createdat_brin
    ON "WalletTransaction" USING brin ("createdAt")
    WITH (pages_per_range = 32);

-- EscrowAuditLog — append-only audit trail (~50M+ rows/year)
CREATE INDEX idx_escrowauditlog_createdat_brin
    ON "EscrowAuditLog" USING brin ("createdAt")
    WITH (pages_per_range = 32);

-- Notification — high-volume (~500M+ rows/year)
CREATE INDEX idx_notification_createdat_brin
    ON "Notification" USING brin ("createdAt")
    WITH (pages_per_range = 64);

-- PaymentTransaction — moderate volume (~50M+ rows/year)
CREATE INDEX idx_paymenttx_createdat_brin
    ON "PaymentTransaction" USING brin ("createdAt")
    WITH (pages_per_range = 32);

-- Deposit — moderate volume
CREATE INDEX idx_deposit_createdat_brin
    ON "Deposit" USING brin ("createdAt")
    WITH (pages_per_range = 32);

-- Withdrawal — moderate volume
CREATE INDEX idx_withdrawal_createdat_brin
    ON "Withdrawal" USING brin ("createdAt")
    WITH (pages_per_range = 32);

-- ReputationEvent — moderate volume
CREATE INDEX idx_reputationevent_createdat_brin
    ON "ReputationEvent" USING brin ("createdAt")
    WITH (pages_per_range = 32);

-- CollectionReminder — moderate volume
CREATE INDEX idx_collectionreminder_sentat_brin
    ON "CollectionReminder" USING brin ("sentAt")
    WITH (pages_per_range = 32);

-- ComplianceScreening — moderate volume
CREATE INDEX idx_compliancescreening_createdat_brin
    ON "ComplianceScreening" USING brin ("createdAt")
    WITH (pages_per_range = 32);

-- FinancialMetric — moderate volume
CREATE INDEX idx_financialmetric_createdat_brin
    ON "FinancialMetric" USING brin ("createdAt")
    WITH (pages_per_range = 32);

-- CurrencyRate — frequently updated
CREATE INDEX idx_currencyrate_expiresat_brin
    ON "CurrencyRate" USING brin ("expiresAt")
    WITH (pages_per_range = 16);

-- ============================================================
-- 2. PARTIAL INDEXES — Index only active/relevant rows
-- ============================================================
-- Drastically reduce index size by excluding completed/terminal states.

-- Active escrow transactions (exclude terminal states)
CREATE INDEX idx_escrow_active
    ON "EscrowTransaction" ("status", "createdAt" DESC)
    WHERE "status" NOT IN ('completed', 'cancelled', 'refunded');

-- Pending/processing escrows (operations queries)
CREATE INDEX idx_escrow_operational
    ON "EscrowTransaction" ("buyerId", "status", "createdAt" DESC)
    WHERE "status" IN ('created', 'funded', 'in_escrow', 'partial_release', 'disputed');

-- Active disputes only
CREATE INDEX idx_dispute_active
    ON "Dispute" ("escrowId", "status", "createdAt" DESC)
    WHERE "status" IN ('open', 'under_review');

-- Active milestones (not released or disputed)
CREATE INDEX idx_milestone_active
    ON "EscrowMilestone" ("escrowId", "status", "sequence")
    WHERE "status" IN ('pending', 'ready');

-- Pending disbursements
CREATE INDEX idx_disbursement_pending
    ON "Disbursement" ("escrowId", "status")
    WHERE "status" IN ('pending', 'processing');

-- Pending payments (exclude settled/failed/refunded)
CREATE INDEX idx_paymenttx_pending
    ON "PaymentTransaction" ("intentId", "status", "createdAt" DESC)
    WHERE "status" IN ('pending', 'processing');

-- Active payment intents (exclude terminal)
CREATE INDEX idx_paymentintent_active
    ON "PaymentIntent" ("status", "createdAt" DESC)
    WHERE "status" NOT IN ('completed', 'failed', 'cancelled');

-- Unread notifications (most common query pattern)
CREATE INDEX idx_notification_unread
    ON "Notification" ("accountId", "createdAt" DESC)
    WHERE "isRead" = false;

-- Unread notifications by category
CREATE INDEX idx_notification_unread_category
    ON "Notification" ("accountId", "category", "createdAt" DESC)
    WHERE "isRead" = false;

-- Active wallets (exclude frozen/closed)
CREATE INDEX idx_wallet_active
    ON "Wallet" ("businessId", "currency", "status")
    WHERE "status" = 'active';

-- Active/frozen wallets (exclude closed)
CREATE INDEX idx_wallet_nonclosed
    ON "Wallet" ("businessId", "currency")
    WHERE "status" != 'closed';

-- Active payment links (exclude expired/depleted)
CREATE INDEX idx_paymentlink_active
    ON "PaymentLink" ("businessId", "status", "createdAt" DESC)
    WHERE "status" IN ('active', 'paused');

-- Active payment link payments (exclude terminal)
CREATE INDEX idx_paymentlinkpayment_active
    ON "PaymentLinkPayment" ("paymentLinkId", "status")
    WHERE "status" IN ('pending', 'processing', 'completed');

-- Active collection cases
CREATE INDEX idx_collectioncase_active
    ON "CollectionCase" ("businessId", "priority", "createdAt" DESC)
    WHERE "status" = 'active';

-- Overdue invoices
CREATE INDEX idx_invoice_overdue
    ON "Invoice" ("receiverId", "status", "dueDate")
    WHERE "status" IN ('sent', 'partially_paid', 'overdue');

-- Active subscriptions (exclude cancelled)
CREATE INDEX idx_subscription_active
    ON "Subscription" ("businessId", "status", "currentPeriodEnd")
    WHERE "status" IN ('active', 'past_due', 'trialing');

-- Pending deposits
CREATE INDEX idx_deposit_pending
    ON "Deposit" ("walletId", "status", "createdAt" DESC)
    WHERE "status" IN ('pending', 'processing');

-- Pending withdrawals
CREATE INDEX idx_withdrawal_pending
    ON "Withdrawal" ("walletId", "status", "createdAt" DESC)
    WHERE "status" IN ('pending', 'processing');

-- Pending crypto withdrawals
CREATE INDEX idx_cryptowithdrawal_pending
    ON "CryptoWithdrawal" ("walletId", "status", "createdAt" DESC)
    WHERE "status" IN ('pending', 'processing');

-- Active fraud alerts (exclude resolved/false_positive)
CREATE INDEX idx_fraudalert_open
    ON "FraudAlert" ("businessId", "severity", "createdAt" DESC)
    WHERE "status" IN ('open', 'investigating', 'escalated');

-- Active fraud rules
CREATE INDEX idx_fraudrule_active
    ON "FraudRule" ("isActive", "severity")
    WHERE "isActive" = true;

-- Active compliance rules
CREATE INDEX idx_compliancerule_active
    ON "ComplianceRule" ("ruleType", "isActive")
    WHERE "isActive" = true;

-- Active compliance screenings needing review
CREATE INDEX idx_compliancescreening_pending
    ON "ComplianceScreening" ("businessId", "screeningType", "result", "createdAt" DESC)
    WHERE "status" IN ('pending', 'in_progress', 'escalated');

-- Active business matches (suggested/contacted)
CREATE INDEX idx_businessmatch_pending
    ON "BusinessMatch" ("seekerId", "matchType", "matchScore" DESC)
    WHERE "status" IN ('suggested', 'contacted');

-- Active collection reminders needing follow-up
CREATE INDEX idx_collectionreminder_pending
    ON "CollectionReminder" ("caseId", "status", "sentAt" DESC)
    WHERE "status" IN ('sent', 'delivered');

-- Active accounts only
CREATE INDEX idx_account_active
    ON "Account" ("tenantId", "email")
    WHERE "isActive" = true;

-- Active users only
CREATE INDEX idx_user_active
    ON "User"("businessId", "role")
    WHERE "isActive" = true;

-- Active businesses
CREATE INDEX idx_business_active
    ON "Business" ("tenantId", "status", "name")
    WHERE "status" = 'verified';

-- Active payment methods
CREATE INDEX idx_paymentmethod_active
    ON "PaymentMethod" ("businessId", "type", "isDefault")
    WHERE "status" = 'active';

-- ============================================================
-- 3. COVERING INDEXES — Index-only scans for common API queries
-- ============================================================
-- INCLUDE columns that are frequently selected but not filtered,
-- enabling the query to be satisfied entirely from the index.

-- Dashboard: escrow list with key fields without hitting table
CREATE INDEX idx_escrow_dashboard_buyer
    ON "EscrowTransaction" ("buyerId", "status", "createdAt" DESC)
    INCLUDE ("amount", "currency", "description", "sellerId");

CREATE INDEX idx_escrow_dashboard_seller
    ON "EscrowTransaction" ("sellerId", "status", "createdAt" DESC)
    INCLUDE ("amount", "currency", "description", "buyerId");

-- Wallet balance overview (API returns balance + currency + status)
CREATE INDEX idx_wallet_balance
    ON "Wallet" ("businessId", "currency")
    INCLUDE ("balance", "availableBalance", "pendingBalance", "frozenBalance", "status", "label");

-- Recent wallet transactions (API returns last N transactions)
CREATE INDEX idx_wallettx_recent
    ON "WalletTransaction" ("walletId", "createdAt" DESC, "type")
    INCLUDE ("amount", "currency", "balanceBefore", "balanceAfter", "description", "status");

-- Payment intent summary (API returns key payment fields)
CREATE INDEX idx_paymentintent_summary
    ON "PaymentIntent" ("fromBusinessId", "status", "createdAt" DESC)
    INCLUDE ("sourceAmount", "sourceCurrency", "targetAmount", "targetCurrency", "toBusinessId");

-- Invoice list (API returns amount + currency + due date)
CREATE INDEX idx_invoice_list_sender
    ON "Invoice" ("senderId", "status", "createdAt" DESC)
    INCLUDE ("amount", "currency", "receiverId", "dueDate", "paidAmount");

CREATE INDEX idx_invoice_list_receiver
    ON "Invoice" ("receiverId", "status", "createdAt" DESC)
    INCLUDE ("amount", "currency", "senderId", "dueDate", "paidAmount");

-- Notification list (API returns title + body + type + category)
CREATE INDEX idx_notification_list
    ON "Notification" ("accountId", "createdAt" DESC)
    INCLUDE ("title", "body", "type", "category", "isRead", "actionUrl");

-- Payment link list (API returns title + amount + currency + totals)
CREATE INDEX idx_paymentlink_list
    ON "PaymentLink" ("businessId", "status", "createdAt" DESC)
    INCLUDE ("title", "amount", "currency", "paymentCount", "totalCollected", "expiresAt");

-- Fraud alert list (API returns severity + description + recommendation)
CREATE INDEX idx_fraudalert_list
    ON "FraudAlert" ("businessId", "createdAt" DESC)
    INCLUDE ("severity", "fraudType", "score", "description", "recommendation", "status");

-- Collection case list (API returns amounts + aging + priority)
CREATE INDEX idx_collectioncase_list
    ON "CollectionCase" ("businessId", "status", "createdAt" DESC)
    INCLUDE ("originalAmount", "outstandingAmount", "currency", "agingBucket", "priority", "debtorId");

-- Business match list (API returns score + match type)
CREATE INDEX idx_businessmatch_list
    ON "BusinessMatch" ("seekerId", "status", "createdAt" DESC)
    INCLUDE ("candidateId", "matchType", "matchScore", "seekerResponse");

-- Trust score overview (API returns all score components)
CREATE INDEX idx_trustscore_overview
    ON "TrustScore" ("businessId")
    INCLUDE ("overallScore", "paymentScore", "deliveryScore", "qualityScore",
             "communicationScore", "complianceScore", "totalReviews", "totalTransactions");

-- Subscription list (API returns plan + amount + period end)
CREATE INDEX idx_subscription_list
    ON "Subscription" ("businessId", "status")
    INCLUDE ("planName", "amount", "currency", "interval", "currentPeriodStart", "currentPeriodEnd");

-- Deposit list (API returns amount + method + provider)
CREATE INDEX idx_deposit_list
    ON "Deposit" ("walletId", "createdAt" DESC)
    INCLUDE ("amount", "currency", "paymentMethod", "provider", "status");

-- Withdrawal list (API returns amount + method + status)
CREATE INDEX idx_withdrawal_list
    ON "Withdrawal" ("walletId", "createdAt" DESC)
    INCLUDE ("amount", "currency", "paymentMethod", "status", "netAmount");

-- ============================================================
-- 4. COMPOSITE INDEXES — Multi-column patterns for API queries
-- ============================================================

-- Business relationship lookup (from + type + status)
CREATE INDEX idx_bizrel_composite
    ON "BusinessRelationship" ("fromBusinessId", "type", "status", "trustLevel" DESC);

-- Payment intent lookup by business pair (common API pattern)
CREATE INDEX idx_paymentintent_pair
    ON "PaymentIntent" ("fromBusinessId", "toBusinessId", "createdAt" DESC);

-- Escrow transactions for a seller with status filter
CREATE INDEX idx_escrow_seller_status
    ON "EscrowTransaction" ("sellerId", "status", "createdAt" DESC);

-- Wallet transactions by type within a wallet
CREATE INDEX idx_wallettx_wallet_type
    ON "WalletTransaction" ("walletId", "type", "createdAt" DESC);

-- Wallet transactions by reference (e.g., all escrow-related txns)
CREATE INDEX idx_wallettx_wallet_reftype
    ON "WalletTransaction" ("walletId", "referenceType", "createdAt" DESC);

-- Currency conversion by pair
CREATE INDEX idx_currencyconversion_pair_date
    ON "CurrencyConversion" ("fromWalletId", "toWalletId", "createdAt" DESC);

-- Fraud alerts for a business sorted by severity and time
CREATE INDEX idx_fraudalert_business_severity
    ON "FraudAlert" ("businessId", "severity", "createdAt" DESC);

-- Collection case by debtor and status
CREATE INDEX idx_collectioncase_debtor_status
    ON "CollectionCase" ("debtorId", "status", "priority", "createdAt" DESC);

-- Compliance screening by type and result
CREATE INDEX idx_compliancescreening_type_result
    ON "ComplianceScreening" ("screeningType", "result", "createdAt" DESC);

-- Business search by country + industry
CREATE INDEX idx_business_country_industry
    ON "Business" ("country", "industry", "status");

-- Review lookup by escrow
CREATE INDEX idx_review_escrow
    ON "Review" ("escrowId", "createdAt" DESC);

-- Verification lookup by business + type + status
CREATE INDEX idx_verification_biz_type_status
    ON "Verification" ("businessId", "type", "status", "createdAt" DESC);

-- Compliance documents by passport + type
CREATE INDEX idx_compliancedocument_passport_type
    ON "ComplianceDocument" ("passportId", "docType", "status");

-- Financial metrics by twin + period
CREATE INDEX idx_financialmetric_twin_period_date
    ON "FinancialMetric" ("twinId", "period", "periodDate" DESC);

-- Referral bonus lookup by wallet
CREATE INDEX idx_referralbonus_wallet
    ON "ReferralBonus" ("walletId", "createdAt" DESC);

-- Notification by account + read status (paginate unread first)
CREATE INDEX idx_notification_account_read
    ON "Notification" ("accountId", "isRead", "createdAt" DESC);

-- EscrowAuditLog by escrow + action type
CREATE INDEX idx_escrowauditlog_escrow_action
    ON "EscrowAuditLog" ("escrowId", "action", "createdAt" DESC);

-- ============================================================
-- 5. GIN INDEXES — JSONB and full-text search
-- ============================================================

-- JSONB metadata queries on WalletTransaction
CREATE INDEX idx_wallettx_metadata_gin
    ON "WalletTransaction" USING gin (metadata jsonb_path_ops);

-- JSONB metadata on EscrowTransaction
CREATE INDEX idx_escrow_metadata_gin
    ON "EscrowTransaction" USING gin (metadata jsonb_path_ops);

-- JSONB metadata on Dispute
CREATE INDEX idx_dispute_metadata_gin
    ON "Dispute" USING gin (metadata jsonb_path_ops);

-- JSONB metadata on PaymentTransaction
CREATE INDEX idx_paymenttx_metadata_gin
    ON "PaymentTransaction" USING gin (metadata jsonb_path_ops);

-- JSONB metadata on FraudAlert
CREATE INDEX idx_fraudalert_metadata_gin
    ON "FraudAlert" USING gin (metadata jsonb_path_ops);

-- JSONB metadata on CollectionCase
CREATE INDEX idx_collectioncase_metadata_gin
    ON "CollectionCase" USING gin (metadata jsonb_path_ops);

-- JSONB items on Invoice (line items search)
CREATE INDEX idx_invoice_items_gin
    ON "Invoice" USING gin (items jsonb_path_ops);

-- Full-text search on business name + description
CREATE INDEX idx_business_search_fts
    ON "Business" USING gin (
        to_tsvector('english',
            coalesce(name, '') || ' ' ||
            coalesce(description, '') || ' ' ||
            coalesce("legalName", '') || ' ' ||
            coalesce(city, '') || ' ' ||
            coalesce(industry, '')
        )
    );

-- Trigram similarity for business name fuzzy search
CREATE INDEX idx_business_name_trgm
    ON "Business" USING gin (name gin_trgm_ops);

-- JSONB features on Tenant (feature flags)
CREATE INDEX idx_tenant_features_gin
    ON "Tenant" USING gin (features jsonb_path_ops);

-- JSONB condition on FraudRule
CREATE INDEX idx_fraudrule_condition_gin
    ON "FraudRule" USING gin (condition jsonb_path_ops);

-- JSONB condition on ComplianceRule
CREATE INDEX idx_compliancerule_condition_gin
    ON "ComplianceRule" USING gin (condition jsonb_path_ops);

-- JSONB allowedMethods on PaymentLink
CREATE INDEX idx_paymentlink_methods_gin
    ON "PaymentLink" USING gin ("allowedMethods" jsonb_path_ops);

-- JSONB matchedLists on ComplianceScreening
CREATE INDEX idx_compliancescreening_lists_gin
    ON "ComplianceScreening" USING gin ("matchedLists" jsonb_path_ops);

-- ============================================================
-- 6. MONTHLY TABLE PARTITIONING
-- ============================================================
-- Partition high-volume append-only tables by month.
-- This enables: partition pruning, parallel queries, easy archival,
-- per-partition VACUUM/REINDEX (less lock contention).
-- ============================================================

-- ---------------------------------------------------------------
-- 6a. WalletTransaction — Monthly partitioning
-- ---------------------------------------------------------------
-- Convert WalletTransaction to a partitioned table.
-- Existing data must be moved to partitions before this runs.
-- In production, use pg_partman for automatic partition management.

-- First, create the parent table as partitioned
-- (This is a template — in production, rename existing table,
--  create partitioned parent, then move data)

-- Parent table definition (unlogged if we replicate via WAL)
CREATE UNLOGGED TABLE IF NOT EXISTS "WalletTransaction_partitioned" (
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
    CONSTRAINT "WalletTransaction_partitioned_pkey" PRIMARY KEY ("id", "createdAt")
) PARTITION BY RANGE ("createdAt");

-- Create initial monthly partitions (current + 2 months ahead)
-- Adjust dates as needed; these should be created before data flows in

CREATE TABLE "WalletTransaction_2025_01" PARTITION OF "WalletTransaction_partitioned"
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE "WalletTransaction_2025_02" PARTITION OF "WalletTransaction_partitioned"
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE "WalletTransaction_2025_03" PARTITION OF "WalletTransaction_partitioned"
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE "WalletTransaction_2025_04" PARTITION OF "WalletTransaction_partitioned"
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE "WalletTransaction_2025_05" PARTITION OF "WalletTransaction_partitioned"
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE "WalletTransaction_2025_06" PARTITION OF "WalletTransaction_partitioned"
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE "WalletTransaction_2025_07" PARTITION OF "WalletTransaction_partitioned"
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE "WalletTransaction_2025_08" PARTITION OF "WalletTransaction_partitioned"
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE "WalletTransaction_2025_09" PARTITION OF "WalletTransaction_partitioned"
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE "WalletTransaction_2025_10" PARTITION OF "WalletTransaction_partitioned"
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE "WalletTransaction_2025_11" PARTITION OF "WalletTransaction_partitioned"
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE "WalletTransaction_2025_12" PARTITION OF "WalletTransaction_partitioned"
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Default partition catches any rows outside the defined ranges
CREATE TABLE "WalletTransaction_default" PARTITION OF "WalletTransaction_partitioned"
    DEFAULT;

-- Indexes on the partitioned table (automatically propagate to partitions)
CREATE INDEX idx_wtx_part_walletid ON "WalletTransaction_partitioned" ("walletId", "createdAt" DESC);
CREATE INDEX idx_wtx_part_type ON "WalletTransaction_partitioned" ("type", "createdAt" DESC);
CREATE INDEX idx_wtx_part_status ON "WalletTransaction_partitioned" ("status", "createdAt" DESC);
CREATE INDEX idx_wtx_part_wallet_type ON "WalletTransaction_partitioned" ("walletId", "type", "createdAt" DESC);

-- BRIN on partitioned table (per-partition, very efficient)
CREATE INDEX idx_wtx_part_createdat_brin
    ON "WalletTransaction_partitioned" USING brin ("createdAt")
    WITH (pages_per_range = 32);

-- Unique constraint on txRef must be handled per-partition or globally
-- Using a unique index on the parent (requires NOT NULL on partition key)
-- txRef uniqueness enforced at application level for partitioned tables
CREATE UNIQUE INDEX idx_wtx_part_txref
    ON "WalletTransaction_partitioned" ("txRef", "createdAt");

-- ---------------------------------------------------------------
-- 6b. EscrowAuditLog — Monthly partitioning
-- ---------------------------------------------------------------

CREATE TABLE "EscrowAuditLog_partitioned" (
    "id"        TEXT NOT NULL,
    "escrowId"  TEXT NOT NULL,
    "action"    TEXT NOT NULL,
    "actor"     TEXT,
    "details"   TEXT,
    "metadata"  JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EscrowAuditLog_partitioned_pkey" PRIMARY KEY ("id", "createdAt")
) PARTITION BY RANGE ("createdAt");

-- Monthly partitions for EscrowAuditLog
CREATE TABLE "EscrowAuditLog_2025_01" PARTITION OF "EscrowAuditLog_partitioned"
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE "EscrowAuditLog_2025_02" PARTITION OF "EscrowAuditLog_partitioned"
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE "EscrowAuditLog_2025_03" PARTITION OF "EscrowAuditLog_partitioned"
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE "EscrowAuditLog_2025_04" PARTITION OF "EscrowAuditLog_partitioned"
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE "EscrowAuditLog_2025_05" PARTITION OF "EscrowAuditLog_partitioned"
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE "EscrowAuditLog_2025_06" PARTITION OF "EscrowAuditLog_partitioned"
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE "EscrowAuditLog_2025_07" PARTITION OF "EscrowAuditLog_partitioned"
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE "EscrowAuditLog_2025_08" PARTITION OF "EscrowAuditLog_partitioned"
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE "EscrowAuditLog_2025_09" PARTITION OF "EscrowAuditLog_partitioned"
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE "EscrowAuditLog_2025_10" PARTITION OF "EscrowAuditLog_partitioned"
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE "EscrowAuditLog_2025_11" PARTITION OF "EscrowAuditLog_partitioned"
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE "EscrowAuditLog_2025_12" PARTITION OF "EscrowAuditLog_partitioned"
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE TABLE "EscrowAuditLog_default" PARTITION OF "EscrowAuditLog_partitioned"
    DEFAULT;

-- Indexes on partitioned EscrowAuditLog
CREATE INDEX idx_eal_part_escrowid ON "EscrowAuditLog_partitioned" ("escrowId", "createdAt" DESC);
CREATE INDEX idx_eal_part_action ON "EscrowAuditLog_partitioned" ("action", "createdAt" DESC);
CREATE INDEX idx_eal_part_createdat_brin
    ON "EscrowAuditLog_partitioned" USING brin ("createdAt")
    WITH (pages_per_range = 32);

-- ---------------------------------------------------------------
-- 6c. PaymentTransaction — Monthly partitioning
-- ---------------------------------------------------------------

CREATE TABLE "PaymentTransaction_partitioned" (
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
    CONSTRAINT "PaymentTransaction_partitioned_pkey" PRIMARY KEY ("id", "createdAt")
) PARTITION BY RANGE ("createdAt");

-- Monthly partitions for PaymentTransaction
CREATE TABLE "PaymentTransaction_2025_01" PARTITION OF "PaymentTransaction_partitioned"
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE "PaymentTransaction_2025_02" PARTITION OF "PaymentTransaction_partitioned"
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE "PaymentTransaction_2025_03" PARTITION OF "PaymentTransaction_partitioned"
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE "PaymentTransaction_2025_04" PARTITION OF "PaymentTransaction_partitioned"
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE "PaymentTransaction_2025_05" PARTITION OF "PaymentTransaction_partitioned"
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE "PaymentTransaction_2025_06" PARTITION OF "PaymentTransaction_partitioned"
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE "PaymentTransaction_2025_07" PARTITION OF "PaymentTransaction_partitioned"
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE "PaymentTransaction_2025_08" PARTITION OF "PaymentTransaction_partitioned"
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE "PaymentTransaction_2025_09" PARTITION OF "PaymentTransaction_partitioned"
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE "PaymentTransaction_2025_10" PARTITION OF "PaymentTransaction_partitioned"
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE "PaymentTransaction_2025_11" PARTITION OF "PaymentTransaction_partitioned"
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE "PaymentTransaction_2025_12" PARTITION OF "PaymentTransaction_partitioned"
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE TABLE "PaymentTransaction_default" PARTITION OF "PaymentTransaction_partitioned"
    DEFAULT;

-- Indexes on partitioned PaymentTransaction
CREATE INDEX idx_ptx_part_intentid ON "PaymentTransaction_partitioned" ("intentId", "createdAt" DESC);
CREATE INDEX idx_ptx_part_status ON "PaymentTransaction_partitioned" ("status", "createdAt" DESC);
CREATE INDEX idx_ptx_part_provider ON "PaymentTransaction_partitioned" ("provider", "createdAt" DESC);
CREATE INDEX idx_ptx_part_createdat_brin
    ON "PaymentTransaction_partitioned" USING brin ("createdAt")
    WITH (pages_per_range = 32);
CREATE UNIQUE INDEX idx_ptx_part_txref
    ON "PaymentTransaction_partitioned" ("txRef", "createdAt");

-- ---------------------------------------------------------------
-- 6d. Notification — Monthly partitioning
-- ---------------------------------------------------------------

CREATE TABLE "Notification_partitioned" (
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
    CONSTRAINT "Notification_partitioned_pkey" PRIMARY KEY ("id", "createdAt")
) PARTITION BY RANGE ("createdAt");

-- Monthly partitions for Notification
CREATE TABLE "Notification_2025_01" PARTITION OF "Notification_partitioned"
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE "Notification_2025_02" PARTITION OF "Notification_partitioned"
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE "Notification_2025_03" PARTITION OF "Notification_partitioned"
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE "Notification_2025_04" PARTITION OF "Notification_partitioned"
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE "Notification_2025_05" PARTITION OF "Notification_partitioned"
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE "Notification_2025_06" PARTITION OF "Notification_partitioned"
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE "Notification_2025_07" PARTITION OF "Notification_partitioned"
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE "Notification_2025_08" PARTITION OF "Notification_partitioned"
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE "Notification_2025_09" PARTITION OF "Notification_partitioned"
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE "Notification_2025_10" PARTITION OF "Notification_partitioned"
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE "Notification_2025_11" PARTITION OF "Notification_partitioned"
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE "Notification_2025_12" PARTITION OF "Notification_partitioned"
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE TABLE "Notification_default" PARTITION OF "Notification_partitioned"
    DEFAULT;

-- Indexes on partitioned Notification
CREATE INDEX idx_notif_part_account ON "Notification_partitioned" ("accountId", "createdAt" DESC);
CREATE INDEX idx_notif_part_unread ON "Notification_partitioned" ("accountId", "createdAt" DESC)
    WHERE "isRead" = false;
CREATE INDEX idx_notif_part_type ON "Notification_partitioned" ("type", "createdAt" DESC);
CREATE INDEX idx_notif_part_category ON "Notification_partitioned" ("category", "createdAt" DESC);
CREATE INDEX idx_notif_part_createdat_brin
    ON "Notification_partitioned" USING brin ("createdAt")
    WITH (pages_per_range = 64);

-- ============================================================
-- 7. AUTO-PARTITION MANAGEMENT PROCEDURE
-- ============================================================
-- Call this monthly to pre-create future partitions.
-- In production, use pg_partman for fully automatic management.

CREATE OR REPLACE FUNCTION create_monthly_partitions(
    table_base TEXT,
    partition_col TEXT,
    months_ahead INT DEFAULT 3
) RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
    i INT;
BEGIN
    FOR i IN 0..months_ahead LOOP
        start_date := date_trunc('month', CURRENT_DATE + (i || ' months')::INTERVAL);
        end_date := start_date + INTERVAL '1 month';
        partition_name := table_base || '_' || to_char(start_date, 'YYYY_MM');
        
        -- Check if partition already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_class WHERE relname = partition_name
        ) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                partition_name, table_base, start_date, end_date
            );
            RAISE NOTICE 'Created partition: %', partition_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. PARTITION MAINTENANCE — Archive old partitions
-- ============================================================

CREATE OR REPLACE FUNCTION archive_old_partitions(
    table_base TEXT,
    months_to_keep INT DEFAULT 12
) RETURNS TABLE(partition_name TEXT, archived_at TIMESTAMP) AS $$
DECLARE
    cutoff_date DATE;
    partition_record RECORD;
BEGIN
    cutoff_date := date_trunc('month', CURRENT_DATE) - (months_to_keep || ' months')::INTERVAL;
    
    FOR partition_record IN
        SELECT c.relname AS partition_name
        FROM pg_inherits i
        JOIN pg_class c ON c.oid = i.inhrelid
        JOIN pg_class p ON p.oid = i.inhparent
        JOIN pg_namespace n ON n.oid = p.relnamespace
        WHERE p.relname = table_base
          AND c.relname != table_base || '_default'
        ORDER BY c.relname
    LOOP
        -- Extract date from partition name (format: tablename_YYYY_MM)
        BEGIN
            IF split_part(partition_record.partition_name, '_', 2) IS NOT NULL THEN
                DECLARE
                    part_date DATE;
                    part_year INT;
                    part_month INT;
                BEGIN
                    part_year := split_part(partition_record.partition_name, '_', array_length(string_to_array(partition_record.partition_name, '_'), 1))::INT;
                    part_month := split_part(partition_record.partition_name, '_', array_length(string_to_array(partition_record.partition_name, '_'), 1) + 1)::INT;
                    part_date := make_date(part_year, part_month, 1);
                    
                    IF part_date < cutoff_date THEN
                        -- Detach partition (move to cold storage separately)
                        EXECUTE format('ALTER TABLE %I DETACH PARTITION %I',
                            table_base, partition_record.partition_name);
                        
                        partition_name := partition_record.partition_name;
                        archived_at := CURRENT_TIMESTAMP;
                        RETURN NEXT;
                        
                        RAISE NOTICE 'Detached old partition: %', partition_record.partition_name;
                    END IF;
                END;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Skip partitions that don't match naming convention
            RAISE NOTICE 'Skipping partition % (cannot parse date)', partition_record.partition_name;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMIT;
