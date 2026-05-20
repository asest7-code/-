import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteReport, getEditableReportById, updateReport } from "@/lib/data-service";
import { requireAdmin } from "@/lib/require-admin";

const reportSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  platform: z.string().min(1),
  campaignName: z.string().min(1),
  adGroupName: z.string().min(1),
  adName: z.string().min(1),
  device: z.string().optional().nullable(),
  keyword: z.string().optional().nullable(),
  creativeName: z.string().optional().nullable(),
  landingPage: z.string().optional().nullable(),
  impressions: z.coerce.number().int().nonnegative(),
  clicks: z.coerce.number().int().nonnegative(),
  cost: z.coerce.number().nonnegative(),
  conversions: z.coerce.number().nonnegative(),
  revenue: z.coerce.number().nonnegative(),
  purchases: z.coerce.number().nonnegative().optional().nullable(),
  leads: z.coerce.number().nonnegative().optional().nullable(),
  memo: z.string().optional().nullable()
});

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const report = await getEditableReportById(params.id);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ report });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = reportSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const report = await updateReport(params.id, parsed.data);
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update report." }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await deleteReport(params.id);
  return NextResponse.json({ ok: true });
}
