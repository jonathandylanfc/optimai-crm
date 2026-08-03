export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { activeStore } from "@/lib/stores";

// Proxies the active store's public Meta catalog feed and returns it as a
// file download, so the CRM can offer a one-click "Download catalog" button.
export async function GET() {
  const store = await activeStore();
  if (!store) {
    return NextResponse.json({ error: "No store connected." }, { status: 503 });
  }
  try {
    const res = await fetch(`${store.baseUrl}/api/catalog`, { cache: "no-store" });
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
