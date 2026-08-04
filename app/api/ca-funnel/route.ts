export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { proxyGet } from "@/lib/store-proxy";

// Proxies the active store's conversion funnel to the CRM dashboard, passing
// through the selected time window (24h / 7d / 30d / all).
export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period") ?? "7d";
  return proxyGet(`/api/funnel?period=${encodeURIComponent(period)}`);
}
