"use client";

import { useEffect, useMemo, useState } from "react";
import { currency } from "@/utils/metrics";

type GroupMode = "date" | "campaign" | "adGroup";
type SortKey = "dateDesc" | "cost" | "revenue" | "conversions" | "clicks" | "roas";

type FilterState = {
  startDate: string;
  endDate: string;
  platform: string;
  campaign: string;
};

type TrendValue = {
  cost: number | null;
  conversions: number | null;
  revenue: number | null;
  roas: number | null;
};

type TableRow = {
  id: string;
  date: string;
  platform: string;
  campaignName: string;
  adGroupName: string;
  rowCount: number;
  metrics: {
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
  dayOverDay?: TrendValue | null;
};

type ReportTableProps = {
  clientSlug: string;
  filters: FilterState;
  password?: string;
};

export function ReportTable({ clientSlug, filters, password = "" }: ReportTableProps) {
  const [groupMode, setGroupMode] = useState<GroupMode>("date");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("dateDesc");
  const [rows, setRows] = useState<TableRow[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const requestQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set("groupMode", groupMode);
    params.set("sortKey", sortKey);
    params.set("page", String(page));
    if (query.trim()) params.set("query", query.trim());
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    if (filters.platform !== "ALL") params.set("platform", filters.platform);
    if (filters.campaign !== "ALL") params.set("campaign", filters.campaign);
    if (password) params.set("password", password);
    return params.toString();
  }, [filters.campaign, filters.endDate, filters.platform, filters.startDate, groupMode, page, password, query, sortKey]);

  useEffect(() => {
    setPage(1);
  }, [filters.startDate, filters.endDate, filters.platform, filters.campaign, groupMode, sortKey, query]);

  useEffect(() => {
    let ignore = false;

    async function loadTable() {
      setLoading(true);

      const response = await fetch(`/api/dashboard/${clientSlug}/table?${requestQuery}`);
      const data = (await response.json()) as {
        rows: TableRow[];
        total: number;
        page: number;
        pageCount: number;
      };

      if (ignore) return;

      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setPageCount(data.pageCount ?? 1);
      setLoading(false);
    }

    void loadTable();

    return () => {
      ignore = true;
    };
  }, [clientSlug, requestQuery]);

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-bold text-slate-950">상세 성과 테이블</h2>
            <p className="mt-1 text-sm text-slate-500">일자 기준으로 매체, 캠페인, 그룹 성과를 확인할 수 있습니다.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input className="input w-full sm:w-64" placeholder="일자, 매체, 캠페인, 그룹 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
            <select className="input w-full sm:w-40" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              <option value="dateDesc">최신순</option>
              <option value="cost">광고비순</option>
              <option value="revenue">매출순</option>
              <option value="conversions">전환수순</option>
              <option value="clicks">클릭수순</option>
              <option value="roas">ROAS순</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { key: "date", label: "일자별" },
            { key: "campaign", label: "캠페인별" },
            { key: "adGroup", label: "그룹별" }
          ].map((mode) => (
            <button
              key={mode.key}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${
                groupMode === mode.key ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              onClick={() => setGroupMode(mode.key as GroupMode)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="border-b px-4 py-3 text-sm text-slate-500">테이블을 불러오는 중입니다.</div> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1480px] text-left text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-3">일자</th>
              <th className="px-3 py-3">매체</th>
              <th className="px-3 py-3">캠페인</th>
              <th className="px-3 py-3">광고그룹</th>
              <th className="px-3 py-3">집계 행수</th>
              <th className="px-3 py-3">노출수</th>
              <th className="px-3 py-3">클릭수</th>
              <th className="px-3 py-3">광고비</th>
              <th className="px-3 py-3">전환수</th>
              <th className="px-3 py-3">매출</th>
              <th className="px-3 py-3">CTR</th>
              <th className="px-3 py-3">CPC</th>
              <th className="px-3 py-3">CPA</th>
              <th className="px-3 py-3">ROAS</th>
              {groupMode === "date" ? (
                <>
                  <th className="px-3 py-3">광고비 증감</th>
                  <th className="px-3 py-3">전환수 증감</th>
                  <th className="px-3 py-3">매출 증감</th>
                  <th className="px-3 py-3">ROAS 증감</th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-3 font-semibold text-slate-900">{row.date}</td>
                <td className="px-3 py-3">{row.platform}</td>
                <td className="px-3 py-3">{row.campaignName || "-"}</td>
                <td className="px-3 py-3">{row.adGroupName || "-"}</td>
                <td className="px-3 py-3">{row.rowCount.toLocaleString("ko-KR")}</td>
                <td className="px-3 py-3">{row.metrics.impressions.toLocaleString("ko-KR")}</td>
                <td className="px-3 py-3">{row.metrics.clicks.toLocaleString("ko-KR")}</td>
                <td className="px-3 py-3">{currency(row.metrics.cost)}원</td>
                <td className="px-3 py-3">{row.metrics.conversions.toLocaleString("ko-KR")}</td>
                <td className="px-3 py-3">{currency(row.metrics.revenue)}원</td>
                <td className="px-3 py-3">{row.metrics.ctr}%</td>
                <td className="px-3 py-3">{currency(row.metrics.cpc)}원</td>
                <td className="px-3 py-3">{currency(row.metrics.cpa)}원</td>
                <td className="px-3 py-3 font-bold text-brand-700">{row.metrics.roas}%</td>
                {groupMode === "date" ? (
                  <>
                    <td className="px-3 py-3">{formatDelta(row.dayOverDay?.cost, "currency")}</td>
                    <td className="px-3 py-3">{formatDelta(row.dayOverDay?.conversions, "number")}</td>
                    <td className="px-3 py-3">{formatDelta(row.dayOverDay?.revenue, "currency")}</td>
                    <td className="px-3 py-3">{formatDelta(row.dayOverDay?.roas, "percent")}</td>
                  </>
                ) : null}
              </tr>
            ))}
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={groupMode === "date" ? 18 : 14} className="px-3 py-10 text-center text-sm text-slate-500">
                  조건에 맞는 데이터가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t p-4 text-sm">
        <span>
          총 {total.toLocaleString("ko-KR")}개 / {page}페이지
        </span>
        <div className="flex gap-2">
          <button className="btn-secondary" disabled={page === 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            이전
          </button>
          <button className="btn-secondary" disabled={page === pageCount || loading} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
            다음
          </button>
        </div>
      </div>
    </section>
  );
}

function formatDelta(value: number | null | undefined, format: "currency" | "number" | "percent") {
  if (value === null || value === undefined) return "-";
  if (value === 0) return "보합";

  const prefix = value > 0 ? "+" : "-";
  const absoluteValue = Math.abs(value);

  if (format === "currency") {
    return `${prefix}${currency(absoluteValue)}원`;
  }

  if (format === "percent") {
    return `${prefix}${absoluteValue.toLocaleString("ko-KR")} %p`;
  }

  return `${prefix}${absoluteValue.toLocaleString("ko-KR")}`;
}
