import { notImplementedConnector, type AdConnector } from "@/services/connectors/base";

export const tiktokConnector: AdConnector = {
  platform: "TIKTOK",
  sync: () => notImplementedConnector("TIKTOK")
};
