import { NextResponse } from "next/server";
import { generateReportSummary } from "@/services/ai/report-summary";

export async function POST(request: Request) {
  const payload = await request.json();
  const summary = await generateReportSummary(payload);
  return NextResponse.json({ summary, provider: "mock" });
}
