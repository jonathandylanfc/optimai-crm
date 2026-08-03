export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { serviceClient, toPublic } from "@/lib/stores";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as {
    name?: string;
    base_url?: string;
    api_secret?: string;
    active?: boolean;
  };
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.base_url !== undefined) patch.base_url = body.base_url.trim().replace(/\/$/, "");
  if (body.active !== undefined) patch.active = body.active;
  // Only overwrite the secret when a non-empty new one is provided
  if (body.api_secret) patch.api_secret = body.api_secret.trim();

  const { data, error } = await serviceClient()
    .from("stores")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ store: toPublic(data) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await serviceClient().from("stores").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
