-- ============================================================
-- 3. TABLES
-- ============================================================

-- MODULE 0: MULTI-TENANCY

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
    "ownerName"    TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
    "id"                 TEXT NOT NULL,
    "email"              CITEXT NOT NULL,
    "passwordHash"       TEXT NOT NULL,
    "name"               TEXT NOT NULL,
    "role"               "AccountRole" NOT NULL DEFAULT 'admin',
    "tenantId"           TEXT NOT NULL,
    "businessId"         TEXT,
    "avatarUrl"          TEXT,
    "isActive"           BOOLEAN NOT NULL DEFAULT TRUE,
    "lastLoginAt"        TIMESTAMP(3),
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,
    "referralCode"       TEXT,
    "referredBy"         TEXT,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
    "twoFactorEnabled"   BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- MODULE 1: COMMERCE PASSPORT

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

-- MODULE 2: TRUST GRAPH

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
