import { formatDeltaValue, formatMetricValue } from "@/lib/dashboard/metrics";

type KpiFormat = "number" | "currency" | "percent" | "roas";

export function KpiCard({
  title,
  value,
  format = "number",
  change,
  delta
}: {
  title: string;
  value: number;
  format?: KpiFormat;
  change?: number | null;
  delta?: number | null;
}) {
  const changeTone = change == null ? "text-slate-400" : change >= 0 ? "text-emerald-600" : "text-red-600";
  const changeLabel = change == null ? "비교 없음" : `${change >= 0 ? "▲" : "▼"} ${formatDeltaValue(change, format === "currency" || format === "number" ? "percent" : format)}`;

  return (
    <article className="panel p-4">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{formatMetricValue(value, format)}</p>
      <div className="mt-3 space-y-1">
        <p className={`text-sm font-semibold ${changeTone}`}>{changeLabel}</p>
        {delta != null ? <p className="text-xs text-slate-500">절대 증감 {formatDeltaValue(delta, format)}</p> : null}
      </div>
    </article>
  );
}
