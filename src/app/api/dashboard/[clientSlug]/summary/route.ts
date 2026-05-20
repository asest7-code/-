import { NextResponse } from "next/server";
import { getDashboardPayload } from "@/lib/dashboard-service";

export async function GET(request: Request, { params }: { params: { clientSlug: string } }) {
  const url = new URL(request.url);
  const payload = await getDashboardPayload(params.clientSlug, {
    startDate: url.searchParams.get("startDate") ?? undefined,
    endDate: url.searchParams.get("endDate") ?? undefined,
    platform: url.searchParams.get("platform") ?? undefined,
    campaign: url.searchParams.get("campaign") ?? undefined
  });
  if (!payload) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    summary: payload.summary,
    previous: payload.previous,
    reportText: payload.reportText,
    topCampaigns: payload.campaignRankings.slice(0, 5),
    weakCampaigns: [...payload.campaignRankings].reverse().slice(0, 5)
  });
}
