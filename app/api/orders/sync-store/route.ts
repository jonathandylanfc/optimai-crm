export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { activeStore } from "@/lib/stores";

export async function POST() {
  const store = await activeStore();
  if (!store) {
    return NextResponse.json({ error: "No store connected." }, { status: 503 });
  }
  try {
    const res = await fetch(`${store.baseUrl}/api/admin/sync-crm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${store.secret}` },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fetch failed" }, { status: 502 });
  }
}
