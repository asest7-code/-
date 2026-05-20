export type Platform = "NAVER" | "GOOGLE" | "META" | "KAKAO" | "TIKTOK" | "GA4" | string;

export type ReportRow = {
  id?: string;
  date: string;
  platform: Platform;
  campaignName: string;
  adGroupName: string;
  adName: string;
  device?: string | null;
  keyword?: string | null;
  creativeName?: string | null;
  landingPage?: string | null;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  revenue: number;
  purchases?: number | null;
  leads?: number | null;
  memo?: string | null;
};

export type MetricSummary = {
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cpa: number;
  cvr: number;
  roas: number;
};

export type ComparisonSummary = MetricSummary & {
  changes: Record<"cost" | "impressions" | "clicks" | "conversions" | "revenue" | "cpa" | "roas", number | null>;
};

export type DashboardFilters = {
  startDate?: string;
  endDate?: string;
  platform?: string;
  campaign?: string;
};

export type DashboardPayload = {
  client: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    isPasswordProtected: boolean;
  };
  filters: {
    platforms: string[];
    campaigns: string[];
    startDate?: string;
    endDate?: string;
  };
  summary: ComparisonSummary;
  previous: MetricSummary;
  timeSeries: Array<{ date: string; cost: number; clicks: number; conversions: number; revenue: number; roas: number }>;
  platformBreakdown: Array<{ platform: string; cost: number; conversions: number; revenue: number; roas: number }>;
  campaignRankings: Array<{ campaignName: string; cost: number; conversions: number; revenue: number; roas: number; cpa: number }>;
  rows: ReportRow[];
  reportText: string;
};
