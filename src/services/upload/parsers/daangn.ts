import { uploadSources } from "@/services/upload/sources";

export const daangnUploadSource = uploadSources.find((source) => source.id === "daangn_ads")!;
