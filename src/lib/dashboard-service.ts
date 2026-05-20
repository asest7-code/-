import { format } from "date-fns";
import { getClientBySlug, listReportsByClient } from "@/lib/data-service";
import { deriveDashboardPayload } from "@/lib/dashboard-derive";
import type { DashboardFilters, DashboardPayload, ReportRow } from "@/types/dashboard";

function toReportRow(row: {
  id: string;
  date: Date | string;
  platform: string;
  campaignName: string;
  adGroupName: string;
  adName: string;
  device: string | null;
  keyword: string | null;
  creativeName: string | null;
  landingPage: string | null;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  revenue: number;
  purchases: number | null;
  leads: number | null;
  memo: string | null;
}): ReportRow {
  return { ...row, date: typeof row.date === "string" ? row.date.slice(0, 10) : format(row.date, "yyyy-MM-dd") };
}

export async function getDashboardPayload(clientSlug: string, filters: DashboardFilters = {}): Promise<DashboardPayload | null> {
  const client = await getClientBySlug(clientSlug);

  if (!client) return null;
  const allRows = (await listReportsByClient(client.id)).map(toReportRow);
  return deriveDashboardPayload({
    client: {
      id: client.id,
      name: client.name,
      slug: client.slug,
      logoUrl: client.logoUrl,
      isPasswordProtected: client.isPasswordProtected
    },
    rows: allRows,
    filters
  });
}
