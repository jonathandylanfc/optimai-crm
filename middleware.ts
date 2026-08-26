import { NextRequest, NextResponse } from "next/server";
import { CRM_SESSION_COOKIE, verifyCrmSessionToken } from "@/lib/crm-auth";

// Everything in this app sits behind the password gate except the login route
// itself and Next's own assets. Deliberately an allowlist: a page or API route
// added later is protected by default rather than needing to be remembered.
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const secret = process.env.CRM_SESSION_SECRET;
  const password = process.env.CRM_PASSWORD;

  // Fail closed. If the gate isn't configured the CRM stays shut rather than
  // silently serving customer data to anyone — locking yourself out is
  // recoverable by setting the variables, a data leak isn't.
  if (!secret || !password) {
    return NextResponse.json(
      { error: "CRM is not configured. Set CRM_PASSWORD and CRM_SESSION_SECRET." },
      { status: 503 }
    );
  }

  if (await verifyCrmSessionToken(request.cookies.get(CRM_SESSION_COOKIE)?.value, secret)) {
    return NextResponse.next();
  }

  // API routes get a 401 rather than a redirect — a fetch that followed a 303
  // to an HTML login page would surface in the dashboard as a JSON parse error.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("redirectTo", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
