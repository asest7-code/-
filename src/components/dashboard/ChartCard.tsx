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
    <section className="panel p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold text-slate-950">{title}</h3>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
      <div className="mt-4 min-h-[220px]">
        {children ? children : <div className="flex h-[220px] items-center justify-center rounded-md border border-dashed border-slate-200 text-sm text-slate-500">{emptyMessage ?? "충분한 데이터가 없습니다."}</div>}
      </div>
    </section>
  );
}
