export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

const STORE_URL = (process.env.CAR_ACCESSORIES_URL ?? "").replace(/\/$/, "");
const STORE_SECRET = process.env.CAR_ACCESSORIES_API_SECRET ?? "";

export async function GET() {
  if (!STORE_URL || !STORE_SECRET) {
    return NextResponse.json({ error: "CAR_ACCESSORIES_URL and CAR_ACCESSORIES_API_SECRET must be set" }, { status: 503 });
  }

  try {
    const res = await fetch(`${STORE_URL}/api/orders`, {
      headers: { Authorization: `Bearer ${STORE_SECRET}` },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fetch failed" }, { status: 502 });
  }
}
