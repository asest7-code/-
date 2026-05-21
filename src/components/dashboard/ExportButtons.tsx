"use client";

export function ExportButtons({
  clientSlug,
  onPrint,
  onShare,
  queryString
}: {
  clientSlug: string;
  onPrint: () => void;
  onShare: () => void;
  queryString: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <a className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href="/admin/upload">
        CSV 업로드
      </a>
      <a
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        href={`/api/dashboard/${clientSlug}/export/csv${queryString ? `?${queryString}` : ""}`}
      >
        CSV 다운로드
      </a>
      <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={onPrint}>
        PDF 저장
      </button>
      <button className="rounded-md bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800" onClick={onShare}>
        공유
      </button>
    </div>
  );
}
