export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { proxyGet, proxyJson } from "@/lib/store-proxy";

export async function GET() {
  return proxyGet("/api/discounts");
}

export async function POST(req: NextRequest) {
  return proxyJson("POST", "/api/discounts", await req.json());
}
