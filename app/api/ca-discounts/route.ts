export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

const STORE_URL = (process.env.CAR_ACCESSORIES_URL ?? "").replace(/\/$/, "");
const STORE_SECRET = process.env.CAR_ACCESSORIES_API_SECRET ?? "";

function headers() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${STORE_SECRET}` };
}

export async function GET() {
  if (!STORE_URL || !STORE_SECRET) {
    return NextResponse.json({ error: "Store connection not configured" }, { status: 503 });
  }
  try {
    const res = await fetch(`${STORE_URL}/api/discounts`, { headers: headers(), cache: "no-store" });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fetch failed" }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (!STORE_URL || !STORE_SECRET) {
    return NextResponse.json({ error: "Store connection not configured" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const res = await fetch(`${STORE_URL}/api/discounts`, { method: "POST", headers: headers(), body: JSON.stringify(body) });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fetch failed" }, { status: 502 });
  }
}
