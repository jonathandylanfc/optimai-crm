// Session gate for the CRM. The dashboard and every /api route under it expose
// customer PII, order history and destructive actions, so both need to sit
// behind a password rather than being reachable by anyone with the Railway URL.
//
// A signed, expiring cookie — no server-side session store to keep in sync.
// Built on Web Crypto rather than node:crypto so the same code runs in the Edge
// middleware and in Node route handlers.

export const CRM_SESSION_COOKIE = "crm_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function subtle(): SubtleCrypto {
  return globalThis.crypto.subtle;
}

const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await subtle().importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return toHex(await subtle().sign("HMAC", key, encoder.encode(value)));
}

// Constant-time string comparison. Compares every character regardless of where
// the first difference is, so response timing doesn't reveal how much of a
// forged signature was correct.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createCrmSessionToken(secret: string): Promise<string> {
  const payload = `crm.${Date.now() + SESSION_MAX_AGE_SECONDS * 1000}`;
  return `${payload}.${await sign(payload, secret)}`;
}

export async function verifyCrmSessionToken(
  token: string | undefined | null,
  secret: string | undefined
): Promise<boolean> {
  if (!token || !secret) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [role, expiresAtRaw, signature] = parts;
    if (role !== "crm") return false;
    if (!safeEqual(signature, await sign(`${role}.${expiresAtRaw}`, secret))) return false;
    const expiresAt = Number(expiresAtRaw);
    return Number.isFinite(expiresAt) && Date.now() <= expiresAt;
  } catch {
    return false;
  }
}

// Hashing both sides first means the comparison is length-independent, so a
// wrong-length guess is indistinguishable from a wrong-value one.
export async function verifyCrmPassword(candidate: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    subtle().digest("SHA-256", encoder.encode(candidate)),
    subtle().digest("SHA-256", encoder.encode(expected)),
  ]);
  return safeEqual(toHex(a), toHex(b));
}

export const CRM_SESSION_MAX_AGE = SESSION_MAX_AGE_SECONDS;
