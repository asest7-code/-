import { NextResponse } from "next/server";
import { createUploadHistory, upsertReports } from "@/lib/data-service";
import { requireAdmin } from "@/lib/require-admin";
import { parseUploadFile } from "@/services/upload";

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const clientId = String(formData.get("clientId") ?? "");
  const file = formData.get("file");
  const previewOnly = String(formData.get("previewOnly") ?? "false") === "true";

  if (!clientId || !(file instanceof File)) {
    return NextResponse.json({ error: "Select a client and an upload file." }, { status: 400 });
  }

  const parsed = await parseUploadFile(file);

  if (parsed.rows.length > 100000) {
    return NextResponse.json(
      {
        error: "You can upload up to 100,000 rows at a time.",
        preview: parsed.preview,
        detectedFormat: parsed.detectedFormat
      },
      { status: 400 }
    );
  }

  if (parsed.errors.length > 0) {
    return NextResponse.json({ errors: parsed.errors, preview: parsed.preview, detectedFormat: parsed.detectedFormat }, { status: 400 });
  }

  if (previewOnly) {
    return NextResponse.json({ preview: parsed.preview, rowCount: parsed.rows.length, detectedFormat: parsed.detectedFormat });
  }

  const upload = await createUploadHistory({
    clientId,
    fileName: file.name,
    rowCount: parsed.rows.length,
    status: "SUCCESS",
    uploadedBy: session.user.id
  });

  await upsertReports(clientId, parsed.rows, upload.id);

  return NextResponse.json({ upload, rowCount: parsed.rows.length, detectedFormat: parsed.detectedFormat });
}
