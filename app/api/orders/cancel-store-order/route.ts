export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { activeStore } from "@/lib/stores";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const storeOrderId = Number(body?.storeOrderId);
  if (!storeOrderId) {
    return NextResponse.json({ error: "storeOrderId required" }, { status: 400 });
  }

  // Cancel in the store (also sends customer email)
  const store = await activeStore();
  if (store) {
    try {
      await fetch(`${store.baseUrl}/api/admin/cancel-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${store.secret}`,
        },
        body: JSON.stringify({ orderId: storeOrderId }),
      });
    } catch (e) {
      console.error("[cancel-store-order] Failed to call store:", e);
    }
  }

  // No Supabase mirror to update any more — the store is the source of truth
  // and the CRM reads its orders from there.

  return NextResponse.json({ success: true });
}
