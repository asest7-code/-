import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { makeLocalId, readLocalDb, writeLocalDb } from "@/lib/local-store";
import type { ReportRow } from "@/types/dashboard";

type ClientInput = {
  name: string;
  slug: string;
  logoUrl: string | null;
  isPasswordProtected: boolean;
  sharePassword?: string;
};

type ReportUpdateInput = {
  date: string;
  platform: string;
  campaignName: string;
  adGroupName: string;
  adName: string;
  device?: string | null;
  keyword?: string | null;
  creativeName?: string | null;
  landingPage?: string | null;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  revenue: number;
  purchases?: number | null;
  leads?: number | null;
  memo?: string | null;
};

let prismaAvailablePromise: Promise<boolean> | null = null;
const REPORT_UPSERT_BATCH_SIZE = 500;

function isVercelRuntime() {
  return Boolean(process.env.VERCEL);
}

async function canUsePrisma() {
  if (!prismaAvailablePromise) {
    prismaAvailablePromise = prisma
      .$connect()
      .then(async () => {
        await prisma.$disconnect();
        return true;
      })
      .catch((error) => {
        console.error("[data-service] Prisma connectivity check failed", error);
        return false;
      });
  }
  return prismaAvailablePromise;
}

function toDateOnly(value: Date | string) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function makeReportCompositeKey(row: Pick<ReportRow, "date" | "platform" | "campaignName" | "adGroupName" | "adName">) {
  return [row.date, row.platform, row.campaignName, row.adGroupName, row.adName].join("::");
}

function mergeDuplicateReportRows(rows: ReportRow[]) {
  const merged = new Map<string, ReportRow>();

  for (const row of rows) {
    const key = makeReportCompositeKey(row);
    const current = merged.get(key);

    if (!current) {
      merged.set(key, { ...row });
      continue;
    }

    merged.set(key, {
      ...current,
      device: current.device ?? row.device ?? null,
      keyword: current.keyword ?? row.keyword ?? null,
      creativeName: current.creativeName ?? row.creativeName ?? null,
      landingPage: current.landingPage ?? row.landingPage ?? null,
      memo: current.memo ?? row.memo ?? null,
      impressions: current.impressions + row.impressions,
      clicks: current.clicks + row.clicks,
      cost: current.cost + row.cost,
      conversions: current.conversions + row.conversions,
      revenue: current.revenue + row.revenue,
      purchases: (current.purchases ?? 0) + (row.purchases ?? 0),
      leads: (current.leads ?? 0) + (row.leads ?? 0)
    });
  }

  return [...merged.values()];
}

export async function getStorageMode() {
  return (await canUsePrisma()) ? "prisma" : "local";
}

export async function getUserByEmail(email: string) {
  const usePrisma = await canUsePrisma();
  console.info("[data-service] getUserByEmail mode", { email, usePrisma, vercel: Boolean(process.env.VERCEL) });

  if (usePrisma) {
    return prisma.user.findUnique({ where: { email } });
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }
  const db = await readLocalDb();
  return db.users.find((user) => user.email === email) ?? null;
}

export async function getClientBySlug(slug: string) {
  if (await canUsePrisma()) {
    return prisma.client.findUnique({ where: { slug } });
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }
  const db = await readLocalDb();
  return db.clients.find((client) => client.slug === slug) ?? null;
}

export async function getClientById(id: string) {
  if (await canUsePrisma()) {
    return prisma.client.findUnique({ where: { id } });
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }
  const db = await readLocalDb();
  return db.clients.find((client) => client.id === id) ?? null;
}

export async function listClients() {
  if (await canUsePrisma()) {
    return prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { campaignReports: true, uploadHistories: true } } }
    });
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }
  const db = await readLocalDb();
  return db.clients
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((client) => ({
      ...client,
      _count: {
        campaignReports: db.reports.filter((report) => report.clientId === client.id).length,
        uploadHistories: db.uploads.filter((upload) => upload.clientId === client.id).length
      }
    }));
}

export async function createClient(input: ClientInput) {
  const sharePasswordHash = input.isPasswordProtected && input.sharePassword ? await bcrypt.hash(input.sharePassword, 10) : null;
  if (await canUsePrisma()) {
    return prisma.client.create({
      data: {
        name: input.name,
        slug: input.slug,
        logoUrl: input.logoUrl,
        isPasswordProtected: input.isPasswordProtected,
        sharePasswordHash
      }
    });
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }

  const db = await readLocalDb();
  if (db.clients.some((client) => client.slug === input.slug)) {
    throw new Error("Slug already exists.");
  }
  const timestamp = new Date().toISOString();
  const client = {
    id: makeLocalId(),
    name: input.name,
    slug: input.slug,
    logoUrl: input.logoUrl,
    sharePasswordHash,
    isPasswordProtected: input.isPasswordProtected,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  db.clients.push(client);
  await writeLocalDb(db);
  return client;
}

export async function updateClient(id: string, input: ClientInput) {
  const nextSharePasswordHash = input.isPasswordProtected && input.sharePassword ? await bcrypt.hash(input.sharePassword, 10) : undefined;
  if (await canUsePrisma()) {
    const data: Prisma.ClientUpdateInput = {
      name: input.name,
      slug: input.slug,
      logoUrl: input.logoUrl,
      isPasswordProtected: input.isPasswordProtected
    };
    if (!input.isPasswordProtected) data.sharePasswordHash = null;
    if (nextSharePasswordHash) data.sharePasswordHash = nextSharePasswordHash;
    return prisma.client.update({ where: { id }, data });
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }

  const db = await readLocalDb();
  const index = db.clients.findIndex((client) => client.id === id);
  if (index === -1) throw new Error("Client not found.");
  if (db.clients.some((client, clientIndex) => client.slug === input.slug && clientIndex !== index)) {
    throw new Error("Slug already exists.");
  }
  const current = db.clients[index];
  db.clients[index] = {
    ...current,
    name: input.name,
    slug: input.slug,
    logoUrl: input.logoUrl,
    isPasswordProtected: input.isPasswordProtected,
    sharePasswordHash: !input.isPasswordProtected ? null : nextSharePasswordHash ?? current.sharePasswordHash,
    updatedAt: new Date().toISOString()
  };
  await writeLocalDb(db);
  return db.clients[index];
}

export async function deleteClient(id: string) {
  if (await canUsePrisma()) {
    await prisma.client.delete({ where: { id } });
    return;
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }
  const db = await readLocalDb();
  db.clients = db.clients.filter((client) => client.id !== id);
  db.reports = db.reports.filter((report) => report.clientId !== id);
  db.uploads = db.uploads.filter((upload) => upload.clientId !== id);
  db.accessLogs = db.accessLogs.filter((log) => log.clientId !== id);
  await writeLocalDb(db);
}

export async function countClients() {
  if (await canUsePrisma()) return prisma.client.count();
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }
  const db = await readLocalDb();
  return db.clients.length;
}

export async function listReportsByClient(clientId: string) {
  if (await canUsePrisma()) {
    return prisma.campaignReport.findMany({
      where: { clientId },
      orderBy: [{ date: "asc" }, { platform: "asc" }, { campaignName: "asc" }]
    });
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }
  const db = await readLocalDb();
  return db.reports
    .filter((report) => report.clientId === clientId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.platform.localeCompare(b.platform) || a.campaignName.localeCompare(b.campaignName));
}

export async function getReportDateRange(clientId: string) {
  if (await canUsePrisma()) {
    return prisma.campaignReport.aggregate({
      where: { clientId },
      _min: { date: true },
      _max: { date: true }
    });
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }
  const reports = await listReportsByClient(clientId);
  if (reports.length === 0) return { _min: { date: null }, _max: { date: null } };
  return {
    _min: { date: new Date(`${reports[0].date}T00:00:00.000Z`) },
    _max: { date: new Date(`${reports[reports.length - 1].date}T00:00:00.000Z`) }
  };
}

export async function listDistinctClientOptions(clientId: string) {
  if (await canUsePrisma()) {
    return prisma.campaignReport.findMany({
      where: { clientId },
      select: { platform: true, campaignName: true },
      distinct: ["platform", "campaignName"]
    });
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }
  const reports = await listReportsByClient(clientId);
  const seen = new Set<string>();
  return reports.filter((report) => {
    const key = `${report.platform}::${report.campaignName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function listScopedReports(params: {
  clientId: string;
  startDate?: string;
  endDate?: string;
  platform?: string;
  campaignName?: string;
}) {
  if (await canUsePrisma()) {
    return prisma.campaignReport.findMany({
      where: {
        clientId: params.clientId,
        ...(params.startDate && params.endDate
          ? {
              date: {
                gte: new Date(`${params.startDate}T00:00:00.000Z`),
                lte: new Date(`${params.endDate}T23:59:59.999Z`)
              }
            }
          : {}),
        ...(params.platform && params.platform !== "ALL" ? { platform: params.platform } : {}),
        ...(params.campaignName && params.campaignName !== "ALL" ? { campaignName: params.campaignName } : {})
      },
      orderBy: [{ date: "asc" }, { platform: "asc" }, { campaignName: "asc" }]
    });
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }
  const reports = await listReportsByClient(params.clientId);
  return reports.filter((report) => {
    if (params.startDate && report.date < params.startDate) return false;
    if (params.endDate && report.date > params.endDate) return false;
    if (params.platform && params.platform !== "ALL" && report.platform !== params.platform) return false;
    if (params.campaignName && params.campaignName !== "ALL" && report.campaignName !== params.campaignName) return false;
    return true;
  });
}

export async function listRecentUploads(take = 6) {
  if (await canUsePrisma()) {
    return prisma.uploadHistory.findMany({ orderBy: { createdAt: "desc" }, take, include: { client: true } });
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }
  const db = await readLocalDb();
  return db.uploads
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, take)
    .map((upload) => ({
      ...upload,
      client: db.clients.find((client) => client.id === upload.clientId)!
    }));
}

export async function listUploadHistories(params?: { clientId?: string; take?: number }) {
  const take = params?.take ?? 30;

  if (await canUsePrisma()) {
    return prisma.uploadHistory.findMany({
      where: params?.clientId && params.clientId !== "ALL" ? { clientId: params.clientId } : undefined,
      orderBy: { createdAt: "desc" },
      take,
      include: { client: true }
    });
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }

  const db = await readLocalDb();
  return db.uploads
    .filter((upload) => !params?.clientId || params.clientId === "ALL" || upload.clientId === params.clientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, take)
    .map((upload) => ({
      ...upload,
      client: db.clients.find((client) => client.id === upload.clientId)!
    }));
}

export async function listAllReports() {
  if (await canUsePrisma()) return prisma.campaignReport.findMany();
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }
  const db = await readLocalDb();
  return db.reports;
}

export async function createUploadHistory(data: { clientId: string; fileName: string; rowCount: number; status: string; uploadedBy?: string | null }) {
  if (await canUsePrisma()) {
    return prisma.uploadHistory.create({ data });
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }
  const db = await readLocalDb();
  const upload = {
    id: makeLocalId(),
    clientId: data.clientId,
    fileName: data.fileName,
    rowCount: data.rowCount,
    status: data.status,
    uploadedBy: data.uploadedBy ?? null,
    createdAt: new Date().toISOString()
  };
  db.uploads.push(upload);
  await writeLocalDb(db);
  return upload;
}

export async function updateUploadHistoryStatus(id: string, status: string) {
  if (await canUsePrisma()) {
    return prisma.uploadHistory.update({
      where: { id },
      data: { status }
    });
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }

  const db = await readLocalDb();
  const index = db.uploads.findIndex((upload) => upload.id === id);
  if (index === -1) throw new Error("Upload history not found.");
  db.uploads[index] = {
    ...db.uploads[index],
    status
  };
  await writeLocalDb(db);
  return db.uploads[index];
}

export async function deleteUploadHistory(id: string) {
  if (await canUsePrisma()) {
    await prisma.$transaction([
      prisma.campaignReport.deleteMany({
        where: { uploadId: id }
      }),
      prisma.uploadHistory.delete({
        where: { id }
      })
    ]);
    return;
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }

  const db = await readLocalDb();
  db.reports = db.reports.filter((report) => report.uploadId !== id);
  db.uploads = db.uploads.filter((upload) => upload.id !== id);
  await writeLocalDb(db);
}

function reportMatchesComposite(report: { clientId: string; date: string; platform: string; campaignName: string; adGroupName: string; adName: string }, clientId: string, row: ReportRow) {
  return (
    report.clientId === clientId &&
    toDateOnly(report.date) === row.date &&
    report.platform === row.platform &&
    report.campaignName === row.campaignName &&
    report.adGroupName === row.adGroupName &&
    report.adName === row.adName
  );
}

export async function upsertReports(clientId: string, rows: ReportRow[], uploadId: string) {
  if (await canUsePrisma()) {
    for (let index = 0; index < rows.length; index += REPORT_UPSERT_BATCH_SIZE) {
      const chunk = mergeDuplicateReportRows(rows.slice(index, index + REPORT_UPSERT_BATCH_SIZE));
      await prisma.$transaction(
        chunk.map((row) =>
          prisma.campaignReport.upsert({
            where: {
              clientId_date_platform_campaignName_adGroupName_adName: {
                clientId,
                date: new Date(`${row.date}T00:00:00.000Z`),
                platform: row.platform,
                campaignName: row.campaignName,
                adGroupName: row.adGroupName,
                adName: row.adName
              }
            },
            update: {
              date: new Date(`${row.date}T00:00:00.000Z`),
              platform: row.platform,
              campaignName: row.campaignName,
              adGroupName: row.adGroupName,
              adName: row.adName,
              device: row.device ?? null,
              keyword: row.keyword ?? null,
              creativeName: row.creativeName ?? null,
              landingPage: row.landingPage ?? null,
              impressions: row.impressions,
              clicks: row.clicks,
              cost: row.cost,
              conversions: row.conversions,
              revenue: row.revenue,
              purchases: row.purchases ?? null,
              leads: row.leads ?? null,
              memo: row.memo ?? null,
              uploadId
            },
            create: {
              clientId,
              date: new Date(`${row.date}T00:00:00.000Z`),
              platform: row.platform,
              campaignName: row.campaignName,
              adGroupName: row.adGroupName,
              adName: row.adName,
              device: row.device ?? null,
              keyword: row.keyword ?? null,
              creativeName: row.creativeName ?? null,
              landingPage: row.landingPage ?? null,
              impressions: row.impressions,
              clicks: row.clicks,
              cost: row.cost,
              conversions: row.conversions,
              revenue: row.revenue,
              purchases: row.purchases ?? null,
              leads: row.leads ?? null,
              memo: row.memo ?? null,
              uploadId
            }
          })
        )
      );
    }
    return;
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }

  const db = await readLocalDb();
  for (const row of rows) {
    const existingIndex = db.reports.findIndex((report) => reportMatchesComposite(report, clientId, row));
    const next = {
      clientId,
      date: row.date,
      platform: row.platform,
      campaignName: row.campaignName,
      adGroupName: row.adGroupName,
      adName: row.adName,
      device: row.device ?? null,
      keyword: row.keyword ?? null,
      creativeName: row.creativeName ?? null,
      landingPage: row.landingPage ?? null,
      impressions: row.impressions,
      clicks: row.clicks,
      cost: row.cost,
      conversions: row.conversions,
      revenue: row.revenue,
      purchases: row.purchases ?? null,
      leads: row.leads ?? null,
      memo: row.memo ?? null,
      uploadId,
      updatedAt: new Date().toISOString()
    };
    if (existingIndex >= 0) {
      db.reports[existingIndex] = {
        ...db.reports[existingIndex],
        ...next
      };
    } else {
      db.reports.push({
        id: makeLocalId(),
        ...next,
        createdAt: new Date().toISOString()
      });
    }
  }
  await writeLocalDb(db);
}

export async function createAccessLog(clientId: string, ipAddress: string | null, userAgent: string | null) {
  if (await canUsePrisma()) {
    await prisma.clientAccessLog.create({
      data: { clientId, ipAddress, userAgent }
    });
    return;
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }
  const db = await readLocalDb();
  db.accessLogs.push({
    id: makeLocalId(),
    clientId,
    accessedAt: new Date().toISOString(),
    ipAddress,
    userAgent
  });
  await writeLocalDb(db);
}

export async function listEditableReports(params: { clientId?: string; query?: string; page?: number; pageSize?: number }) {
  const dbMode = await canUsePrisma();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const query = params.query?.toLowerCase().trim();

  if (dbMode) {
    const where: Prisma.CampaignReportWhereInput = {
      ...(params.clientId && params.clientId !== "ALL" ? { clientId: params.clientId } : {}),
      ...(query
        ? {
            OR: [
              { platform: { contains: query, mode: "insensitive" } },
              { campaignName: { contains: query, mode: "insensitive" } },
              { adGroupName: { contains: query, mode: "insensitive" } },
              { adName: { contains: query, mode: "insensitive" } }
            ]
          }
        : {})
    };
    const [total, rows] = await Promise.all([
      prisma.campaignReport.count({ where }),
      prisma.campaignReport.findMany({
        where,
        orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
        include: { client: true },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return { total, rows };
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }

  const db = await readLocalDb();
  let rows = db.reports.map((report) => ({
    ...report,
    client: db.clients.find((client) => client.id === report.clientId)!
  }));
  if (params.clientId && params.clientId !== "ALL") {
    rows = rows.filter((row) => row.clientId === params.clientId);
  }
  if (query) {
    rows = rows.filter((row) => [row.platform, row.campaignName, row.adGroupName, row.adName].join(" ").toLowerCase().includes(query));
  }
  rows = rows.sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
  const total = rows.length;
  return {
    total,
    rows: rows.slice((page - 1) * pageSize, page * pageSize)
  };
}

export async function getEditableReportById(id: string) {
  if (await canUsePrisma()) {
    return prisma.campaignReport.findUnique({ where: { id }, include: { client: true } });
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }
  const db = await readLocalDb();
  const report = db.reports.find((item) => item.id === id);
  if (!report) return null;
  return { ...report, client: db.clients.find((client) => client.id === report.clientId)! };
}

export async function updateReport(id: string, input: ReportUpdateInput) {
  if (await canUsePrisma()) {
    return prisma.campaignReport.update({
      where: { id },
      data: {
        date: new Date(`${input.date}T00:00:00.000Z`),
        platform: input.platform,
        campaignName: input.campaignName,
        adGroupName: input.adGroupName,
        adName: input.adName,
        device: input.device ?? null,
        keyword: input.keyword ?? null,
        creativeName: input.creativeName ?? null,
        landingPage: input.landingPage ?? null,
        impressions: input.impressions,
        clicks: input.clicks,
        cost: input.cost,
        conversions: input.conversions,
        revenue: input.revenue,
        purchases: input.purchases ?? null,
        leads: input.leads ?? null,
        memo: input.memo ?? null
      }
    });
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }

  const db = await readLocalDb();
  const index = db.reports.findIndex((report) => report.id === id);
  if (index === -1) throw new Error("Report not found.");
  db.reports[index] = {
    ...db.reports[index],
    ...input,
    device: input.device ?? null,
    keyword: input.keyword ?? null,
    creativeName: input.creativeName ?? null,
    landingPage: input.landingPage ?? null,
    purchases: input.purchases ?? null,
    leads: input.leads ?? null,
    memo: input.memo ?? null,
    updatedAt: new Date().toISOString()
  };
  await writeLocalDb(db);
  return db.reports[index];
}

export async function deleteReport(id: string) {
  if (await canUsePrisma()) {
    await prisma.campaignReport.delete({ where: { id } });
    return;
  }
  if (isVercelRuntime()) {
    throw new Error("Database connection is unavailable in Vercel runtime.");
  }
  const db = await readLocalDb();
  db.reports = db.reports.filter((report) => report.id !== id);
  await writeLocalDb(db);
}
