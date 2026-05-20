import { format, subDays } from "date-fns";
import { getClientBySlug, getReportDateRange, listDistinctClientOptions, listScopedReports } from "@/lib/data-service";
import { generateReportSummary } from "@/services/ai/report-summary";
import { calculateMetrics, compareMetrics, getPreviousRange, groupByDate } from "@/utils/metrics";
import type { DashboardFilters, DashboardPayload, ReportRow } from "@/types/dashboard";

function toReportRow(row: {
  id: string;
  date: Date | string;
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
}): ReportRow {
  return { ...row, date: typeof row.date === "string" ? row.date.slice(0, 10) : format(row.date, "yyyy-MM-dd") };
}

export async function getDashboardPayload(clientSlug: string, filters: DashboardFilters = {}): Promise<DashboardPayload | null> {
  const client = await getClientBySlug(clientSlug);

  if (!client) return null;

  const dateRange = await getReportDateRange(client.id);
  const minDateValue = dateRange._min.date ? format(dateRange._min.date, "yyyy-MM-dd") : undefined;
  const maxDateValue = dateRange._max.date ? format(dateRange._max.date, "yyyy-MM-dd") : undefined;

  const resolvedEndDate = filters.endDate ?? maxDateValue;
  const resolvedStartDate =
    filters.startDate ??
    (resolvedEndDate
      ? format(subDays(new Date(`${resolvedEndDate}T00:00:00.000Z`), 29), "yyyy-MM-dd")
      : minDateValue);

  const scopedFilters = {
    ...filters,
    startDate: resolvedStartDate,
    endDate: resolvedEndDate
  };

  const [currentRowsRaw, filterOptions] = await Promise.all([
    listScopedReports({
      clientId: client.id,
      startDate: scopedFilters.startDate,
      endDate: scopedFilters.endDate,
      platform: scopedFilters.platform,
      campaignName: scopedFilters.campaign
    }),
    listDistinctClientOptions(client.id)
  ]);

  const currentRows = currentRowsRaw.map(toReportRow);
  const previousRange = getPreviousRange(scopedFilters.startDate, scopedFilters.endDate);
  const previousRowsRaw =
    previousRange.previousStartDate && previousRange.previousEndDate
      ? await listScopedReports({
          clientId: client.id,
          startDate: previousRange.previousStartDate,
          endDate: previousRange.previousEndDate,
          platform: scopedFilters.platform,
          campaignName: scopedFilters.campaign
        })
      : [];
  const previousRows = previousRowsRaw.map(toReportRow);

  const currentMetrics = calculateMetrics(currentRows);
  const previousMetrics = calculateMetrics(previousRows);
  const summary = compareMetrics(currentMetrics, previousMetrics);
  const platforms = Array.from(new Set(filterOptions.map((row) => row.platform))).sort();
  const campaigns = Array.from(new Set(filterOptions.map((row) => row.campaignName))).sort();

  const timeSeries = groupByDate(currentRows).map((item) => ({
    date: item.date,
    cost: item.cost,
    clicks: item.clicks,
    conversions: item.conversions,
    revenue: item.revenue,
    roas: item.roas
  }));

  const platformMap = new Map<string, ReportRow[]>();
  currentRows.forEach((row) => platformMap.set(row.platform, [...(platformMap.get(row.platform) ?? []), row]));
  const platformBreakdown = Array.from(platformMap.entries()).map(([platform, rows]) => ({
    platform,
    ...calculateMetrics(rows)
  }));

  const campaignMap = new Map<string, ReportRow[]>();
  currentRows.forEach((row) => campaignMap.set(row.campaignName, [...(campaignMap.get(row.campaignName) ?? []), row]));
  const campaignRankings = Array.from(campaignMap.entries())
    .map(([campaignName, rows]) => ({ campaignName, ...calculateMetrics(rows) }))
    .sort((a, b) => b.roas - a.roas);

  const partialPayload = {
    client: {
      id: client.id,
      name: client.name,
      slug: client.slug,
      logoUrl: client.logoUrl,
      isPasswordProtected: client.isPasswordProtected
    },
    filters: {
      platforms,
      campaigns,
      startDate: scopedFilters.startDate,
      endDate: scopedFilters.endDate
    },
    summary,
    previous: previousMetrics,
    timeSeries,
    platformBreakdown,
    campaignRankings,
    rows: currentRows
  };

  return {
    ...partialPayload,
    reportText: generateReportSummary(partialPayload)
  };
}
