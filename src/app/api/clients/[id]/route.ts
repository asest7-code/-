import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteClient, getClientById, updateClient } from "@/lib/data-service";
import { requireAdmin } from "@/lib/require-admin";

const clientSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  logoUrl: z.string().url().optional().or(z.literal("")),
  isPasswordProtected: z.boolean().default(false),
  sharePassword: z.string().optional()
});

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await getClientById(params.id);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ client });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = clientSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const data = parsed.data;
    const client = await updateClient(params.id, {
      name: data.name,
      slug: data.slug,
      logoUrl: data.logoUrl || null,
      isPasswordProtected: data.isPasswordProtected,
      sharePassword: data.sharePassword
    });

    return NextResponse.json({ client });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update client." }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await deleteClient(params.id);
  return NextResponse.json({ ok: true });
}
