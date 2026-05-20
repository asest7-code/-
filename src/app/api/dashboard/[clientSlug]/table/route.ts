import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { format } from "date-fns";
import { getClientBySlug, listScopedReports } from "@/lib/data-service";
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
  const query = (url.searchParams.get("query") ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);

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
        [row.date, row.platform, row.campaignName, row.adGroupName].join(" ").toLowerCase().includes(query)
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
