export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

const STORE_URL = (process.env.CAR_ACCESSORIES_URL ?? "").replace(/\/$/, "");

// Proxies the storefront's public Meta catalog feed and returns it as a
// file download, so the CRM can offer a one-click "Download catalog" button
// without exposing the store URL to the client.
export async function GET() {
  if (!STORE_URL) {
    return NextResponse.json({ error: "CAR_ACCESSORIES_URL is not set" }, { status: 503 });
  }
  try {
    const res = await fetch(`${STORE_URL}/api/catalog`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: `Store returned ${res.status}` }, { status: 502 });
    }
    const csv = await res.text();
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="catalog_products.csv"',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fetch failed" }, { status: 502 });
  }
}
