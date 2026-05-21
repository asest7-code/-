import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createAccessLog, getClientBySlug } from "@/lib/data-service";
import { getCachedDashboardShellPayload } from "@/lib/dashboard-service";
import { getDemoDashboardPayload } from "@/services/report/demo-data";

export async function GET(request: Request, { params }: { params: { clientSlug: string } }) {
  if (params.clientSlug === "demo") {
    const url = new URL(request.url);
    return NextResponse.json(await getDemoDashboardPayload({
      startDate: url.searchParams.get("startDate") ?? undefined,
      endDate: url.searchParams.get("endDate") ?? undefined,
      platform: url.searchParams.get("platform") ?? undefined,
      campaign: url.searchParams.get("campaign") ?? undefined
    }));
  }

  const url = new URL(request.url);
  const password = url.searchParams.get("password");
  const client = await getClientBySlug(params.clientSlug);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (client.isPasswordProtected) {
    const ok = password && client.sharePasswordHash ? await bcrypt.compare(password, client.sharePasswordHash) : false;
    if (!ok) return NextResponse.json({ passwordRequired: true }, { status: 401 });
  }

  const payload = await getCachedDashboardShellPayload(params.clientSlug, {
    startDate: url.searchParams.get("startDate") ?? undefined,
    endDate: url.searchParams.get("endDate") ?? undefined,
    platform: url.searchParams.get("platform") ?? undefined,
    campaign: url.searchParams.get("campaign") ?? undefined
  });
  await createAccessLog(client.id, request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, request.headers.get("user-agent"));
  return NextResponse.json(payload);
}
