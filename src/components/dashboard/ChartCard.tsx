"use client";

export function ChartCard({
  title,
  description,
  children,
  emptyMessage
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  emptyMessage?: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-slate-100 shadow-sm">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold text-white">{title}</h3>
        {description ? <p className="text-sm text-slate-400">{description}</p> : null}
      </div>
      <div className="mt-4 min-h-[220px]">
        {children ? (
          children
        ) : (
          <div className="flex h-[220px] items-center justify-center rounded-md border border-dashed border-slate-700 text-sm text-slate-400">
            {emptyMessage ?? "충분한 데이터가 없습니다."}
          </div>
        )}
      </div>
    </section>
  );
}
