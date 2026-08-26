import { lookup } from "node:dns/promises";
import net from "node:net";

// Guards the two routes that fetch a URL the caller supplies (the photo editor
// and AI Studio). Without this, that request originates from inside the
// deployment, so a crafted URL could reach the cloud metadata endpoint, a
// database bound to localhost, or anything else on the private network — and
// have the response handed back. Classic SSRF.

function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) || // link-local, incl. cloud metadata at 169.254.169.254
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      a >= 224 // multicast and reserved
    );
  }
  if (net.isIPv6(ip)) {
    const s = ip.toLowerCase();
    if (s === "::1" || s === "::") return true;
    if (s.startsWith("fe80") || s.startsWith("fc") || s.startsWith("fd")) return true;
    // IPv4-mapped (::ffff:10.0.0.1) — check the embedded address
    const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }
  return true; // unparseable — refuse rather than guess
}

/**
 * Fetch a caller-supplied URL only if it is plain http(s) on a public address.
 * Throws with a user-safe message otherwise.
 */
export async function fetchExternalImage(rawUrl: string, timeoutMs = 20_000): Promise<Response> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }

  // Blocks file:, data:, gopher: and friends.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http:// and https:// image URLs are allowed.");
  }

  // Resolve first and check every address the name maps to, so a hostname
  // pointing at a private IP is rejected before any connection is made.
  let addresses: { address: string }[];
  try {
    addresses = await lookup(parsed.hostname, { all: true });
  } catch {
    throw new Error("Could not resolve that host.");
  }
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error("That host isn't allowed.");
  }

  // redirect: "manual" so a 302 into the private network can't sidestep the
  // check above — the redirect target was never validated.
  const res = await fetch(parsed.toString(), {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; image-fetcher/1.0)" },
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (res.status >= 300 && res.status < 400) {
    throw new Error("That URL redirects; please use the direct image link.");
  }
  return res;
}
