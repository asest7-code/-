"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type UploadReportRow = {
  id: string;
  client: Client;
  date: string;
  platform: string;
  campaignName: string;
  adGroupName: string;
  adName: string;
  cost: number;
  conversions: number;
  revenue: number;
};

type ParsedUploadState = {
  rows: ReportRow[];
  preview: ReportRow[];
  detectedFormat: string;
  platform: string;
  reportLevel: string;
  errors: string[];
};

const previewColumns = ["date", "platform", "campaignName", "adGroupName", "adName", "impressions", "clicks", "cost", "conversions", "revenue"];
const CLIENT_UPLOAD_CHUNK_SIZE = 1000;
const MAX_PARALLEL_UPLOADS = 2;
const REVIEW_PAGE_SIZE = 20;

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
    throw new Error(typeof data.error === "string" ? data.error : `업로드 처리 중 오류가 발생했습니다. (HTTP ${response.status})`);
  }

  return {
    uploadId: typeof data.uploadId === "string" ? data.uploadId : params.uploadId
  };
}

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
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
  const [detectedPlatform, setDetectedPlatform] = useState("");
  const [detectedReportLevel, setDetectedReportLevel] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [uploads, setUploads] = useState<UploadHistoryRow[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState("");
  const [selectedUploadName, setSelectedUploadName] = useState("");
  const [uploadRows, setUploadRows] = useState<UploadReportRow[]>([]);
  const [uploadRowsTotal, setUploadRowsTotal] = useState(0);
  const [uploadRowsPage, setUploadRowsPage] = useState(1);
  const [uploadRowsQuery, setUploadRowsQuery] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const parsedRef = useRef<ParsedUploadState | null>(null);

  const selectedClient = useMemo(() => clients.find((client) => client.id === clientId) ?? null, [clientId, clients]);
  const mergedPreviewCount = parsedRef.current ? mergeRowsInBrowser(parsedRef.current.rows).length : 0;
  const uploadReviewPageCount = Math.max(1, Math.ceil(uploadRowsTotal / REVIEW_PAGE_SIZE));

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

  useEffect(() => {
    if (!selectedUploadId) return;
    void loadUploadRows(selectedUploadId, uploadRowsPage, uploadRowsQuery);
  }, [selectedUploadId, uploadRowsPage, uploadRowsQuery]);

  async function loadUploads() {
    const response = await fetch("/api/uploads?take=30");
    const data = await response.json();
    setUploads(data.uploads ?? []);
  }

  async function loadUploadRows(uploadId: string, page = 1, query = "") {
    setReviewLoading(true);

    try {
      const params = new URLSearchParams({
        uploadId,
        page: String(page),
        pageSize: String(REVIEW_PAGE_SIZE)
      });

      if (query.trim()) params.set("query", query.trim());

      const response = await fetch(`/api/reports?${params.toString()}`);
      const data = await response.json();

      setUploadRows(data.rows ?? []);
      setUploadRowsTotal(data.total ?? 0);
      setSelectedRowIds([]);
    } finally {
      setReviewLoading(false);
    }
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
        setDetectedPlatform(parsed.platform ?? "");
        setDetectedReportLevel(parsed.reportLevel ?? "");
        setRowCount(parsed.rows.length);
        return;
      }

      if (parsed.errors.length > 0) {
        setErrors(parsed.errors);
        setPreview(parsed.preview ?? []);
        setDetectedFormat(parsed.detectedFormat ?? "");
        setDetectedPlatform(parsed.platform ?? "");
        setDetectedReportLevel(parsed.reportLevel ?? "");
        setRowCount(parsed.rows.length);
        return;
      }

      setPreview(parsed.preview ?? []);
      setRowCount(parsed.rows.length);
      setDetectedFormat(parsed.detectedFormat ?? "");
      setDetectedPlatform(parsed.platform ?? "");
      setDetectedReportLevel(parsed.reportLevel ?? "");
      setMessage(`${formatNumber(parsed.rows.length)}행 검증이 완료됐습니다. 아래 미리보기와 병합 결과를 확인해 주세요.`);
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

      const mergedRows = mergeRowsInBrowser(parsed.rows);
      const chunks: ReportRow[][] = [];

      for (let index = 0; index < mergedRows.length; index += CLIENT_UPLOAD_CHUNK_SIZE) {
        chunks.push(mergedRows.slice(index, index + CLIENT_UPLOAD_CHUNK_SIZE));
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
        mergedRows.length === parsed.rows.length
          ? `${formatNumber(parsed.rows.length)}행 업로드가 완료됐습니다.`
          : `중복 병합 후 ${formatNumber(mergedRows.length)}행으로 업로드가 완료됐습니다. (원본 ${formatNumber(parsed.rows.length)}행)`
      );

      await loadUploads();

      if (typeof uploadId === "string") {
        setSelectedUploadId(uploadId);
        setSelectedUploadName(file.name);
        setUploadRowsPage(1);
        setUploadRowsQuery("");
        await loadUploadRows(uploadId, 1, "");
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "업로드 처리 중 오류가 발생했습니다."]);
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
    setDetectedPlatform("");
    setDetectedReportLevel("");
    setProgressText("");
  }

  async function removeUpload(upload: UploadHistoryRow) {
    const confirmed = window.confirm(`${upload.fileName} 업로드 이력과 연결된 데이터를 모두 삭제할까요?`);
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

      if (selectedUploadId === upload.id) {
        setSelectedUploadId("");
        setSelectedUploadName("");
        setUploadRows([]);
        setUploadRowsTotal(0);
        setSelectedRowIds([]);
      }

      setMessage("업로드 이력과 연결된 데이터를 삭제했습니다.");
      await loadUploads();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "업로드 이력을 삭제하지 못했습니다."]);
    } finally {
      setLoading(false);
    }
  }

  async function openUploadReview(upload: UploadHistoryRow) {
    setSelectedUploadId(upload.id);
    setSelectedUploadName(upload.fileName);
    setUploadRowsPage(1);
    setUploadRowsQuery("");
    await loadUploadRows(upload.id, 1, "");
  }

  function toggleRowSelection(reportId: string) {
    setSelectedRowIds((current) => (current.includes(reportId) ? current.filter((id) => id !== reportId) : [...current, reportId]));
  }

  function toggleSelectAllCurrentPage() {
    const pageIds = uploadRows.map((row) => row.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedRowIds.includes(id));

    setSelectedRowIds(allSelected ? selectedRowIds.filter((id) => !pageIds.includes(id)) : Array.from(new Set([...selectedRowIds, ...pageIds])));
  }

  async function deleteSelectedRows() {
    if (selectedRowIds.length === 0) return;

    const confirmed = window.confirm(`선택한 ${formatNumber(selectedRowIds.length)}개 행을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`);
    if (!confirmed) return;

    setReviewLoading(true);
    setErrors([]);
    setMessage("");

    try {
      const response = await fetch("/api/reports", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ids: selectedRowIds
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "선택한 행을 삭제하지 못했습니다.");
      }

      setMessage(`${formatNumber(Number(data.deletedCount ?? selectedRowIds.length))}개 행을 삭제했습니다.`);

      if (selectedUploadId) {
        await loadUploadRows(selectedUploadId, uploadRowsPage, uploadRowsQuery);
      }

      await loadUploads();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "선택한 행을 삭제하지 못했습니다."]);
    } finally {
      setReviewLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-950">데이터 업로드</h1>
        <p className="text-sm text-slate-500">파일 검증, 업로드 진행, 업로드 이력 관리, 행 단위 검수까지 한 화면에서 처리할 수 있습니다.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="선택 클라이언트" value={selectedClient?.name ?? "-"} helper={selectedClient ? `/dashboard/${selectedClient.slug}` : "클라이언트를 선택해 주세요."} />
        <StatCard label="검증된 원본 행" value={rowCount > 0 ? formatNumber(rowCount) : "-"} helper="브라우저 기준 검증 결과" />
        <StatCard label="병합 후 업로드 행" value={mergedPreviewCount > 0 ? formatNumber(mergedPreviewCount) : "-"} helper="중복 키 병합 기준" />
      </section>

      <section className="panel p-6">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_1.3fr]">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">1. 업로드 준비</h2>
              <p className="mt-1 text-sm text-slate-500">클라이언트와 파일을 선택하고, 미리보기로 검증한 뒤 문제가 없으면 업로드를 확정합니다.</p>
            </div>

            <label className="block">
              <span className="label">클라이언트</span>
              <select className="input mt-1" value={clientId} onChange={(event) => setClientId(event.target.value)}>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="label">업로드 파일</span>
              <input className="input mt-1" type="file" accept=".csv,.xlsx,.xls" onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)} />
            </label>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">필수 컬럼</p>
              <p className="mt-2 break-all">
                <code>date, platform, campaign_name, ad_group_name, ad_name, impressions, clicks, cost, conversions, revenue</code>
              </p>
              <p className="mt-2 text-slate-500">일부 변형 헤더도 자동 인식합니다. 예: campaign, campaignName, 캠페인명, 광고비, 매출, 노출수</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" disabled={loading || !file} onClick={previewFile}>
                미리보기
              </button>
              <button className="btn-primary" disabled={loading || !file} onClick={uploadConfirmed}>
                업로드 확정
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">2. 업로드 상태</h2>
              <p className="mt-1 text-sm text-slate-500">검증 결과와 업로드 진행 상황을 바로 확인할 수 있습니다.</p>
            </div>

            {message ? <Notice tone="blue">{message}</Notice> : null}
            {progressText ? <Notice tone="slate">{progressText}</Notice> : null}
            {detectedFormat ? (
              <Notice tone="amber">
                감지된 업로드 형식: {detectedFormat.toUpperCase()}
                {detectedPlatform ? ` / 저장 매체: ${detectedPlatform}` : ""}
                {detectedReportLevel ? ` / 보고서 레벨: ${detectedReportLevel}` : ""}
              </Notice>
            ) : null}

            {errors.length > 0 ? (
              <div className="rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-700">
                {errors.slice(0, 12).map((error) => (
                  <p key={error}>{error}</p>
                ))}
                {errors.length > 12 ? <p>외 {errors.length - 12}개 오류</p> : null}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
                파일을 선택하고 미리보기를 누르면 검증 결과와 업로드 형식이 표시됩니다.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b p-4">
          <h2 className="font-bold text-slate-950">3. 데이터 미리보기</h2>
          {rowCount > 0 ? <p className="mt-1 text-sm text-slate-500">검증된 원본 행 수: {formatNumber(rowCount)}</p> : null}
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
              {preview.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={previewColumns.length}>
                    아직 표시할 미리보기 데이터가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <section className="panel overflow-hidden">
          <div className="border-b p-4">
            <h2 className="font-bold text-slate-950">4. 업로드 이력</h2>
            <p className="mt-1 text-sm text-slate-500">업로드 전체 삭제 또는 업로드별 행 검수로 이어질 수 있습니다.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
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
                  <tr key={upload.id} className={`border-b last:border-0 ${selectedUploadId === upload.id ? "bg-blue-50/60" : ""}`}>
                    <td className="px-3 py-3 font-semibold">{upload.client.name}</td>
                    <td className="px-3 py-3">{upload.fileName}</td>
                    <td className="px-3 py-3">{formatNumber(upload.rowCount)}</td>
                    <td className="px-3 py-3">{upload.status}</td>
                    <td className="px-3 py-3">{new Date(upload.createdAt).toLocaleString("ko-KR")}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <button className="btn-secondary" disabled={loading} onClick={() => void openUploadReview(upload)}>
                          행 검수
                        </button>
                        <button className="btn-secondary" disabled={loading} onClick={() => void removeUpload(upload)}>
                          전체 삭제
                        </button>
                      </div>
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

        <section className="panel overflow-hidden">
          <div className="border-b p-4">
            <div className="flex flex-col gap-2">
              <h2 className="font-bold text-slate-950">5. 업로드 행 검수 / 부분 삭제</h2>
              <p className="text-sm text-slate-500">
                {selectedUploadId
                  ? `${selectedUploadName} 업로드에서 잘못 들어간 행만 골라 삭제할 수 있습니다.`
                  : "업로드 이력에서 행 검수를 눌러 선택한 업로드의 행을 확인해 주세요."}
              </p>
            </div>
          </div>

          <div className="border-b p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <input
                className="input w-full lg:max-w-sm"
                placeholder="매체, 캠페인, 그룹, 소재 검색"
                value={uploadRowsQuery}
                onChange={(event) => {
                  setUploadRowsQuery(event.target.value);
                  setUploadRowsPage(1);
                }}
                disabled={!selectedUploadId}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button className="btn-secondary" disabled={!selectedUploadId || uploadRows.length === 0} onClick={toggleSelectAllCurrentPage}>
                  현재 페이지 전체 선택
                </button>
                <button className="btn-primary" disabled={selectedRowIds.length === 0 || reviewLoading} onClick={() => void deleteSelectedRows()}>
                  선택 행 삭제
                </button>
              </div>
            </div>
          </div>

          {reviewLoading ? <div className="px-4 py-3 text-sm text-slate-500">업로드 행을 불러오는 중입니다.</div> : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={uploadRows.length > 0 && uploadRows.every((row) => selectedRowIds.includes(row.id))}
                      onChange={toggleSelectAllCurrentPage}
                      disabled={uploadRows.length === 0}
                    />
                  </th>
                  <th className="px-3 py-3">일자</th>
                  <th className="px-3 py-3">매체</th>
                  <th className="px-3 py-3">캠페인</th>
                  <th className="px-3 py-3">광고그룹</th>
                  <th className="px-3 py-3">소재</th>
                  <th className="px-3 py-3">광고비</th>
                  <th className="px-3 py-3">전환수</th>
                  <th className="px-3 py-3">매출</th>
                </tr>
              </thead>
              <tbody>
                {uploadRows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={selectedRowIds.includes(row.id)} onChange={() => toggleRowSelection(row.id)} />
                    </td>
                    <td className="px-3 py-3">{row.date.slice(0, 10)}</td>
                    <td className="px-3 py-3">{row.platform}</td>
                    <td className="px-3 py-3">{row.campaignName}</td>
                    <td className="px-3 py-3">{row.adGroupName}</td>
                    <td className="px-3 py-3">{row.adName}</td>
                    <td className="px-3 py-3">{formatNumber(row.cost)}</td>
                    <td className="px-3 py-3">{formatNumber(row.conversions)}</td>
                    <td className="px-3 py-3">{formatNumber(row.revenue)}</td>
                  </tr>
                ))}
                {!selectedUploadId ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-slate-500" colSpan={9}>
                      먼저 업로드 이력에서 검수할 업로드를 선택해 주세요.
                    </td>
                  </tr>
                ) : uploadRows.length === 0 && !reviewLoading ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-slate-500" colSpan={9}>
                      조건에 맞는 업로드 행이 없습니다.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t p-4 text-sm">
            <span>
              총 {formatNumber(uploadRowsTotal)}개 / {uploadRowsPage}페이지
            </span>
            <div className="flex gap-2">
              <button className="btn-secondary" disabled={!selectedUploadId || uploadRowsPage === 1 || reviewLoading} onClick={() => setUploadRowsPage((value) => Math.max(1, value - 1))}>
                이전
              </button>
              <button
                className="btn-secondary"
                disabled={!selectedUploadId || uploadRowsPage === uploadReviewPageCount || reviewLoading}
                onClick={() => setUploadRowsPage((value) => Math.min(uploadReviewPageCount, value + 1))}
              >
                다음
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Notice({ children, tone }: { children: React.ReactNode; tone: "blue" | "slate" | "amber" }) {
  const toneClass = tone === "blue" ? "bg-blue-50 text-blue-700" : tone === "amber" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700";

  return <p className={`rounded-lg px-4 py-3 text-sm font-semibold ${toneClass}`}>{children}</p>;
}

function StatCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <section className="panel p-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </section>
  );
}
