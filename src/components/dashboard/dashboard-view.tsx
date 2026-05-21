"use client";

import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { DashboardInsights } from "@/components/dashboard/dashboard-insights";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ReportTable } from "@/components/dashboard/report-table";
import type { DashboardAnalyticsPayload, DashboardShellPayload } from "@/types/dashboard";
import { formatRoas } from "@/utils/metrics";

type FilterState = {
  startDate: string;
  endDate: string;
  platform: string;
  campaign: string;
};

type DatePreset = {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
};

function toDateString(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function getDatePresets(): DatePreset[] {
  const today = new Date();
  const yesterday = subDays(today, 1);
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const lastWeekBase = subWeeks(today, 1);
  const lastWeekStart = startOfWeek(lastWeekBase, { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(lastWeekBase, { weekStartsOn: 1 });
  const thisMonthStart = startOfMonth(today);
  const lastMonthBase = subMonths(today, 1);
  const lastMonthStart = startOfMonth(lastMonthBase);
  const lastMonthEnd = endOfMonth(lastMonthBase);

  return [
    { key: "today", label: "오늘", startDate: toDateString(today), endDate: toDateString(today) },
    { key: "yesterday", label: "어제", startDate: toDateString(yesterday), endDate: toDateString(yesterday) },
    { key: "this-week", label: "이번주", startDate: toDateString(thisWeekStart), endDate: toDateString(today) },
    { key: "last-week", label: "지난주", startDate: toDateString(lastWeekStart), endDate: toDateString(lastWeekEnd) },
    { key: "last-7", label: "최근 7일(오늘 제외)", startDate: toDateString(subDays(today, 7)), endDate: toDateString(yesterday) },
    { key: "this-month", label: "이번달", startDate: toDateString(thisMonthStart), endDate: toDateString(today) },
    { key: "last-month", label: "지난달", startDate: toDateString(lastMonthStart), endDate: toDateString(lastMonthEnd) },
    { key: "last-30", label: "최근 30일(오늘 제외)", startDate: toDateString(subDays(today, 30)), endDate: toDateString(yesterday) }
  ];
}

function formatRangeLabel(startDate: string, endDate: string) {
  if (!startDate || !endDate) return "기간 선택";
  return `${startDate.replaceAll("-", ".")} - ${endDate.replaceAll("-", ".")}`;
}

function buildDashboardQuery(filters?: FilterState, password?: string) {
  const params = new URLSearchParams();
  if (password) params.set("password", password);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.platform && filters.platform !== "ALL") params.set("platform", filters.platform);
  if (filters?.campaign && filters.campaign !== "ALL") params.set("campaign", filters.campaign);
  return params;
}

export function DashboardView({ clientSlug, reportMode = false }: { clientSlug: string; reportMode?: boolean }) {
  const [payload, setPayload] = useState<DashboardShellPayload | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalyticsPayload | null>(null);
  const [password, setPassword] = useState("");
  const [passwordDraft, setPasswordDraft] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ startDate: "", endDate: "", platform: "ALL", campaign: "ALL" });
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const requestVersion = useRef(0);

  async function loadAnalytics(nextPassword: string, nextFilters: FilterState, version: number) {
    setAnalyticsLoading(true);
    const params = buildDashboardQuery(nextFilters, nextPassword);
    const response = await fetch(`/api/dashboard/${clientSlug}/analytics${params.toString() ? `?${params.toString()}` : ""}`);

    if (version !== requestVersion.current) return;

    if (response.status === 401) {
      setPasswordRequired(true);
      setAnalytics(null);
      setAnalyticsLoading(false);
      return;
    }

    if (!response.ok) {
      setAnalytics(null);
      setAnalyticsLoading(false);
      return;
    }

    const data = (await response.json()) as DashboardAnalyticsPayload;
    if (version !== requestVersion.current) return;
    setAnalytics(data);
    setAnalyticsLoading(false);
  }

  async function loadDashboard(nextPassword = "", nextFilters?: FilterState) {
    const version = requestVersion.current + 1;
    requestVersion.current = version;

    setLoading(true);
    setAnalytics(null);

    const params = buildDashboardQuery(nextFilters, nextPassword);
    const response = await fetch(`/api/dashboard/${clientSlug}${params.toString() ? `?${params.toString()}` : ""}`);

    if (version !== requestVersion.current) return;

    if (response.status === 404) {
      setPayload(null);
      setPasswordRequired(false);
      setLoading(false);
      return;
    }

    if (response.status === 401) {
      setPasswordRequired(true);
      setLoading(false);
      return;
    }

    if (!response.ok) {
      setPayload(null);
      setPasswordRequired(false);
      setLoading(false);
      return;
    }

    const data = (await response.json()) as DashboardShellPayload;
    const resolvedFilters = {
      startDate: nextFilters?.startDate ?? data.filters.startDate ?? "",
      endDate: nextFilters?.endDate ?? data.filters.endDate ?? "",
      platform: nextFilters?.platform ?? "ALL",
      campaign: nextFilters?.campaign ?? "ALL"
    };

    setPayload(data);
    setPasswordRequired(false);
    setPassword(nextPassword);
    setFilters(resolvedFilters);
    setLoading(false);

    void loadAnalytics(nextPassword, resolvedFilters, version);
  }

  function applyFilters(nextFilters: FilterState) {
    setFilters(nextFilters);
    void loadDashboard(password, nextFilters);
  }

  useEffect(() => {
    void loadDashboard();
  }, [clientSlug]);

  if (passwordRequired) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <form
          className="panel w-full max-w-md p-8"
          onSubmit={(event) => {
            event.preventDefault();
            void loadDashboard(passwordDraft);
          }}
        >
          <h1 className="text-xl font-bold">비밀번호 입력</h1>
          <p className="mt-2 text-sm text-slate-500">이 공유 대시보드는 비밀번호가 설정되어 있습니다.</p>
          <input className="input mt-5" type="password" value={passwordDraft} onChange={(event) => setPasswordDraft(event.target.value)} />
          <button className="btn-primary mt-4 w-full">대시보드 보기</button>
        </form>
      </main>
    );
  }

  if (loading) {
    return <main className="p-8 text-sm font-semibold text-slate-500">대시보드를 불러오는 중입니다.</main>;
  }

  if (!payload) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <section className="panel max-w-lg p-8 text-center">
          <h1 className="text-xl font-bold text-slate-950">대시보드를 찾을 수 없습니다</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">클라이언트 URL을 확인하거나 관리자 화면에서 데이터를 먼저 업로드해 주세요.</p>
        </section>
      </main>
    );
  }

  return (
    <DashboardContent
      clientSlug={clientSlug}
      payload={payload}
      analytics={analytics}
      analyticsLoading={analyticsLoading}
      filters={filters}
      setFilters={applyFilters}
      reportMode={reportMode}
      password={password}
    />
  );
}

export function DashboardContent({
  clientSlug,
  payload,
  analytics,
  analyticsLoading,
  filters,
  setFilters,
  reportMode = false,
  password = ""
}: {
  clientSlug: string;
  payload: DashboardShellPayload;
  analytics: DashboardAnalyticsPayload | null;
  analyticsLoading: boolean;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  reportMode?: boolean;
  password?: string;
}) {
  const datePresets = useMemo(() => getDatePresets(), []);
  const activePreset = datePresets.find((preset) => preset.startDate === filters.startDate && preset.endDate === filters.endDate)?.key ?? "";
  const [isDateEditorOpen, setIsDateEditorOpen] = useState(false);

  const exportQuery = buildDashboardQuery(filters, password);

  function applyPreset(preset: DatePreset) {
    setFilters({ ...filters, startDate: preset.startDate, endDate: preset.endDate });
    setIsDateEditorOpen(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">{payload.client.name} 광고 성과 대시보드</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <a className="btn-secondary" href={`/api/dashboard/${clientSlug}/export/csv?${exportQuery.toString()}`}>
              CSV 다운로드
            </a>
            <button className="btn-primary" onClick={() => window.print()}>
              PDF 저장 / 인쇄
            </button>
          </div>
        </header>

        <section className="panel space-y-4 p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <p className="label">빠른 기간 선택</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {datePresets.map((preset) => (
                  <button
                    key={preset.key}
                    className={`rounded-md px-3 py-2 text-sm font-semibold ${activePreset === preset.key ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full xl:max-w-[360px]">
              <span className="label">직접 기간 지정</span>
              <button
                className="mt-2 flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-4 py-3 text-left transition hover:border-slate-400"
                onClick={() => setIsDateEditorOpen((value) => !value)}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{formatRangeLabel(filters.startDate, filters.endDate)}</p>
                  <p className="mt-1 text-xs text-slate-500">달력에서 시작일과 종료일을 직접 선택합니다.</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">{isDateEditorOpen ? "닫기" : "열기"}</span>
              </button>

              {isDateEditorOpen ? (
                <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label>
                      <span className="mb-1 block text-xs font-semibold text-slate-600">시작일</span>
                      <input className="input bg-white" type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} />
                    </label>
                    <label>
                      <span className="mb-1 block text-xs font-semibold text-slate-600">종료일</span>
                      <input className="input bg-white" type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} />
                    </label>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <span className="label">매체</span>
              <select className="input mt-1" value={filters.platform} onChange={(event) => setFilters({ ...filters, platform: event.target.value })}>
                <option value="ALL">전체</option>
                {payload.filters.platforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="label">캠페인</span>
              <select className="input mt-1" value={filters.campaign} onChange={(event) => setFilters({ ...filters, campaign: event.target.value })}>
                <option value="ALL">전체</option>
                {payload.filters.campaigns.map((campaign) => (
                  <option key={campaign} value={campaign}>
                    {campaign}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard title="광고비" value={payload.summary.cost} format="currency" change={payload.summary.changes.cost} />
          <KpiCard title="노출수" value={payload.summary.impressions} change={payload.summary.changes.impressions} />
          <KpiCard title="클릭수" value={payload.summary.clicks} change={payload.summary.changes.clicks} />
          <KpiCard title="전환수" value={payload.summary.conversions} change={payload.summary.changes.conversions} />
          <KpiCard title="매출" value={payload.summary.revenue} format="currency" change={payload.summary.changes.revenue} />
          <KpiCard title="CTR" value={payload.summary.ctr} format="percent" />
          <KpiCard title="CPC" value={payload.summary.cpc} format="currency" />
          <KpiCard title="CPA" value={payload.summary.cpa} format="currency" change={payload.summary.changes.cpa} />
          <KpiCard title="CVR" value={payload.summary.cvr} format="percent" />
          <KpiCard title="ROAS" value={payload.summary.roas} format="roas" change={payload.summary.changes.roas} />
        </section>

        {reportMode ? <ReportSummary summary={payload.summary} analytics={analytics} loading={analyticsLoading} /> : null}
        <DashboardInsights summary={payload.summary} analytics={analytics} loading={analyticsLoading} />
        <DashboardCharts analytics={analytics} loading={analyticsLoading} />
        <ReportTable clientSlug={clientSlug} filters={filters} password={password} />
      </div>
    </main>
  );
}

function AnalyticsPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <section className="panel p-5">
      <h2 className="font-bold text-slate-950">{title}</h2>
      <p className="mt-3 text-sm text-slate-500">{description}</p>
    </section>
  );
}

function ReportSummary({
  summary,
  analytics,
  loading
}: {
  summary: DashboardShellPayload["summary"];
  analytics: DashboardAnalyticsPayload | null;
  loading: boolean;
}) {
  if (!analytics) {
    return <AnalyticsPlaceholder title="보고서 요약" description={loading ? "보고서 요약을 계산하는 중입니다." : "보고서 요약을 불러오지 못했습니다."} />;
  }

  const top = analytics.campaignRankings.slice(0, 3);
  const weak = [...analytics.campaignRankings].sort((a, b) => a.roas - b.roas).slice(0, 3);

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <div className="panel p-5 lg:col-span-2">
        <h2 className="font-bold">보고서 요약</h2>
        <div className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{analytics.reportText}</div>
      </div>

      <div className="panel p-5">
        <h2 className="font-bold">캠페인 진단</h2>

        <p className="mt-4 text-sm font-semibold text-emerald-700">성과 우수</p>
        <ul className="mt-2 space-y-2 text-sm">
          {top.map((row) => (
            <li key={row.campaignName}>{row.campaignName} / ROAS {formatRoas(row.roas)}</li>
          ))}
        </ul>

        <p className="mt-5 text-sm font-semibold text-red-700">개선 필요</p>
        <ul className="mt-2 space-y-2 text-sm">
          {weak.map((row) => (
            <li key={row.campaignName}>{row.campaignName} / ROAS {formatRoas(row.roas)}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
