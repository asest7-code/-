import type { CanonicalColumn, UploadSourceDefinition } from "@/services/upload/types";

export function normalizeHeaderToken(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-_/().]+/g, "");
}

export function buildAliasLookup(source: UploadSourceDefinition) {
  const entries = Object.entries(source.aliases) as Array<[CanonicalColumn, string[]]>;
  return new Map(entries.flatMap(([target, aliases]) => aliases.map((alias) => [normalizeHeaderToken(alias), target] as const)));
}

export function normalizeHeaders(headers: string[], source: UploadSourceDefinition) {
  const lookup = buildAliasLookup(source);
  return headers.map((header) => {
    const token = normalizeHeaderToken(header);
    return lookup.get(token) ?? header.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s\-]+/g, "_");
  });
}

export function scoreSource(source: UploadSourceDefinition, fileName: string, sheetName: string, headers: string[]) {
  const normalizedFileName = fileName.toLowerCase();
  const normalizedSheetName = sheetName.toLowerCase();
  const lookup = buildAliasLookup(source);
  let score = 0;

  for (const hint of source.filenameHints) {
    if (normalizedFileName.includes(hint.toLowerCase())) score += 4;
  }
  for (const hint of source.sheetHints) {
    if (normalizedSheetName.includes(hint.toLowerCase())) score += 3;
  }
  for (const header of headers) {
    if (lookup.has(normalizeHeaderToken(header))) score += 1;
  }

  return score;
}
