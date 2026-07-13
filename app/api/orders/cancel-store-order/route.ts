export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const STORE_URL = (process.env.CAR_ACCESSORIES_URL ?? "").replace(/\/$/, "");
const STORE_SECRET = process.env.CAR_ACCESSORIES_API_SECRET ?? "";

function getCrmClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const storeOrderId = Number(body?.storeOrderId);
  if (!storeOrderId) {
    return NextResponse.json({ error: "storeOrderId required" }, { status: 400 });
  }

  // Cancel in the store (also sends customer email)
  if (STORE_URL && STORE_SECRET) {
    try {
      await fetch(`${STORE_URL}/api/admin/cancel-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STORE_SECRET}`,
        },
        body: JSON.stringify({ orderId: storeOrderId }),
      });
    } catch (e) {
      console.error("[cancel-store-order] Failed to call store:", e);
    }
  }

  // Also update Supabase if there's a synced CRM order
  const crm = getCrmClient();
  if (crm) {
    await crm
      .from("orders")
      .update({ status: "cancelled" })
      .like("notes", `Store order #${storeOrderId}%`);
  }

  return NextResponse.json({ success: true });
}
