import type { ReportRow } from "@/types/dashboard";

export type ConnectorSyncResult = {
  platform: string;
  rows: ReportRow[];
};

export interface AdConnector {
  platform: string;
  sync(accountId: string, startDate: string, endDate: string): Promise<ConnectorSyncResult>;
}

export async function notImplementedConnector(platform: string): Promise<ConnectorSyncResult> {
  return { platform, rows: [] };
}
