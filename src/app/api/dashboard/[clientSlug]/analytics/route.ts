import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getClientBySlug } from "@/lib/data-service";
import { getDashboardAnalyticsPayload } from "@/lib/dashboard-service";
import { getDemoDashboardPayload } from "@/services/report/demo-data";

export async function GET(request: Request, { params }: { params: { clientSlug: string } }) {
  const url = new URL(request.url);

  if (params.clientSlug === "demo") {
    const payload = await getDemoDashboardPayload({
      startDate: url.searchParams.get("startDate") ?? undefined,
      endDate: url.searchParams.get("endDate") ?? undefined,
      platform: url.searchParams.get("platform") ?? undefined,
      campaign: url.searchParams.get("campaign") ?? undefined
    });

    return NextResponse.json({
      timeSeries: payload.timeSeries,
      platformBreakdown: payload.platformBreakdown,
      campaignRankings: payload.campaignRankings,
      reportText: payload.reportText
    });
  }

  const password = url.searchParams.get("password");
  const client = await getClientBySlug(params.clientSlug);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (client.isPasswordProtected) {
    const ok = password && client.sharePasswordHash ? await bcrypt.compare(password, client.sharePasswordHash) : false;
    if (!ok) return NextResponse.json({ passwordRequired: true }, { status: 401 });
  }

  const payload = await getDashboardAnalyticsPayload(params.clientSlug, {
    startDate: url.searchParams.get("startDate") ?? undefined,
    endDate: url.searchParams.get("endDate") ?? undefined,
    platform: url.searchParams.get("platform") ?? undefined,
    campaign: url.searchParams.get("campaign") ?? undefined
  });

  return NextResponse.json(payload);
}
