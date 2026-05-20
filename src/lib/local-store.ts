import bcrypt from "bcryptjs";
import crypto from "crypto";
import path from "path";
import { promises as fs } from "fs";

type LocalUser = {
  id: string;
  name: string | null;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

type LocalClient = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  sharePasswordHash: string | null;
  isPasswordProtected: boolean;
  createdAt: string;
  updatedAt: string;
};

type LocalUploadHistory = {
  id: string;
  clientId: string;
  fileName: string;
  rowCount: number;
  status: string;
  uploadedBy: string | null;
  createdAt: string;
};

type LocalCampaignReport = {
  id: string;
  clientId: string;
  date: string;
  platform: string;
  campaignName: string;
  adGroupName: string;
  adName: string;
  device: string | null;
  keyword: string | null;
  creativeName: string | null;
  landingPage: string | null;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  revenue: number;
  purchases: number | null;
  leads: number | null;
  memo: string | null;
  uploadId: string | null;
  createdAt: string;
  updatedAt: string;
};

type LocalAccessLog = {
  id: string;
  clientId: string;
  accessedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
};

export type LocalDb = {
  users: LocalUser[];
  clients: LocalClient[];
  uploads: LocalUploadHistory[];
  reports: LocalCampaignReport[];
  accessLogs: LocalAccessLog[];
};

const dataDir = path.join(process.cwd(), "data");
const dbFilePath = path.join(dataDir, "local-db.json");

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  return crypto.randomUUID();
}

async function createInitialDb(): Promise<LocalDb> {
  const timestamp = nowIso();
  const adminPasswordHash = await bcrypt.hash("admin1234", 10);
  const progressClientId = makeId();
  const sampleClientId = makeId();

  return {
    users: [
      {
        id: makeId(),
        name: "관리자",
        email: "admin@example.com",
        passwordHash: adminPasswordHash,
        role: "ADMIN",
        createdAt: timestamp,
        updatedAt: timestamp
      }
    ],
    clients: [
      {
        id: progressClientId,
        name: "Progress Media",
        slug: "progressmedia",
        logoUrl: "https://dummyimage.com/180x60/1d4ed8/ffffff&text=Progress",
        sharePasswordHash: null,
        isPasswordProtected: false,
        createdAt: timestamp,
        updatedAt: timestamp
      },
      {
        id: sampleClientId,
        name: "Sample Client",
        slug: "sample-client",
        logoUrl: "https://dummyimage.com/180x60/0f172a/ffffff&text=Sample",
        sharePasswordHash: null,
        isPasswordProtected: false,
        createdAt: timestamp,
        updatedAt: timestamp
      }
    ],
    uploads: [],
    reports: [],
    accessLogs: []
  };
}

function stripSeedData(db: LocalDb): LocalDb {
  const seedUploadIds = new Set(db.uploads.filter((upload) => upload.fileName === "seed-sample.csv").map((upload) => upload.id));
  return {
    ...db,
    uploads: db.uploads.filter((upload) => upload.fileName !== "seed-sample.csv"),
    reports: db.reports.filter((report) => report.uploadId !== null && !seedUploadIds.has(report.uploadId)),
    accessLogs: db.accessLogs
  };
}

function normalizeDb(raw: any): LocalDb {
  return {
    users: Array.isArray(raw?.users) ? raw.users : [],
    clients: Array.isArray(raw?.clients)
      ? raw.clients.map((client: any) => ({
          id: client.id,
          name: client.name,
          slug: client.slug,
          logoUrl: client.logoUrl ?? null,
          sharePasswordHash: client.sharePasswordHash ?? null,
          isPasswordProtected: Boolean(client.isPasswordProtected),
          createdAt: client.createdAt,
          updatedAt: client.updatedAt
        }))
      : [],
    uploads: Array.isArray(raw?.uploads) ? raw.uploads : [],
    reports: Array.isArray(raw?.reports) ? raw.reports : [],
    accessLogs: Array.isArray(raw?.accessLogs) ? raw.accessLogs : []
  };
}

async function ensureDbFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dbFilePath);
  } catch {
    const initial = await createInitialDb();
    await fs.writeFile(dbFilePath, JSON.stringify(initial, null, 2), "utf8");
  }
}

export async function readLocalDb(): Promise<LocalDb> {
  await ensureDbFile();
  const content = await fs.readFile(dbFilePath, "utf8");
  const db = stripSeedData(normalizeDb(JSON.parse(content)));
  await fs.writeFile(dbFilePath, JSON.stringify(db, null, 2), "utf8");
  return db;
}

export async function writeLocalDb(db: LocalDb) {
  await ensureDbFile();
  await fs.writeFile(dbFilePath, JSON.stringify(db, null, 2), "utf8");
}

export function makeLocalId() {
  return makeId();
}
