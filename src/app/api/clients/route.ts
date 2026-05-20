import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, listClients } from "@/lib/data-service";
import { requireAdmin } from "@/lib/require-admin";

const clientSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  logoUrl: z.string().url().optional().or(z.literal("")),
  isPasswordProtected: z.boolean().default(false),
  sharePassword: z.string().optional()
});

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clients = await listClients();
  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = clientSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const data = parsed.data;
    const client = await createClient({
      name: data.name,
      slug: data.slug,
      logoUrl: data.logoUrl || null,
      isPasswordProtected: data.isPasswordProtected,
      sharePassword: data.sharePassword
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create client." }, { status: 400 });
  }
}
