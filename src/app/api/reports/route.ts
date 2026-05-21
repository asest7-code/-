import { NextResponse } from "next/server";
import { deleteReports, listEditableReports } from "@/lib/data-service";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId") ?? undefined;
  const uploadId = url.searchParams.get("uploadId") ?? undefined;
  const query = url.searchParams.get("query") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "20");

  const result = await listEditableReports({ clientId, uploadId, query, page, pageSize });
  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { ids?: string[] } | null;
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id): id is string => typeof id === "string" && id.length > 0) : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "No report ids supplied." }, { status: 400 });
  }

  const deletedCount = await deleteReports(ids);
  return NextResponse.json({ success: true, deletedCount });
}
