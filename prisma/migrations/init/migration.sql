-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "status" TEXT NOT NULL DEFAULT 'active',
    "maxBusinesses" INTEGER NOT NULL DEFAULT 5,
    "maxUsers" INTEGER NOT NULL DEFAULT 10,
    "features" TEXT NOT NULL DEFAULT '{}',
    "ownerEmail" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "tenantId" TEXT NOT NULL,
    "businessId" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "referralCode" TEXT,
    "referredBy" TEXT,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Account_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "registrationNo" TEXT,
    "taxId" TEXT,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "employeeCount" INTEGER,
    "annualRevenue" REAL,
    "description" TEXT,
    "logoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Business_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommercePassport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "passportHash" TEXT NOT NULL,
    "credentialLevel" TEXT NOT NULL DEFAULT 'basic',
    "kycStatus" TEXT NOT NULL DEFAULT 'not_started',
    "kycVerifiedAt" DATETIME,
    "amlStatus" TEXT NOT NULL DEFAULT 'not_started',
    "amlCheckedAt" DATETIME,
    "riskRating" TEXT NOT NULL DEFAULT 'medium',
    "lastAuditAt" DATETIME,
    "nextAuditDue" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommercePassport_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" DATETIME,
    "verifiedBy" TEXT,
    "rejectionReason" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Verification_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComplianceDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "passportId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "docName" TEXT NOT NULL,
    "docUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ComplianceDocument_passportId_fkey" FOREIGN KEY ("passportId") REFERENCES "CommercePassport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrustScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "overallScore" REAL NOT NULL DEFAULT 50.0,
    "paymentScore" REAL NOT NULL DEFAULT 50.0,
    "deliveryScore" REAL NOT NULL DEFAULT 50.0,
    "qualityScore" REAL NOT NULL DEFAULT 50.0,
    "communicationScore" REAL NOT NULL DEFAULT 50.0,
    "complianceScore" REAL NOT NULL DEFAULT 50.0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    "scoreVersion" INTEGER NOT NULL DEFAULT 1,
    "lastCalculated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrustScore_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BusinessRelationship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromBusinessId" TEXT NOT NULL,
    "toBusinessId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "trustLevel" REAL NOT NULL DEFAULT 50.0,
    "totalTxVolume" REAL NOT NULL DEFAULT 0,
    "totalTxCount" INTEGER NOT NULL DEFAULT 0,
    "firstTxDate" DATETIME,
    "lastTxDate" DATETIME,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BusinessRelationship_fromBusinessId_fkey" FOREIGN KEY ("fromBusinessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BusinessRelationship_toBusinessId_fkey" FOREIGN KEY ("toBusinessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReputationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trustScoreId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "scoreImpact" REAL NOT NULL DEFAULT 0,
    "description" TEXT,
    "sourceId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReputationEvent_trustScoreId_fkey" FOREIGN KEY ("trustScoreId") REFERENCES "TrustScore" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromBusinessId" TEXT NOT NULL,
    "toBusinessId" TEXT NOT NULL,
    "escrowId" TEXT,
    "rating" REAL NOT NULL,
    "paymentRating" REAL,
    "deliveryRating" REAL,
    "qualityRating" REAL,
    "communicationRating" REAL,
    "comment" TEXT,
    "response" TEXT,
    "respondedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Review_fromBusinessId_fkey" FOREIGN KEY ("fromBusinessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_toBusinessId_fkey" FOREIGN KEY ("toBusinessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EscrowTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "txRef" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "currentMilestone" INTEGER NOT NULL DEFAULT 0,
    "totalMilestones" INTEGER NOT NULL DEFAULT 1,
    "fundedAmount" REAL NOT NULL DEFAULT 0,
    "releasedAmount" REAL NOT NULL DEFAULT 0,
    "refundedAmount" REAL NOT NULL DEFAULT 0,
    "feeAmount" REAL NOT NULL DEFAULT 0,
    "feeCurrency" TEXT NOT NULL DEFAULT 'USD',
    "aiRiskScore" REAL,
    "aiRiskLevel" TEXT,
    "paymentIntentId" TEXT,
    "expiresAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "buyerWalletId" TEXT,
    "sellerWalletId" TEXT,
    "releasedAt" DATETIME,
    CONSTRAINT "EscrowTransaction_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EscrowTransaction_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EscrowMilestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escrowId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "evidence" TEXT,
    "releasedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EscrowMilestone_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "EscrowTransaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Disbursement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escrowId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "fromAccount" TEXT,
    "toAccount" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentRef" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Disbursement_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "EscrowTransaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escrowId" TEXT NOT NULL,
    "raisedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "resolvedAt" DATETIME,
    "aiRecommendation" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Dispute_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "EscrowTransaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EscrowAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escrowId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT,
    "details" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EscrowAuditLog_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "EscrowTransaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "intentRef" TEXT NOT NULL,
    "escrowId" TEXT,
    "fromBusinessId" TEXT NOT NULL,
    "toBusinessId" TEXT NOT NULL,
    "sourceAmount" REAL NOT NULL,
    "sourceCurrency" TEXT NOT NULL,
    "targetAmount" REAL NOT NULL,
    "targetCurrency" TEXT NOT NULL,
    "exchangeRate" REAL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "paymentMethod" TEXT,
    "routingProvider" TEXT,
    "routingScore" REAL,
    "estimatedFee" REAL,
    "actualFee" REAL,
    "estimatedTime" INTEGER,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentIntent_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "EscrowTransaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "intentId" TEXT NOT NULL,
    "txRef" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerTxId" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "fromAddress" TEXT,
    "toAddress" TEXT,
    "metadata" TEXT,
    "settledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentTransaction_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "PaymentIntent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CurrencyRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "provider" TEXT NOT NULL,
    "source" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT,
    "label" TEXT,
    "identifier" TEXT,
    "currency" TEXT,
    "country" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentMethod_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialDigitalTwin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "healthScore" REAL NOT NULL DEFAULT 50.0,
    "cashFlowHealth" REAL NOT NULL DEFAULT 50.0,
    "riskAppetite" TEXT NOT NULL DEFAULT 'moderate',
    "creditWorthiness" REAL NOT NULL DEFAULT 50.0,
    "liquidityScore" REAL NOT NULL DEFAULT 50.0,
    "growthTrajectory" TEXT NOT NULL DEFAULT 'stable',
    "aiModelVersion" TEXT NOT NULL DEFAULT 'v1.0',
    "lastSyncAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinancialDigitalTwin_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "twinId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodDate" TEXT NOT NULL,
    "revenue" REAL,
    "expenses" REAL,
    "netIncome" REAL,
    "accountsReceivable" REAL,
    "accountsPayable" REAL,
    "totalAssets" REAL,
    "totalLiabilities" REAL,
    "cashBalance" REAL,
    "transactionCount" INTEGER,
    "averageTransactionValue" REAL,
    "paymentSuccessRate" REAL,
    "disputeRate" REAL,
    "customerCount" INTEGER,
    "supplierCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialMetric_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "FinancialDigitalTwin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialPrediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "twinId" TEXT NOT NULL,
    "predictionType" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "predictedValue" REAL NOT NULL,
    "confidence" REAL NOT NULL,
    "lowerBound" REAL,
    "upperBound" REAL,
    "model" TEXT NOT NULL DEFAULT 'ensemble',
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialPrediction_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "FinancialDigitalTwin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "twinId" TEXT NOT NULL,
    "snapshotType" TEXT NOT NULL,
    "healthScore" REAL NOT NULL,
    "cashFlowHealth" REAL NOT NULL,
    "creditWorthiness" REAL NOT NULL,
    "liquidityScore" REAL NOT NULL,
    "topRiskFactors" TEXT,
    "topOpportunities" TEXT,
    "aiSummary" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialSnapshot_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "FinancialDigitalTwin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceRef" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "escrowId" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "dueDate" DATETIME,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "items" TEXT,
    "notes" TEXT,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "subscriptionId" TEXT,
    CONSTRAINT "Invoice_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "businessId" TEXT,
    "tenantId" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "linkRef" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "allowedMethods" TEXT NOT NULL DEFAULT '[]',
    "allowedCountries" TEXT,
    "maxPayments" INTEGER NOT NULL DEFAULT 1,
    "paymentCount" INTEGER NOT NULL DEFAULT 0,
    "totalCollected" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" DATETIME,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    CONSTRAINT "PaymentLink_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentLinkPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentLinkId" TEXT NOT NULL,
    "payerName" TEXT,
    "payerEmail" TEXT,
    "payerCountry" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "provider" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "feeAmount" REAL,
    "netAmount" REAL,
    "providerTxId" TEXT,
    "metadata" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentLinkPayment_paymentLinkId_fkey" FOREIGN KEY ("paymentLinkId") REFERENCES "PaymentLink" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GlobalPaymentMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "methodCode" TEXT NOT NULL,
    "methodName" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "countries" TEXT NOT NULL,
    "currencies" TEXT NOT NULL,
    "minAmount" REAL,
    "maxAmount" REAL,
    "feePercent" REAL NOT NULL DEFAULT 0,
    "fixedFee" REAL NOT NULL DEFAULT 0,
    "settlementTime" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "availableBalance" REAL NOT NULL DEFAULT 0,
    "pendingBalance" REAL NOT NULL DEFAULT 0,
    "frozenBalance" REAL NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "label" TEXT,
    CONSTRAINT "Wallet_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "txRef" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "balanceBefore" REAL NOT NULL,
    "balanceAfter" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "counterpartyId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "depositRef" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "provider" TEXT,
    "providerTxId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "bankName" TEXT,
    "bankRef" TEXT,
    "cardLast4" TEXT,
    "notes" TEXT,
    "completedAt" DATETIME,
    "failedReason" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Deposit_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "withdrawalRef" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "provider" TEXT,
    "providerTxId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "bankName" TEXT,
    "bankAccount" TEXT,
    "bankCode" TEXT,
    "recipientName" TEXT,
    "feeAmount" REAL NOT NULL DEFAULT 0,
    "netAmount" REAL,
    "notes" TEXT,
    "completedAt" DATETIME,
    "failedReason" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Withdrawal_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CryptoWithdrawal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "withdrawalRef" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "cryptoAmount" REAL,
    "currency" TEXT NOT NULL,
    "cryptoCurrency" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "exchangeRate" REAL,
    "networkFee" REAL NOT NULL DEFAULT 0,
    "processingFee" REAL NOT NULL DEFAULT 0,
    "gasPrice" TEXT,
    "txHash" TEXT,
    "explorerUrl" TEXT,
    "notes" TEXT,
    "completedAt" DATETIME,
    "failedReason" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CryptoWithdrawal_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CurrencyConversion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversionRef" TEXT NOT NULL,
    "fromWalletId" TEXT NOT NULL,
    "toWalletId" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "fromAmount" REAL NOT NULL,
    "toAmount" REAL NOT NULL,
    "exchangeRate" REAL NOT NULL,
    "feePercent" REAL NOT NULL DEFAULT 0.5,
    "feeAmount" REAL NOT NULL,
    "netAmount" REAL NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'internal',
    "status" TEXT NOT NULL DEFAULT 'completed',
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CurrencyConversion_fromWalletId_fkey" FOREIGN KEY ("fromWalletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CurrencyConversion_toWalletId_fkey" FOREIGN KEY ("toWalletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FraudAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alertRef" TEXT NOT NULL,
    "businessId" TEXT,
    "relatedType" TEXT NOT NULL,
    "relatedId" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "fraudType" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "recommendation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolvedBy" TEXT,
    "resolvedAt" DATETIME,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FraudAlert_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FraudRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "condition" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "lastTriggeredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BusinessMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seekerId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "matchType" TEXT NOT NULL,
    "matchScore" REAL NOT NULL,
    "reasons" TEXT,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "seekerResponse" TEXT,
    "candidateResponse" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BusinessMatch_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BusinessMatch_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollectionCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseRef" TEXT NOT NULL,
    "invoiceId" TEXT,
    "businessId" TEXT NOT NULL,
    "debtorId" TEXT NOT NULL,
    "originalAmount" REAL NOT NULL,
    "outstandingAmount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "agingBucket" TEXT NOT NULL DEFAULT 'current',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'active',
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" DATETIME,
    "nextReminderDue" DATETIME,
    "aiStrategy" TEXT,
    "resolution" TEXT,
    "resolvedAt" DATETIME,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CollectionCase_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollectionCase_debtorId_fkey" FOREIGN KEY ("debtorId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollectionReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response" TEXT,
    "respondedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionReminder_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CollectionCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComplianceRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleType" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggeredCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ComplianceScreening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT,
    "transactionType" TEXT,
    "transactionId" TEXT,
    "screeningType" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "details" TEXT,
    "matchedLists" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ComplianceScreening_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReferralBonus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bonusRef" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "depositId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "bonusAmount" REAL NOT NULL DEFAULT 100.00,
    "bonusCurrency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'credited',
    "creditedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReferralBonus_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReferralBonus_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "category" TEXT NOT NULL DEFAULT 'general',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "actionUrl" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interval" TEXT NOT NULL DEFAULT 'monthly',
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "trialEndsAt" DATETIME,
    "currentPeriodStart" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" DATETIME NOT NULL,
    "cancelledAt" DATETIME,
    "cancellationReason" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Account_referralCode_key" ON "Account"("referralCode");

-- CreateIndex
CREATE INDEX "Account_tenantId_idx" ON "Account"("tenantId");

-- CreateIndex
CREATE INDEX "Account_email_idx" ON "Account"("email");

-- CreateIndex
CREATE INDEX "Account_role_idx" ON "Account"("role");

-- CreateIndex
CREATE INDEX "Account_isActive_idx" ON "Account"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Account_tenantId_email_key" ON "Account"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Business_tenantId_idx" ON "Business"("tenantId");

-- CreateIndex
CREATE INDEX "Business_country_idx" ON "Business"("country");

-- CreateIndex
CREATE INDEX "Business_industry_idx" ON "Business"("industry");

-- CreateIndex
CREATE INDEX "Business_status_idx" ON "Business"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CommercePassport_businessId_key" ON "CommercePassport"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercePassport_passportHash_key" ON "CommercePassport"("passportHash");

-- CreateIndex
CREATE INDEX "CommercePassport_credentialLevel_idx" ON "CommercePassport"("credentialLevel");

-- CreateIndex
CREATE INDEX "CommercePassport_riskRating_idx" ON "CommercePassport"("riskRating");

-- CreateIndex
CREATE INDEX "Verification_type_idx" ON "Verification"("type");

-- CreateIndex
CREATE INDEX "Verification_status_idx" ON "Verification"("status");

-- CreateIndex
CREATE INDEX "ComplianceDocument_docType_idx" ON "ComplianceDocument"("docType");

-- CreateIndex
CREATE INDEX "ComplianceDocument_status_idx" ON "ComplianceDocument"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TrustScore_businessId_key" ON "TrustScore"("businessId");

-- CreateIndex
CREATE INDEX "TrustScore_overallScore_idx" ON "TrustScore"("overallScore");

-- CreateIndex
CREATE INDEX "BusinessRelationship_type_idx" ON "BusinessRelationship"("type");

-- CreateIndex
CREATE INDEX "BusinessRelationship_trustLevel_idx" ON "BusinessRelationship"("trustLevel");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessRelationship_fromBusinessId_toBusinessId_type_key" ON "BusinessRelationship"("fromBusinessId", "toBusinessId", "type");

-- CreateIndex
CREATE INDEX "ReputationEvent_eventType_idx" ON "ReputationEvent"("eventType");

-- CreateIndex
CREATE INDEX "ReputationEvent_createdAt_idx" ON "ReputationEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Review_toBusinessId_idx" ON "Review"("toBusinessId");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- CreateIndex
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowTransaction_txRef_key" ON "EscrowTransaction"("txRef");

-- CreateIndex
CREATE INDEX "EscrowTransaction_status_idx" ON "EscrowTransaction"("status");

-- CreateIndex
CREATE INDEX "EscrowTransaction_buyerId_idx" ON "EscrowTransaction"("buyerId");

-- CreateIndex
CREATE INDEX "EscrowTransaction_sellerId_idx" ON "EscrowTransaction"("sellerId");

-- CreateIndex
CREATE INDEX "EscrowTransaction_currency_idx" ON "EscrowTransaction"("currency");

-- CreateIndex
CREATE INDEX "EscrowTransaction_createdAt_idx" ON "EscrowTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "EscrowMilestone_escrowId_idx" ON "EscrowMilestone"("escrowId");

-- CreateIndex
CREATE INDEX "EscrowMilestone_status_idx" ON "EscrowMilestone"("status");

-- CreateIndex
CREATE INDEX "Disbursement_escrowId_idx" ON "Disbursement"("escrowId");

-- CreateIndex
CREATE INDEX "Disbursement_status_idx" ON "Disbursement"("status");

-- CreateIndex
CREATE INDEX "Dispute_escrowId_idx" ON "Dispute"("escrowId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "EscrowAuditLog_escrowId_idx" ON "EscrowAuditLog"("escrowId");

-- CreateIndex
CREATE INDEX "EscrowAuditLog_action_idx" ON "EscrowAuditLog"("action");

-- CreateIndex
CREATE INDEX "EscrowAuditLog_createdAt_idx" ON "EscrowAuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_intentRef_key" ON "PaymentIntent"("intentRef");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_escrowId_key" ON "PaymentIntent"("escrowId");

-- CreateIndex
CREATE INDEX "PaymentIntent_status_idx" ON "PaymentIntent"("status");

-- CreateIndex
CREATE INDEX "PaymentIntent_fromBusinessId_idx" ON "PaymentIntent"("fromBusinessId");

-- CreateIndex
CREATE INDEX "PaymentIntent_toBusinessId_idx" ON "PaymentIntent"("toBusinessId");

-- CreateIndex
CREATE INDEX "PaymentIntent_paymentMethod_idx" ON "PaymentIntent"("paymentMethod");

-- CreateIndex
CREATE INDEX "PaymentIntent_createdAt_idx" ON "PaymentIntent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_txRef_key" ON "PaymentTransaction"("txRef");

-- CreateIndex
CREATE INDEX "PaymentTransaction_intentId_idx" ON "PaymentTransaction"("intentId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");

-- CreateIndex
CREATE INDEX "PaymentTransaction_provider_idx" ON "PaymentTransaction"("provider");

-- CreateIndex
CREATE INDEX "PaymentTransaction_createdAt_idx" ON "PaymentTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "CurrencyRate_fromCurrency_toCurrency_idx" ON "CurrencyRate"("fromCurrency", "toCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "CurrencyRate_fromCurrency_toCurrency_provider_createdAt_key" ON "CurrencyRate"("fromCurrency", "toCurrency", "provider", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentMethod_businessId_idx" ON "PaymentMethod"("businessId");

-- CreateIndex
CREATE INDEX "PaymentMethod_type_idx" ON "PaymentMethod"("type");

-- CreateIndex
CREATE INDEX "PaymentMethod_status_idx" ON "PaymentMethod"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialDigitalTwin_businessId_key" ON "FinancialDigitalTwin"("businessId");

-- CreateIndex
CREATE INDEX "FinancialDigitalTwin_healthScore_idx" ON "FinancialDigitalTwin"("healthScore");

-- CreateIndex
CREATE INDEX "FinancialDigitalTwin_growthTrajectory_idx" ON "FinancialDigitalTwin"("growthTrajectory");

-- CreateIndex
CREATE INDEX "FinancialMetric_twinId_idx" ON "FinancialMetric"("twinId");

-- CreateIndex
CREATE INDEX "FinancialMetric_period_idx" ON "FinancialMetric"("period");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialMetric_twinId_period_periodDate_key" ON "FinancialMetric"("twinId", "period", "periodDate");

-- CreateIndex
CREATE INDEX "FinancialPrediction_twinId_idx" ON "FinancialPrediction"("twinId");

-- CreateIndex
CREATE INDEX "FinancialPrediction_predictionType_idx" ON "FinancialPrediction"("predictionType");

-- CreateIndex
CREATE INDEX "FinancialSnapshot_twinId_idx" ON "FinancialSnapshot"("twinId");

-- CreateIndex
CREATE INDEX "FinancialSnapshot_snapshotType_idx" ON "FinancialSnapshot"("snapshotType");

-- CreateIndex
CREATE INDEX "FinancialSnapshot_createdAt_idx" ON "FinancialSnapshot"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceRef_key" ON "Invoice"("invoiceRef");

-- CreateIndex
CREATE INDEX "Invoice_senderId_idx" ON "Invoice"("senderId");

-- CreateIndex
CREATE INDEX "Invoice_receiverId_idx" ON "Invoice"("receiverId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_businessId_idx" ON "User"("businessId");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLink_linkRef_key" ON "PaymentLink"("linkRef");

-- CreateIndex
CREATE INDEX "PaymentLink_businessId_idx" ON "PaymentLink"("businessId");

-- CreateIndex
CREATE INDEX "PaymentLink_status_idx" ON "PaymentLink"("status");

-- CreateIndex
CREATE INDEX "PaymentLink_currency_idx" ON "PaymentLink"("currency");

-- CreateIndex
CREATE INDEX "PaymentLink_createdAt_idx" ON "PaymentLink"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentLinkPayment_paymentLinkId_idx" ON "PaymentLinkPayment"("paymentLinkId");

-- CreateIndex
CREATE INDEX "PaymentLinkPayment_status_idx" ON "PaymentLinkPayment"("status");

-- CreateIndex
CREATE INDEX "PaymentLinkPayment_payerCountry_idx" ON "PaymentLinkPayment"("payerCountry");

-- CreateIndex
CREATE INDEX "PaymentLinkPayment_paymentMethod_idx" ON "PaymentLinkPayment"("paymentMethod");

-- CreateIndex
CREATE INDEX "PaymentLinkPayment_createdAt_idx" ON "PaymentLinkPayment"("createdAt");

-- CreateIndex
CREATE INDEX "GlobalPaymentMethod_type_idx" ON "GlobalPaymentMethod"("type");

-- CreateIndex
CREATE INDEX "GlobalPaymentMethod_isActive_idx" ON "GlobalPaymentMethod"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalPaymentMethod_methodCode_key" ON "GlobalPaymentMethod"("methodCode");

-- CreateIndex
CREATE INDEX "Wallet_businessId_idx" ON "Wallet"("businessId");

-- CreateIndex
CREATE INDEX "Wallet_currency_idx" ON "Wallet"("currency");

-- CreateIndex
CREATE INDEX "Wallet_status_idx" ON "Wallet"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_businessId_currency_key" ON "Wallet"("businessId", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_txRef_key" ON "WalletTransaction"("txRef");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");

-- CreateIndex
CREATE INDEX "WalletTransaction_referenceType_idx" ON "WalletTransaction"("referenceType");

-- CreateIndex
CREATE INDEX "WalletTransaction_status_idx" ON "WalletTransaction"("status");

-- CreateIndex
CREATE INDEX "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_depositRef_key" ON "Deposit"("depositRef");

-- CreateIndex
CREATE INDEX "Deposit_walletId_idx" ON "Deposit"("walletId");

-- CreateIndex
CREATE INDEX "Deposit_status_idx" ON "Deposit"("status");

-- CreateIndex
CREATE INDEX "Deposit_paymentMethod_idx" ON "Deposit"("paymentMethod");

-- CreateIndex
CREATE INDEX "Deposit_provider_idx" ON "Deposit"("provider");

-- CreateIndex
CREATE INDEX "Deposit_createdAt_idx" ON "Deposit"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Withdrawal_withdrawalRef_key" ON "Withdrawal"("withdrawalRef");

-- CreateIndex
CREATE INDEX "Withdrawal_walletId_idx" ON "Withdrawal"("walletId");

-- CreateIndex
CREATE INDEX "Withdrawal_status_idx" ON "Withdrawal"("status");

-- CreateIndex
CREATE INDEX "Withdrawal_paymentMethod_idx" ON "Withdrawal"("paymentMethod");

-- CreateIndex
CREATE INDEX "Withdrawal_createdAt_idx" ON "Withdrawal"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoWithdrawal_withdrawalRef_key" ON "CryptoWithdrawal"("withdrawalRef");

-- CreateIndex
CREATE INDEX "CryptoWithdrawal_walletId_idx" ON "CryptoWithdrawal"("walletId");

-- CreateIndex
CREATE INDEX "CryptoWithdrawal_status_idx" ON "CryptoWithdrawal"("status");

-- CreateIndex
CREATE INDEX "CryptoWithdrawal_cryptoCurrency_idx" ON "CryptoWithdrawal"("cryptoCurrency");

-- CreateIndex
CREATE INDEX "CryptoWithdrawal_network_idx" ON "CryptoWithdrawal"("network");

-- CreateIndex
CREATE INDEX "CryptoWithdrawal_createdAt_idx" ON "CryptoWithdrawal"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CurrencyConversion_conversionRef_key" ON "CurrencyConversion"("conversionRef");

-- CreateIndex
CREATE INDEX "CurrencyConversion_fromWalletId_idx" ON "CurrencyConversion"("fromWalletId");

-- CreateIndex
CREATE INDEX "CurrencyConversion_toWalletId_idx" ON "CurrencyConversion"("toWalletId");

-- CreateIndex
CREATE INDEX "CurrencyConversion_fromCurrency_toCurrency_idx" ON "CurrencyConversion"("fromCurrency", "toCurrency");

-- CreateIndex
CREATE INDEX "CurrencyConversion_status_idx" ON "CurrencyConversion"("status");

-- CreateIndex
CREATE INDEX "CurrencyConversion_createdAt_idx" ON "CurrencyConversion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FraudAlert_alertRef_key" ON "FraudAlert"("alertRef");

-- CreateIndex
CREATE INDEX "FraudAlert_businessId_idx" ON "FraudAlert"("businessId");

-- CreateIndex
CREATE INDEX "FraudAlert_severity_idx" ON "FraudAlert"("severity");

-- CreateIndex
CREATE INDEX "FraudAlert_fraudType_idx" ON "FraudAlert"("fraudType");

-- CreateIndex
CREATE INDEX "FraudAlert_status_idx" ON "FraudAlert"("status");

-- CreateIndex
CREATE INDEX "FraudAlert_score_idx" ON "FraudAlert"("score");

-- CreateIndex
CREATE INDEX "FraudAlert_createdAt_idx" ON "FraudAlert"("createdAt");

-- CreateIndex
CREATE INDEX "FraudRule_isActive_idx" ON "FraudRule"("isActive");

-- CreateIndex
CREATE INDEX "FraudRule_severity_idx" ON "FraudRule"("severity");

-- CreateIndex
CREATE INDEX "BusinessMatch_seekerId_idx" ON "BusinessMatch"("seekerId");

-- CreateIndex
CREATE INDEX "BusinessMatch_candidateId_idx" ON "BusinessMatch"("candidateId");

-- CreateIndex
CREATE INDEX "BusinessMatch_matchScore_idx" ON "BusinessMatch"("matchScore");

-- CreateIndex
CREATE INDEX "BusinessMatch_status_idx" ON "BusinessMatch"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessMatch_seekerId_candidateId_matchType_key" ON "BusinessMatch"("seekerId", "candidateId", "matchType");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionCase_caseRef_key" ON "CollectionCase"("caseRef");

-- CreateIndex
CREATE INDEX "CollectionCase_businessId_idx" ON "CollectionCase"("businessId");

-- CreateIndex
CREATE INDEX "CollectionCase_debtorId_idx" ON "CollectionCase"("debtorId");

-- CreateIndex
CREATE INDEX "CollectionCase_agingBucket_idx" ON "CollectionCase"("agingBucket");

-- CreateIndex
CREATE INDEX "CollectionCase_priority_idx" ON "CollectionCase"("priority");

-- CreateIndex
CREATE INDEX "CollectionCase_status_idx" ON "CollectionCase"("status");

-- CreateIndex
CREATE INDEX "CollectionReminder_caseId_idx" ON "CollectionReminder"("caseId");

-- CreateIndex
CREATE INDEX "CollectionReminder_channel_idx" ON "CollectionReminder"("channel");

-- CreateIndex
CREATE INDEX "CollectionReminder_status_idx" ON "CollectionReminder"("status");

-- CreateIndex
CREATE INDEX "ComplianceRule_ruleType_idx" ON "ComplianceRule"("ruleType");

-- CreateIndex
CREATE INDEX "ComplianceRule_isActive_idx" ON "ComplianceRule"("isActive");

-- CreateIndex
CREATE INDEX "ComplianceRule_severity_idx" ON "ComplianceRule"("severity");

-- CreateIndex
CREATE INDEX "ComplianceScreening_businessId_idx" ON "ComplianceScreening"("businessId");

-- CreateIndex
CREATE INDEX "ComplianceScreening_screeningType_idx" ON "ComplianceScreening"("screeningType");

-- CreateIndex
CREATE INDEX "ComplianceScreening_result_idx" ON "ComplianceScreening"("result");

-- CreateIndex
CREATE INDEX "ComplianceScreening_riskLevel_idx" ON "ComplianceScreening"("riskLevel");

-- CreateIndex
CREATE INDEX "ComplianceScreening_status_idx" ON "ComplianceScreening"("status");

-- CreateIndex
CREATE INDEX "ComplianceScreening_createdAt_idx" ON "ComplianceScreening"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralBonus_bonusRef_key" ON "ReferralBonus"("bonusRef");

-- CreateIndex
CREATE INDEX "ReferralBonus_referrerId_idx" ON "ReferralBonus"("referrerId");

-- CreateIndex
CREATE INDEX "ReferralBonus_refereeId_idx" ON "ReferralBonus"("refereeId");

-- CreateIndex
CREATE INDEX "ReferralBonus_status_idx" ON "ReferralBonus"("status");

-- CreateIndex
CREATE INDEX "ReferralBonus_creditedAt_idx" ON "ReferralBonus"("creditedAt");

-- CreateIndex
CREATE INDEX "Notification_accountId_idx" ON "Notification"("accountId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_category_idx" ON "Notification"("category");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Subscription_businessId_idx" ON "Subscription"("businessId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_planName_idx" ON "Subscription"("planName");

-- CreateIndex
CREATE INDEX "Subscription_interval_idx" ON "Subscription"("interval");

-- CreateIndex
CREATE INDEX "Subscription_currentPeriodEnd_idx" ON "Subscription"("currentPeriodEnd");

