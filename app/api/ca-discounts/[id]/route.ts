export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { proxyJson } from "@/lib/store-proxy";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJson("PUT", `/api/discounts/${id}`, await req.json());
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJson("DELETE", `/api/discounts/${id}`);
}
