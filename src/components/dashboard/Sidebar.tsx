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
      {open ? <button className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={onClose} aria-label="사이드바 닫기" /> : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[280px] transform border-r border-slate-200 bg-white p-4 shadow-xl transition duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">AdDash</p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">광고 보고서</h2>
          </div>
          <button className="btn-secondary px-3 lg:hidden" onClick={onClose}>
            닫기
          </button>
        </div>

        <nav className="mt-4 space-y-2">
          {SIDEBAR_ITEMS.map((item) => (
            <div key={item.id} className="space-y-2">
              <button
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
                  activeSection === item.id ? "bg-brand-700 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
                onClick={() => {
                  onSelect(item.id, item.children?.[0]?.id);
                  onClose();
                }}
              >
                <span>{item.label}</span>
                {item.children?.length ? (
                  <span className={`text-xs ${activeSection === item.id ? "text-white/80" : "text-slate-400"}`}>{item.children.length}</span>
                ) : null}
              </button>

              {item.children?.length && activeSection === item.id ? (
                <div className="ml-2 border-l border-slate-200 pl-3">
                  {item.children.map((child) => (
                    <button
                      key={child.id}
                      className={`mt-1 flex w-full rounded-md px-3 py-2 text-left text-sm transition ${
                        activeSubSection === child.id ? "bg-slate-100 font-semibold text-slate-950" : "text-slate-600 hover:bg-slate-50"
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
