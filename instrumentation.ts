// Runs once on server startup (Next.js instrumentation hook).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Supabase's REST API sits behind Cloudflare and advertises IPv6 (AAAA)
    // records. Some container networks (incl. some Railway setups) can't route
    // IPv6, so Node's fetch selects an IPv6 address and fails with the opaque
    // "TypeError: fetch failed" — even though IPv4-only hosts work fine.
    // Preferring IPv4 makes server-side Supabase calls connect reliably.
    const dns = await import("node:dns");
    dns.setDefaultResultOrder("ipv4first");
  }
}
