"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { DashboardHeader } from "@/components/dashboard/Header";
import { InsightBox } from "@/components/dashboard/InsightBox";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { buildDashboardQuery, createDefaultFilters } from "@/lib/dashboard/filters";
import { rowsToCsv, downloadCsvFile } from "@/lib/dashboard/csv";
import type {
  BreakdownRow,
  DashboardFilters,
  DashboardRawPage,
  DashboardSectionId,
  DashboardSectionPayload,
  DashboardShellPayload
} from "@/types/dashboard";
import { currency, formatNumber, formatPercent, formatRoas } from "@/utils/metrics";

const CHART_COLORS = {
  cost: "#3b82f6",
  revenue: "#ef4444",
  conversions: "#fbbf24",
  roas: "#22c55e"
} as const;

type RawSortKey = "date" | "cost" | "conversions" | "revenue" | "roas" | "clicks";

async function fetchJson<T>(url: string) {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "데이터를 불러오지 못했습니다.");
  }

  return data as T;
}

function tooltipFormatter(value: number, name: string) {
  if (["cost", "revenue", "cpc", "cpa", "aov"].includes(name)) return [`${currency(Number(value))}원`, name];
  if (["roas", "ctr", "cvr", "purchaseRate", "leadRate"].includes(name)) return [`${formatPercent(Number(value), name === "roas" ? 0 : 1)}`, name];
  return [formatNumber(Number(value)), name];
}

function prettifyDateLabel(value?: string) {
  return value ? value.replaceAll("-", ".") : "-";
}

function formatChangeBadge(change?: number | null) {
  if (change == null) return "비교 없음";
  const prefix = change > 0 ? "+" : "";
  return `${prefix}${formatPercent(change, 1)}`;
}

function getMetricTone(change?: number | null) {
  if (change == null || change === 0) return "text-slate-400";
  return change > 0 ? "text-emerald-400" : "text-red-400";
}

export function DashboardView({ clientSlug, reportMode = false }: { clientSlug: string; reportMode?: boolean }) {
  const [shell, setShell] = useState<DashboardShellPayload | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(createDefaultFilters());
  const [activeSection, setActiveSection] = useState<DashboardSectionId>(reportMode ? "compare" : "summary");
  const [activeSubSection, setActiveSubSection] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [password, setPassword] = useState("");
  const [shellLoading, setShellLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionData, setSectionData] = useState<DashboardSectionPayload | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const shellRequest = useRef(0);
  const sectionRequest = useRef(0);
  const sectionCache = useRef(new Map<string, DashboardSectionPayload>());

  const queryString = useMemo(() => buildDashboardQuery(filters, password).toString(), [filters, password]);

  useEffect(() => {
    const timeout = toastMessage ? window.setTimeout(() => setToastMessage(""), 2200) : undefined;
    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [toastMessage]);

  useEffect(() => {
    void loadShell();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSlug]);

  useEffect(() => {
    if (!shell) return;
    void loadSection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shell, activeSection, activeSubSection, queryString]);

  async function loadShell(nextPassword = password, nextFilters = filters) {
    const version = shellRequest.current + 1;
    shellRequest.current = version;
    setShellLoading(true);
    setErrorMessage("");

    try {
      const params = buildDashboardQuery(nextFilters, nextPassword);
      const response = await fetch(`/api/dashboard/${clientSlug}${params.toString() ? `?${params.toString()}` : ""}`);

      if (version !== shellRequest.current) return;

      if (response.status === 401) {
        setPasswordRequired(true);
        setShellLoading(false);
        return;
      }

      if (response.status === 404) {
        setShell(null);
        setShellLoading(false);
        return;
      }

      const data = (await response.json()) as DashboardShellPayload;
      setShell(data);
      setPasswordRequired(false);
      setPassword(nextPassword);
      setFilters((current) => ({
        ...createDefaultFilters(data.filters.startDate ?? "", data.filters.endDate ?? ""),
        ...current,
        ...nextFilters,
        startDate: nextFilters.startDate ?? data.filters.startDate ?? "",
        endDate: nextFilters.endDate ?? data.filters.endDate ?? ""
      }));
    } catch (error) {
      if (version !== shellRequest.current) return;
      setErrorMessage(error instanceof Error ? error.message : "대시보드 기본 정보를 불러오지 못했습니다.");
      setShell(null);
    } finally {
      if (version === shellRequest.current) {
        setShellLoading(false);
      }
    }
  }

  async function loadSection() {
    const cacheKey = [clientSlug, activeSection, activeSubSection, queryString].join("::");
    const cached = sectionCache.current.get(cacheKey);
    if (cached) {
      setSectionData(cached);
      return;
    }

    const version = sectionRequest.current + 1;
    sectionRequest.current = version;
    setSectionLoading(true);

    try {
      const params = buildDashboardQuery(filters, password);
      params.set("section", activeSection);
      params.set("subSection", activeSubSection);

      const data = await fetchJson<DashboardSectionPayload>(`/api/dashboard/${clientSlug}/section?${params.toString()}`);
      if (version !== sectionRequest.current) return;

      sectionCache.current.set(cacheKey, data);
      setSectionData(data);
    } catch (error) {
      if (version !== sectionRequest.current) return;
      setErrorMessage(error instanceof Error ? error.message : "섹션 데이터를 불러오지 못했습니다.");
      setSectionData(null);
    } finally {
      if (version === sectionRequest.current) {
        setSectionLoading(false);
      }
    }
  }

  function updateFilters(next: DashboardFilters) {
    sectionCache.current.clear();
    setFilters(next);
    void loadShell(password, next);
  }

  async function handleShare() {
    await navigator.clipboard.writeText(window.location.href);
    setToastMessage("현재 URL을 클립보드에 복사했습니다.");
  }

  if (passwordRequired) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <form
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            void loadShell(passwordDraft, filters);
          }}
        >
          <h1 className="text-2xl font-bold text-slate-950">비밀번호 입력</h1>
          <p className="mt-2 text-sm text-slate-500">이 대시보드는 비밀번호가 설정되어 있습니다.</p>
          <input className="input mt-5" type="password" value={passwordDraft} onChange={(event) => setPasswordDraft(event.target.value)} />
          <button className="mt-4 w-full rounded-md bg-sky-700 px-4 py-3 font-semibold text-white hover:bg-sky-800">대시보드 보기</button>
        </form>
      </main>
    );
  }

  if (shellLoading && !shell) {
    return <DashboardWorkspaceSkeleton />;
  }

  if (!shell) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">대시보드를 찾을 수 없습니다</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{errorMessage || "광고주 URL을 확인하거나 관리자 화면에서 데이터를 먼저 업로드해 주세요."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      {toastMessage ? <Toast message={toastMessage} /> : null}

      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        <Sidebar
          open={sidebarOpen}
          activeSection={activeSection}
          activeSubSection={activeSubSection}
          onClose={() => setSidebarOpen(false)}
          onSelect={(section, subSection) => {
            setActiveSection(section);
            setActiveSubSection(subSection ?? "all");
          }}
        />

        <div className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="space-y-6">
            <DashboardHeader
              clientSlug={clientSlug}
              clientName={shell.client.name}
              section={activeSection}
              subSection={activeSubSection}
              queryString={queryString}
              onMenuClick={() => setSidebarOpen(true)}
              onPrint={() => window.print()}
              onShare={() => void handleShare()}
            />

            <FilterBar filters={filters} options={shell.filters} password={password} onChange={updateFilters} />

            {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

            <SectionRenderer
              clientSlug={clientSlug}
              section={activeSection}
              subSection={activeSubSection}
              shell={shell}
              filters={filters}
              password={password}
              data={sectionData}
              loading={sectionLoading}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function SectionRenderer({
  clientSlug,
  section,
  subSection,
  shell,
  filters,
  password,
  data,
  loading
}: {
  clientSlug: string;
  section: DashboardSectionId;
  subSection: string;
  shell: DashboardShellPayload;
  filters: DashboardFilters;
  password: string;
  data: DashboardSectionPayload | null;
  loading: boolean;
}) {
  if (loading && !data) return <DashboardSectionSkeleton />;

  if (!data) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        데이터를 불러오지 못했습니다.
      </section>
    );
  }

  if (section === "raw") {
    return <RawDataPanel clientSlug={clientSlug} filters={filters} password={password} />;
  }

  if (section === "compare") {
    return <CompareSectionView data={data} />;
  }

  if (section === "sa") {
    return <SearchSectionView data={data} subSection={subSection} />;
  }

  if (section === "da") {
    return <DisplaySectionView data={data} subSection={subSection} />;
  }

  if (section === "campaign") {
    return <CampaignSectionView data={data} />;
  }

  if (section === "creative") {
    return <CreativeSectionView data={data} />;
  }

  if (section === "keyword") {
    return <KeywordSectionView data={data} />;
  }

  if (section === "landing") {
    return <LandingSectionView data={data} />;
  }

  return <SummarySectionView data={data} fallbackSummary={shell.summary} />;
}

function SummarySectionView({ data, fallbackSummary }: { data: DashboardSectionPayload; fallbackSummary: DashboardShellPayload["summary"] }) {
  const summary = data.summary ?? fallbackSummary;

  return (
    <div className="space-y-6">
      <KpiGrid summary={summary} />
      <InsightBox insights={data.insights} />

      <ReportBoard
        left={
          <>
            <ReportSummaryTable title="매체" rows={data.platformRows} />
            <ReportSummaryTable title="광고 유형" rows={data.adTypeRows} />
            <ReportSummaryTable title="소스 유형" rows={data.sourceTypeRows} />
          </>
        }
        right={
          <>
            <MixedTrendChartCard title="일자별 총 비용 / 전환매출액 / 전환수" rows={data.timeSeries} />
            <MixedBreakdownChartCard title="소스 유형별 성과 비교" rows={data.sourceTypeRows} />
          </>
        }
      />

      <ReportBoard
        left={
          <>
            <ReportSummaryTable title="상위 캠페인" rows={data.campaignRows.slice(0, 8)} />
            <ReportSummaryTable title="상위 광고그룹" rows={data.adGroupRows.slice(0, 8)} />
          </>
        }
        right={
          <>
            <MixedBreakdownChartCard title="매체별 비용 / 매출 / 전환수" rows={data.platformRows} />
            <MixedBreakdownChartCard title="상위 캠페인 성과" rows={data.campaignRows.slice(0, 8)} />
          </>
        }
      />

      <BreakdownTable title="일자별 데이터" description="일자 단위로 비용, 클릭, 전환, 매출, ROAS를 확인합니다." rows={data.dateRows} type="date" />
    </div>
  );
}

function SearchSectionView({ data, subSection }: { data: DashboardSectionPayload; subSection: string }) {
  return (
    <div className="space-y-6">
      <KpiGrid summary={data.summary} />
      <InsightBox insights={data.insights} title={subSection === "all" ? "SA 운영 인사이트" : "검색광고 인사이트"} />

      <ReportBoard
        left={
          <>
            <ReportSummaryTable title="키워드" rows={data.keywordRows.slice(0, 10)} />
            <ReportSummaryTable title="캠페인" rows={data.campaignRows.slice(0, 8)} />
            <ReportSummaryTable title="광고그룹" rows={data.adGroupRows.slice(0, 8)} />
          </>
        }
        right={
          <>
            <MixedTrendChartCard title="일자별 SA 비용 / 전환매출액 / 전환수" rows={data.timeSeries} />
            <MixedBreakdownChartCard title="키워드별 성과 비교" rows={data.keywordRows.slice(0, 10)} />
          </>
        }
      />

      <BreakdownTable title="키워드 분석" rows={data.keywordRows} type="keyword" />
      <BreakdownTable title="캠페인 / 광고그룹 분석" rows={data.campaignRows} type="campaign" />
    </div>
  );
}

function DisplaySectionView({ data, subSection }: { data: DashboardSectionPayload; subSection: string }) {
  return (
    <div className="space-y-6">
      <KpiGrid summary={data.summary} includeCpm />
      <InsightBox insights={data.insights} title={subSection === "all" ? "DA 운영 인사이트" : "디스플레이 광고 인사이트"} />

      <ReportBoard
        left={
          <>
            <ReportSummaryTable title="매체" rows={data.platformRows} />
            <ReportSummaryTable title="광고그룹" rows={data.adGroupRows.slice(0, 8)} />
            <ReportSummaryTable title="소재" rows={data.creativeRows.slice(0, 10)} />
          </>
        }
        right={
          <>
            <MixedTrendChartCard title="일자별 DA 비용 / 전환매출액 / 전환수" rows={data.timeSeries} />
            <MixedBreakdownChartCard title="소재별 성과 비교" rows={data.creativeRows.slice(0, 10)} />
          </>
        }
      />

      <BreakdownTable title="소재 분석" rows={data.creativeRows} type="creative" />
      <BreakdownTable title="캠페인 / 광고그룹 분석" rows={data.campaignRows} type="campaign" />
    </div>
  );
}

function CampaignSectionView({ data }: { data: DashboardSectionPayload }) {
  return (
    <div className="space-y-6">
      <KpiGrid summary={data.summary} />
      <InsightBox insights={data.insights} />
      <ReportBoard
        left={
          <>
            <ReportSummaryTable title="캠페인 성과" rows={data.campaignRows.slice(0, 10)} />
            <ReportSummaryTable title="매체별 캠페인 비중" rows={data.platformRows} />
          </>
        }
        right={
          <>
            <MixedBreakdownChartCard title="캠페인별 비용 / 매출 / 전환수" rows={data.campaignRows.slice(0, 10)} />
            <MixedTrendChartCard title="전체 기간 추이" rows={data.timeSeries} />
          </>
        }
      />
      <BreakdownTable title="캠페인 KPI 테이블" rows={data.campaignRows} type="campaign" />
    </div>
  );
}

function CreativeSectionView({ data }: { data: DashboardSectionPayload }) {
  return (
    <div className="space-y-6">
      <KpiGrid summary={data.summary} includeCpm />
      <InsightBox insights={data.insights} />
      <ReportBoard
        left={
          <>
            <ReportSummaryTable title="상위 소재" rows={data.creativeRows.slice(0, 10)} />
            <ReportSummaryTable title="상위 광고그룹" rows={data.adGroupRows.slice(0, 8)} />
          </>
        }
        right={
          <>
            <MixedBreakdownChartCard title="소재별 비용 / 매출 / 전환수" rows={data.creativeRows.slice(0, 10)} />
            <MixedTrendChartCard title="전체 기간 추이" rows={data.timeSeries} />
          </>
        }
      />
      <BreakdownTable title="소재 KPI 테이블" rows={data.creativeRows} type="creative" />
    </div>
  );
}

function KeywordSectionView({ data }: { data: DashboardSectionPayload }) {
  const exclusionRows = data.keywordRows.filter((row) => row.metrics.clicks >= 30 && row.metrics.conversions === 0);

  return (
    <div className="space-y-6">
      <KpiGrid summary={data.summary} />
      <InsightBox insights={data.insights} />
      <ReportBoard
        left={
          <>
            <ReportSummaryTable title="키워드" rows={data.keywordRows.slice(0, 10)} />
            <ReportSummaryTable title="제외 키워드 후보" rows={exclusionRows.slice(0, 8)} />
          </>
        }
        right={
          <>
            <MixedBreakdownChartCard title="키워드별 비용 / 매출 / 전환수" rows={data.keywordRows.slice(0, 10)} />
            <MixedTrendChartCard title="전체 기간 추이" rows={data.timeSeries} />
          </>
        }
      />
      <BreakdownTable title="키워드 KPI 테이블" rows={data.keywordRows} type="keyword" />
    </div>
  );
}

function LandingSectionView({ data }: { data: DashboardSectionPayload }) {
  return (
    <div className="space-y-6">
      <KpiGrid summary={data.summary} />
      <InsightBox insights={data.insights} />
      <ReportBoard
        left={
          <>
            <ReportSummaryTable title="랜딩페이지" rows={data.landingRows.slice(0, 10)} />
            <ReportSummaryTable title="매체" rows={data.platformRows} />
          </>
        }
        right={
          <>
            <MixedBreakdownChartCard title="랜딩페이지별 비용 / 매출 / 전환수" rows={data.landingRows.slice(0, 10)} />
            <MixedTrendChartCard title="전체 기간 추이" rows={data.timeSeries} />
          </>
        }
      />
      <BreakdownTable title="랜딩페이지 KPI 테이블" rows={data.landingRows} type="landing" />
    </div>
  );
}

function CompareSectionView({ data }: { data: DashboardSectionPayload }) {
  return (
    <div className="space-y-6">
      <KpiGrid summary={data.summary} includeCpm />
      <InsightBox insights={data.insights} title="기간 비교 리포트" />

      <div className="grid gap-4 xl:grid-cols-2">
        <CompareTrendChartCard title="비용 추이 비교" rows={data.compareSeries ?? []} currentKey="currentCost" previousKey="previousCost" />
        <CompareTrendChartCard title="전환 추이 비교" rows={data.compareSeries ?? []} currentKey="currentConversions" previousKey="previousConversions" />
        <CompareTrendChartCard title="ROAS 추이 비교" rows={data.compareSeries ?? []} currentKey="currentRoas" previousKey="previousRoas" />
        <MixedBreakdownChartCard title="매체별 비교 기준 성과" rows={data.platformRows} />
      </div>

      <BreakdownTable title="비교 테이블" rows={data.campaignRows} type="campaign" />
    </div>
  );
}

function RawDataPanel({ clientSlug, filters, password }: { clientSlug: string; filters: DashboardFilters; password: string }) {
  const [data, setData] = useState<DashboardRawPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<RawSortKey>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    let ignore = false;

    async function loadRawRows() {
      setLoading(true);
      const params = buildDashboardQuery(filters, password);
      params.set("page", String(page));
      params.set("sortKey", sortKey);
      params.set("sortDirection", sortDirection);
      if (query.trim()) params.set("query", query.trim());

      try {
        const response = await fetchJson<DashboardRawPage>(`/api/dashboard/${clientSlug}/raw?${params.toString()}`);
        if (!ignore) setData(response);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadRawRows();

    return () => {
      ignore = true;
    };
  }, [clientSlug, filters, password, page, query, sortDirection, sortKey]);

  async function exportCurrentRows(type: "csv" | "xlsx") {
    const params = buildDashboardQuery(filters, password);
    params.set("page", "1");
    params.set("pageSize", "5000");
    params.set("sortKey", sortKey);
    params.set("sortDirection", sortDirection);
    if (query.trim()) params.set("query", query.trim());

    const payload = await fetchJson<DashboardRawPage>(`/api/dashboard/${clientSlug}/raw?${params.toString()}`);
    const exportRows = payload.rows.map((row) => ({
      date: row.date,
      platform: row.platform,
      campaign_name: row.campaignName,
      ad_group_name: row.adGroupName,
      ad_name: row.adName,
      device: row.device ?? "",
      keyword: row.keyword ?? "",
      creative_name: row.creativeName ?? "",
      landing_page: row.landingPage ?? "",
      impressions: row.impressions,
      clicks: row.clicks,
      cost: row.cost,
      conversions: row.conversions,
      revenue: row.revenue,
      roas: row.cost === 0 ? 0 : Math.round((row.revenue / row.cost) * 100)
    }));

    if (type === "csv") {
      downloadCsvFile(`${clientSlug}-raw-data.csv`, rowsToCsv(exportRows));
      return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "raw-data");
    XLSX.writeFile(workbook, `${clientSlug}-raw-data.xlsx`);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950">원본 데이터 테이블</h3>
            <p className="mt-1 text-sm text-slate-500">검색, 정렬, CSV / Excel 다운로드를 지원합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input className="input w-full lg:w-72" placeholder="캠페인, 키워드, 랜딩페이지 검색" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={() => void exportCurrentRows("csv")}>
              CSV 다운로드
            </button>
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={() => void exportCurrentRows("xlsx")}>
              Excel 다운로드
            </button>
          </div>
        </div>
      </div>

      <DataTable
        title="원본 데이터"
        description={loading ? "데이터를 불러오는 중입니다." : `총 ${(data?.total ?? 0).toLocaleString("ko-KR")}건`}
        rows={data?.rows ?? []}
        searchable={false}
        defaultSortKey="date"
        pageSize={data?.pageSize ?? 20}
        columns={[
          { key: "date", header: "일자", render: (row) => row.date, sortValue: (row) => row.date },
          { key: "platform", header: "매체", render: (row) => row.platform, sortValue: (row) => String(row.platform) },
          { key: "campaignName", header: "캠페인", render: (row) => row.campaignName, sortValue: (row) => row.campaignName },
          { key: "adGroupName", header: "광고그룹", render: (row) => row.adGroupName, sortValue: (row) => row.adGroupName },
          { key: "adName", header: "소재/광고", render: (row) => row.adName, sortValue: (row) => row.adName },
          { key: "keyword", header: "키워드", render: (row) => row.keyword || "-", sortValue: (row) => row.keyword || "" },
          { key: "landingPage", header: "랜딩페이지", render: (row) => row.landingPage || "-", sortValue: (row) => row.landingPage || "" },
          { key: "impressions", header: "노출", render: (row) => formatNumber(row.impressions), sortValue: (row) => row.impressions },
          { key: "clicks", header: "클릭", render: (row) => formatNumber(row.clicks), sortValue: (row) => row.clicks },
          { key: "cost", header: "총 비용", render: (row) => `${currency(row.cost)}원`, sortValue: (row) => row.cost },
          { key: "conversions", header: "전환수", render: (row) => formatNumber(row.conversions), sortValue: (row) => row.conversions },
          { key: "revenue", header: "전환매출액", render: (row) => `${currency(row.revenue)}원`, sortValue: (row) => row.revenue },
          {
            key: "roas",
            header: "ROAS",
            render: (row) => formatRoas(row.cost === 0 ? 0 : (row.revenue / row.cost) * 100),
            sortValue: (row) => (row.cost === 0 ? 0 : (row.revenue / row.cost) * 100)
          }
        ]}
      />
    </div>
  );
}

function KpiGrid({ summary, includeCpm = false }: { summary: DashboardSectionPayload["summary"]; includeCpm?: boolean }) {
  const items = [
    { title: "총 비용", value: summary.cost, format: "currency" as const, change: summary.changes.cost, delta: summary.deltas.cost },
    { title: "노출수", value: summary.impressions, format: "number" as const, change: summary.changes.impressions, delta: summary.deltas.impressions },
    { title: "클릭수", value: summary.clicks, format: "number" as const, change: summary.changes.clicks, delta: summary.deltas.clicks },
    { title: "전환수", value: summary.conversions, format: "number" as const, change: summary.changes.conversions, delta: summary.deltas.conversions },
    { title: "전환매출액", value: summary.revenue, format: "currency" as const, change: summary.changes.revenue, delta: summary.deltas.revenue },
    { title: "CTR", value: summary.ctr, format: "percent" as const, change: summary.changes.ctr, delta: summary.deltas.ctr },
    { title: "CPC", value: summary.cpc, format: "currency" as const, change: summary.changes.cpc, delta: summary.deltas.cpc },
    { title: "CPA", value: summary.cpa, format: "currency" as const, change: summary.changes.cpa, delta: summary.deltas.cpa },
    { title: "CVR", value: summary.cvr, format: "percent" as const, change: summary.changes.cvr, delta: summary.deltas.cvr },
    { title: "ROAS", value: summary.roas, format: "roas" as const, change: summary.changes.roas, delta: summary.deltas.roas }
  ];

  if (includeCpm) {
    items.splice(7, 0, { title: "CPM", value: summary.cpm, format: "currency" as const, change: null, delta: null });
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <KpiCard key={item.title} title={item.title} value={item.value} format={item.format} change={item.change} delta={item.delta} />
      ))}
    </section>
  );
}

function ReportBoard({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return <section className="grid gap-4 xl:grid-cols-[0.96fr_1.04fr]">{left}<div className="space-y-4">{right}</div></section>;
}

function ReportSummaryTable({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  const topRows = rows.slice(0, 5);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-sm">
      <div className="border-b border-slate-800 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>

      {topRows.length === 0 ? (
        <div className="px-4 py-8 text-sm text-slate-400">충분한 데이터가 없습니다.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">{title}</th>
                <th className="px-3 py-3 text-right font-semibold">노출수</th>
                <th className="px-3 py-3 text-right font-semibold">클릭수</th>
                <th className="px-3 py-3 text-right font-semibold">CPC</th>
                <th className="px-3 py-3 text-right font-semibold">총 비용</th>
                <th className="px-3 py-3 text-right font-semibold">전환율</th>
                <th className="px-3 py-3 text-right font-semibold">전환수</th>
                <th className="px-3 py-3 text-right font-semibold">전환매출액</th>
                <th className="px-3 py-3 text-right font-semibold">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {topRows.map((row, index) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="px-4 py-3 font-semibold text-white">
                    <span className="mr-2 text-slate-500">{index + 1}.</span>
                    {row.label}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-300">{formatNumber(row.metrics.impressions)}</td>
                  <td className="px-3 py-3 text-right text-slate-300">{formatNumber(row.metrics.clicks)}</td>
                  <td className="px-3 py-3 text-right text-slate-300">{currency(row.metrics.cpc)}</td>
                  <td className="px-3 py-3 text-right text-slate-100">{currency(row.metrics.cost)}</td>
                  <td className="px-3 py-3 text-right text-slate-300">{formatPercent(row.metrics.cvr, 2)}</td>
                  <td className="px-3 py-3 text-right text-slate-300">{formatNumber(row.metrics.conversions)}</td>
                  <td className="px-3 py-3 text-right text-slate-100">{currency(row.metrics.revenue)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-white">{formatRoas(row.metrics.roas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function MixedTrendChartCard({
  title,
  rows
}: {
  title: string;
  rows: Array<{ date: string; cost: number; revenue: number; conversions: number }>;
}) {
  return (
    <ChartCard title={title} description="총 비용, 전환매출액, 전환수를 함께 비교합니다.">
      {rows.length ? (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={rows}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={prettifyDateLabel} />
            <YAxis yAxisId="left" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value) => `${Math.round(Number(value) / 10000)}만`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip formatter={tooltipFormatter} labelFormatter={prettifyDateLabel} />
            <Legend wrapperStyle={{ color: "#e2e8f0" }} />
            <Bar yAxisId="left" dataKey="cost" name="총 비용" fill={CHART_COLORS.cost} radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="revenue" name="전환매출액" fill={CHART_COLORS.revenue} radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="conversions" name="전환수" stroke={CHART_COLORS.conversions} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ) : null}
    </ChartCard>
  );
}

function MixedBreakdownChartCard({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  const chartRows = rows.slice(0, 8).map((row) => ({
    label: row.label,
    cost: row.metrics.cost,
    revenue: row.metrics.revenue,
    conversions: row.metrics.conversions
  }));

  return (
    <ChartCard title={title} description="비용과 매출은 막대로, 전환수는 선으로 비교합니다.">
      {chartRows.length ? (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartRows}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} angle={-18} textAnchor="end" height={64} />
            <YAxis yAxisId="left" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value) => `${Math.round(Number(value) / 10000)}만`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip formatter={tooltipFormatter} />
            <Legend wrapperStyle={{ color: "#e2e8f0" }} />
            <Bar yAxisId="left" dataKey="cost" name="총 비용" fill={CHART_COLORS.cost} radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="revenue" name="전환매출액" fill={CHART_COLORS.revenue} radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="conversions" name="전환수" stroke={CHART_COLORS.conversions} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ) : null}
    </ChartCard>
  );
}

function CompareTrendChartCard({
  title,
  rows,
  currentKey,
  previousKey
}: {
  title: string;
  rows: DashboardSectionPayload["compareSeries"];
  currentKey: "currentCost" | "currentConversions" | "currentRoas";
  previousKey: "previousCost" | "previousConversions" | "previousRoas";
}) {
  return (
    <ChartCard title={title} description="현재 기간과 비교 기간의 추이를 함께 보여줍니다.">
      {rows && rows.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={rows}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={prettifyDateLabel} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip formatter={tooltipFormatter} labelFormatter={prettifyDateLabel} />
            <Legend wrapperStyle={{ color: "#e2e8f0" }} />
            <Line type="monotone" dataKey={currentKey} name="현재 기간" stroke={CHART_COLORS.cost} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey={previousKey} name="비교 기간" stroke={CHART_COLORS.revenue} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ) : null}
    </ChartCard>
  );
}

function BreakdownTable({
  title,
  rows,
  type,
  description
}: {
  title: string;
  rows: BreakdownRow[];
  type: "date" | "campaign" | "creative" | "keyword" | "landing";
  description?: string;
}) {
  return (
    <DataTable
      title={title}
      description={description}
      rows={rows}
      defaultSortKey="cost"
      columns={[
        { key: "label", header: typeLabel(type), render: (row) => row.label, sortValue: (row) => row.label },
        { key: "platform", header: "매체", render: (row) => row.platform || "-", sortValue: (row) => row.platform || "" },
        { key: "impressions", header: "노출", render: (row) => formatNumber(row.metrics.impressions), sortValue: (row) => row.metrics.impressions },
        { key: "clicks", header: "클릭", render: (row) => formatNumber(row.metrics.clicks), sortValue: (row) => row.metrics.clicks },
        { key: "cost", header: "총 비용", render: (row) => `${currency(row.metrics.cost)}원`, sortValue: (row) => row.metrics.cost },
        { key: "conversions", header: "전환수", render: (row) => formatNumber(row.metrics.conversions), sortValue: (row) => row.metrics.conversions },
        { key: "revenue", header: "전환매출액", render: (row) => `${currency(row.metrics.revenue)}원`, sortValue: (row) => row.metrics.revenue },
        { key: "ctr", header: "CTR", render: (row) => formatPercent(row.metrics.ctr, 2), sortValue: (row) => row.metrics.ctr },
        { key: "cpc", header: "CPC", render: (row) => `${currency(row.metrics.cpc)}원`, sortValue: (row) => row.metrics.cpc },
        { key: "cpa", header: "CPA", render: (row) => `${currency(row.metrics.cpa)}원`, sortValue: (row) => row.metrics.cpa },
        { key: "cvr", header: "전환율", render: (row) => formatPercent(row.metrics.cvr, 2), sortValue: (row) => row.metrics.cvr },
        { key: "roas", header: "ROAS", render: (row) => formatRoas(row.metrics.roas), sortValue: (row) => row.metrics.roas },
        {
          key: "change",
          header: "증감률",
          render: (row) => <span className={getMetricTone(row.changes?.roas)}>{formatChangeBadge(row.changes?.roas)}</span>,
          sortValue: (row) => row.changes?.roas ?? -999999
        }
      ]}
    />
  );
}

function typeLabel(type: "date" | "campaign" | "creative" | "keyword" | "landing") {
  if (type === "date") return "일자";
  if (type === "campaign") return "캠페인";
  if (type === "creative") return "소재";
  if (type === "keyword") return "키워드";
  return "랜딩페이지";
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
      {message}
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed right-5 top-5 z-50 rounded-md bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-lg">
      {message}
    </div>
  );
}

function DashboardWorkspaceSkeleton() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="grid gap-6 lg:grid-cols-[292px_1fr]">
        <div className="h-[80vh] animate-pulse rounded-2xl bg-slate-900" />
        <div className="space-y-6">
          <div className="h-28 animate-pulse rounded-2xl bg-white" />
          <div className="h-36 animate-pulse rounded-2xl bg-white" />
          <div className="grid gap-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-2xl bg-slate-900" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function DashboardSectionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-2xl bg-slate-900" />
        ))}
      </div>
      <div className="h-56 animate-pulse rounded-2xl bg-slate-950" />
      <div className="grid gap-4 xl:grid-cols-[0.96fr_1.04fr]">
        <div className="space-y-4">
          <div className="h-64 animate-pulse rounded-2xl bg-slate-900" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-900" />
        </div>
        <div className="space-y-4">
          <div className="h-80 animate-pulse rounded-2xl bg-slate-900" />
          <div className="h-80 animate-pulse rounded-2xl bg-slate-900" />
        </div>
      </div>
    </div>
  );
}
