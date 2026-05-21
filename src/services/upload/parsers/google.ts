import { uploadSources } from "@/services/upload/sources";

export const googleUploadSource = uploadSources.find((source) => source.id === "google_ads")!;
