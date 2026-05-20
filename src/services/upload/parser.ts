import * as XLSX from "xlsx";
import iconv from "iconv-lite";
import { z } from "zod";
import { scoreSource } from "@/services/upload/utils";
import { uploadSources } from "@/services/upload/sources";
import { detectUploadSource } from "@/services/upload/detector";
import { buildAliasLookup, normalizeHeaderToken } from "@/services/upload/utils";
import type { CanonicalColumn, NormalizedWorkbook, UploadParseResult, UploadSourceDefinition } from "@/services/upload/types";
import type { ReportRow } from "@/types/dashboard";

const hardRequiredColumns = ["date", "campaign_name", "ad_group_name", "ad_name", "impressions", "clicks", "cost"] satisfies CanonicalColumn[];

function normalizeDateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value ?? "").trim();
  const dotted = raw.match(/^(\d{4})\.(\d{2})\.(\d{2})\.?$/);
  if (dotted) {
    return `${dotted[1]}-${dotted[2]}-${dotted[3]}`;
  }
  return raw;
}

function cleanText(value: string | null | undefined) {
  if (!value) return null;
  return value.replace(/^'+/, "").trim() || null;
}

const rowSchema = z.object({
  date: z.preprocess(normalizeDateValue, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD.")),
  platform: z.string().min(1),
  campaign_name: z.string().min(1),
  ad_group_name: z.string().min(1),
  ad_name: z.string().min(1),
  impressions: z.coerce.number().int().nonnegative(),
  clicks: z.coerce.number().int().nonnegative(),
  cost: z.coerce.number().nonnegative(),
  conversions: z.coerce.number().nonnegative().default(0),
  revenue: z.coerce.number().nonnegative().default(0),
  device: z.string().optional().nullable(),
  keyword: z.string().optional().nullable(),
  creative_name: z.string().optional().nullable(),
  landing_page: z.string().optional().nullable(),
  purchases: z.coerce.number().nonnegative().optional().nullable(),
  leads: z.coerce.number().nonnegative().optional().nullable(),
  memo: z.string().optional().nullable()
});

function isCsvFile(fileName: string) {
  return fileName.toLowerCase().endsWith(".csv");
}

function decodeCsvCandidates(buffer: Buffer) {
  return [
    iconv.decode(buffer, "utf8"),
    iconv.decode(buffer, "cp949"),
    iconv.decode(buffer, "euc-kr")
  ];
}

function parseSpecialNaverKeywordReport(fileName: string, text: string): NormalizedWorkbook | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 3) return null;
  if (!lines[0].includes("\uAC80\uC0C9\uC5B4 \uBCF4\uACE0\uC11C") && !fileName.includes("\uAC80\uC0C9\uC5B4")) return null;

  const headers = lines[1].split(",").map((item) => item.trim());
  const expectedPrefix = ["\uCEA0\uD398\uC778", "\uAD11\uACE0\uADF8\uB8F9", "\uAC80\uC0C9\uC5B4"];
  if (!expectedPrefix.every((value, index) => headers[index] === value)) return null;

  const rows = lines.slice(2).map((line) => {
    const parts = line.split(",");
    if (parts.length <= headers.length) {
      return Object.fromEntries(headers.map((header, index) => [header, parts[index] ?? ""]));
    }

    const trailingFixedCount = 8;
    const keywordParts = parts.slice(2, parts.length - trailingFixedCount);
    const reconstructed = [
      parts[0] ?? "",
      parts[1] ?? "",
      keywordParts.join(","),
      ...parts.slice(parts.length - trailingFixedCount)
    ];

    return Object.fromEntries(headers.map((header, index) => [header, reconstructed[index] ?? ""]));
  });

  return {
    fileName,
    sheetName: "Sheet1",
    headers,
    rows
  };
}

function pickBestHeaderRow(fileName: string, sheetName: string, matrix: unknown[][]) {
  let bestIndex = 0;
  let bestScore = -1;

  for (let index = 0; index < Math.min(matrix.length, 10); index += 1) {
    const headers = (matrix[index] ?? []).map((cell) => String(cell ?? "").trim()).filter(Boolean);
    if (headers.length < 3) continue;
    const score = Math.max(...uploadSources.map((source) => scoreSource(source, fileName, sheetName, headers)));
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function workbookToJson(file: File, workbook: XLSX.WorkBook): NormalizedWorkbook {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  const headerRowIndex = pickBestHeaderRow(file.name, sheetName, matrix);
  const headers = (matrix[headerRowIndex] ?? []).map((cell) => String(cell ?? "").trim());
  const rows = matrix
    .slice(headerRowIndex + 1)
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));

  return {
    fileName: file.name,
    sheetName,
    headers,
    rows
  };
}

function parseWorkbookFromFile(file: File, buffer: Buffer) {
  if (!isCsvFile(file.name)) {
    return XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false });
  }

  const candidates = decodeCsvCandidates(buffer).map((text) => XLSX.read(text, { type: "string", cellDates: true, raw: false }));
  let bestWorkbook = candidates[0];
  let bestScore = -1;

  for (const workbook of candidates) {
    const normalized = workbookToJson(file, workbook);
    const source = detectUploadSource(file.name, normalized.sheetName, normalized.headers);
    const score = scoreSource(source, file.name, normalized.sheetName, normalized.headers);
    if (score > bestScore) {
      bestScore = score;
      bestWorkbook = workbook;
    }
  }

  return bestWorkbook;
}

function applyAliasesToRow(rawRow: Record<string, unknown>, source: UploadSourceDefinition) {
  const primaryLookup = buildAliasLookup(source);
  const duplicateLookup = new Map<string, CanonicalColumn>();

  for (const [target, aliases] of Object.entries(source.duplicateAliases ?? {}) as Array<[CanonicalColumn, readonly string[]]>) {
    aliases.forEach((alias) => duplicateLookup.set(normalizeHeaderToken(alias), target));
  }

  const normalizedRow: Record<string, unknown> = {};
  for (const [originalHeader, value] of Object.entries(rawRow)) {
    const token = normalizeHeaderToken(originalHeader);
    const primary = primaryLookup.get(token);
    const duplicate = duplicateLookup.get(token);

    if (primary) normalizedRow[primary] = value;
    if (duplicate && normalizedRow[duplicate] == null) normalizedRow[duplicate] = value;
  }

  return normalizedRow;
}

function normalizeRows(rows: Record<string, unknown>[], source: UploadSourceDefinition) {
  return rows.map((row) => applyAliasesToRow(row, source));
}

function ensureDefaults(rows: Record<string, unknown>[], source: UploadSourceDefinition) {
  rows.forEach((row) => {
    if (!row.platform) row.platform = source.platformValue || "";
    if (!("conversions" in row)) row.conversions = 0;
    if (!("revenue" in row)) row.revenue = 0;
  });
}

function validateAndMapRows(rows: Record<string, unknown>[], source: UploadSourceDefinition) {
  ensureDefaults(rows, source);
  const columns = Object.keys(rows[0] ?? {});
  const missing = hardRequiredColumns.filter((column) => !columns.includes(column));
  const errors = missing.map((column) => `Missing required column for ${source.label}: ${column}`);

  const mappedRows: ReportRow[] = [];
  rows.forEach((rawRow, index) => {
    const parsed = rowSchema.safeParse(rawRow);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        errors.push(`Row ${index + 2} ${issue.path.join(".")}: ${issue.message}`);
      });
      return;
    }

    const row = parsed.data;
    mappedRows.push({
      date: row.date,
      platform: String(row.platform || source.platformValue).toUpperCase(),
      campaignName: row.campaign_name,
      adGroupName: row.ad_group_name,
      adName: cleanText(row.ad_name) ?? "",
      device: cleanText(row.device),
      keyword: cleanText(row.keyword),
      creativeName: cleanText(row.creative_name),
      landingPage: cleanText(row.landing_page),
      impressions: row.impressions,
      clicks: row.clicks,
      cost: row.cost,
      conversions: row.conversions ?? 0,
      revenue: row.revenue ?? 0,
      purchases: row.purchases ?? null,
      leads: row.leads ?? null,
      memo: cleanText(row.memo)
    });
  });

  return { columns, errors, mappedRows };
}

export async function parseUploadFile(file: File): Promise<UploadParseResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const specialCsv = isCsvFile(file.name)
    ? decodeCsvCandidates(buffer)
        .map((text) => parseSpecialNaverKeywordReport(file.name, text))
        .find(Boolean) ?? null
    : null;
  const workbook = specialCsv ? null : parseWorkbookFromFile(file, buffer);
  const normalizedWorkbook = specialCsv ?? workbookToJson(file, workbook!);
  const detectedSource = detectUploadSource(normalizedWorkbook.fileName, normalizedWorkbook.sheetName, normalizedWorkbook.headers);
  const normalizedRows = normalizeRows(normalizedWorkbook.rows, detectedSource);
  const { columns, errors, mappedRows } = validateAndMapRows(normalizedRows, detectedSource);

  if (errors.length > 0 && columns.length > 0) {
    errors.push(`Detected format: ${detectedSource.label}`);
    errors.push(`Recognized columns: ${columns.join(", ")}`);
  }

  return {
    rows: mappedRows,
    preview: mappedRows.slice(0, 20),
    errors,
    columns,
    detectedFormat: detectedSource.id
  };
}

export function reportRowsToCsv(rows: ReportRow[]) {
  const headers = ["date", "platform", "campaign_name", "ad_group_name", "ad_name", "impressions", "clicks", "cost", "conversions", "revenue", "device", "keyword", "creative_name", "landing_page", "purchases", "leads", "memo"];
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const lines = rows.map((row) =>
    [
      row.date,
      row.platform,
      row.campaignName,
      row.adGroupName,
      row.adName,
      row.impressions,
      row.clicks,
      row.cost,
      row.conversions,
      row.revenue,
      row.device,
      row.keyword,
      row.creativeName,
      row.landingPage,
      row.purchases,
      row.leads,
      row.memo
    ]
      .map(escape)
      .join(",")
  );
  return [headers.join(","), ...lines].join("\n");
}

export { uploadSources };
