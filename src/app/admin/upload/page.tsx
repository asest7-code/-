"use client";

import { useEffect, useState } from "react";

type Client = { id: string; name: string; slug: string };
type PreviewRow = Record<string, string | number | null>;

const previewColumns = ["date", "platform", "campaignName", "adGroupName", "adName", "impressions", "clicks", "cost", "conversions", "revenue"];

export default function UploadPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [detectedFormat, setDetectedFormat] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/clients")
      .then((response) => response.json())
      .then((data) => {
        setClients(data.clients ?? []);
        setClientId(data.clients?.[0]?.id ?? "");
      });
  }, []);

  async function upload(previewOnly: boolean) {
    if (!clientId || !file) return;
    setLoading(true);
    setErrors([]);
    setMessage("");

    const formData = new FormData();
    formData.append("clientId", clientId);
    formData.append("file", file);
    formData.append("previewOnly", String(previewOnly));

    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setErrors(data.errors ?? [data.error ?? "업로드 검증에 실패했습니다."]);
      setPreview(data.preview ?? []);
      setDetectedFormat(data.detectedFormat ?? "");
      return;
    }

    setPreview(data.preview ?? []);
    setRowCount(data.rowCount ?? 0);
    setDetectedFormat(data.detectedFormat ?? "");
    setMessage(previewOnly ? `${data.rowCount}행 검증이 완료되었습니다. 아래 미리보기를 확인해 주세요.` : `${data.rowCount}행 업로드가 완료되었습니다.`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CSV/XLSX 업로드</h1>
        <p className="mt-1 text-sm text-slate-500">원본 파일의 컬럼을 검증한 뒤 공통 리포트 형식으로 저장합니다.</p>
      </div>

      <section className="panel grid gap-4 p-6 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
        <label>
          <span className="label">클라이언트</span>
          <select className="input mt-1" value={clientId} onChange={(event) => setClientId(event.target.value)}>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">업로드 파일</span>
          <input className="input mt-1" type="file" accept=".csv,.xlsx,.xls" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <button className="btn-secondary" disabled={loading || !file} onClick={() => upload(true)}>
          미리보기
        </button>
        <button className="btn-primary" disabled={loading || !file || preview.length === 0} onClick={() => upload(false)}>
          업로드 확정
        </button>
      </section>

      <section className="panel p-5">
        <h2 className="font-bold">필수 컬럼</h2>
        <p className="mt-2 text-sm text-slate-600">
          `date, platform, campaign_name, ad_group_name, ad_name, impressions, clicks, cost, conversions, revenue`
        </p>
        <p className="mt-2 text-sm text-slate-500">
          일부 변형 헤더도 자동 인식합니다. 예: `campaign`, `campaignName`, `캠페인명`, `광고비`, `매출`, `노출수`
        </p>
      </section>

      {message ? <p className="rounded-md bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{message}</p> : null}
      {detectedFormat ? <p className="rounded-md bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">감지된 업로드 포맷: {detectedFormat.toUpperCase()}</p> : null}

      {errors.length > 0 ? (
        <div className="rounded-md bg-red-50 p-4 text-sm font-semibold text-red-700">
          {errors.slice(0, 12).map((error) => (
            <p key={error}>{error}</p>
          ))}
          {errors.length > 12 ? <p>외 {errors.length - 12}개 오류</p> : null}
        </div>
      ) : null}

      <section className="panel overflow-hidden">
        <div className="border-b p-4">
          <h2 className="font-bold">데이터 미리보기</h2>
          {rowCount > 0 ? <p className="mt-1 text-sm text-slate-500">검증된 행 수: {rowCount.toLocaleString("ko-KR")}</p> : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {previewColumns.map((column) => (
                  <th key={column} className="px-3 py-3">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, index) => (
                <tr key={index} className="border-t">
                  {previewColumns.map((column) => (
                    <td key={column} className="px-3 py-3">
                      {String(row[column] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
