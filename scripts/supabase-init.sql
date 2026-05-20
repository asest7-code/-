-- Schema bootstrap for Supabase when Prisma cannot connect directly.
-- Safe for an empty project database.

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "sharePasswordHash" TEXT,
    "isPasswordProtected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdAccount" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "externalAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampaignReport" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "platform" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL,
    "adGroupName" TEXT NOT NULL,
    "adName" TEXT NOT NULL,
    "device" TEXT,
    "keyword" TEXT,
    "creativeName" TEXT,
    "landingPage" TEXT,
    "impressions" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "conversions" DOUBLE PRECISION NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,
    "purchases" DOUBLE PRECISION,
    "leads" DOUBLE PRECISION,
    "memo" TEXT,
    "uploadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UploadHistory" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UploadHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientAccessLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "ClientAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Client_slug_key" ON "Client"("slug");
CREATE INDEX "AdAccount_clientId_idx" ON "AdAccount"("clientId");
CREATE INDEX "CampaignReport_clientId_date_idx" ON "CampaignReport"("clientId", "date");
CREATE INDEX "CampaignReport_clientId_platform_idx" ON "CampaignReport"("clientId", "platform");
CREATE INDEX "CampaignReport_clientId_campaignName_idx" ON "CampaignReport"("clientId", "campaignName");
CREATE UNIQUE INDEX "CampaignReport_clientId_date_platform_campaignName_adGroupN_key" ON "CampaignReport"("clientId", "date", "platform", "campaignName", "adGroupName", "adName");
CREATE INDEX "UploadHistory_clientId_idx" ON "UploadHistory"("clientId");
CREATE INDEX "UploadHistory_createdAt_idx" ON "UploadHistory"("createdAt");
CREATE INDEX "ClientAccessLog_clientId_idx" ON "ClientAccessLog"("clientId");
CREATE INDEX "ClientAccessLog_accessedAt_idx" ON "ClientAccessLog"("accessedAt");

ALTER TABLE "AdAccount" ADD CONSTRAINT "AdAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignReport" ADD CONSTRAINT "CampaignReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignReport" ADD CONSTRAINT "CampaignReport_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "UploadHistory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UploadHistory" ADD CONSTRAINT "UploadHistory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UploadHistory" ADD CONSTRAINT "UploadHistory_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClientAccessLog" ADD CONSTRAINT "ClientAccessLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
