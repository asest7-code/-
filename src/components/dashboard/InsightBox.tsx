"use client";

import type { InsightItem } from "@/types/dashboard";

const toneClassMap: Record<NonNullable<InsightItem["tone"]>, string> = {
  neutral: "border-slate-700 bg-slate-900/70 text-slate-200",
  positive: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  danger: "border-red-500/30 bg-red-500/10 text-red-100"
};

export function InsightBox({ title = "데이터 인사이트", insights, loading }: { title?: string; insights: InsightItem[]; loading?: boolean }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-white shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="text-sm text-slate-400">데이터를 기준으로 자동 정리한 보고서 코멘트입니다.</p>
      </div>

      {loading ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-lg bg-slate-900" />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {insights.map((insight) => (
            <article key={insight.id} className={`rounded-xl border p-4 ${toneClassMap[insight.tone ?? "neutral"]}`}>
              <p className="text-sm font-semibold">{insight.title}</p>
              <p className="mt-2 text-sm leading-6">{insight.body}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
