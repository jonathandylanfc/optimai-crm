export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { respond, jsonBody, pick } from "../db";

const WRITABLE = ["name", "role", "email", "phone", "quota", "rank", "avatar_url", "region"] as const;

export async function GET(req: NextRequest) {
  // `basic` is the lightweight list the deal form needs; the default carries
  // the deal join the Team section renders.
  if (req.nextUrl.searchParams.get("view") === "basic") {
    return respond((db) => db.from("team_members").select("id, name").order("name"));
  }
  return respond((db) =>
    db.from("team_members").select("*, deals(id, value, stage)").order("rank", { ascending: true, nullsFirst: false })
  );
}

export async function POST(req: NextRequest) {
  const body = await jsonBody(req);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  return respond((db) => db.from("team_members").insert(pick(body, WRITABLE)).select().single());
}
