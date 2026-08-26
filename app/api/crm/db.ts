import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/stores";

// Server-side data access for the CRM's own Supabase tables.
//
// These queries used to run in the browser with NEXT_PUBLIC_SUPABASE_ANON_KEY,
// which ships in the JS bundle and is readable by anyone. That made customers,
// deals and team_members directly readable AND writable by the public — the
// dashboard password can't help, because those requests never touch this app.
//
// Running them here with the service role key means the tables can have RLS
// switched on and deny anon entirely: the service key bypasses RLS, and every
// route in this folder sits behind the session gate in middleware.ts.

export type Json = Record<string, unknown>;

/** Runs a Supabase query and turns its error into a JSON response. */
export async function respond<T>(
  run: (db: ReturnType<typeof serviceClient>) => PromiseLike<{ data: T; error: { message: string } | null }>
): Promise<NextResponse> {
  try {
    const { data, error } = await run(serviceClient());
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data ?? null);
  } catch (e) {
    console.error("[crm/db]", e);
    return NextResponse.json({ error: "Database request failed." }, { status: 500 });
  }
}

/** Reads a JSON body, returning null when it isn't valid JSON. */
export async function jsonBody(req: Request): Promise<Json | null> {
  try {
    const parsed = await req.json();
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Json) : null;
  } catch {
    return null;
  }
}

/**
 * Keeps only the columns a table is allowed to accept from the client, so a
 * crafted body can't set an id, a created_at, or a column that happens to exist
 * but was never meant to be writable here.
 */
export function pick(body: Json, allowed: readonly string[]): Json {
  const out: Json = {};
  for (const key of allowed) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}
