"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
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
import { Tabs } from "@/components/dashboard/Tabs";
import { buildDashboardQuery, createDefaultFilters } from "@/lib/dashboard/filters";
import { rowsToCsv, downloadCsvFile } from "@/lib/dashboard/csv";
import { formatMetricValue } from "@/lib/dashboard/metrics";
import type {
  BreakdownRow,
  DashboardFilters,
  DashboardRawPage,
  DashboardSectionId,
  DashboardSectionPayload,
  DashboardShellPayload,
  ReportRow
} from "@/types/dashboard";
import { currency, formatNumber, formatPercent, formatRoas, safeDivide } from "@/utils/metrics";

const CHART_COLORS = ["#1d4ed8", "#0891b2", "#059669", "#f59e0b", "#ef4444", "#7c3aed", "#0f766e", "#2563eb"];

type RawSortKey = "date" | "cost" | "conversions" | "revenue" | "roas" | "clicks";

async function fetchJson<T>(url: string) {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "데이터를 불러오지 못했습니다.");
  }

  return data as T;
}

function metricTooltipFormatter(value: number, name: string) {
  if (["cost", "revenue", "cpc", "cpa", "aov"].includes(name)) {
    return [`${currency(Number(value))}원`, name];
  }
  if (["roas", "ctr", "cvr", "purchaseRate", "leadRate"].includes(name)) {
    return [`${formatPercent(Number(value), name === "roas" ? 0 : 1)}`, name];
  }
  return [formatNumber(Number(value)), name];
}

function formatDateLabel(value?: string) {
  if (!value) return "-";
  return value.replaceAll("-", ".");
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
          className="panel w-full max-w-md p-8"
          onSubmit={(event) => {
            event.preventDefault();
            void loadShell(passwordDraft, filters);
          }}
        >
          <h1 className="text-2xl font-bold text-slate-950">비밀번호 입력</h1>
          <p className="mt-2 text-sm text-slate-500">이 대시보드는 비밀번호가 설정되어 있습니다.</p>
          <input className="input mt-5" type="password" value={passwordDraft} onChange={(event) => setPasswordDraft(event.target.value)} />
          <button className="btn-primary mt-4 w-full">대시보드 보기</button>
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
        <section className="panel max-w-lg p-8 text-center">
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
  if (loading && !data) {
    return <DashboardSectionSkeleton />;
  }

  if (!data) {
    return (
      <section className="panel p-8 text-center text-sm text-slate-500">
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

      <div className="grid gap-4 xl:grid-cols-2">
        <TimeSeriesChartCard title="일자별 광고비 / 매출 추이" rows={data.timeSeries} firstKey="cost" secondKey="revenue" firstLabel="광고비" secondLabel="매출" />
        <TimeSeriesChartCard title="일자별 클릭 / 전환 추이" rows={data.timeSeries} firstKey="clicks" secondKey="conversions" firstLabel="클릭" secondLabel="전환" />
        <TimeSeriesChartCard title="일자별 ROAS 추이" rows={data.timeSeries} firstKey="roas" firstLabel="ROAS" />
        <PieBreakdownChartCard title="매체별 광고비 비중" rows={data.platformRows} metricKey="cost" />
        <PieBreakdownChartCard title="매체별 매출 비중" rows={data.platformRows} metricKey="revenue" />
        <BarBreakdownChartCard title="매체별 ROAS 비교" rows={data.platformRows} metricKey="roas" />
        <BarBreakdownChartCard title="매체별 전환수 순위" rows={data.platformRows} metricKey="conversions" />
        <BarBreakdownChartCard title="캠페인별 비용 TOP 10" rows={data.campaignRows.slice(0, 10)} metricKey="cost" />
        <BarBreakdownChartCard title="캠페인별 ROAS TOP 10" rows={[...data.campaignRows].sort((a, b) => b.metrics.roas - a.metrics.roas).slice(0, 10)} metricKey="roas" />
      </div>

      <TabsAndTables
        tabs={[
          { id: "date", label: "일자별 데이터" },
          { id: "platform", label: "매체별 데이터" },
          { id: "campaign", label: "캠페인별 데이터" },
          { id: "adgroup", label: "광고그룹별 데이터" }
        ]}
        datasets={{
          date: data.dateRows,
          platform: data.platformRows,
          campaign: data.campaignRows,
          adgroup: data.adGroupRows
        }}
      />
    </div>
  );
}

function SearchSectionView({ data, subSection }: { data: DashboardSectionPayload; subSection: string }) {
  return (
    <div className="space-y-6">
      <KpiGrid summary={data.summary} includeCpm={false} />
      <InsightBox insights={data.insights} title={subSection === "all" ? "SA 운영 인사이트" : "검색광고 인사이트"} />

      <div className="grid gap-4 xl:grid-cols-2">
        <TimeSeriesChartCard title="일자별 SA 비용 / 전환 추이" rows={data.timeSeries} firstKey="cost" secondKey="conversions" firstLabel="광고비" secondLabel="전환" />
        <TimeSeriesChartCard title="일자별 SA ROAS 추이" rows={data.timeSeries} firstKey="roas" firstLabel="ROAS" />
        <BarBreakdownChartCard title="키워드별 비용 TOP 10" rows={data.keywordRows.slice(0, 10)} metricKey="cost" />
        <BarBreakdownChartCard title="키워드별 전환 TOP 10" rows={[...data.keywordRows].sort((a, b) => b.metrics.conversions - a.metrics.conversions).slice(0, 10)} metricKey="conversions" />
        <BarBreakdownChartCard title="키워드별 ROAS TOP 10" rows={[...data.keywordRows].sort((a, b) => b.metrics.roas - a.metrics.roas).slice(0, 10)} metricKey="roas" />
        <BarBreakdownChartCard title="캠페인별 SA 성과 비교" rows={data.campaignRows.slice(0, 10)} metricKey="roas" />
      </div>

      <BreakdownTable title="키워드 분석" description="검색어·키워드 기준으로 비용, 전환, ROAS를 빠르게 점검합니다." rows={data.keywordRows} type="keyword" />
      <BreakdownTable title="캠페인 / 광고그룹 분석" rows={data.campaignRows} type="campaign" />
      <BreakdownTable title="검색어 보고서" rows={data.keywordRows} type="keyword-detail" />
    </div>
  );
}

function DisplaySectionView({ data, subSection }: { data: DashboardSectionPayload; subSection: string }) {
  const creativeCards = [...data.creativeRows].slice(0, 12);

  return (
    <div className="space-y-6">
      <KpiGrid summary={data.summary} includeCpm />
      <InsightBox insights={data.insights} title={subSection === "all" ? "DA 운영 인사이트" : "디스플레이 광고 인사이트"} />

      <div className="grid gap-4 xl:grid-cols-2">
        <TimeSeriesChartCard title="일자별 DA 광고비 / 매출 추이" rows={data.timeSeries} firstKey="cost" secondKey="revenue" firstLabel="광고비" secondLabel="매출" />
        <TimeSeriesChartCard title="일자별 DA 클릭 / 전환 추이" rows={data.timeSeries} firstKey="clicks" secondKey="conversions" firstLabel="클릭" secondLabel="전환" />
        <TimeSeriesChartCard title="일자별 DA ROAS 추이" rows={data.timeSeries} firstKey="roas" firstLabel="ROAS" />
        <PieBreakdownChartCard title="매체별 광고비 비중" rows={data.platformRows} metricKey="cost" />
        <PieBreakdownChartCard title="매체별 전환 비중" rows={data.platformRows} metricKey="conversions" />
        <BarBreakdownChartCard title="소재별 CTR 비교" rows={[...data.creativeRows].sort((a, b) => b.metrics.ctr - a.metrics.ctr).slice(0, 10)} metricKey="ctr" />
        <BarBreakdownChartCard title="소재별 ROAS 비교" rows={[...data.creativeRows].sort((a, b) => b.metrics.roas - a.metrics.roas).slice(0, 10)} metricKey="roas" />
        <BarBreakdownChartCard title="캠페인별 DA 성과 비교" rows={data.campaignRows.slice(0, 10)} metricKey="roas" />
      </div>

      <BreakdownTable title="소재 분석" rows={data.creativeRows} type="creative" />
      <BreakdownTable title="캠페인 / 광고그룹 분석" rows={data.campaignRows} type="campaign" />

      <section className="panel p-5">
        <h3 className="text-base font-bold text-slate-950">소재 미리보기</h3>
        <p className="mt-1 text-sm text-slate-500">이미지 URL이 없는 경우 카드형 리스트로 소재명을 미리 보여줍니다.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {creativeCards.map((row) => (
            <article key={row.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{row.label}</p>
              <p className="mt-2 text-xs text-slate-500">{row.campaignName || "-"}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>
                  <dt className="font-semibold">CTR</dt>
                  <dd>{formatPercent(row.metrics.ctr, 1)}</dd>
                </div>
                <div>
                  <dt className="font-semibold">ROAS</dt>
                  <dd>{formatRoas(row.metrics.roas)}</dd>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function CampaignSectionView({ data }: { data: DashboardSectionPayload }) {
  return (
    <div className="space-y-6">
      <KpiGrid summary={data.summary} />
      <InsightBox insights={data.insights} />
      <div className="grid gap-4 xl:grid-cols-2">
        <BarBreakdownChartCard title="캠페인별 비용 TOP 10" rows={data.campaignRows.slice(0, 10)} metricKey="cost" />
        <BarBreakdownChartCard title="캠페인별 매출 TOP 10" rows={[...data.campaignRows].sort((a, b) => b.metrics.revenue - a.metrics.revenue).slice(0, 10)} metricKey="revenue" />
        <BarBreakdownChartCard title="캠페인별 전환 TOP 10" rows={[...data.campaignRows].sort((a, b) => b.metrics.conversions - a.metrics.conversions).slice(0, 10)} metricKey="conversions" />
        <BarBreakdownChartCard title="캠페인별 ROAS TOP 10" rows={[...data.campaignRows].sort((a, b) => b.metrics.roas - a.metrics.roas).slice(0, 10)} metricKey="roas" />
      </div>
      <BreakdownTable title="캠페인 KPI 테이블" rows={data.campaignRows} type="campaign" />
    </div>
  );
}

function CreativeSectionView({ data }: { data: DashboardSectionPayload }) {
  return (
    <div className="space-y-6">
      <KpiGrid summary={data.summary} includeCpm />
      <InsightBox insights={data.insights} />
      <div className="grid gap-4 xl:grid-cols-2">
        <BarBreakdownChartCard title="CTR 높은 소재" rows={[...data.creativeRows].sort((a, b) => b.metrics.ctr - a.metrics.ctr).slice(0, 10)} metricKey="ctr" />
        <BarBreakdownChartCard title="전환 많은 소재" rows={[...data.creativeRows].sort((a, b) => b.metrics.conversions - a.metrics.conversions).slice(0, 10)} metricKey="conversions" />
        <BarBreakdownChartCard title="ROAS 높은 소재" rows={[...data.creativeRows].sort((a, b) => b.metrics.roas - a.metrics.roas).slice(0, 10)} metricKey="roas" />
        <BarBreakdownChartCard title="비용 높은데 전환 낮은 소재" rows={[...data.creativeRows].sort((a, b) => b.metrics.cost - a.metrics.cost).slice(0, 10)} metricKey="cost" />
      </div>
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
      <div className="grid gap-4 xl:grid-cols-2">
        <BarBreakdownChartCard title="검색량 / 노출 많은 키워드" rows={[...data.keywordRows].sort((a, b) => b.metrics.impressions - a.metrics.impressions).slice(0, 10)} metricKey="impressions" />
        <BarBreakdownChartCard title="클릭 많은 키워드" rows={[...data.keywordRows].sort((a, b) => b.metrics.clicks - a.metrics.clicks).slice(0, 10)} metricKey="clicks" />
        <BarBreakdownChartCard title="전환 많은 키워드" rows={[...data.keywordRows].sort((a, b) => b.metrics.conversions - a.metrics.conversions).slice(0, 10)} metricKey="conversions" />
        <BarBreakdownChartCard title="ROAS 높은 키워드" rows={[...data.keywordRows].sort((a, b) => b.metrics.roas - a.metrics.roas).slice(0, 10)} metricKey="roas" />
      </div>
      <BreakdownTable title="키워드 KPI 테이블" rows={data.keywordRows} type="keyword" />
      <BreakdownTable title="제외 키워드 후보" description="클릭 30회 이상, 전환 0건인 키워드를 먼저 추렸습니다." rows={exclusionRows} type="keyword" />
    </div>
  );
}

function LandingSectionView({ data }: { data: DashboardSectionPayload }) {
  return (
    <div className="space-y-6">
      <KpiGrid summary={data.summary} includeCpm={false} />
      <InsightBox insights={data.insights} />
      <div className="grid gap-4 xl:grid-cols-2">
        <BarBreakdownChartCard title="랜딩페이지별 비용" rows={data.landingRows.slice(0, 10)} metricKey="cost" />
        <BarBreakdownChartCard title="랜딩페이지별 전환" rows={[...data.landingRows].sort((a, b) => b.metrics.conversions - a.metrics.conversions).slice(0, 10)} metricKey="conversions" />
        <BarBreakdownChartCard title="랜딩페이지별 CVR" rows={[...data.landingRows].sort((a, b) => b.metrics.cvr - a.metrics.cvr).slice(0, 10)} metricKey="cvr" />
        <BarBreakdownChartCard title="랜딩페이지별 ROAS" rows={[...data.landingRows].sort((a, b) => b.metrics.roas - a.metrics.roas).slice(0, 10)} metricKey="roas" />
      </div>
      <BreakdownTable title="랜딩페이지 KPI 테이블" rows={data.landingRows} type="landing" />
    </div>
  );
}

function CompareSectionView({ data }: { data: DashboardSectionPayload }) {
  return (
    <div className="space-y-6">
      <KpiGrid summary={data.summary} includeCpm />
      <div className="grid gap-4 xl:grid-cols-2">
        <CompareChartCard title="현재 기간 vs 비교 기간 비용 추이" rows={data.compareSeries ?? []} currentKey="currentCost" previousKey="previousCost" />
        <CompareChartCard title="현재 기간 vs 비교 기간 전환 추이" rows={data.compareSeries ?? []} currentKey="currentConversions" previousKey="previousConversions" />
        <CompareChartCard title="현재 기간 vs 비교 기간 ROAS 추이" rows={data.compareSeries ?? []} currentKey="currentRoas" previousKey="previousRoas" />
        <BarBreakdownChartCard title="매체별 증감 비교" rows={data.platformRows.slice(0, 10)} metricKey="roas" />
        <BarBreakdownChartCard title="캠페인별 증감 비교" rows={data.campaignRows.slice(0, 10)} metricKey="roas" />
      </div>
      <ComparisonTable rows={data.campaignRows} />
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
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    date: true,
    platform: true,
    campaignName: true,
    adGroupName: true,
    adName: true,
    device: true,
    keyword: true,
    landingPage: true,
    impressions: true,
    clicks: true,
    cost: true,
    conversions: true,
    revenue: true,
    roas: true
  });

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

  const rows = data?.rows ?? [];

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-950">원본 데이터 테이블</h3>
            <p className="mt-1 text-sm text-slate-500">검색, 정렬, CSV / Excel 다운로드, 컬럼 표시 / 숨김을 지원합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => void exportCurrentRows("csv")}>
              CSV 다운로드
            </button>
            <button className="btn-secondary" onClick={() => void exportCurrentRows("xlsx")}>
              Excel 다운로드
            </button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto]">
          <input
            className="input"
            placeholder="전체 검색"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
          <select className="input xl:w-48" value={sortKey} onChange={(event) => setSortKey(event.target.value as RawSortKey)}>
            <option value="date">날짜 정렬</option>
            <option value="cost">비용 높은 순</option>
            <option value="conversions">전환 높은 순</option>
            <option value="revenue">매출 높은 순</option>
            <option value="roas">ROAS 높은 순</option>
            <option value="clicks">클릭 높은 순</option>
          </select>
          <button className="btn-secondary" onClick={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))}>
            {sortDirection === "asc" ? "오름차순" : "내림차순"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.keys(visibleColumns).map((column) => (
            <button
              key={column}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${visibleColumns[column] ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"}`}
              onClick={() => setVisibleColumns((current) => ({ ...current, [column]: !current[column] }))}
            >
              {column}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="p-4 text-sm text-slate-500">원본 데이터를 불러오는 중입니다.</div> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1600px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {visibleColumns.date ? <th className="px-3 py-3">date</th> : null}
              {visibleColumns.platform ? <th className="px-3 py-3">platform</th> : null}
              {visibleColumns.campaignName ? <th className="px-3 py-3">campaign_name</th> : null}
              {visibleColumns.adGroupName ? <th className="px-3 py-3">ad_group_name</th> : null}
              {visibleColumns.adName ? <th className="px-3 py-3">ad_name</th> : null}
              {visibleColumns.device ? <th className="px-3 py-3">device</th> : null}
              {visibleColumns.keyword ? <th className="px-3 py-3">keyword</th> : null}
              {visibleColumns.landingPage ? <th className="px-3 py-3">landing_page</th> : null}
              {visibleColumns.impressions ? <th className="px-3 py-3">impressions</th> : null}
              {visibleColumns.clicks ? <th className="px-3 py-3">clicks</th> : null}
              {visibleColumns.cost ? <th className="px-3 py-3">cost</th> : null}
              {visibleColumns.conversions ? <th className="px-3 py-3">conversions</th> : null}
              {visibleColumns.revenue ? <th className="px-3 py-3">revenue</th> : null}
              {visibleColumns.roas ? <th className="px-3 py-3">roas</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const roas = row.cost === 0 ? 0 : (row.revenue / row.cost) * 100;
              return (
                <tr key={`${row.id ?? row.date}-${index}`} className="border-t">
                  {visibleColumns.date ? <td className="px-3 py-3">{row.date}</td> : null}
                  {visibleColumns.platform ? <td className="px-3 py-3">{row.platform}</td> : null}
                  {visibleColumns.campaignName ? <td className="px-3 py-3">{row.campaignName}</td> : null}
                  {visibleColumns.adGroupName ? <td className="px-3 py-3">{row.adGroupName}</td> : null}
                  {visibleColumns.adName ? <td className="px-3 py-3">{row.adName}</td> : null}
                  {visibleColumns.device ? <td className="px-3 py-3">{row.device ?? "-"}</td> : null}
                  {visibleColumns.keyword ? <td className="px-3 py-3">{row.keyword ?? "-"}</td> : null}
                  {visibleColumns.landingPage ? <td className="px-3 py-3">{row.landingPage ?? "-"}</td> : null}
                  {visibleColumns.impressions ? <td className="px-3 py-3">{formatNumber(row.impressions)}</td> : null}
                  {visibleColumns.clicks ? <td className="px-3 py-3">{formatNumber(row.clicks)}</td> : null}
                  {visibleColumns.cost ? <td className="px-3 py-3">{currency(row.cost)}원</td> : null}
                  {visibleColumns.conversions ? <td className="px-3 py-3">{formatNumber(row.conversions)}</td> : null}
                  {visibleColumns.revenue ? <td className="px-3 py-3">{currency(row.revenue)}원</td> : null}
                  {visibleColumns.roas ? <td className="px-3 py-3">{formatRoas(roas)}</td> : null}
                </tr>
              );
            })}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-3 py-10 text-center text-sm text-slate-500">
                  조건에 맞는 원본 데이터가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t p-4 text-sm">
        <span>
          총 {formatNumber(data?.total ?? 0)}건 / {data?.page ?? 1}페이지
        </span>
        <div className="flex gap-2">
          <button className="btn-secondary" disabled={(data?.page ?? 1) === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            이전
          </button>
          <button className="btn-secondary" disabled={(data?.page ?? 1) === (data?.pageCount ?? 1)} onClick={() => setPage((current) => Math.min(data?.pageCount ?? 1, current + 1))}>
            다음
          </button>
        </div>
      </div>
    </section>
  );
}

function TabsAndTables({
  tabs,
  datasets
}: {
  tabs: Array<{ id: string; label: string }>;
  datasets: Record<string, BreakdownRow[]>;
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "date");
  const rows = datasets[activeTab] ?? [];

  return (
    <div className="space-y-4">
      <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
      <BreakdownTable title={tabs.find((tab) => tab.id === activeTab)?.label ?? "상세 테이블"} rows={rows} type={activeTab === "platform" ? "platform" : activeTab === "campaign" ? "campaign" : activeTab === "adgroup" ? "adgroup" : "date"} />
    </div>
  );
}

function BreakdownTable({
  title,
  description,
  rows,
  type
}: {
  title: string;
  description?: string;
  rows: BreakdownRow[];
  type: "date" | "platform" | "campaign" | "adgroup" | "creative" | "keyword" | "keyword-detail" | "landing";
}) {
  const columns = [
    {
      key: "label",
      header:
        type === "date"
          ? "일자"
          : type === "platform"
            ? "매체"
            : type === "campaign"
              ? "캠페인명"
              : type === "adgroup"
                ? "광고그룹명"
                : type === "creative"
                  ? "소재명"
                  : type === "landing"
                    ? "랜딩페이지"
                    : "키워드 / 검색어",
      render: (row: BreakdownRow) => row.label,
      sortValue: (row: BreakdownRow) => row.label
    },
    { key: "platform", header: "매체", render: (row: BreakdownRow) => row.platform ?? "-", sortValue: (row: BreakdownRow) => row.platform ?? "" },
    { key: "campaign", header: "캠페인", render: (row: BreakdownRow) => row.campaignName ?? "-", sortValue: (row: BreakdownRow) => row.campaignName ?? "" },
    { key: "adgroup", header: "광고그룹", render: (row: BreakdownRow) => row.adGroupName ?? "-", sortValue: (row: BreakdownRow) => row.adGroupName ?? "" },
    { key: "impressions", header: "노출", render: (row: BreakdownRow) => formatNumber(row.metrics.impressions), sortValue: (row: BreakdownRow) => row.metrics.impressions },
    { key: "clicks", header: "클릭", render: (row: BreakdownRow) => formatNumber(row.metrics.clicks), sortValue: (row: BreakdownRow) => row.metrics.clicks },
    { key: "cost", header: "비용", render: (row: BreakdownRow) => `${currency(row.metrics.cost)}원`, sortValue: (row: BreakdownRow) => row.metrics.cost },
    { key: "conversions", header: "전환", render: (row: BreakdownRow) => formatNumber(row.metrics.conversions), sortValue: (row: BreakdownRow) => row.metrics.conversions },
    { key: "revenue", header: "매출", render: (row: BreakdownRow) => `${currency(row.metrics.revenue)}원`, sortValue: (row: BreakdownRow) => row.metrics.revenue },
    { key: "ctr", header: "CTR", render: (row: BreakdownRow) => formatPercent(row.metrics.ctr, 1), sortValue: (row: BreakdownRow) => row.metrics.ctr },
    { key: "cpc", header: "CPC", render: (row: BreakdownRow) => `${currency(row.metrics.cpc)}원`, sortValue: (row: BreakdownRow) => row.metrics.cpc },
    { key: "cpa", header: "CPA", render: (row: BreakdownRow) => `${currency(row.metrics.cpa)}원`, sortValue: (row: BreakdownRow) => row.metrics.cpa },
    { key: "cvr", header: "CVR", render: (row: BreakdownRow) => formatPercent(row.metrics.cvr, 1), sortValue: (row: BreakdownRow) => row.metrics.cvr },
    { key: "roas", header: "ROAS", render: (row: BreakdownRow) => formatRoas(row.metrics.roas), sortValue: (row: BreakdownRow) => row.metrics.roas }
  ];

  return <DataTable title={title} description={description} rows={rows} columns={columns} defaultSortKey="cost" />;
}

function ComparisonTable({ rows }: { rows: BreakdownRow[] }) {
  return (
    <DataTable
      title="기간 비교 테이블"
      description="현재 기간 값, 비교 기간 값, 증감값, 증감률을 한 번에 봅니다."
      rows={rows}
      defaultSortKey="cost"
      columns={[
        { key: "label", header: "항목", render: (row: BreakdownRow) => row.label, sortValue: (row: BreakdownRow) => row.label },
        { key: "currentCost", header: "현재 비용", render: (row: BreakdownRow) => `${currency(row.metrics.cost)}원`, sortValue: (row: BreakdownRow) => row.metrics.cost },
        { key: "prevCost", header: "비교 비용", render: (row: BreakdownRow) => `${currency(row.previous?.cost ?? 0)}원`, sortValue: (row: BreakdownRow) => row.previous?.cost ?? 0 },
        { key: "deltaCost", header: "비용 증감", render: (row: BreakdownRow) => formatMetricValue(row.deltas?.cost ?? 0, "currency"), sortValue: (row: BreakdownRow) => row.deltas?.cost ?? 0 },
        { key: "changeCost", header: "비용 증감률", render: (row: BreakdownRow) => row.changes?.cost == null ? "비교 없음" : formatPercent(row.changes.cost, 1), sortValue: (row: BreakdownRow) => row.changes?.cost ?? 0 },
        { key: "currentConv", header: "현재 전환", render: (row: BreakdownRow) => formatNumber(row.metrics.conversions), sortValue: (row: BreakdownRow) => row.metrics.conversions },
        { key: "prevConv", header: "비교 전환", render: (row: BreakdownRow) => formatNumber(row.previous?.conversions ?? 0), sortValue: (row: BreakdownRow) => row.previous?.conversions ?? 0 },
        { key: "currentRoas", header: "현재 ROAS", render: (row: BreakdownRow) => formatRoas(row.metrics.roas), sortValue: (row: BreakdownRow) => row.metrics.roas },
        { key: "prevRoas", header: "비교 ROAS", render: (row: BreakdownRow) => formatRoas(row.previous?.roas ?? 0), sortValue: (row: BreakdownRow) => row.previous?.roas ?? 0 }
      ]}
    />
  );
}

function KpiGrid({ summary, includeCpm = true }: { summary: DashboardSectionPayload["summary"]; includeCpm?: boolean }) {
  const cards = [
    { title: "총 비용", value: summary.cost, format: "currency" as const, change: summary.changes.cost, delta: summary.deltas.cost },
    { title: "노출", value: summary.impressions, format: "number" as const, change: summary.changes.impressions, delta: summary.deltas.impressions },
    { title: "클릭", value: summary.clicks, format: "number" as const, change: summary.changes.clicks, delta: summary.deltas.clicks },
    { title: "전환", value: summary.conversions, format: "number" as const, change: summary.changes.conversions, delta: summary.deltas.conversions },
    { title: "매출", value: summary.revenue, format: "currency" as const, change: summary.changes.revenue, delta: summary.deltas.revenue },
    { title: "CTR", value: summary.ctr, format: "percent" as const, change: summary.changes.ctr, delta: summary.deltas.ctr },
    { title: "CPC", value: summary.cpc, format: "currency" as const, change: summary.changes.cpc, delta: summary.deltas.cpc },
    { title: "CPA", value: summary.cpa, format: "currency" as const, change: summary.changes.cpa, delta: summary.deltas.cpa },
    { title: "CVR", value: summary.cvr, format: "percent" as const, change: summary.changes.cvr, delta: summary.deltas.cvr },
    { title: "ROAS", value: summary.roas, format: "roas" as const, change: summary.changes.roas, delta: summary.deltas.roas }
  ];

  if (includeCpm) {
    cards.splice(8, 0, { title: "CPM", value: summary.cpm, format: "currency" as const, change: null, delta: null });
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <KpiCard key={card.title} title={card.title} value={card.value} format={card.format} change={card.change} delta={card.delta} />
      ))}
    </section>
  );
}

function TimeSeriesChartCard({
  title,
  rows,
  firstKey,
  secondKey,
  firstLabel,
  secondLabel
}: {
  title: string;
  rows: DashboardSectionPayload["timeSeries"];
  firstKey: "cost" | "clicks" | "conversions" | "revenue" | "roas";
  secondKey?: "cost" | "clicks" | "conversions" | "revenue" | "roas";
  firstLabel: string;
  secondLabel?: string;
}) {
  return (
    <ChartCard title={title}>
      {rows.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={metricTooltipFormatter} />
            <Line type="monotone" dataKey={firstKey} name={firstLabel} stroke="#1d4ed8" strokeWidth={2} dot={false} />
            {secondKey ? <Line type="monotone" dataKey={secondKey} name={secondLabel} stroke="#059669" strokeWidth={2} dot={false} /> : null}
          </LineChart>
        </ResponsiveContainer>
      ) : null}
    </ChartCard>
  );
}

function PieBreakdownChartCard({
  title,
  rows,
  metricKey
}: {
  title: string;
  rows: BreakdownRow[];
  metricKey: keyof BreakdownRow["metrics"];
}) {
  return (
    <ChartCard title={title}>
      {rows.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={rows.slice(0, 8)} dataKey={(row) => Number(row.metrics[metricKey] ?? 0)} nameKey="label" outerRadius={96} label>
              {rows.slice(0, 8).map((row, index) => (
                <Cell key={row.id} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [formatMetricValue(Number(value), metricKey === "roas" ? "roas" : ["cost", "revenue", "cpc", "cpa", "aov"].includes(String(metricKey)) ? "currency" : "number"), String(metricKey)]} />
          </PieChart>
        </ResponsiveContainer>
      ) : null}
    </ChartCard>
  );
}

function BarBreakdownChartCard({
  title,
  rows,
  metricKey
}: {
  title: string;
  rows: BreakdownRow[];
  metricKey: keyof BreakdownRow["metrics"];
}) {
  return (
    <ChartCard title={title}>
      {rows.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={rows.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => [formatMetricValue(Number(value), metricKey === "roas" ? "roas" : metricKey === "ctr" || metricKey === "cvr" || metricKey === "purchaseRate" || metricKey === "leadRate" ? "percent" : metricKey === "cost" || metricKey === "revenue" || metricKey === "cpc" || metricKey === "cpa" || metricKey === "aov" ? "currency" : "number"), String(metricKey)]} />
            <Bar dataKey={(row) => Number(row.metrics[metricKey] ?? 0)} fill="#1d4ed8" />
          </BarChart>
        </ResponsiveContainer>
      ) : null}
    </ChartCard>
  );
}

function CompareChartCard({
  title,
  rows,
  currentKey,
  previousKey
}: {
  title: string;
  rows: NonNullable<DashboardSectionPayload["compareSeries"]>;
  currentKey: keyof NonNullable<DashboardSectionPayload["compareSeries"]>[number];
  previousKey: keyof NonNullable<DashboardSectionPayload["compareSeries"]>[number];
}) {
  return (
    <ChartCard title={title}>
      {rows.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={metricTooltipFormatter} />
            <Line type="monotone" dataKey={String(currentKey)} name="현재 기간" stroke="#1d4ed8" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey={String(previousKey)} name="비교 기간" stroke="#94a3b8" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : null}
    </ChartCard>
  );
}

function Toast({ message }: { message: string }) {
  return <div className="fixed right-4 top-4 z-50 rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg">{message}</div>;
}

function ErrorBanner({ message }: { message: string }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{message}</div>;
}

function DashboardWorkspaceSkeleton() {
  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-[1800px] space-y-6">
        <div className="panel h-28 animate-pulse bg-slate-100" />
        <div className="panel h-40 animate-pulse bg-slate-100" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="panel h-36 animate-pulse bg-slate-100" />
          ))}
        </div>
      </div>
    </main>
  );
}

function DashboardSectionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="panel h-36 animate-pulse bg-slate-100" />
        ))}
      </div>
      <div className="panel h-56 animate-pulse bg-slate-100" />
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="panel h-80 animate-pulse bg-slate-100" />
        <div className="panel h-80 animate-pulse bg-slate-100" />
      </div>
    </div>
  );
}
