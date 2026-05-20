import { addDays, differenceInCalendarDays, format, parseISO, subDays } from "date-fns";
import type { ComparisonSummary, DashboardFilters, MetricSummary, ReportRow } from "@/types/dashboard";

const empty: MetricSummary = {
  cost: 0,
  impressions: 0,
  clicks: 0,
  conversions: 0,
  revenue: 0,
  ctr: 0,
  cpc: 0,
  cpm: 0,
  cpa: 0,
  cvr: 0,
  roas: 0
};

export function safeDivide(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : numerator / denominator;
}

export function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calculateMetrics(rows: Pick<ReportRow, "cost" | "impressions" | "clicks" | "conversions" | "revenue">[]): MetricSummary {
  const sums = rows.reduce(
    (acc, row) => {
      acc.cost += Number(row.cost) || 0;
      acc.impressions += Number(row.impressions) || 0;
      acc.clicks += Number(row.clicks) || 0;
      acc.conversions += Number(row.conversions) || 0;
      acc.revenue += Number(row.revenue) || 0;
      return acc;
    },
    { ...empty }
  );

  return {
    cost: round(sums.cost),
    impressions: Math.round(sums.impressions),
    clicks: Math.round(sums.clicks),
    conversions: round(sums.conversions),
    revenue: round(sums.revenue),
    ctr: round(safeDivide(sums.clicks, sums.impressions) * 100),
    cpc: round(safeDivide(sums.cost, sums.clicks)),
    cpm: round(safeDivide(sums.cost, sums.impressions) * 1000),
    cpa: round(safeDivide(sums.cost, sums.conversions)),
    cvr: round(safeDivide(sums.conversions, sums.clicks) * 100),
    roas: round(safeDivide(sums.revenue, sums.cost) * 100)
  };
}

export function calculateMetricsFromTotals(totals: {
  cost?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  conversions?: number | null;
  revenue?: number | null;
}): MetricSummary {
  const sums = {
    cost: Number(totals.cost) || 0,
    impressions: Number(totals.impressions) || 0,
    clicks: Number(totals.clicks) || 0,
    conversions: Number(totals.conversions) || 0,
    revenue: Number(totals.revenue) || 0
  };

  return {
    cost: round(sums.cost),
    impressions: Math.round(sums.impressions),
    clicks: Math.round(sums.clicks),
    conversions: round(sums.conversions),
    revenue: round(sums.revenue),
    ctr: round(safeDivide(sums.clicks, sums.impressions) * 100),
    cpc: round(safeDivide(sums.cost, sums.clicks)),
    cpm: round(safeDivide(sums.cost, sums.impressions) * 1000),
    cpa: round(safeDivide(sums.cost, sums.conversions)),
    cvr: round(safeDivide(sums.conversions, sums.clicks) * 100),
    roas: round(safeDivide(sums.revenue, sums.cost) * 100)
  };
}

export function enrichRows<T extends ReportRow>(rows: T[]) {
  return rows.map((row) => ({ ...row, ...calculateMetrics([row]) }));
}

export function getDefaultRange(rows: ReportRow[]) {
  if (rows.length === 0) return {};
  const dates = rows.map((row) => row.date).sort();
  return { startDate: dates[0], endDate: dates[dates.length - 1] };
}

export function filterRows(rows: ReportRow[], filters: DashboardFilters) {
  return rows.filter((row) => {
    if (filters.startDate && row.date < filters.startDate) return false;
    if (filters.endDate && row.date > filters.endDate) return false;
    if (filters.platform && filters.platform !== "ALL" && row.platform !== filters.platform) return false;
    if (filters.campaign && filters.campaign !== "ALL" && row.campaignName !== filters.campaign) return false;
    return true;
  });
}

export function getPreviousRange(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return {};
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const length = differenceInCalendarDays(end, start) + 1;
  const previousEnd = subDays(start, 1);
  const previousStart = addDays(previousEnd, -length + 1);
  return {
    previousStartDate: format(previousStart, "yyyy-MM-dd"),
    previousEndDate: format(previousEnd, "yyyy-MM-dd")
  };
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return round(((current - previous) / previous) * 100);
}

export function compareMetrics(current: MetricSummary, previous: MetricSummary): ComparisonSummary {
  return {
    ...current,
    changes: {
      cost: percentChange(current.cost, previous.cost),
      impressions: percentChange(current.impressions, previous.impressions),
      clicks: percentChange(current.clicks, previous.clicks),
      conversions: percentChange(current.conversions, previous.conversions),
      revenue: percentChange(current.revenue, previous.revenue),
      cpa: percentChange(current.cpa, previous.cpa),
      roas: percentChange(current.roas, previous.roas)
    }
  };
}

export function groupByDate(rows: ReportRow[]) {
  const map = new Map<string, ReportRow[]>();
  rows.forEach((row) => map.set(row.date, [...(map.get(row.date) ?? []), row]));
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dateRows]) => ({ date, ...calculateMetrics(dateRows) }));
}

export function groupByKey(rows: ReportRow[], key: keyof Pick<ReportRow, "platform" | "campaignName">) {
  const map = new Map<string, ReportRow[]>();
  rows.forEach((row) => map.set(String(row[key]), [...(map.get(String(row[key])) ?? []), row]));
  return Array.from(map.entries()).map(([name, groupedRows]) => ({ name, ...calculateMetrics(groupedRows) }));
}

export function currency(value: number) {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(value);
}
