import { format, subDays } from "date-fns";
import type { DashboardFilters, DashboardPayload, ReportRow } from "@/types/dashboard";
import { deriveDashboardPayload } from "@/lib/dashboard-derive";
import { getAdTypeForRow } from "@/lib/dashboard/metrics";

const platforms = ["NAVER", "GOOGLE", "META", "KAKAO"];
const campaigns = ["Brand Search", "Lead Gen", "Retargeting", "Promotion", "Content Traffic", "Purchase Conversion"];
const groups = ["Core Keywords", "Competitor", "Interest", "Cart", "New Customer", "High Value", "Mobile", "PC", "Local Target", "Lookalike"];
const ads = Array.from({ length: 24 }, (_, index) => `Creative ${String(index + 1).padStart(2, "0")}`);

export function makeDemoRows(): ReportRow[] {
  const rows: ReportRow[] = [];
  for (let day = 59; day >= 0; day -= 1) {
    const date = format(subDays(new Date(), day), "yyyy-MM-dd");
    for (const platform of platforms) {
      for (let i = 0; i < 3; i += 1) {
        const platformIndex = platforms.indexOf(platform);
        const campaignName = campaigns[(day + i + platformIndex) % campaigns.length];
        const adGroupName = groups[(day + i + platformIndex) % groups.length];
        const adName = ads[(day * 3 + i + platformIndex) % ads.length];
        const impressions = 2800 + day * 32 + i * 510 + platformIndex * 310;
        const clicks = Math.round(impressions * (0.019 + i * 0.004));
        const cost = Math.round(clicks * (540 + i * 110 + platformIndex * 45));
        const conversions = Number((clicks * (0.026 + i * 0.007)).toFixed(1));
        const revenue = Math.round(conversions * (43000 + i * 9200));
        rows.push({
          id: `${date}-${platform}-${campaignName}-${adGroupName}-${adName}`,
          date,
          platform,
          campaignName,
          adGroupName,
          adName,
          device: i % 2 === 0 ? "mobile" : "desktop",
          keyword: platform === "NAVER" || platform === "GOOGLE" ? `${campaignName} keyword` : null,
          creativeName: adName,
          landingPage: `https://example.com/${campaignName.replaceAll(" ", "-").toLowerCase()}`,
          impressions,
          clicks,
          cost,
          conversions,
          revenue,
          purchases: Number((conversions * 0.58).toFixed(1)),
          leads: Number((conversions * 0.42).toFixed(1)),
          memo: ""
        });
      }
    }
  }
  return rows;
}

export function filterDemoRows(rows: ReportRow[], filters: DashboardFilters = {}) {
  return rows.filter((row) => {
    if (filters.startDate && row.date < filters.startDate) return false;
    if (filters.endDate && row.date > filters.endDate) return false;

    if (filters.platform && filters.platform !== "ALL") {
      if (filters.platform === "GFA") {
        if (!(row.platform === "NAVER" && row.creativeName)) return false;
      } else if (filters.platform === "DANGGEUN") {
        if (row.platform !== "DAANGN") return false;
      } else if (row.platform !== filters.platform) {
        return false;
      }
    }

    if (filters.campaign && filters.campaign !== "ALL" && row.campaignName !== filters.campaign) return false;
    if (filters.adGroup && filters.adGroup !== "ALL" && row.adGroupName !== filters.adGroup) return false;
    if (filters.creative && filters.creative !== "ALL" && row.adName !== filters.creative && row.creativeName !== filters.creative) return false;
    if (filters.device && filters.device !== "ALL" && String(row.device ?? "").toUpperCase() !== String(filters.device).toUpperCase()) return false;
    if (filters.keyword && filters.keyword !== "ALL" && row.keyword !== filters.keyword) return false;
    if (filters.landingPage && filters.landingPage !== "ALL" && row.landingPage !== filters.landingPage) return false;
    if (filters.adType && filters.adType !== "ALL" && getAdTypeForRow(row) !== filters.adType) return false;

    return true;
  });
}

export async function getDemoDashboardPayload(filters: DashboardFilters = {}): Promise<DashboardPayload> {
  const allRows = makeDemoRows();
  return deriveDashboardPayload({
    client: {
      id: "demo",
      name: "Demo Client",
      slug: "demo",
      logoUrl: null,
      isPasswordProtected: false
    },
    rows: allRows,
    filters: {
      ...filters,
      startDate: filters.startDate ?? format(subDays(new Date(), 29), "yyyy-MM-dd"),
      endDate: filters.endDate ?? format(new Date(), "yyyy-MM-dd")
    }
  });
}
