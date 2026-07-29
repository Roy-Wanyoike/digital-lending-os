-- MODULE 5: FINANCIAL DIGITAL TWIN

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

-- SHARED: INVOICE

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

-- MODULE 6: USERS & ROLES

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
