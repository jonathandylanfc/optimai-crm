export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { spawnSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

const STORE_URL = (process.env.CAR_ACCESSORIES_URL ?? "").replace(/\/$/, "");
const STORE_SECRET = process.env.CAR_ACCESSORIES_API_SECRET ?? "";

export async function GET() {
  // Car accessories store connection: config + live reachability
  let storeReachable = false;
  let storeError: string | null = null;
  if (STORE_URL && STORE_SECRET) {
    try {
      const res = await fetch(`${STORE_URL}/api/products`, {
        headers: { Authorization: `Bearer ${STORE_SECRET}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      storeReachable = res.ok;
      if (!res.ok) storeError = `Store responded ${res.status}`;
    } catch (e) {
      storeError = e instanceof Error ? e.message : "Unreachable";
    }
  } else {
    storeError = "CAR_ACCESSORIES_URL / CAR_ACCESSORIES_API_SECRET not set";
  }

  // Supabase: config + live query
  let supabaseOk = false;
  let supabaseError: string | null = null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.from("customers").select("id", { count: "exact", head: true });
      supabaseOk = !error;
      if (error) supabaseError = error.message;
    } catch (e) {
      supabaseError = e instanceof Error ? e.message : "Query failed";
    }
  } else {
    supabaseError = "Supabase env vars not set";
  }

  // AI image processing: python3 + rembg present on this server
  let aiOk = false;
  let aiError: string | null = null;
  try {
    const py = spawnSync("/usr/bin/python3", ["-c", "import rembg, PIL"], { timeout: 15000 });
    aiOk = py.status === 0;
    if (!aiOk) aiError = py.stderr?.toString().split("\n")[0] || "python3/rembg not available";
  } catch (e) {
    aiError = e instanceof Error ? e.message : "python3 not found";
  }

  // Cloudinary: config presence (uploads are unsigned, no live check)
  const cloudinaryConfigured = !!(
    (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "v4h2yok3") &&
    (process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "OPTIMAI")
  );

  // AI Studio (Gemini): is the key present in THIS running process?
  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiOk = !!geminiKey;

  return NextResponse.json({
    store: { ok: storeReachable, configured: !!(STORE_URL && STORE_SECRET), url: STORE_URL || null, error: storeError },
    supabase: { ok: supabaseOk, configured: !!(supabaseUrl && supabaseKey), error: supabaseError },
    ai: { ok: aiOk, error: aiError },
    cloudinary: { ok: cloudinaryConfigured, error: cloudinaryConfigured ? null : "Cloudinary env vars not set" },
    gemini: {
      ok: geminiOk,
      error: geminiOk ? null : "GEMINI_API_KEY not found in the running CRM process — add it to THIS service's variables and redeploy.",
    },
  });
}
