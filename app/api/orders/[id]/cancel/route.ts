export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { activeStore } from "@/lib/stores";

function getCrmClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const crm = getCrmClient();
  if (!crm) {
    return NextResponse.json({ error: "CRM not configured" }, { status: 503 });
  }

  const { data: order, error } = await crm
    .from("orders")
    .select("id, notes, customer_id, status")
    .eq("id", id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status === "cancelled") {
    return NextResponse.json({ success: true });
  }

  await crm.from("orders").update({ status: "cancelled" }).eq("id", id);

  // Extract store order ID from notes e.g. "Store order #42 — ..."
  const match = (order.notes as string | null)?.match(/Store order #(\d+)/);
  const storeOrderId = match ? Number(match[1]) : null;

  const store = storeOrderId ? await activeStore() : null;
  if (storeOrderId && store) {
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
      console.error("[crm-cancel] Failed to call store cancel API:", e);
    }
  }

  return NextResponse.json({ success: true });
}
