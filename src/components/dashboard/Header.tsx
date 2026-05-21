"use client";

import { ExportButtons } from "@/components/dashboard/ExportButtons";
import { getSectionTitle } from "@/lib/dashboard/filters";
import type { DashboardSectionId } from "@/types/dashboard";

export function DashboardHeader({
  clientSlug,
  clientName,
  section,
  subSection,
  queryString,
  onMenuClick,
  onPrint,
  onShare
}: {
  clientSlug: string;
  clientName: string;
  section: DashboardSectionId;
  subSection: string;
  queryString: string;
  onMenuClick: () => void;
  onPrint: () => void;
  onShare: () => void;
}) {
  return (
    <header className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 lg:hidden" onClick={onMenuClick}>
            메뉴
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Advertising Performance Dashboard</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">{clientName} 광고 성과 대시보드</h1>
            <p className="mt-2 text-sm text-slate-500">{getSectionTitle(section, subSection)}</p>
          </div>
        </div>

        <ExportButtons clientSlug={clientSlug} onPrint={onPrint} onShare={onShare} queryString={queryString} />
      </div>
    </header>
  );
}
