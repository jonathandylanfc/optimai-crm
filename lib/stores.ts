import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

// Registry of storefronts the CRM manages. Each store is an instance of the
// same template exposing the internal API (products/orders/analytics/etc.)
// behind a Bearer secret. Rows live in the CRM's own Supabase (service role).

export type Store = {
  id: string;
  name: string;
  slug: string | null;
  base_url: string;
  api_secret: string;
  active: boolean;
  created_at: string;
};

export type ResolvedStore = { id: string; name: string; baseUrl: string; secret: string };

// Public shape (never leaks the secret to the browser)
export type StorePublic = {
  id: string;
  name: string;
  slug: string | null;
  base_url: string;
  active: boolean;
  hasSecret: boolean;
};

export const ENV_STORE_ID = "env-default";
export const ACTIVE_STORE_COOKIE = "active_store_id";

export function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// The legacy single store configured via env vars — used as a fallback until
// the registry is populated, so the current setup keeps working.
export function envStore(): ResolvedStore | null {
  const baseUrl = (process.env.CAR_ACCESSORIES_URL ?? "").replace(/\/$/, "");
  const secret = process.env.CAR_ACCESSORIES_API_SECRET ?? "";
  if (!baseUrl || !secret) return null;
  return { id: ENV_STORE_ID, name: "Car Accessories Store", baseUrl, secret };
}

// Read all registry rows. Throws if the table doesn't exist yet — callers that
// need graceful fallback should catch.
export async function listStores(): Promise<Store[]> {
  const { data, error } = await serviceClient()
    .from("stores")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Store[];
}

export function toPublic(s: Store): StorePublic {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    base_url: s.base_url,
    active: s.active,
    hasSecret: !!s.api_secret,
  };
}

// Resolve the store a request should act on. Prefers the registry (active
// cookie → first active → first row); falls back to the env-var store.
export async function resolveActiveStore(activeId?: string | null): Promise<ResolvedStore | null> {
  try {
    const stores = await listStores();
    if (stores.length > 0) {
      const chosen =
        (activeId && stores.find((s) => s.id === activeId)) ||
        stores.find((s) => s.active) ||
        stores[0];
      if (chosen) {
        return {
          id: chosen.id,
          name: chosen.name,
          baseUrl: chosen.base_url.replace(/\/$/, ""),
          secret: chosen.api_secret,
        };
      }
    }
  } catch {
    // table missing / query failed → fall back to env store
  }
  return envStore();
}

// Convenience for route handlers: reads the active-store cookie and resolves.
export async function activeStore(): Promise<ResolvedStore | null> {
  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_STORE_COOKIE)?.value ?? null;
  return resolveActiveStore(activeId);
}
