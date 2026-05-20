import { NextResponse } from "next/server";
import { deleteUploadHistory } from "@/lib/data-service";
import { requireAdmin } from "@/lib/require-admin";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await deleteUploadHistory(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete upload history." }, { status: 400 });
  }
}
