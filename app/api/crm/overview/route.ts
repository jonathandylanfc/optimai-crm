export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/stores";

// The two Supabase reads the Overview section needs, in one round trip.
export async function GET() {
  try {
    const db = serviceClient();
    const [deals, customers] = await Promise.all([
      db.from("deals").select("id, value, stage, created_at"),
      db.from("customers").select("id, created_at"),
    ]);
    if (deals.error) return NextResponse.json({ error: deals.error.message }, { status: 400 });
    if (customers.error) return NextResponse.json({ error: customers.error.message }, { status: 400 });
    return NextResponse.json({ deals: deals.data ?? [], customers: customers.data ?? [] });
  } catch (e) {
    console.error("[crm/overview]", e);
    return NextResponse.json({ error: "Database request failed." }, { status: 500 });
  }
}
