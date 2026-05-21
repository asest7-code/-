import { currency, formatNumber, formatPercent, formatRoas } from "@/utils/metrics";

type KpiFormat = "number" | "currency" | "percent" | "roas";

export function KpiCard({
  title,
  value,
  format = "number",
  change
}: {
  title: string;
  value: number;
  format?: KpiFormat;
  change?: number | null;
}) {
  const formatted =
    format === "currency"
      ? `${currency(value)}원`
      : format === "roas"
        ? formatRoas(value)
        : format === "percent"
          ? formatPercent(value, 1)
          : formatNumber(value);

  const positive = typeof change === "number" && change >= 0;
  const formattedChange = change == null ? "비교 불가" : `${positive ? "+" : ""}${format === "roas" ? formatRoas(change) : formatPercent(change, 1)}`;

  return (
    <div className="panel p-4">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-bold text-slate-950">{formatted}</p>
      <p className={`mt-2 text-sm font-semibold ${change == null ? "text-slate-400" : positive ? "text-emerald-600" : "text-red-600"}`}>{formattedChange}</p>
    </div>
  );
}
