import { NextResponse } from "next/server";
import { listEditableReports } from "@/lib/data-service";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId") ?? undefined;
  const query = url.searchParams.get("query") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "20");

  const result = await listEditableReports({ clientId, query, page, pageSize });
  return NextResponse.json(result);
}
