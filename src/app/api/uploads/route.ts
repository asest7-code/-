import { NextResponse } from "next/server";
import { listUploadHistories } from "@/lib/data-service";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId") ?? undefined;
  const take = Number(searchParams.get("take") ?? "30");

  const uploads = await listUploadHistories({
    clientId,
    take: Number.isFinite(take) ? take : 30
  });

  return NextResponse.json({ uploads });
}
