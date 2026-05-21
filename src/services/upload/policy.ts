import type { ReportLevel, UploadSourceDefinition, UploadSourceId } from "@/services/upload/types";
import type { ReportRow } from "@/types/dashboard";

const keywordCapableSources = new Set<UploadSourceId>(["naver_sa", "google_ads"]);

function hasText(value: unknown) {
  return String(value ?? "").trim().length > 0;
}

export function cleanText(value: string | null | undefined) {
  if (!value) return null;
  return value.replace(/^'+/, "").trim() || null;
}

export function normalizeDateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value ?? "").trim();
  const dotted = raw.match(/^(\d{4})\.(\d{2})\.(\d{2})\.?$/);
  if (dotted) {
    return `${dotted[1]}-${dotted[2]}-${dotted[3]}`;
  }
  const slashed = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashed) {
    const month = slashed[1].padStart(2, "0");
    const day = slashed[2].padStart(2, "0");
    const year = slashed[3].length === 2 ? `20${slashed[3]}` : slashed[3];
    return `${year}-${month}-${day}`;
  }
  return raw;
}

export function inferReportLevel(rows: Record<string, unknown>[], source: UploadSourceDefinition): ReportLevel {
  const hasKeyword = rows.some((row) => hasText(row.keyword));
  const hasAd = rows.some((row) => hasText(row.ad_name));
  const hasAdGroup = rows.some((row) => hasText(row.ad_group_name));

  if (keywordCapableSources.has(source.id) && hasKeyword) return "keyword";
  if (hasAd) return "ad";
  if (hasAdGroup) return "ad_group";
  return "campaign";
}

export function getRequiredFieldsByReportLevel(reportLevel: ReportLevel) {
  switch (reportLevel) {
    case "campaign":
      return ["campaignName"] as const;
    case "ad_group":
      return ["campaignName", "adGroupName"] as const;
    case "ad":
      return ["campaignName", "adGroupName", "adName"] as const;
    case "keyword":
      return ["campaignName", "adGroupName", "keyword"] as const;
  }
}

export function normalizeRowForDashboard(
  row: {
    date: string;
    platform?: string | null;
    campaign_name: string;
    ad_group_name?: string | null;
    ad_name?: string | null;
    impressions: number;
    clicks: number;
    cost: number;
    conversions?: number;
    revenue?: number;
    device?: string | null;
    keyword?: string | null;
    creative_name?: string | null;
    landing_page?: string | null;
    purchases?: number | null;
    leads?: number | null;
    memo?: string | null;
  },
  source: UploadSourceDefinition,
  reportLevel: ReportLevel
) {
  const platform = String(row.platform || source.platformValue || "").toUpperCase();
  const campaignName = cleanText(row.campaign_name);
  const adGroupName = cleanText(row.ad_group_name);
  const keyword = cleanText(row.keyword);
  const adNameFromRaw = cleanText(row.ad_name);

  const resolvedAdGroupName = adGroupName ?? (reportLevel === "campaign" ? "(unassigned)" : null);
  const resolvedAdName =
    adNameFromRaw ??
    (reportLevel === "keyword" ? keyword ?? "(unassigned)" : reportLevel === "campaign" || reportLevel === "ad_group" ? "(unassigned)" : null);

  const mapped: ReportRow = {
    date: row.date,
    platform,
    sourceType: source.id,
    reportLevel,
    campaignName: campaignName ?? "",
    adGroupName: resolvedAdGroupName ?? "",
    adName: resolvedAdName ?? "",
    device: cleanText(row.device),
    keyword,
    creativeName: cleanText(row.creative_name),
    landingPage: cleanText(row.landing_page),
    impressions: row.impressions,
    clicks: row.clicks,
    cost: row.cost,
    conversions: row.conversions ?? 0,
    revenue: row.revenue ?? 0,
    purchases: row.purchases ?? null,
    leads: row.leads ?? null,
    memo: cleanText(row.memo)
  };

  const missingLabels: string[] = [];

  if (!mapped.platform) {
    missingLabels.push("platform");
  }

  for (const field of getRequiredFieldsByReportLevel(reportLevel)) {
    if (!mapped[field]) {
      missingLabels.push(field);
    }
  }

  return {
    mapped,
    missingLabels
  };
}
