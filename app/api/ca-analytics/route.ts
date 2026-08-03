export const dynamic = "force-dynamic";
import { proxyGet } from "@/lib/store-proxy";

export async function GET() {
  return proxyGet("/api/analytics");
}
