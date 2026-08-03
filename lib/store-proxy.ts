import "server-only";
import { NextResponse } from "next/server";
import { activeStore } from "@/lib/stores";

const NO_STORE = () =>
  NextResponse.json(
    { error: "No store connected. Add one in Settings → Connected Stores." },
    { status: 503 }
  );

// Pass-through GET to the active store's internal API.
export async function proxyGet(path: string) {
  const store = await activeStore();
  if (!store) return NO_STORE();
  try {
    const res = await fetch(`${store.baseUrl}${path}`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${store.secret}` },
      cache: "no-store",
    });
    const text = await res.text();
    return new NextResponse(text || "null", {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fetch failed" }, { status: 502 });
  }
}

// Pass-through with a JSON body (POST/PUT) to the active store.
export async function proxyJson(method: "POST" | "PUT" | "DELETE", path: string, body?: unknown) {
  const store = await activeStore();
  if (!store) return NO_STORE();
  try {
    const res = await fetch(`${store.baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${store.secret}` },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
    if (res.status === 204) return new NextResponse(null, { status: 204 });
    const text = await res.text();
    return new NextResponse(text || "null", {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fetch failed" }, { status: 502 });
  }
}
