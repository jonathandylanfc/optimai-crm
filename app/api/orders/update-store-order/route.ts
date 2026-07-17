export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const STORE_URL = (process.env.CAR_ACCESSORIES_URL ?? "").replace(/\/$/, "");
const STORE_SECRET = process.env.CAR_ACCESSORIES_API_SECRET ?? "";

// Store statuses → CRM (Supabase) statuses
const STATUS_MAP: Record<string, string> = {
  pending: "pending",
  processing: "processing",
  shipped: "processing",
  delivered: "fulfilled",
  cancelled: "cancelled",
};

function getCrmClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const storeOrderId = Number(body?.storeOrderId);
  const status = body?.status as string | undefined;
  const trackingNumber = body?.trackingNumber as string | null | undefined;

  if (!storeOrderId) {
    return NextResponse.json({ error: "storeOrderId required" }, { status: 400 });
  }
  if (!STORE_URL || !STORE_SECRET) {
    return NextResponse.json({ error: "Store connection not configured" }, { status: 503 });
  }

  // Update the store (source of truth) — this also emails the customer on ship
  const storeRes = await fetch(`${STORE_URL}/api/admin/orders/${storeOrderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STORE_SECRET}`,
    },
    body: JSON.stringify({
      ...(status !== undefined ? { status } : {}),
      ...(trackingNumber !== undefined ? { trackingNumber } : {}),
    }),
  });

  if (!storeRes.ok) {
    const data = await storeRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: data.error ?? `Store update failed: ${storeRes.status}` },
      { status: storeRes.status }
    );
  }

  // Mirror the status onto the synced Supabase order record
  const crm = getCrmClient();
  if (crm && status && STATUS_MAP[status]) {
    await crm
      .from("orders")
      .update({ status: STATUS_MAP[status] })
      .like("notes", `Store order #${storeOrderId}%`);
  }

  return NextResponse.json(await storeRes.json());
}
