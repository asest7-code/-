import { notImplementedConnector, type AdConnector } from "@/services/connectors/base";

export const metaConnector: AdConnector = {
  platform: "META",
  sync: () => notImplementedConnector("META")
};
