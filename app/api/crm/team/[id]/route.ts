export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { respond, jsonBody, pick } from "../../db";

const WRITABLE = ["name", "role", "email", "phone", "quota", "rank", "avatar_url", "region"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await jsonBody(req);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  return respond((db) => db.from("team_members").update(pick(body, WRITABLE)).eq("id", id).select().single());
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return respond((db) => db.from("team_members").delete().eq("id", id));
}
