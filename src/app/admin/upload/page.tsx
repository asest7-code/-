"use client";

import { useEffect, useRef, useState } from "react";
import { parseUploadFileInBrowser } from "@/services/upload/browser-parser";
import type { ReportRow } from "@/types/dashboard";

type Client = { id: string; name: string; slug: string };
type PreviewRow = Record<string, string | number | null>;
type UploadHistoryRow = {
  id: string;
  fileName: string;
  rowCount: number;
  status: string;
  createdAt: string;
  client: {
    id: string;
    name: string;
  };
};

type ParsedUploadState = {
  rows: ReportRow[];
  preview: ReportRow[];
  detectedFormat: string;
  errors: string[];
};

const previewColumns = ["date", "platform", "campaignName", "adGroupName", "adName", "impressions", "clicks", "cost", "conversions", "revenue"];
const CLIENT_UPLOAD_CHUNK_SIZE = 1000;
const MAX_PARALLEL_UPLOADS = 2;

function makeRowKey(row: Pick<ReportRow, "date" | "platform" | "campaignName" | "adGroupName" | "adName">) {
  return [row.date, row.platform, row.campaignName, row.adGroupName, row.adName].join("::");
}

function mergeRowsInBrowser(rows: ReportRow[]) {
  const merged = new Map<string, ReportRow>();

  for (const row of rows) {
    const key = makeRowKey(row);
    const current = merged.get(key);

    if (!current) {
      merged.set(key, { ...row });
      continue;
    }

    merged.set(key, {
      ...current,
      device: current.device ?? row.device ?? null,
      keyword: current.keyword ?? row.keyword ?? null,
      creativeName: current.creativeName ?? row.creativeName ?? null,
      landingPage: current.landingPage ?? row.landingPage ?? null,
      memo: current.memo ?? row.memo ?? null,
      impressions: current.impressions + row.impressions,
      clicks: current.clicks + row.clicks,
      cost: current.cost + row.cost,
      conversions: current.conversions + row.conversions,
      revenue: current.revenue + row.revenue,
      purchases: (current.purchases ?? 0) + (row.purchases ?? 0),
      leads: (current.leads ?? 0) + (row.leads ?? 0)
    });
  }

  return [...merged.values()];
}

async function parseResponsePayload(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text };
  }
}

async function uploadChunk(params: {
  clientId: string;
  fileName: string;
  rows: ReportRow[];
  uploadId?: string;
  rowCount: number;
  detectedFormat: string;
  isFirstChunk: boolean;
}) {
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      clientId: params.clientId,
      fileName: params.fileName,
      rows: params.rows,
      uploadId: params.uploadId,
      rowCount: params.rowCount,
      detectedFormat: params.detectedFormat,
      isFirstChunk: params.isFirstChunk
    })
  });

  const data = await parseResponsePayload(response);

  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `업로드 저장 중 오류가 발생했습니다. (HTTP ${response.status})`);
  }

  return {
    uploadId: typeof data.uploadId === "string" ? data.uploadId : params.uploadId
  };
}

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
  const [progressText, setProgressText] = useState("");
  const [uploads, setUploads] = useState<UploadHistoryRow[]>([]);
  const parsedRef = useRef<ParsedUploadState | null>(null);

  useEffect(() => {
    fetch("/api/clients")
      .then((response) => response.json())
      .then((data) => {
        setClients(data.clients ?? []);
        setClientId(data.clients?.[0]?.id ?? "");
      });
  }, []);

  useEffect(() => {
    void loadUploads();
  }, []);

  async function loadUploads() {
    const response = await fetch("/api/uploads?take=30");
    const data = await response.json();
    setUploads(data.uploads ?? []);
  }

  async function ensureParsedUpload() {
    if (!file) return null;
    if (parsedRef.current) return parsedRef.current;

    setProgressText("파일을 브라우저에서 분석하는 중입니다...");
    const parsed = await parseUploadFileInBrowser(file);
    parsedRef.current = parsed;
    setProgressText("");
    return parsed;
  }

  async function previewFile() {
    if (!clientId || !file) return;
    setLoading(true);
    setErrors([]);
    setMessage("");

    try {
      const parsed = await ensureParsedUpload();
      if (!parsed) return;

      if (parsed.rows.length > 100000) {
        setErrors(["한 번에 최대 100,000행까지 업로드할 수 있습니다."]);
        setPreview(parsed.preview ?? []);
        setDetectedFormat(parsed.detectedFormat ?? "");
        setRowCount(parsed.rows.length);
        return;
      }

      if (parsed.errors.length > 0) {
        setErrors(parsed.errors);
        setPreview(parsed.preview ?? []);
        setDetectedFormat(parsed.detectedFormat ?? "");
        setRowCount(parsed.rows.length);
        return;
      }

      setPreview(parsed.preview ?? []);
      setRowCount(parsed.rows.length);
      setDetectedFormat(parsed.detectedFormat ?? "");
      setMessage(`${parsed.rows.length.toLocaleString("ko-KR")}행 검증이 완료되었습니다. 아래 미리보기를 확인해 주세요.`);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "업로드 파일을 분석하지 못했습니다."]);
    } finally {
      setLoading(false);
      setProgressText("");
    }
  }

  async function uploadConfirmed() {
    if (!clientId || !file) return;
    setLoading(true);
    setErrors([]);
    setMessage("");

    try {
      const parsed = await ensureParsedUpload();
      if (!parsed) return;

      if (parsed.rows.length > 100000) {
        setErrors(["한 번에 최대 100,000행까지 업로드할 수 있습니다."]);
        return;
      }

      if (parsed.errors.length > 0) {
        setErrors(parsed.errors);
        return;
      }

      const uploadRows = mergeRowsInBrowser(parsed.rows);

      const chunks: ReportRow[][] = [];
      for (let index = 0; index < uploadRows.length; index += CLIENT_UPLOAD_CHUNK_SIZE) {
        chunks.push(uploadRows.slice(index, index + CLIENT_UPLOAD_CHUNK_SIZE));
      }

      const totalChunks = chunks.length;
      let completedChunks = 0;

      setProgressText(`업로드 중... 0/${totalChunks}`);

      const firstResult = await uploadChunk({
        clientId,
        fileName: file.name,
        rows: chunks[0],
        rowCount: parsed.rows.length,
        detectedFormat: parsed.detectedFormat,
        isFirstChunk: true
      });

      const uploadId = firstResult.uploadId;
      completedChunks += 1;
      setProgressText(`업로드 중... ${completedChunks}/${totalChunks}`);

      const remainingChunks = chunks.slice(1);
      let nextChunkIndex = 0;

      const workers = Array.from({ length: Math.min(MAX_PARALLEL_UPLOADS, remainingChunks.length) }, async () => {
        while (true) {
          const currentIndex = nextChunkIndex;
          nextChunkIndex += 1;

          if (currentIndex >= remainingChunks.length) break;

          await uploadChunk({
            clientId,
            fileName: file.name,
            rows: remainingChunks[currentIndex],
            uploadId,
            rowCount: parsed.rows.length,
            detectedFormat: parsed.detectedFormat,
            isFirstChunk: false
          });

          completedChunks += 1;
          setProgressText(`업로드 중... ${completedChunks}/${totalChunks}`);
        }
      });

      await Promise.all(workers);

      const finalizeResponse = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          uploadId,
          finalizeOnly: true,
          rows: []
        })
      });

      const finalizeData = await parseResponsePayload(finalizeResponse);

      if (!finalizeResponse.ok) {
        throw new Error(typeof finalizeData.error === "string" ? finalizeData.error : `업로드 완료 처리 중 오류가 발생했습니다. (HTTP ${finalizeResponse.status})`);
      }

      setMessage(
        uploadRows.length === parsed.rows.length
          ? `${parsed.rows.length.toLocaleString("ko-KR")}행 업로드가 완료되었습니다.`
          : `중복 병합 후 ${uploadRows.length.toLocaleString("ko-KR")}행으로 업로드가 완료되었습니다. (원본 ${parsed.rows.length.toLocaleString("ko-KR")}행)`
      );
      await loadUploads();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "업로드 저장 중 오류가 발생했습니다."]);
    } finally {
      setLoading(false);
      setProgressText("");
    }
  }

  function onSelectFile(nextFile: File | null) {
    setFile(nextFile);
    parsedRef.current = null;
    setPreview([]);
    setRowCount(0);
    setErrors([]);
    setMessage("");
    setDetectedFormat("");
    setProgressText("");
  }

  async function removeUpload(upload: UploadHistoryRow) {
    const confirmed = window.confirm(`${upload.fileName} 업로드 이력과 연결된 데이터를 삭제할까요?`);
    if (!confirmed) return;

    setLoading(true);
    setErrors([]);
    setMessage("");

    try {
      const response = await fetch(`/api/uploads/${upload.id}`, {
        method: "DELETE"
      });
      const data = await parseResponsePayload(response);

      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "업로드 이력을 삭제하지 못했습니다.");
      }

      setMessage("업로드 이력과 연결된 데이터를 삭제했습니다.");
      await loadUploads();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "업로드 이력을 삭제하지 못했습니다."]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CSV/XLSX 업로드</h1>
        <p className="mt-1 text-sm text-slate-500">원본 파일을 브라우저에서 먼저 검증한 뒤, 분할 업로드 방식으로 안전하게 저장합니다.</p>
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
          <input className="input mt-1" type="file" accept=".csv,.xlsx,.xls" onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)} />
        </label>
        <button className="btn-secondary" disabled={loading || !file} onClick={previewFile}>
          미리보기
        </button>
        <button className="btn-primary" disabled={loading || !file} onClick={uploadConfirmed}>
          업로드 확정
        </button>
      </section>

      <section className="panel p-5">
        <h2 className="font-bold">필수 컬럼</h2>
        <p className="mt-2 text-sm text-slate-600">
          <code>date, platform, campaign_name, ad_group_name, ad_name, impressions, clicks, cost, conversions, revenue</code>
        </p>
        <p className="mt-2 text-sm text-slate-500">일부 변형 헤더도 자동 인식합니다. 예: campaign, campaignName, 캠페인명, 광고비, 매출, 노출수</p>
      </section>

      {message ? <p className="rounded-md bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{message}</p> : null}
      {progressText ? <p className="rounded-md bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">{progressText}</p> : null}
      {detectedFormat ? <p className="rounded-md bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">감지된 업로드 형식: {detectedFormat.toUpperCase()}</p> : null}

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

      <section className="panel overflow-hidden">
        <div className="border-b p-4">
          <h2 className="font-bold">업로드 이력</h2>
          <p className="mt-1 text-sm text-slate-500">최근 업로드한 파일을 확인하고, 필요하면 해당 업로드로 들어간 데이터를 삭제할 수 있습니다.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-3">클라이언트</th>
                <th className="px-3 py-3">파일명</th>
                <th className="px-3 py-3">행 수</th>
                <th className="px-3 py-3">상태</th>
                <th className="px-3 py-3">업로드 시각</th>
                <th className="px-3 py-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((upload) => (
                <tr key={upload.id} className="border-b last:border-0">
                  <td className="px-3 py-3 font-semibold">{upload.client.name}</td>
                  <td className="px-3 py-3">{upload.fileName}</td>
                  <td className="px-3 py-3">{upload.rowCount.toLocaleString("ko-KR")}</td>
                  <td className="px-3 py-3">{upload.status}</td>
                  <td className="px-3 py-3">{new Date(upload.createdAt).toLocaleString("ko-KR")}</td>
                  <td className="px-3 py-3 text-right">
                    <button className="btn-secondary" disabled={loading} onClick={() => removeUpload(upload)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {uploads.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={6}>
                    업로드 이력이 아직 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
