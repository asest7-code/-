import { NextResponse } from "next/server";
import { ensureDashboardAccess, resolveComparisonRange } from "@/lib/dashboard/api";
import { groupRowsByDimension, sortBreakdownRows } from "@/lib/dashboard/grouping";
import { buildSectionInsights } from "@/lib/dashboard/insights";
import { buildExtendedComparison, calculateExtendedMetrics } from "@/lib/dashboard/metrics";
import { listScopedReports } from "@/lib/data-service";
import { filterDemoRows, makeDemoRows } from "@/services/report/demo-data";
import type { DashboardFilters, DashboardSectionId, DashboardSectionPayload, ReportRow } from "@/types/dashboard";

function toDateOnly(value: Date | string) {
  return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}

function normalizeRows<T extends { date: Date | string }>(rows: T[]): Array<Omit<T, "date"> & { date: string }> {
  return rows.map((row) => ({
    ...row,
    date: toDateOnly(row.date)
  }));
}

function readFilters(url: URL): DashboardFilters {
  return {
    startDate: url.searchParams.get("startDate") ?? undefined,
    endDate: url.searchParams.get("endDate") ?? undefined,
    compareMode: (url.searchParams.get("compareMode") as DashboardFilters["compareMode"]) ?? "previous",
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

function applySectionScope(section: DashboardSectionId, subSection: string, filters: DashboardFilters): DashboardFilters {
  if (section === "sa") {
    if (subSection === "naver") return { ...filters, adType: "SA", platform: "NAVER" };
    if (subSection === "google") return { ...filters, adType: "SA", platform: "GOOGLE" };
    return { ...filters, adType: "SA" };
  }

  if (section === "da") {
    if (subSection === "gfa") return { ...filters, adType: "DA", platform: "GFA" };
    if (subSection === "daangn") return { ...filters, adType: "DA", platform: "DANGGEUN" };
    if (subSection === "kakao") return { ...filters, adType: "DA", platform: "KAKAO" };
    if (subSection === "meta") return { ...filters, adType: "DA", platform: "META" };
    return { ...filters, adType: "DA" };
  }

  if (section === "keyword") {
    return { ...filters, adType: "SA" };
  }

  return filters;
}

function buildTimeSeries(rows: ReportRow[]) {
  const map = new Map<string, ReportRow[]>();

  for (const row of rows) {
    const current = map.get(row.date) ?? [];
    current.push(row);
    map.set(row.date, current);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dateRows]) => {
      const metrics = calculateExtendedMetrics(dateRows);
      return {
        date,
        cost: metrics.cost,
        clicks: metrics.clicks,
        conversions: metrics.conversions,
        revenue: metrics.revenue,
        roas: metrics.roas
      };
    });
}

function buildCompareSeries(currentRows: ReportRow[], previousRows: ReportRow[]) {
  const current = buildTimeSeries(currentRows);
  const previous = buildTimeSeries(previousRows);

  return current.map((item, index) => {
    const compare = previous[index] ?? { cost: 0, conversions: 0, revenue: 0, roas: 0 };
    return {
      date: item.date,
      currentCost: item.cost,
      currentConversions: item.conversions,
      currentRevenue: item.revenue,
      currentRoas: item.roas,
      previousCost: compare.cost,
      previousConversions: compare.conversions,
      previousRevenue: compare.revenue,
      previousRoas: compare.roas
    };
  });
}

function createSectionPayload(section: DashboardSectionId, subSection: string, rows: ReportRow[], previousRows: ReportRow[]): DashboardSectionPayload {
  const summary = buildExtendedComparison(calculateExtendedMetrics(rows), calculateExtendedMetrics(previousRows));
  const platformRows = sortBreakdownRows(groupRowsByDimension(rows, previousRows, "platform"), "cost");
  const campaignRows = sortBreakdownRows(groupRowsByDimension(rows, previousRows, "campaign"), "cost");
  const adGroupRows = sortBreakdownRows(groupRowsByDimension(rows, previousRows, "adGroup"), "cost");
  const creativeRows = sortBreakdownRows(groupRowsByDimension(rows, previousRows, "creative"), "cost");
  const keywordRows = sortBreakdownRows(groupRowsByDimension(rows, previousRows, "keyword"), "cost");
  const landingRows = sortBreakdownRows(groupRowsByDimension(rows, previousRows, "landing"), "cost");
  const dateRows = sortBreakdownRows(groupRowsByDimension(rows, previousRows, "date"), "cost");
  const timeSeries = buildTimeSeries(rows);
  const compareSeries = buildCompareSeries(rows, previousRows);

  return {
    section,
    subSection,
    summary,
    previous: calculateExtendedMetrics(previousRows),
    timeSeries,
    compareSeries,
    platformRows,
    campaignRows,
    adGroupRows,
    creativeRows,
    keywordRows,
    landingRows,
    dateRows,
    insights: buildSectionInsights({
      section,
      summary,
      platformRows,
      campaignRows,
      creativeRows,
      keywordRows,
      landingRows
    })
  };
}

export async function GET(request: Request, { params }: { params: { clientSlug: string } }) {
  const url = new URL(request.url);
  const section = (url.searchParams.get("section") as DashboardSectionId) ?? "summary";
  const subSection = url.searchParams.get("subSection") ?? "all";
  const filters = applySectionScope(section, subSection, readFilters(url));
  const compareRange = resolveComparisonRange(filters);

  if (params.clientSlug === "demo") {
    const allRows = makeDemoRows();
    const currentRows = filterDemoRows(allRows, filters);
    const previousRows =
      compareRange.previousStartDate && compareRange.previousEndDate
        ? filterDemoRows(allRows, {
            ...filters,
            startDate: compareRange.previousStartDate,
            endDate: compareRange.previousEndDate
          })
        : [];

    return NextResponse.json(createSectionPayload(section, subSection, currentRows, previousRows));
  }

  const access = await ensureDashboardAccess(params.clientSlug, url.searchParams.get("password"));

  if (access.status === 404) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (access.status === 401) return NextResponse.json({ passwordRequired: true }, { status: 401 });

  const currentRowsRaw = await listScopedReports({
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
  });

  const previousRowsRaw =
    compareRange.previousStartDate && compareRange.previousEndDate
      ? await listScopedReports({
          clientId: access.client.id,
          startDate: compareRange.previousStartDate,
          endDate: compareRange.previousEndDate,
          platform: filters.platform,
          campaignName: filters.campaign,
          adGroupName: filters.adGroup,
          adName: filters.creative,
          device: filters.device,
          keyword: filters.keyword,
          landingPage: filters.landingPage,
          adType: filters.adType
        })
      : [];

  const currentRows = normalizeRows(currentRowsRaw) as ReportRow[];
  const previousRows = normalizeRows(previousRowsRaw) as ReportRow[];

  return NextResponse.json(createSectionPayload(section, subSection, currentRows, previousRows));
}
