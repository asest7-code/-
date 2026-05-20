"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardPayload } from "@/types/dashboard";
import { calculateMetrics, currency } from "@/utils/metrics";

type ReportTableProps = {
  rows: DashboardPayload["rows"];
};

type GroupMode = "date" | "campaign" | "adGroup";
type SortKey = "dateDesc" | "cost" | "revenue" | "conversions" | "clicks" | "roas";

type TrendValue = {
  cost: number | null;
  conversions: number | null;
  revenue: number | null;
  roas: number | null;
};

type AggregatedRow = {
  id: string;
  date: string;
  platform: string;
  campaignName: string;
  adGroupName: string;
  rowCount: number;
  metrics: ReturnType<typeof calculateMetrics>;
  dayOverDay?: TrendValue | null;
};

const pageSize = 15;

export function ReportTable({ rows }: ReportTableProps) {
  const [groupMode, setGroupMode] = useState<GroupMode>("date");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("dateDesc");

  const aggregatedRows = useMemo(() => aggregateRows(rows, groupMode), [rows, groupMode]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matched = normalizedQuery
      ? aggregatedRows.filter((row) =>
          [row.date, row.platform, row.campaignName, row.adGroupName].join(" ").toLowerCase().includes(normalizedQuery)
        )
      : aggregatedRows;

    return [...matched].sort((a, b) => sortRows(a, b, sortKey));
  }, [aggregatedRows, query, sortKey]);

  useEffect(() => {
    setPage(1);
  }, [rows, query, sortKey, groupMode]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-bold text-slate-950">상세 성과 테이블</h2>
            <p className="mt-1 text-sm text-slate-500">일자 기준으로 매체, 캠페인, 그룹 성과를 나눠서 확인할 수 있습니다.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="input w-full sm:w-64"
              placeholder="일자, 매체, 캠페인, 그룹 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
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
            {pageRows.map((row) => (
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
            {pageRows.length === 0 ? (
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
          총 {filteredRows.length.toLocaleString("ko-KR")}개 / {page}페이지
        </span>
        <div className="flex gap-2">
          <button className="btn-secondary" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            이전
          </button>
          <button
            className="btn-secondary"
            disabled={page === pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
          >
            다음
          </button>
        </div>
      </div>
    </section>
  );
}

function aggregateRows(rows: DashboardPayload["rows"], mode: GroupMode): AggregatedRow[] {
  const grouped = new Map<string, DashboardPayload["rows"]>();

  rows.forEach((row) => {
    const key =
      mode === "date"
        ? [row.date, row.platform].join("__")
        : mode === "campaign"
          ? [row.date, row.platform, row.campaignName].join("__")
          : [row.date, row.platform, row.campaignName, row.adGroupName].join("__");

    const current = grouped.get(key) ?? [];
    current.push(row);
    grouped.set(key, current);
  });

  const aggregated = Array.from(grouped.entries()).map(([key, groupedRows]) => {
    const [date, platform, campaignName = "", adGroupName = ""] = key.split("__");

    return {
      id: `${mode}-${key}`,
      date,
      platform,
      campaignName: mode === "date" ? "-" : campaignName,
      adGroupName: mode === "adGroup" ? adGroupName : "-",
      rowCount: groupedRows.length,
      metrics: calculateMetrics(groupedRows)
    } satisfies AggregatedRow;
  });

  if (mode !== "date") {
    return aggregated;
  }

  const byPlatform = new Map<string, AggregatedRow[]>();
  aggregated.forEach((row) => {
    const current = byPlatform.get(row.platform) ?? [];
    current.push(row);
    byPlatform.set(row.platform, current);
  });

  const trendMap = new Map<string, TrendValue>();

  byPlatform.forEach((platformRows) => {
    const sorted = [...platformRows].sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach((row, index) => {
      const previous = sorted[index - 1];
      trendMap.set(row.id, {
        cost: previous ? row.metrics.cost - previous.metrics.cost : null,
        conversions: previous ? row.metrics.conversions - previous.metrics.conversions : null,
        revenue: previous ? row.metrics.revenue - previous.metrics.revenue : null,
        roas: previous ? row.metrics.roas - previous.metrics.roas : null
      });
    });
  });

  return aggregated.map((row) => ({ ...row, dayOverDay: trendMap.get(row.id) ?? null }));
}

function sortRows(a: AggregatedRow, b: AggregatedRow, sortKey: SortKey) {
  if (sortKey === "dateDesc") {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.platform.localeCompare(b.platform);
  }

  return Number(b.metrics[sortKey]) - Number(a.metrics[sortKey]);
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
