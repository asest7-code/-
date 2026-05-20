import { NextResponse } from "next/server";
import { getDashboardPayload } from "@/lib/dashboard-service";
import { getClientBySlug } from "@/lib/data-service";
import { reportRowsToCsv } from "@/lib/upload-parser";
import { getDemoDashboardPayload } from "@/services/report/demo-data";
import bcrypt from "bcryptjs";

export async function GET(request: Request, { params }: { params: { clientSlug: string } }) {
  const url = new URL(request.url);
  if (params.clientSlug !== "demo") {
    const client = await getClientBySlug(params.clientSlug);
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (client.isPasswordProtected) {
      const password = url.searchParams.get("password");
      const ok = password && client.sharePasswordHash ? await bcrypt.compare(password, client.sharePasswordHash) : false;
      if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const filters = {
    startDate: url.searchParams.get("startDate") ?? undefined,
    endDate: url.searchParams.get("endDate") ?? undefined,
    platform: url.searchParams.get("platform") ?? undefined,
    campaign: url.searchParams.get("campaign") ?? undefined
  };
  const payload = params.clientSlug === "demo" ? await getDemoDashboardPayload(filters) : await getDashboardPayload(params.clientSlug, filters);
  if (!payload) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const csv = reportRowsToCsv(payload.rows);
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${params.clientSlug}-ad-report.csv"`
    }
  });
}
