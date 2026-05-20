import { notImplementedConnector, type AdConnector } from "@/services/connectors/base";

export const naverConnector: AdConnector = {
  platform: "NAVER",
  sync: () => notImplementedConnector("NAVER")
};
