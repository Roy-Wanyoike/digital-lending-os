-- AlterTable: add tenantId to ComplianceRule
ALTER TABLE "ComplianceRule" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT "cms4ms0zp0000p0t5swn5scuk";
CREATE INDEX "ComplianceRule_tenantId_idx" ON "ComplianceRule"("tenantId");
