import { uploadSources } from "@/services/upload/sources";
import { scoreSource } from "@/services/upload/utils";
import type { UploadSourceDefinition } from "@/services/upload/types";

export function detectUploadSource(fileName: string, sheetName: string, headers: string[]): UploadSourceDefinition {
  const scored = uploadSources.map((source) => ({
    source,
    score: scoreSource(source, fileName, sheetName, headers)
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.score > 0 ? scored[0].source : uploadSources.find((source) => source.id === "generic")!;
}
