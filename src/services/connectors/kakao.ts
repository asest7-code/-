import { notImplementedConnector, type AdConnector } from "@/services/connectors/base";

export const kakaoConnector: AdConnector = {
  platform: "KAKAO",
  sync: () => notImplementedConnector("KAKAO")
};
