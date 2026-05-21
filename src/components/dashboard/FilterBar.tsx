"use client";

import { useMemo, useState } from "react";
import { buildDashboardQuery, formatRangeLabel, getCompareModeLabel, getDatePresets } from "@/lib/dashboard/filters";
import type { DashboardFilterOptions, DashboardFilters } from "@/types/dashboard";

function getVisibleOptions(values: string[]) {
  return values.filter(Boolean).slice(0, 200);
}

export function FilterBar({
  filters,
  options,
  password,
  onChange
}: {
  filters: DashboardFilters;
  options: DashboardFilterOptions;
  password?: string;
  onChange: (next: DashboardFilters) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDateEditor, setShowDateEditor] = useState(false);
  const presets = useMemo(() => getDatePresets(), []);
  const activePreset = presets.find((preset) => preset.startDate === filters.startDate && preset.endDate === filters.endDate)?.key ?? "";
  const exportQuery = useMemo(() => buildDashboardQuery(filters, password).toString(), [filters, password]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">빠른 기간 선택</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.key}
                  className={`rounded-md px-3 py-2 text-sm font-semibold ${
                    activePreset === preset.key ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  onClick={() => onChange({ ...filters, startDate: preset.startDate, endDate: preset.endDate })}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full xl:max-w-[360px]">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">선택 기간</span>
            <button
              className="mt-2 flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-4 py-3 text-left hover:border-slate-400"
              onClick={() => setShowDateEditor((value) => !value)}
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{formatRangeLabel(filters.startDate, filters.endDate)}</p>
                <p className="mt-1 text-xs text-slate-500">{getCompareModeLabel(filters.compareMode ?? "previous")}</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">{showDateEditor ? "닫기" : "열기"}</span>
            </button>
          </div>
        </div>

        {showDateEditor ? (
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-3">
            <label>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">시작일</span>
              <input className="input mt-1 bg-white" type="date" value={filters.startDate ?? ""} onChange={(event) => onChange({ ...filters, startDate: event.target.value })} />
            </label>
            <label>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">종료일</span>
              <input className="input mt-1 bg-white" type="date" value={filters.endDate ?? ""} onChange={(event) => onChange({ ...filters, endDate: event.target.value })} />
            </label>
            <label>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">비교 기간</span>
              <select className="input mt-1 bg-white" value={filters.compareMode ?? "previous"} onChange={(event) => onChange({ ...filters, compareMode: event.target.value as DashboardFilters["compareMode"] })}>
                <option value="previous">이전 기간 대비</option>
                <option value="month">전월 대비</option>
                <option value="year">전년 동기간 대비</option>
                <option value="none">비교 없음</option>
              </select>
            </label>
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-4">
          <SelectField label="매체" value={filters.platform ?? "ALL"} options={["ALL", ...getVisibleOptions(options.platforms)]} onChange={(value) => onChange({ ...filters, platform: value })} />
          <SelectField label="광고 유형" value={filters.adType ?? "ALL"} options={["ALL", "SA", "DA"]} onChange={(value) => onChange({ ...filters, adType: value as DashboardFilters["adType"] })} />
          <SelectField label="캠페인" value={filters.campaign ?? "ALL"} options={["ALL", ...getVisibleOptions(options.campaigns)]} onChange={(value) => onChange({ ...filters, campaign: value })} />
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setShowAdvanced((value) => !value)}>
            {showAdvanced ? "상세 필터 닫기" : "상세 필터 열기"}
          </button>
        </div>

        {showAdvanced ? (
          <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-4">
            <SelectField label="광고그룹" value={filters.adGroup ?? "ALL"} options={["ALL", ...getVisibleOptions(options.adGroups)]} onChange={(value) => onChange({ ...filters, adGroup: value })} />
            <SelectField label="소재" value={filters.creative ?? "ALL"} options={["ALL", ...getVisibleOptions(options.creatives)]} onChange={(value) => onChange({ ...filters, creative: value })} />
            <SelectField label="디바이스" value={filters.device ?? "ALL"} options={["ALL", ...getVisibleOptions(options.devices)]} onChange={(value) => onChange({ ...filters, device: value })} />
            <SelectField label="키워드" value={filters.keyword ?? "ALL"} options={["ALL", ...getVisibleOptions(options.keywords)]} onChange={(value) => onChange({ ...filters, keyword: value })} />
            <SelectField label="랜딩페이지" value={filters.landingPage ?? "ALL"} options={["ALL", ...getVisibleOptions(options.landingPages)]} onChange={(value) => onChange({ ...filters, landingPage: value })} />
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 xl:col-span-3">
              현재 필터 URL: <code className="break-all">{exportQuery}</code>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</span>
      <select className="input mt-1" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "ALL" ? "전체" : option}
          </option>
        ))}
      </select>
    </label>
  );
}
