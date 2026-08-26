export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { respond, jsonBody, pick } from "../db";

const WRITABLE = [
  "name", "industry", "tier", "location", "contact_name", "email", "phone",
  "health_score", "trend", "contract_value", "contract_length_months", "payment_date",
] as const;

export async function GET() {
  return respond((db) =>
    db.from("customers").select("*, deals(id, name, value, stage)").order("created_at", { ascending: false })
  );
}

export async function POST(req: NextRequest) {
  const body = await jsonBody(req);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  return respond((db) => db.from("customers").insert(pick(body, WRITABLE)).select().single());
}
