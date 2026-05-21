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
      <a className="btn-secondary" href="/admin/upload">
        CSV 업로드
      </a>
      <a className="btn-secondary" href={`/api/dashboard/${clientSlug}/export/csv${queryString ? `?${queryString}` : ""}`}>
        CSV 다운로드
      </a>
      <button className="btn-secondary" onClick={onPrint}>
        PDF 저장
      </button>
      <button className="btn-primary" onClick={onShare}>
        공유
      </button>
    </div>
  );
}
