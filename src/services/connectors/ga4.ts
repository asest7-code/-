import { notImplementedConnector, type AdConnector } from "@/services/connectors/base";

export const ga4Connector: AdConnector = {
  platform: "GA4",
  sync: () => notImplementedConnector("GA4")
};
