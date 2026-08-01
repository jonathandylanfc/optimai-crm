export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

const STORE_URL = (process.env.CAR_ACCESSORIES_URL ?? "").replace(/\/$/, "");
const STORE_SECRET = process.env.CAR_ACCESSORIES_API_SECRET ?? "";

function headers() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${STORE_SECRET}` };
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!STORE_URL || !STORE_SECRET) {
    return NextResponse.json({ error: "Store connection not configured" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const res = await fetch(`${STORE_URL}/api/discounts/${id}`, { method: "PUT", headers: headers(), body: JSON.stringify(body) });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fetch failed" }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!STORE_URL || !STORE_SECRET) {
    return NextResponse.json({ error: "Store connection not configured" }, { status: 503 });
  }
  try {
    const res = await fetch(`${STORE_URL}/api/discounts/${id}`, { method: "DELETE", headers: headers() });
    if (res.status === 204) return new NextResponse(null, { status: 204 });
    return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fetch failed" }, { status: 502 });
  }
}
