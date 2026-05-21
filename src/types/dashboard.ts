export type Platform = "NAVER" | "GOOGLE" | "META" | "KAKAO" | "TIKTOK" | "GA4" | string;
export type ReportLevel = "campaign" | "ad_group" | "ad" | "keyword";
export type DashboardAdType = "ALL" | "SA" | "DA";
export type DashboardCompareMode = "previous" | "month" | "year" | "none";
export type DashboardSectionId = "summary" | "sa" | "da" | "campaign" | "creative" | "keyword" | "landing" | "compare" | "raw";

export type ReportRow = {
  id?: string;
  date: string;
  platform: Platform;
  sourceType?: string | null;
  reportLevel?: ReportLevel | null;
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
  compareMode?: DashboardCompareMode;
  adType?: DashboardAdType;
  adGroup?: string;
  creative?: string;
  device?: string;
  keyword?: string;
  landingPage?: string;
};

export type DashboardFilterOptions = {
  platforms: string[];
  campaigns: string[];
  adGroups: string[];
  creatives: string[];
  devices: string[];
  keywords: string[];
  landingPages: string[];
  startDate?: string;
  endDate?: string;
};

export type ExtendedMetricSummary = MetricSummary & {
  purchases: number;
  leads: number;
  aov: number;
  purchaseRate: number;
  leadRate: number;
};

export type ExtendedComparisonSummary = ExtendedMetricSummary & {
  changes: Record<
    "cost" | "impressions" | "clicks" | "conversions" | "revenue" | "ctr" | "cpc" | "cpa" | "cvr" | "roas" | "purchases" | "leads",
    number | null
  >;
  deltas: Record<
    "cost" | "impressions" | "clicks" | "conversions" | "revenue" | "ctr" | "cpc" | "cpa" | "cvr" | "roas" | "purchases" | "leads",
    number | null
  >;
};

export type BreakdownRow = {
  id: string;
  label: string;
  platform?: string | null;
  adType?: Exclude<DashboardAdType, "ALL"> | null;
  campaignName?: string | null;
  adGroupName?: string | null;
  adName?: string | null;
  creativeName?: string | null;
  keyword?: string | null;
  landingPage?: string | null;
  device?: string | null;
  metrics: ExtendedMetricSummary;
  previous?: ExtendedMetricSummary | null;
  changes?: ExtendedComparisonSummary["changes"];
  deltas?: ExtendedComparisonSummary["deltas"];
};

export type ComparePoint = {
  date: string;
  currentCost: number;
  currentConversions: number;
  currentRevenue: number;
  currentRoas: number;
  previousCost: number;
  previousConversions: number;
  previousRevenue: number;
  previousRoas: number;
};

export type InsightItem = {
  id: string;
  title: string;
  body: string;
  tone?: "neutral" | "positive" | "warning" | "danger";
};

export type DashboardSectionPayload = {
  section: DashboardSectionId;
  subSection?: string;
  summary: ExtendedComparisonSummary;
  previous: ExtendedMetricSummary;
  timeSeries: Array<{ date: string; cost: number; clicks: number; conversions: number; revenue: number; roas: number }>;
  compareSeries?: ComparePoint[];
  adTypeRows: BreakdownRow[];
  sourceTypeRows: BreakdownRow[];
  platformRows: BreakdownRow[];
  campaignRows: BreakdownRow[];
  adGroupRows: BreakdownRow[];
  creativeRows: BreakdownRow[];
  keywordRows: BreakdownRow[];
  landingRows: BreakdownRow[];
  dateRows: BreakdownRow[];
  insights: InsightItem[];
};

export type DashboardRawPage = {
  rows: ReportRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

export type DashboardPayload = {
  client: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    isPasswordProtected: boolean;
  };
  filters: DashboardFilterOptions;
  summary: ComparisonSummary;
  previous: MetricSummary;
  timeSeries: Array<{ date: string; cost: number; clicks: number; conversions: number; revenue: number; roas: number }>;
  platformBreakdown: Array<{ platform: string; cost: number; conversions: number; revenue: number; roas: number }>;
  campaignRankings: Array<{ campaignName: string; cost: number; conversions: number; revenue: number; roas: number; cpa: number }>;
  rows: ReportRow[];
  reportText: string;
};

export type DashboardShellPayload = Pick<DashboardPayload, "client" | "filters" | "summary" | "previous">;

export type DashboardAnalyticsPayload = Pick<DashboardPayload, "timeSeries" | "platformBreakdown" | "campaignRankings" | "reportText">;
