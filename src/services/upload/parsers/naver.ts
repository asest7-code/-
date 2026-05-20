import { uploadSources } from "@/services/upload/sources";

export const naverUploadSource = uploadSources.find((source) => source.id === "naver")!;
