import { format, subDays } from "date-fns";
import { unstable_cache } from "next/cache";
import {
  aggregateScopedCampaignRankings,
  aggregateScopedPlatformBreakdown,
  aggregateScopedReportMetrics,
  aggregateScopedTimeSeries,
  getClientBySlug,
  getReportDateRange,
  listDistinctClientOptions,
  listScopedReports
} from "@/lib/data-service";
import { generateReportSummary } from "@/services/ai/report-summary";
import { calculateMetricsFromTotals, compareMetrics, getPreviousRange } from "@/utils/metrics";
import type { DashboardAnalyticsPayload, DashboardFilters, DashboardPayload, DashboardShellPayload, ReportRow } from "@/types/dashboard";

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

async function resolveDashboardBase(clientSlug: string, filters: DashboardFilters = {}) {
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

  const previousRange = getPreviousRange(scopedFilters.startDate, scopedFilters.endDate);

  return {
    client,
    scopedFilters,
    previousRange
  };
}

function makeFilterCacheKey(filters: DashboardFilters = {}) {
  return JSON.stringify({
    startDate: filters.startDate ?? "",
    endDate: filters.endDate ?? "",
    platform: filters.platform ?? "",
    campaign: filters.campaign ?? ""
  });
}

export async function getDashboardShellPayload(clientSlug: string, filters: DashboardFilters = {}): Promise<DashboardShellPayload | null> {
  const resolved = await resolveDashboardBase(clientSlug, filters);
  if (!resolved) return null;

  const [filterOptions, currentTotals, previousTotals] = await Promise.all([
    listDistinctClientOptions(resolved.client.id),
    aggregateScopedReportMetrics({
      clientId: resolved.client.id,
      startDate: resolved.scopedFilters.startDate,
      endDate: resolved.scopedFilters.endDate,
      platform: resolved.scopedFilters.platform,
      campaignName: resolved.scopedFilters.campaign
    }),
    resolved.previousRange.previousStartDate && resolved.previousRange.previousEndDate
      ? aggregateScopedReportMetrics({
          clientId: resolved.client.id,
          startDate: resolved.previousRange.previousStartDate,
          endDate: resolved.previousRange.previousEndDate,
          platform: resolved.scopedFilters.platform,
          campaignName: resolved.scopedFilters.campaign
        })
      : Promise.resolve({
          cost: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0
        })
  ]);

  const currentMetrics = calculateMetricsFromTotals(currentTotals);
  const previousMetrics = calculateMetricsFromTotals(previousTotals);
  const summary = compareMetrics(currentMetrics, previousMetrics);
  const platforms = Array.from(new Set(filterOptions.map((row) => row.platform))).sort();
  const campaigns = Array.from(new Set(filterOptions.map((row) => row.campaignName))).sort();

  return {
    client: {
      id: resolved.client.id,
      name: resolved.client.name,
      slug: resolved.client.slug,
      logoUrl: resolved.client.logoUrl,
      isPasswordProtected: resolved.client.isPasswordProtected
    },
    filters: {
      platforms,
      campaigns,
      startDate: resolved.scopedFilters.startDate,
      endDate: resolved.scopedFilters.endDate
    },
    summary,
    previous: previousMetrics
  };
}

export async function getDashboardAnalyticsPayload(clientSlug: string, filters: DashboardFilters = {}): Promise<DashboardAnalyticsPayload | null> {
  const resolved = await resolveDashboardBase(clientSlug, filters);
  if (!resolved) return null;

  const [timeSeries, platformBreakdown, campaignRankings, shell] = await Promise.all([
    aggregateScopedTimeSeries({
      clientId: resolved.client.id,
      startDate: resolved.scopedFilters.startDate,
      endDate: resolved.scopedFilters.endDate,
      platform: resolved.scopedFilters.platform,
      campaignName: resolved.scopedFilters.campaign
    }),
    aggregateScopedPlatformBreakdown({
      clientId: resolved.client.id,
      startDate: resolved.scopedFilters.startDate,
      endDate: resolved.scopedFilters.endDate,
      platform: resolved.scopedFilters.platform,
      campaignName: resolved.scopedFilters.campaign
    }),
    aggregateScopedCampaignRankings({
      clientId: resolved.client.id,
      startDate: resolved.scopedFilters.startDate,
      endDate: resolved.scopedFilters.endDate,
      platform: resolved.scopedFilters.platform,
      campaignName: resolved.scopedFilters.campaign
    }),
    getDashboardShellPayload(clientSlug, filters)
  ]);

  if (!shell) return null;

  const reportSummaryInput = {
    summary: shell.summary,
    platformBreakdown,
    campaignRankings
  };

  return {
    timeSeries,
    platformBreakdown,
    campaignRankings,
    reportText: generateReportSummary(reportSummaryInput)
  };
}

export async function getCachedDashboardShellPayload(clientSlug: string, filters: DashboardFilters = {}) {
  const key = makeFilterCacheKey(filters);
  return unstable_cache(() => getDashboardShellPayload(clientSlug, filters), ["dashboard-shell", clientSlug, key], {
    revalidate: 60
  })();
}

export async function getCachedDashboardAnalyticsPayload(clientSlug: string, filters: DashboardFilters = {}) {
  const key = makeFilterCacheKey(filters);
  return unstable_cache(() => getDashboardAnalyticsPayload(clientSlug, filters), ["dashboard-analytics", clientSlug, key], {
    revalidate: 60
  })();
}

export async function getDashboardPayload(clientSlug: string, filters: DashboardFilters = {}): Promise<DashboardPayload | null> {
  const [shell, analytics] = await Promise.all([getDashboardShellPayload(clientSlug, filters), getDashboardAnalyticsPayload(clientSlug, filters)]);
  if (!shell || !analytics) return null;

  const resolved = await resolveDashboardBase(clientSlug, filters);
  if (!resolved) return null;

  const currentRowsRaw = await listScopedReports({
    clientId: resolved.client.id,
    startDate: resolved.scopedFilters.startDate,
    endDate: resolved.scopedFilters.endDate,
    platform: resolved.scopedFilters.platform,
    campaignName: resolved.scopedFilters.campaign
  });

  return {
    ...shell,
    ...analytics,
    rows: currentRowsRaw.map(toReportRow)
  };
}
