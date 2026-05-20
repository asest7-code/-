import { notImplementedConnector, type AdConnector } from "@/services/connectors/base";

export const googleConnector: AdConnector = {
  platform: "GOOGLE",
  sync: () => notImplementedConnector("GOOGLE")
};
