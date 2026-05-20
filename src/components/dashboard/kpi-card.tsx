import { currency } from "@/utils/metrics";

export function KpiCard({ title, value, format = "number", change }: { title: string; value: number; format?: "number" | "currency" | "percent"; change?: number | null }) {
  const formatted = format === "currency" ? `${currency(value)}원` : format === "percent" ? `${value}%` : value.toLocaleString("ko-KR");
  const positive = typeof change === "number" && change >= 0;
  return (
    <div className="panel p-4">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-bold text-slate-950">{formatted}</p>
      <p className={`mt-2 text-sm font-semibold ${change == null ? "text-slate-400" : positive ? "text-emerald-600" : "text-red-600"}`}>
        {change == null ? "비교 불가" : `${positive ? "+" : ""}${change}%`}
      </p>
    </div>
  );
}
