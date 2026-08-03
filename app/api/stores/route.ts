export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { serviceClient, listStores, toPublic, envStore, ENV_STORE_ID, type StorePublic } from "@/lib/stores";

// GET: list managed stores (never returns secrets). If the registry table
// doesn't exist or is empty yet, surfaces the env-var store as a fallback
// entry so the switcher still works before migration.
export async function GET() {
  try {
    const stores = await listStores();
    if (stores.length > 0) {
      return NextResponse.json({ stores: stores.map(toPublic), registryReady: true });
    }
  } catch {
    // table missing → fall through to env fallback
  }
  const env = envStore();
  const fallback: StorePublic[] = env
    ? [{ id: ENV_STORE_ID, name: env.name, slug: "default", base_url: env.baseUrl, active: true, hasSecret: true }]
    : [];
  return NextResponse.json({ stores: fallback, registryReady: false });
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    action?: string;
    name?: string;
    base_url?: string;
    api_secret?: string;
  };

  // One-click migration: pull the current env-var store into the registry
  if (body.action === "import-env") {
    const env = envStore();
    if (!env) return NextResponse.json({ error: "No env-var store configured to import." }, { status: 400 });
    const { data, error } = await serviceClient()
      .from("stores")
      .insert({ name: env.name, slug: "car-accessories", base_url: env.baseUrl, api_secret: env.secret, active: true })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ store: toPublic(data) }, { status: 201 });
  }

  const name = body.name?.trim();
  const base_url = body.base_url?.trim().replace(/\/$/, "");
  const api_secret = body.api_secret?.trim();
  if (!name || !base_url || !api_secret) {
    return NextResponse.json({ error: "name, base_url and api_secret are required" }, { status: 422 });
  }
  try {
    const parsed = new URL(base_url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  } catch {
    return NextResponse.json({ error: "base_url must be a full https:// URL" }, { status: 422 });
  }

  const { data, error } = await serviceClient()
    .from("stores")
    .insert({ name, slug: slugify(name), base_url, api_secret, active: true })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ store: toPublic(data) }, { status: 201 });
}
