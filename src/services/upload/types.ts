import type { ReportRow } from "@/types/dashboard";

export const requiredColumns = [
  "date",
  "platform",
  "campaign_name",
  "ad_group_name",
  "ad_name",
  "impressions",
  "clicks",
  "cost",
  "conversions",
  "revenue"
] as const;

export const optionalColumns = ["device", "keyword", "creative_name", "landing_page", "purchases", "leads", "memo"] as const;

export type CanonicalColumn = (typeof requiredColumns)[number] | (typeof optionalColumns)[number];

export type UploadParseResult = {
  rows: ReportRow[];
  preview: ReportRow[];
  errors: string[];
  columns: string[];
  detectedFormat: UploadSourceId;
};

export type UploadSourceId = "generic" | "naver" | "daangn" | "kakao" | "meta" | "google";

export type UploadSourceDefinition = {
  id: UploadSourceId;
  label: string;
  platformValue: string;
  filenameHints: string[];
  sheetHints: string[];
  aliases: Partial<Record<CanonicalColumn, readonly string[]>>;
  duplicateAliases?: Partial<Record<CanonicalColumn, readonly string[]>>;
  optionalTargets?: CanonicalColumn[];
};

export type NormalizedWorkbook = {
  fileName: string;
  sheetName: string;
  headers: string[];
  rows: Record<string, unknown>[];
};
