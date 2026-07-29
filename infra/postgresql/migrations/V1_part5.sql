-- MODULE 7: PAYMENT LINKS

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

-- MODULE 8: GLOBAL PAYMENT METHODS CATALOG

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

-- MODULE 9: MULTI-CURRENCY WALLET

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
