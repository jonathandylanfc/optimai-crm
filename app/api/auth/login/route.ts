export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import {
  CRM_SESSION_COOKIE,
  CRM_SESSION_MAX_AGE,
  createCrmSessionToken,
  verifyCrmPassword,
} from "@/lib/crm-auth";

// Per-IP throttle so the single shared password can't be brute-forced. In
// memory, which means it resets on redeploy and isn't shared across instances —
// enough to make guessing impractical, not a substitute for a strong password.
const attempts = new Map<string, { count: number; first: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(ip, { count: 1, first: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(request: NextRequest) {
  const secret = process.env.CRM_SESSION_SECRET;
  const expected = process.env.CRM_PASSWORD;
  if (!secret || !expected) {
    return NextResponse.json(
      { error: "CRM is not configured. Set CRM_PASSWORD and CRM_SESSION_SECRET." },
      { status: 503 }
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const password = String(body?.password ?? "");
  if (!(await verifyCrmPassword(password, expected))) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  attempts.delete(ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CRM_SESSION_COOKIE, await createCrmSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CRM_SESSION_MAX_AGE,
  });
  return res;
}
