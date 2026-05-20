import type { DashboardFilters, DashboardPayload, ReportRow } from "@/types/dashboard";
import { generateReportSummary } from "@/services/ai/report-summary";
import { calculateMetrics, compareMetrics, enrichRows, filterRows, getDefaultRange, getPreviousRange, groupByDate } from "@/utils/metrics";

type DashboardClient = DashboardPayload["client"];

export function deriveDashboardPayload(input: {
  client: DashboardClient;
  rows: ReportRow[];
  filters?: DashboardFilters;
}): DashboardPayload {
  const defaultRange = getDefaultRange(input.rows);
  const activeFilters = {
    ...input.filters,
    startDate: input.filters?.startDate ?? defaultRange.startDate,
    endDate: input.filters?.endDate ?? defaultRange.endDate
  };

  const currentRows = filterRows(input.rows, activeFilters);
  const previousRange = getPreviousRange(activeFilters.startDate, activeFilters.endDate);
  const previousRows = filterRows(input.rows, {
    startDate: previousRange.previousStartDate,
    endDate: previousRange.previousEndDate,
    platform: activeFilters.platform,
    campaign: activeFilters.campaign
  });

  const currentMetrics = calculateMetrics(currentRows);
  const previousMetrics = calculateMetrics(previousRows);
  const summary = compareMetrics(currentMetrics, previousMetrics);
  const platforms = Array.from(new Set(input.rows.map((row) => row.platform))).sort();
  const campaigns = Array.from(new Set(input.rows.map((row) => row.campaignName))).sort();

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
    client: input.client,
    filters: {
      platforms,
      campaigns,
      startDate: activeFilters.startDate,
      endDate: activeFilters.endDate
    },
    summary,
    previous: previousMetrics,
    timeSeries,
    platformBreakdown,
    campaignRankings,
    rows: enrichRows(currentRows),
    sourceRows: input.rows
  };

  return {
    ...partialPayload,
    reportText: generateReportSummary(partialPayload)
  };
}
