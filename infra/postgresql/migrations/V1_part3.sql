-- MODULE 3: AI SMART ESCROW

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

-- MODULE 4: GLOBAL PAYMENT ROUTER

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
