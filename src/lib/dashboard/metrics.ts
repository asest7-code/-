import type {
  BreakdownRow,
  DashboardAdType,
  ExtendedComparisonSummary,
  ExtendedMetricSummary,
  MetricSummary,
  ReportRow
} from "@/types/dashboard";
import { currency, formatNumber, formatPercent, formatRoas, percentChange, round, safeDivide } from "@/utils/metrics";

const EMPTY_METRICS: ExtendedMetricSummary = {
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
  roas: 0,
  purchases: 0,
  leads: 0,
  aov: 0,
  purchaseRate: 0,
  leadRate: 0
};

export function getAdTypeForRow(row: Pick<ReportRow, "platform" | "keyword" | "creativeName">): Exclude<DashboardAdType, "ALL"> {
  const platform = String(row.platform ?? "").toUpperCase();

  if (platform === "GOOGLE") return "SA";
  if (platform === "NAVER") return row.creativeName ? "DA" : "SA";
  if (["META", "KAKAO", "DAANGN", "DANGGEUN", "GFA"].includes(platform)) return "DA";

  return row.keyword ? "SA" : "DA";
}

export function calculateExtendedMetrics(
  rows: Array<Pick<ReportRow, "cost" | "impressions" | "clicks" | "conversions" | "revenue" | "purchases" | "leads">>
): ExtendedMetricSummary {
  const sums = rows.reduce<{
    cost: number;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    purchases: number;
    leads: number;
  }>(
    (acc, row) => ({
      cost: acc.cost + (Number(row.cost) || 0),
      impressions: acc.impressions + (Number(row.impressions) || 0),
      clicks: acc.clicks + (Number(row.clicks) || 0),
      conversions: acc.conversions + (Number(row.conversions) || 0),
      revenue: acc.revenue + (Number(row.revenue) || 0),
      purchases: acc.purchases + (Number(row.purchases) || 0),
      leads: acc.leads + (Number(row.leads) || 0)
    }),
    {
      cost: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      purchases: 0,
      leads: 0
    }
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
    roas: round(safeDivide(sums.revenue, sums.cost) * 100),
    purchases: round(Number(sums.purchases ?? 0)),
    leads: round(Number(sums.leads ?? 0)),
    aov: round(safeDivide(Number(sums.revenue ?? 0), Number(sums.purchases ?? 0))),
    purchaseRate: round(safeDivide(Number(sums.purchases ?? 0), Number(sums.clicks ?? 0)) * 100),
    leadRate: round(safeDivide(Number(sums.leads ?? 0), Number(sums.clicks ?? 0)) * 100)
  };
}

export function buildExtendedComparison(current: ExtendedMetricSummary, previous: ExtendedMetricSummary): ExtendedComparisonSummary {
  const deltas: ExtendedComparisonSummary["deltas"] = {
    cost: round(current.cost - previous.cost),
    impressions: round(current.impressions - previous.impressions),
    clicks: round(current.clicks - previous.clicks),
    conversions: round(current.conversions - previous.conversions),
    revenue: round(current.revenue - previous.revenue),
    ctr: round(current.ctr - previous.ctr),
    cpc: round(current.cpc - previous.cpc),
    cpa: round(current.cpa - previous.cpa),
    cvr: round(current.cvr - previous.cvr),
    roas: round(current.roas - previous.roas),
    purchases: round(current.purchases - previous.purchases),
    leads: round(current.leads - previous.leads)
  };

  return {
    ...current,
    changes: {
      cost: percentChange(current.cost, previous.cost),
      impressions: percentChange(current.impressions, previous.impressions),
      clicks: percentChange(current.clicks, previous.clicks),
      conversions: percentChange(current.conversions, previous.conversions),
      revenue: percentChange(current.revenue, previous.revenue),
      ctr: percentChange(current.ctr, previous.ctr),
      cpc: percentChange(current.cpc, previous.cpc),
      cpa: percentChange(current.cpa, previous.cpa),
      cvr: percentChange(current.cvr, previous.cvr),
      roas: percentChange(current.roas, previous.roas),
      purchases: percentChange(current.purchases, previous.purchases),
      leads: percentChange(current.leads, previous.leads)
    },
    deltas
  };
}

export function buildBreakdownRow(
  id: string,
  label: string,
  rows: ReportRow[],
  previousRows: ReportRow[] = [],
  extra: Omit<BreakdownRow, "id" | "label" | "metrics" | "previous" | "changes" | "deltas"> = {}
): BreakdownRow {
  const metrics = calculateExtendedMetrics(rows);
  const previous = previousRows.length > 0 ? calculateExtendedMetrics(previousRows) : null;
  const comparison = buildExtendedComparison(metrics, previous ?? EMPTY_METRICS);

  return {
    id,
    label,
    ...extra,
    metrics,
    previous,
    changes: comparison.changes,
    deltas: comparison.deltas
  };
}

export function formatMetricValue(value: number, format: "number" | "currency" | "percent" | "roas") {
  if (format === "currency") return `${currency(value)}원`;
  if (format === "roas") return formatRoas(value);
  if (format === "percent") return formatPercent(value, 1);
  return formatNumber(value);
}

export function formatDeltaValue(value: number | null | undefined, format: "number" | "currency" | "percent" | "roas") {
  if (value == null) return "비교 없음";
  if (value === 0) return "보합";

  const prefix = value > 0 ? "+" : "-";
  const absolute = Math.abs(value);

  if (format === "currency") return `${prefix}${currency(absolute)}원`;
  if (format === "roas") return `${prefix}${formatRoas(absolute)}`;
  if (format === "percent") return `${prefix}${formatPercent(absolute, 1)}`;
  return `${prefix}${formatNumber(absolute)}`;
}

export function toBaseMetricSummary(metrics: ExtendedMetricSummary): MetricSummary {
  return {
    cost: metrics.cost,
    impressions: metrics.impressions,
    clicks: metrics.clicks,
    conversions: metrics.conversions,
    revenue: metrics.revenue,
    ctr: metrics.ctr,
    cpc: metrics.cpc,
    cpm: metrics.cpm,
    cpa: metrics.cpa,
    cvr: metrics.cvr,
    roas: metrics.roas
  };
}
