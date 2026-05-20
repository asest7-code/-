import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";
import { getDashboardPayload } from "@/lib/dashboard-service";
import { currency } from "@/utils/metrics";

async function createPdfBuffer(clientSlug: string, request: Request) {
  const url = new URL(request.url);
  const payload = await getDashboardPayload(clientSlug, {
    startDate: url.searchParams.get("startDate") ?? undefined,
    endDate: url.searchParams.get("endDate") ?? undefined,
    platform: url.searchParams.get("platform") ?? undefined,
    campaign: url.searchParams.get("campaign") ?? undefined
  });
  if (!payload) return null;

  const doc = new PDFDocument({ size: "A4", margin: 48 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  doc.fontSize(20).text(`${payload.client.name} Ad Performance Report`);
  doc.moveDown();
  doc.fontSize(11).text(`${payload.filters.startDate ?? ""} ~ ${payload.filters.endDate ?? ""}`);
  doc.moveDown();
  doc.fontSize(13).text(`Cost: ${currency(payload.summary.cost)} KRW`);
  doc.text(`Clicks: ${payload.summary.clicks.toLocaleString("ko-KR")}`);
  doc.text(`Conversions: ${payload.summary.conversions.toLocaleString("ko-KR")}`);
  doc.text(`Revenue: ${currency(payload.summary.revenue)} KRW`);
  doc.text(`CPA: ${currency(payload.summary.cpa)} KRW`);
  doc.text(`ROAS: ${payload.summary.roas}%`);
  doc.moveDown();
  doc.fontSize(12).text("Summary");
  doc.fontSize(10).text(payload.reportText);
  doc.moveDown();
  doc.fontSize(12).text("Top Campaigns");
  payload.campaignRankings.slice(0, 8).forEach((row) => {
    doc.fontSize(9).text(`${row.campaignName} | ROAS ${row.roas}% | Revenue ${currency(row.revenue)} KRW`);
  });
  doc.end();

  return done;
}

export async function GET(request: Request, { params }: { params: { clientSlug: string } }) {
  const buffer = await createPdfBuffer(params.clientSlug, request);
  if (!buffer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${params.clientSlug}-report.pdf"`
    }
  });
}
