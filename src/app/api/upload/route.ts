import { NextResponse } from "next/server";
import { createUploadHistory, updateUploadHistoryStatus, upsertReports } from "@/lib/data-service";
import { requireAdmin } from "@/lib/require-admin";
import { parseUploadFile } from "@/services/upload";
import type { ReportRow } from "@/types/dashboard";

type ChunkUploadBody = {
  clientId: string;
  fileName: string;
  rows: ReportRow[];
  uploadId?: string;
  rowCount: number;
  detectedFormat?: string;
  isFirstChunk?: boolean;
  isLastChunk?: boolean;
  finalizeOnly?: boolean;
};

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as ChunkUploadBody;

      if (body.finalizeOnly) {
        if (!body.uploadId) {
          return NextResponse.json({ error: "Missing uploadId for finalize request." }, { status: 400 });
        }

        await updateUploadHistoryStatus(body.uploadId, "SUCCESS");

        return NextResponse.json({
          uploadId: body.uploadId,
          finalized: true
        });
      }

      if (!body.clientId || !Array.isArray(body.rows) || body.rows.length === 0 || !body.fileName) {
        return NextResponse.json({ error: "Invalid chunk upload payload." }, { status: 400 });
      }

      let uploadId = body.uploadId;

      if (!uploadId) {
        const upload = await createUploadHistory({
          clientId: body.clientId,
          fileName: body.fileName,
          rowCount: body.rowCount,
          status: "PROCESSING",
          uploadedBy: session.user.id
        });
        uploadId = upload.id;
      }

      await upsertReports(body.clientId, body.rows, uploadId);

      return NextResponse.json({
        uploadId,
        rowCount: body.rows.length,
        detectedFormat: body.detectedFormat ?? ""
      });
    }

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
  } catch (error) {
    console.error("[upload] Upload request failed", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload request failed."
      },
      { status: 500 }
    );
  }
}
