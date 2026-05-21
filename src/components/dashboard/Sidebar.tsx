"use client";

import { SIDEBAR_ITEMS } from "@/lib/dashboard/filters";
import type { DashboardSectionId } from "@/types/dashboard";

export function Sidebar({
  open,
  activeSection,
  activeSubSection,
  onSelect,
  onClose
}: {
  open: boolean;
  activeSection: DashboardSectionId;
  activeSubSection: string;
  onSelect: (section: DashboardSectionId, subSection?: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      {open ? <button className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={onClose} aria-label="사이드바 닫기" /> : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[292px] transform border-r border-slate-800 bg-slate-950 text-slate-100 transition duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-400">AdDash</p>
            <h2 className="mt-1 text-lg font-bold text-white">광고 보고서</h2>
          </div>
          <button className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 lg:hidden" onClick={onClose}>
            닫기
          </button>
        </div>

        <nav className="space-y-2 overflow-y-auto px-3 py-4">
          {SIDEBAR_ITEMS.map((item) => (
            <div key={item.id} className="space-y-2">
              <button
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                  activeSection === item.id ? "bg-sky-500/20 text-white ring-1 ring-sky-400/50" : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`}
                onClick={() => {
                  onSelect(item.id, item.children?.[0]?.id);
                  onClose();
                }}
              >
                <span>{item.label}</span>
                {item.children?.length ? (
                  <span className={`text-xs ${activeSection === item.id ? "text-sky-300" : "text-slate-500"}`}>{item.children.length}</span>
                ) : null}
              </button>

              {item.children?.length && activeSection === item.id ? (
                <div className="ml-3 border-l border-slate-800 pl-3">
                  {item.children.map((child) => (
                    <button
                      key={child.id}
                      className={`mt-1 flex w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                        activeSubSection === child.id ? "bg-slate-900 font-semibold text-white" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                      }`}
                      onClick={() => {
                        onSelect(item.id, child.id);
                        onClose();
                      }}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
