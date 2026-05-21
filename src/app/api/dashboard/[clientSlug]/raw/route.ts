import { NextResponse } from "next/server";
import { ensureDashboardAccess } from "@/lib/dashboard/api";
import { listScopedReports } from "@/lib/data-service";
import { filterDemoRows, makeDemoRows } from "@/services/report/demo-data";
import type { DashboardFilters, ReportRow } from "@/types/dashboard";

const DEFAULT_PAGE_SIZE = 25;

function readFilters(url: URL): DashboardFilters {
  return {
    startDate: url.searchParams.get("startDate") ?? undefined,
    endDate: url.searchParams.get("endDate") ?? undefined,
    platform: url.searchParams.get("platform") ?? undefined,
    adType: (url.searchParams.get("adType") as DashboardFilters["adType"]) ?? undefined,
    campaign: url.searchParams.get("campaign") ?? undefined,
    adGroup: url.searchParams.get("adGroup") ?? undefined,
    creative: url.searchParams.get("creative") ?? undefined,
    device: url.searchParams.get("device") ?? undefined,
    keyword: url.searchParams.get("keyword") ?? undefined,
    landingPage: url.searchParams.get("landingPage") ?? undefined
  };
}

function sortRows(rows: ReportRow[], sortKey: string, sortDirection: "asc" | "desc") {
  const sorted = [...rows].sort((left, right) => {
    const leftRoas = left.cost === 0 ? 0 : (left.revenue / left.cost) * 100;
    const rightRoas = right.cost === 0 ? 0 : (right.revenue / right.cost) * 100;

    const leftValue =
      sortKey === "cost"
        ? left.cost
        : sortKey === "conversions"
          ? left.conversions
          : sortKey === "revenue"
            ? left.revenue
            : sortKey === "roas"
              ? leftRoas
              : sortKey === "clicks"
                ? left.clicks
                : left.date;

    const rightValue =
      sortKey === "cost"
        ? right.cost
        : sortKey === "conversions"
          ? right.conversions
          : sortKey === "revenue"
            ? right.revenue
            : sortKey === "roas"
              ? rightRoas
              : sortKey === "clicks"
                ? right.clicks
                : right.date;

    if (leftValue === rightValue) return 0;
    const result = leftValue > rightValue ? 1 : -1;
    return sortDirection === "asc" ? result : -result;
  });

  return sorted;
}

export async function GET(request: Request, { params }: { params: { clientSlug: string } }) {
  const url = new URL(request.url);
  const filters = readFilters(url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(5000, Math.max(1, Number(url.searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE));
  const query = (url.searchParams.get("query") ?? "").trim().toLowerCase();
  const sortKey = url.searchParams.get("sortKey") ?? "date";
  const sortDirection = (url.searchParams.get("sortDirection") as "asc" | "desc") ?? "desc";

  let rows: ReportRow[] = [];

  if (params.clientSlug === "demo") {
    rows = filterDemoRows(makeDemoRows(), filters);
  } else {
    const access = await ensureDashboardAccess(params.clientSlug, url.searchParams.get("password"));

    if (access.status === 404) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (access.status === 401) return NextResponse.json({ passwordRequired: true }, { status: 401 });

    rows = (await listScopedReports({
      clientId: access.client.id,
      startDate: filters.startDate,
      endDate: filters.endDate,
      platform: filters.platform,
      campaignName: filters.campaign,
      adGroupName: filters.adGroup,
      adName: filters.creative,
      device: filters.device,
      keyword: filters.keyword,
      landingPage: filters.landingPage,
      adType: filters.adType
    })) as ReportRow[];
  }

  if (query) {
    rows = rows.filter((row) =>
      [row.date, row.platform, row.campaignName, row.adGroupName, row.adName, row.keyword, row.landingPage]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }

  const sorted = sortRows(rows, sortKey, sortDirection);
  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pagedRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  return NextResponse.json({
    rows: pagedRows,
    total,
    page,
    pageCount,
    pageSize
  });
}
