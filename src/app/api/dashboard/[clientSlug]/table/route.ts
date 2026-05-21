import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { format } from "date-fns";
import { getClientBySlug, listScopedReports } from "@/lib/data-service";
import { prisma } from "@/lib/prisma";
import { calculateMetrics } from "@/utils/metrics";

type GroupMode = "date" | "campaign" | "adGroup";
type SortKey = "dateDesc" | "cost" | "revenue" | "conversions" | "clicks" | "roas";

type TrendValue = {
  cost: number | null;
  conversions: number | null;
  revenue: number | null;
  roas: number | null;
};

type AggregatedRow = {
  id: string;
  date: string;
  platform: string;
  campaignName: string;
  adGroupName: string;
  rowCount: number;
  metrics: ReturnType<typeof calculateMetrics>;
  dayOverDay?: TrendValue | null;
};

const PAGE_SIZE = 15;

function toDateOnly(value: Date | string) {
  return typeof value === "string" ? value.slice(0, 10) : format(value, "yyyy-MM-dd");
}

function aggregateRows(
  rows: Array<{
    date: Date | string;
    platform: string;
    campaignName: string;
    adGroupName: string;
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    revenue: number;
  }>,
  mode: GroupMode
) {
  const grouped = new Map<string, typeof rows>();

  rows.forEach((row) => {
    const date = toDateOnly(row.date);
    const key =
      mode === "date"
        ? [date, row.platform].join("__")
        : mode === "campaign"
          ? [date, row.platform, row.campaignName].join("__")
          : [date, row.platform, row.campaignName, row.adGroupName].join("__");

    const current = grouped.get(key) ?? [];
    current.push(row);
    grouped.set(key, current);
  });

  const aggregated = Array.from(grouped.entries()).map(([key, groupedRows]) => {
    const [date, platform, campaignName = "", adGroupName = ""] = key.split("__");

    return {
      id: `${mode}-${key}`,
      date,
      platform,
      campaignName: mode === "date" ? "-" : campaignName,
      adGroupName: mode === "adGroup" ? adGroupName : "-",
      rowCount: groupedRows.length,
      metrics: calculateMetrics(groupedRows)
    } satisfies AggregatedRow;
  });

  if (mode !== "date") {
    return aggregated;
  }

  const byPlatform = new Map<string, AggregatedRow[]>();
  aggregated.forEach((row) => {
    const current = byPlatform.get(row.platform) ?? [];
    current.push(row);
    byPlatform.set(row.platform, current);
  });

  const trendMap = new Map<string, TrendValue>();

  byPlatform.forEach((platformRows) => {
    const sorted = [...platformRows].sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach((row, index) => {
      const previous = sorted[index - 1];
      trendMap.set(row.id, {
        cost: previous ? row.metrics.cost - previous.metrics.cost : null,
        conversions: previous ? row.metrics.conversions - previous.metrics.conversions : null,
        revenue: previous ? row.metrics.revenue - previous.metrics.revenue : null,
        roas: previous ? row.metrics.roas - previous.metrics.roas : null
      });
    });
  });

  return aggregated.map((row) => ({ ...row, dayOverDay: trendMap.get(row.id) ?? null }));
}

function sortRows(a: AggregatedRow, b: AggregatedRow, sortKey: SortKey) {
  if (sortKey === "dateDesc") {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.platform.localeCompare(b.platform);
  }

  return Number(b.metrics[sortKey]) - Number(a.metrics[sortKey]);
}

function getSortSql(sortKey: SortKey) {
  switch (sortKey) {
    case "cost":
      return Prisma.raw(`"cost" DESC, "date" DESC, "platform" ASC`);
    case "revenue":
      return Prisma.raw(`"revenue" DESC, "date" DESC, "platform" ASC`);
    case "conversions":
      return Prisma.raw(`"conversions" DESC, "date" DESC, "platform" ASC`);
    case "clicks":
      return Prisma.raw(`"clicks" DESC, "date" DESC, "platform" ASC`);
    case "roas":
      return Prisma.raw(`"roas" DESC, "date" DESC, "platform" ASC`);
    case "dateDesc":
    default:
      return Prisma.raw(`"date" DESC, "platform" ASC, "campaignName" ASC, "adGroupName" ASC`);
  }
}

function buildGroupedTableCtes(params: {
  clientId: string;
  startDate?: string;
  endDate?: string;
  platform?: string;
  campaign?: string;
  groupMode: GroupMode;
  query: string;
}) {
  const baseWhere: Prisma.Sql[] = [Prisma.sql`"clientId" = ${params.clientId}`];

  if (params.startDate) {
    baseWhere.push(Prisma.sql`"date" >= ${new Date(`${params.startDate}T00:00:00.000Z`)}`);
  }

  if (params.endDate) {
    baseWhere.push(Prisma.sql`"date" <= ${new Date(`${params.endDate}T23:59:59.999Z`)}`);
  }

  if (params.platform && params.platform !== "ALL") {
    baseWhere.push(Prisma.sql`"platform" = ${params.platform}`);
  }

  if (params.campaign && params.campaign !== "ALL") {
    baseWhere.push(Prisma.sql`"campaignName" = ${params.campaign}`);
  }

  const whereSql = Prisma.sql`WHERE ${Prisma.join(baseWhere, " AND ")}`;

  const campaignSelect =
    params.groupMode === "date" ? Prisma.sql`'-'::text AS "campaignName"` : Prisma.sql`"campaignName"`;
  const adGroupSelect =
    params.groupMode === "adGroup" ? Prisma.sql`"adGroupName"` : Prisma.sql`'-'::text AS "adGroupName"`;

  const groupByColumns =
    params.groupMode === "date"
      ? [Prisma.raw(`DATE("date")`), Prisma.raw(`"platform"`)]
      : params.groupMode === "campaign"
        ? [Prisma.raw(`DATE("date")`), Prisma.raw(`"platform"`), Prisma.raw(`"campaignName"`)]
        : [Prisma.raw(`DATE("date")`), Prisma.raw(`"platform"`), Prisma.raw(`"campaignName"`), Prisma.raw(`"adGroupName"`)];

  const searchWhere =
    params.query.trim().length > 0
      ? Prisma.sql`WHERE LOWER(CONCAT_WS(' ', "date", "platform", "campaignName", "adGroupName")) LIKE ${`%${params.query.toLowerCase()}%`}`
      : Prisma.empty;

  const trendSelect =
    params.groupMode === "date"
      ? Prisma.sql`
          "cost" - LAG("cost") OVER (PARTITION BY "platform" ORDER BY "date") AS "costChange",
          "conversions" - LAG("conversions") OVER (PARTITION BY "platform" ORDER BY "date") AS "conversionsChange",
          "revenue" - LAG("revenue") OVER (PARTITION BY "platform" ORDER BY "date") AS "revenueChange",
          "roas" - LAG("roas") OVER (PARTITION BY "platform" ORDER BY "date") AS "roasChange"
        `
      : Prisma.sql`
          NULL::double precision AS "costChange",
          NULL::double precision AS "conversionsChange",
          NULL::double precision AS "revenueChange",
          NULL::double precision AS "roasChange"
        `;

  return Prisma.sql`
    WITH aggregated AS (
      SELECT
        DATE("date") AS "date",
        "platform",
        ${campaignSelect},
        ${adGroupSelect},
        COUNT(*)::int AS "rowCount",
        COALESCE(SUM("impressions"), 0)::int AS "impressions",
        COALESCE(SUM("clicks"), 0)::int AS "clicks",
        COALESCE(SUM("cost"), 0)::double precision AS "cost",
        COALESCE(SUM("conversions"), 0)::double precision AS "conversions",
        COALESCE(SUM("revenue"), 0)::double precision AS "revenue"
      FROM "CampaignReport"
      ${whereSql}
      GROUP BY ${Prisma.join(groupByColumns, ", ")}
    ),
    enriched AS (
      SELECT
        CONCAT(${params.groupMode}, '-', TO_CHAR("date", 'YYYY-MM-DD'), '-', "platform", '-', "campaignName", '-', "adGroupName") AS "id",
        TO_CHAR("date", 'YYYY-MM-DD') AS "date",
        "platform",
        "campaignName",
        "adGroupName",
        "rowCount",
        "impressions",
        "clicks",
        "cost",
        "conversions",
        "revenue",
        CASE WHEN "impressions" = 0 THEN 0 ELSE ROUND(("clicks"::numeric / NULLIF("impressions", 0)::numeric) * 100, 2) END AS "ctr",
        CASE WHEN "clicks" = 0 THEN 0 ELSE ROUND(("cost"::numeric / NULLIF("clicks", 0)::numeric), 2) END AS "cpc",
        CASE WHEN "impressions" = 0 THEN 0 ELSE ROUND(("cost"::numeric / NULLIF("impressions", 0)::numeric) * 1000, 2) END AS "cpm",
        CASE WHEN "conversions" = 0 THEN 0 ELSE ROUND(("cost"::numeric / NULLIF("conversions", 0)::numeric), 2) END AS "cpa",
        CASE WHEN "clicks" = 0 THEN 0 ELSE ROUND(("conversions"::numeric / NULLIF("clicks", 0)::numeric) * 100, 2) END AS "cvr",
        CASE WHEN "cost" = 0 THEN 0 ELSE ROUND(("revenue"::numeric / NULLIF("cost", 0)::numeric) * 100, 2) END AS "roas"
      FROM aggregated
    ),
    filtered AS (
      SELECT *
      FROM enriched
      ${searchWhere}
    ),
    ranked AS (
      SELECT
        *,
        ${trendSelect}
      FROM filtered
    )
  `;
}

export async function GET(request: Request, { params }: { params: { clientSlug: string } }) {
  const url = new URL(request.url);
  const password = url.searchParams.get("password");
  const client = await getClientBySlug(params.clientSlug);

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (client.isPasswordProtected) {
    const ok = password && client.sharePasswordHash ? await bcrypt.compare(password, client.sharePasswordHash) : false;
    if (!ok) return NextResponse.json({ passwordRequired: true }, { status: 401 });
  }

  const groupMode = (url.searchParams.get("groupMode") ?? "date") as GroupMode;
  const sortKey = (url.searchParams.get("sortKey") ?? "dateDesc") as SortKey;
  const query = (url.searchParams.get("query") ?? "").trim();
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);

  try {
    const ctes = buildGroupedTableCtes({
      clientId: client.id,
      startDate: url.searchParams.get("startDate") ?? undefined,
      endDate: url.searchParams.get("endDate") ?? undefined,
      platform: url.searchParams.get("platform") ?? undefined,
      campaign: url.searchParams.get("campaign") ?? undefined,
      groupMode,
      query
    });

    const sortSql = getSortSql(sortKey);
    const offset = (page - 1) * PAGE_SIZE;

    const [rows, totalRows] = await Promise.all([
      prisma.$queryRaw<
        Array<{
          id: string;
          date: string;
          platform: string;
          campaignName: string;
          adGroupName: string;
          rowCount: number;
          impressions: number;
          clicks: number;
          cost: number;
          conversions: number;
          revenue: number;
          ctr: number;
          cpc: number;
          cpm: number;
          cpa: number;
          cvr: number;
          roas: number;
          costChange: number | null;
          conversionsChange: number | null;
          revenueChange: number | null;
          roasChange: number | null;
        }>
      >(
        Prisma.sql`
          ${ctes}
          SELECT *
          FROM ranked
          ORDER BY ${sortSql}
          LIMIT ${PAGE_SIZE}
          OFFSET ${offset}
        `
      ),
      prisma.$queryRaw<Array<{ total: bigint | number }>>(
        Prisma.sql`
          ${ctes}
          SELECT COUNT(*) AS "total"
          FROM ranked
        `
      )
    ]);

    const total = Number(totalRows[0]?.total ?? 0);
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return NextResponse.json({
      rows: rows.map((row) => ({
        id: row.id,
        date: row.date,
        platform: row.platform,
        campaignName: row.campaignName,
        adGroupName: row.adGroupName,
        rowCount: Number(row.rowCount),
        metrics: {
          cost: Number(row.cost),
          impressions: Number(row.impressions),
          clicks: Number(row.clicks),
          conversions: Number(row.conversions),
          revenue: Number(row.revenue),
          ctr: Number(row.ctr),
          cpc: Number(row.cpc),
          cpm: Number(row.cpm),
          cpa: Number(row.cpa),
          cvr: Number(row.cvr),
          roas: Number(row.roas)
        },
        dayOverDay:
          groupMode === "date"
            ? {
                cost: row.costChange === null ? null : Number(row.costChange),
                conversions: row.conversionsChange === null ? null : Number(row.conversionsChange),
                revenue: row.revenueChange === null ? null : Number(row.revenueChange),
                roas: row.roasChange === null ? null : Number(row.roasChange)
              }
            : null
      })),
      total,
      page,
      pageCount,
      pageSize: PAGE_SIZE
    });
  } catch {
    const rows = await listScopedReports({
      clientId: client.id,
      startDate: url.searchParams.get("startDate") ?? undefined,
      endDate: url.searchParams.get("endDate") ?? undefined,
      platform: url.searchParams.get("platform") ?? undefined,
      campaignName: url.searchParams.get("campaign") ?? undefined
    });

    const aggregatedRows = aggregateRows(rows, groupMode);
    const filteredRows = query
      ? aggregatedRows.filter((row) =>
          [row.date, row.platform, row.campaignName, row.adGroupName].join(" ").toLowerCase().includes(query.toLowerCase())
        )
      : aggregatedRows;
    const sortedRows = [...filteredRows].sort((a, b) => sortRows(a, b, sortKey));
    const total = sortedRows.length;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const pagedRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return NextResponse.json({
      rows: pagedRows,
      total,
      page,
      pageCount,
      pageSize: PAGE_SIZE
    });
  }
}
