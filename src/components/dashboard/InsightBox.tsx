"use client";

import type { InsightItem } from "@/types/dashboard";

const toneClassMap: Record<NonNullable<InsightItem["tone"]>, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  positive: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-800"
};

export function InsightBox({ title = "데이터 인사이트", insights, loading }: { title?: string; insights: InsightItem[]; loading?: boolean }) {
  return (
    <section className="panel p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <p className="text-sm text-slate-500">데이터를 기준으로 자동 정리한 리포트 코멘트입니다.</p>
      </div>

      {loading ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {insights.map((insight) => (
            <article key={insight.id} className={`rounded-lg border p-4 ${toneClassMap[insight.tone ?? "neutral"]}`}>
              <p className="text-sm font-semibold">{insight.title}</p>
              <p className="mt-2 text-sm leading-6">{insight.body}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
