import { uploadSources } from "@/services/upload/sources";

export const kakaoUploadSource = uploadSources.find((source) => source.id === "kakao")!;
