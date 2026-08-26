"use client";

// Browser-side helper for the CRM's own data. Talks to /api/crm/*, which runs
// the Supabase queries server-side with the service role key.
//
// The dashboard used to query Supabase straight from the browser using the anon
// key. That key ships in the JS bundle, so those tables were readable and
// writable by anyone who opened devtools — the login gate is irrelevant when
// the request never reaches this app. Going through the server means the tables
// can deny anon entirely via RLS.

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/crm/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.status === 204 ? (null as T) : ((await res.json()) as T);
}

export const crmApi = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
