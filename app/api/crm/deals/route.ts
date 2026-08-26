export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { respond, jsonBody, pick } from "../db";

const WRITABLE = [
  "name", "company", "value", "stage", "probability", "close_date",
  "customer_id", "team_member_id", "days_in_stage", "notes",
] as const;

export async function GET() {
  return respond((db) =>
    db.from("deals").select("*, customers(name, company), team_members(name)").order("created_at", { ascending: false })
  );
}

export async function POST(req: NextRequest) {
  const body = await jsonBody(req);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  return respond((db) => db.from("deals").insert(pick(body, WRITABLE)).select().single());
}
