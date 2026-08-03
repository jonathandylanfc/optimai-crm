export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

// Pings a store's internal API with a candidate secret so the CRM can confirm
// a new store is reachable and the secret is valid before saving it.
export async function POST(req: NextRequest) {
  const { base_url, api_secret } = (await req.json()) as { base_url?: string; api_secret?: string };
  if (!base_url || !api_secret) {
    return NextResponse.json({ ok: false, error: "base_url and api_secret are required" }, { status: 422 });
  }
  const url = base_url.trim().replace(/\/$/, "");
  try {
    const res = await fetch(`${url}/api/analytics`, {
      headers: { Authorization: `Bearer ${api_secret.trim()}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ ok: false, error: "Reached the store, but the API secret was rejected." });
    }
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Store responded with ${res.status}.` });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unreachable";
    return NextResponse.json({ ok: false, error: `Could not reach the store (${msg}). Check the URL.` });
  }
}
