export const dynamic = "force-dynamic";
import { proxyGet } from "@/lib/store-proxy";

// Store-account customers (everyone who registered on the storefront).
export async function GET() {
  return proxyGet("/api/customers");
}
