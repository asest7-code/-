import { buildBreakdownRow, getAdTypeForRow } from "@/lib/dashboard/metrics";
import type { BreakdownRow, ReportRow } from "@/types/dashboard";

type Dimension = "date" | "platform" | "campaign" | "adGroup" | "creative" | "keyword" | "landing" | "adType" | "sourceType";

type GroupDescriptor = {
  label: string;
  rows: ReportRow[];
  extra: Partial<BreakdownRow>;
};

export function groupRowsByDimension(rows: ReportRow[], previousRows: ReportRow[], dimension: Dimension) {
  const currentGroups = buildGroups(rows, dimension);
  const previousGroups = buildGroups(previousRows, dimension);

  return Array.from(currentGroups.entries()).map(([id, meta]) => {
    const previous = previousGroups.get(id)?.rows ?? [];
    return buildBreakdownRow(id, meta.label, meta.rows, previous, meta.extra);
  });
}

function buildGroups(rows: ReportRow[], dimension: Dimension): Map<string, GroupDescriptor> {
  const groups = new Map<string, GroupDescriptor>();

  for (const row of rows) {
    const descriptor = getDescriptor(row, dimension);
    const current = groups.get(descriptor.id);

    if (current) {
      current.rows.push(row);
      continue;
    }

    groups.set(descriptor.id, {
      label: descriptor.label,
      rows: [row],
      extra: descriptor.extra
    });
  }

  return groups;
}

function getDescriptor(row: ReportRow, dimension: Dimension) {
  const adType = getAdTypeForRow(row);

  if (dimension === "date") {
    return {
      id: `${row.date}`,
      label: row.date,
      extra: { platform: row.platform, adType }
    };
  }

  if (dimension === "platform") {
    return {
      id: String(row.platform),
      label: String(row.platform),
      extra: { platform: row.platform, adType }
    };
  }

  if (dimension === "adType") {
    return {
      id: adType,
      label: adType,
      extra: { adType }
    };
  }

  if (dimension === "sourceType") {
    const sourceType = row.sourceType || "(미지정)";
    return {
      id: sourceType,
      label: sourceType,
      extra: { platform: row.platform, adType }
    };
  }

  if (dimension === "campaign") {
    return {
      id: `${row.platform}::${row.campaignName}`,
      label: row.campaignName || "(미지정)",
      extra: { platform: row.platform, campaignName: row.campaignName, adType }
    };
  }

  if (dimension === "adGroup") {
    return {
      id: `${row.platform}::${row.campaignName}::${row.adGroupName}`,
      label: row.adGroupName || "(미지정)",
      extra: { platform: row.platform, campaignName: row.campaignName, adGroupName: row.adGroupName, adType }
    };
  }

  if (dimension === "creative") {
    const creativeName = row.creativeName || row.adName || "(미지정)";
    return {
      id: `${row.platform}::${row.campaignName}::${row.adGroupName}::${creativeName}`,
      label: creativeName,
      extra: {
        platform: row.platform,
        campaignName: row.campaignName,
        adGroupName: row.adGroupName,
        adName: row.adName,
        creativeName,
        adType
      }
    };
  }

  if (dimension === "keyword") {
    const keyword = row.keyword || "(미지정)";
    return {
      id: `${row.platform}::${row.campaignName}::${row.adGroupName}::${keyword}`,
      label: keyword,
      extra: {
        platform: row.platform,
        campaignName: row.campaignName,
        adGroupName: row.adGroupName,
        keyword,
        adType
      }
    };
  }

  const landingPage = row.landingPage || "(미지정)";
  return {
    id: `${row.platform}::${landingPage}`,
    label: landingPage,
    extra: { platform: row.platform, landingPage, adType }
  };
}

export function sortBreakdownRows(
  rows: BreakdownRow[],
  sortKey: "cost" | "revenue" | "conversions" | "clicks" | "roas" | "ctr" | "cpa" = "cost"
) {
  return [...rows].sort((left, right) => {
    if (sortKey === "cost") return right.metrics.cost - left.metrics.cost;
    if (sortKey === "revenue") return right.metrics.revenue - left.metrics.revenue;
    if (sortKey === "conversions") return right.metrics.conversions - left.metrics.conversions;
    if (sortKey === "clicks") return right.metrics.clicks - left.metrics.clicks;
    if (sortKey === "ctr") return right.metrics.ctr - left.metrics.ctr;
    if (sortKey === "cpa") return left.metrics.cpa - right.metrics.cpa;
    return right.metrics.roas - left.metrics.roas;
  });
}
