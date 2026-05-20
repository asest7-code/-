import { uploadSources } from "@/services/upload/sources";

export const metaUploadSource = uploadSources.find((source) => source.id === "meta")!;
