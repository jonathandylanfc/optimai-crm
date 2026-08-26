export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { activeStore } from "@/lib/stores";


export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const storeOrderId = Number(body?.storeOrderId);
  const status = body?.status as string | undefined;
  const trackingNumber = body?.trackingNumber as string | null | undefined;
  // false suppresses the customer email — for catching the record up to
  // something that already happened, rather than announcing it.
  const notify = body?.notify as boolean | undefined;

  if (!storeOrderId) {
    return NextResponse.json({ error: "storeOrderId required" }, { status: 400 });
  }
  const store = await activeStore();
  if (!store) {
    return NextResponse.json({ error: "No store connected" }, { status: 503 });
  }

  // Update the store (source of truth) — this also emails the customer on ship
  // and on delivery, unless notify is false
  const storeRes = await fetch(`${store.baseUrl}/api/admin/orders/${storeOrderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${store.secret}`,
    },
    body: JSON.stringify({
      ...(status !== undefined ? { status } : {}),
      ...(trackingNumber !== undefined ? { trackingNumber } : {}),
      ...(notify !== undefined ? { notify } : {}),
    }),
  });

  if (!storeRes.ok) {
    const data = await storeRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: data.error ?? `Store update failed: ${storeRes.status}` },
      { status: storeRes.status }
    );
  }

  // The Supabase mirror of orders is gone — the CRM reads orders from the store,
  // which is the source of truth this route just wrote to. It also used to run
  // unguarded right here, so an unreachable Supabase reported "Update failed"
  // for an order that had in fact been marked shipped and the customer emailed.

  return NextResponse.json(await storeRes.json());
}
