import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const dbPath = join(process.cwd(), "prisma", "dev.db");
mkdirSync(dirname(dbPath), { recursive: true });
rmSync(dbPath, { force: true });

const db = new DatabaseSync(dbPath);
db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'ADMIN',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Client" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "managerName" TEXT NOT NULL,
  "logoUrl" TEXT,
  "sharePasswordHash" TEXT,
  "isPasswordProtected" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Client_slug_key" ON "Client"("slug");

CREATE TABLE "AdAccount" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "accountName" TEXT NOT NULL,
  "externalAccountId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AdAccount_clientId_idx" ON "AdAccount"("clientId");

CREATE TABLE "UploadHistory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "rowCount" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "uploadedBy" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UploadHistory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UploadHistory_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "UploadHistory_clientId_idx" ON "UploadHistory"("clientId");
CREATE INDEX "UploadHistory_createdAt_idx" ON "UploadHistory"("createdAt");

CREATE TABLE "CampaignReport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "date" DATETIME NOT NULL,
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
  "cost" REAL NOT NULL,
  "conversions" REAL NOT NULL,
  "revenue" REAL NOT NULL,
  "purchases" REAL,
  "leads" REAL,
  "memo" TEXT,
  "uploadId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CampaignReport_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "UploadHistory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CampaignReport_clientId_date_platform_campaignName_adGroupName_adName_key" ON "CampaignReport"("clientId", "date", "platform", "campaignName", "adGroupName", "adName");
CREATE INDEX "CampaignReport_clientId_date_idx" ON "CampaignReport"("clientId", "date");
CREATE INDEX "CampaignReport_clientId_platform_idx" ON "CampaignReport"("clientId", "platform");
CREATE INDEX "CampaignReport_clientId_campaignName_idx" ON "CampaignReport"("clientId", "campaignName");
`);
db.close();

console.log(`Initialized ${dbPath}`);
