export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { respond, jsonBody, pick } from "../../db";

const WRITABLE = [
  "name", "company", "value", "stage", "probability", "close_date",
  "customer_id", "team_member_id", "days_in_stage", "notes",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await jsonBody(req);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  return respond((db) => db.from("deals").update(pick(body, WRITABLE)).eq("id", id).select().single());
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return respond((db) => db.from("deals").delete().eq("id", id));
}
