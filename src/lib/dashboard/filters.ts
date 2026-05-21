import { endOfMonth, format, startOfMonth, subDays, subMonths } from "date-fns";
import type { DashboardCompareMode, DashboardFilters, DashboardSectionId } from "@/types/dashboard";

export type DashboardDatePreset = {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
};

export type SidebarItem = {
  id: DashboardSectionId;
  label: string;
  children?: Array<{ id: string; label: string }>;
};

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "summary", label: "매체별 요약 데이터" },
  {
    id: "sa",
    label: "SA 상세",
    children: [
      { id: "all", label: "전체 SA 요약" },
      { id: "naver", label: "네이버 검색" },
      { id: "google", label: "구글 검색" }
    ]
  },
  {
    id: "da",
    label: "DA 상세",
    children: [
      { id: "all", label: "전체 DA 요약" },
      { id: "gfa", label: "네이버 GFA" },
      { id: "daangn", label: "당근" },
      { id: "kakao", label: "카카오" },
      { id: "meta", label: "메타" }
    ]
  },
  { id: "campaign", label: "캠페인 분석" },
  { id: "creative", label: "소재 분석" },
  { id: "keyword", label: "키워드 분석" },
  { id: "landing", label: "랜딩페이지 분석" },
  { id: "compare", label: "기간 비교 리포트" },
  { id: "raw", label: "원본 데이터 테이블" }
];

export const KEYWORD_EXCLUSION_RULES = {
  minClicks: 30,
  minCostVsAverageMultiplier: 1,
  requiredConversions: 0
} as const;

function toDateString(value: Date) {
  return format(value, "yyyy-MM-dd");
}

export function getDatePresets(): DashboardDatePreset[] {
  const today = new Date();
  const yesterday = subDays(today, 1);
  const thisMonthStart = startOfMonth(today);
  const lastMonthBase = subMonths(today, 1);
  const lastMonthStart = startOfMonth(lastMonthBase);
  const lastMonthEnd = endOfMonth(lastMonthBase);

  return [
    { key: "today", label: "오늘", startDate: toDateString(today), endDate: toDateString(today) },
    { key: "yesterday", label: "어제", startDate: toDateString(yesterday), endDate: toDateString(yesterday) },
    { key: "last-7", label: "최근 7일", startDate: toDateString(subDays(today, 6)), endDate: toDateString(today) },
    { key: "last-14", label: "최근 14일", startDate: toDateString(subDays(today, 13)), endDate: toDateString(today) },
    { key: "last-30", label: "최근 30일", startDate: toDateString(subDays(today, 29)), endDate: toDateString(today) },
    { key: "this-month", label: "이번 달", startDate: toDateString(thisMonthStart), endDate: toDateString(today) },
    { key: "last-month", label: "지난 달", startDate: toDateString(lastMonthStart), endDate: toDateString(lastMonthEnd) }
  ];
}

export function createDefaultFilters(startDate = "", endDate = ""): DashboardFilters {
  return {
    startDate,
    endDate,
    compareMode: "previous",
    platform: "ALL",
    adType: "ALL",
    campaign: "ALL",
    adGroup: "ALL",
    creative: "ALL",
    device: "ALL",
    keyword: "ALL",
    landingPage: "ALL"
  };
}

export function formatRangeLabel(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return "기간 선택";
  return `${startDate.replaceAll("-", ".")} - ${endDate.replaceAll("-", ".")}`;
}

export function buildDashboardQuery(filters: DashboardFilters = {}, password = "") {
  const params = new URLSearchParams();

  if (password) params.set("password", password);

  const append = (key: keyof DashboardFilters, value?: string) => {
    if (!value || value === "ALL" || value === "none") return;
    params.set(String(key), value);
  };

  append("startDate", filters.startDate);
  append("endDate", filters.endDate);
  append("compareMode", filters.compareMode);
  append("platform", filters.platform);
  append("adType", filters.adType);
  append("campaign", filters.campaign);
  append("adGroup", filters.adGroup);
  append("creative", filters.creative);
  append("device", filters.device);
  append("keyword", filters.keyword);
  append("landingPage", filters.landingPage);

  return params;
}

export function getSectionTitle(section: DashboardSectionId, subSection = "all") {
  if (section === "summary") return "매체별 요약 데이터";
  if (section === "campaign") return "캠페인 분석";
  if (section === "creative") return "소재 분석";
  if (section === "keyword") return "키워드 분석";
  if (section === "landing") return "랜딩페이지 분석";
  if (section === "compare") return "기간 비교 리포트";
  if (section === "raw") return "원본 데이터 테이블";

  if (section === "sa") {
    if (subSection === "naver") return "SA 상세 · 네이버 검색";
    if (subSection === "google") return "SA 상세 · 구글 검색";
    return "SA 상세 · 전체 SA 요약";
  }

  if (section === "da") {
    if (subSection === "gfa") return "DA 상세 · 네이버 GFA";
    if (subSection === "daangn") return "DA 상세 · 당근";
    if (subSection === "kakao") return "DA 상세 · 카카오";
    if (subSection === "meta") return "DA 상세 · 메타";
    return "DA 상세 · 전체 DA 요약";
  }

  return "광고 성과 대시보드";
}

export function getCompareModeLabel(compareMode: DashboardCompareMode) {
  if (compareMode === "month") return "전월 대비";
  if (compareMode === "year") return "전년 동기간 대비";
  if (compareMode === "none") return "비교 없음";
  return "이전 기간 대비";
}
