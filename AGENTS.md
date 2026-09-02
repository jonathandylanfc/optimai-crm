# SalesOps — CRM for the OptimAI storefront

Next.js 15, deployed on Railway. This app is a **front end over the storefront**
(`optimai-car-accessories`), not a system of record. Orders, products,
customers, discounts and analytics are all read from that store over
`INTERNAL_API_SECRET` via the `/api/ca-*` routes. Nothing here owns that data.

## Authentication — do not weaken this

Every page and every `/api` route sits behind a password gate in
`middleware.ts`, backed by `lib/crm-auth.ts` (signed, expiring cookie).

This exists because the CRM was previously **completely unauthenticated** and
publicly reachable: anyone with the Railway URL could read every customer's
name, email and address, cancel orders, trigger shipping emails to real
customers, and mint discount codes.

- The gate is an **allowlist** — only `/login` and `/api/auth/login` are public,
  so a route added later is protected by default rather than by being
  remembered.
- It **fails closed**. Without `CRM_PASSWORD` and `CRM_SESSION_SECRET` the app
  returns 503 rather than serving data. Locking yourself out is recoverable; a
  leak is not.
- Built on **Web Crypto, not `node:crypto`**, so the same code runs in Edge
  middleware and Node route handlers.
- API routes answer **401 rather than redirecting** — a `fetch` following a 303
  to an HTML login page surfaces as a confusing JSON parse error.

## Supabase is mostly gone — keep it that way

The CRM used to query Supabase directly from the browser with
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. That key ships in the JS bundle, so with RLS
off those tables were publicly readable *and writable*. The Deals, Pipeline and
Team sections that used it were B2B sales-CRM scaffolding (contract length,
account health scores, rep quotas) with nothing feeding them, and they have been
removed.

**Do not reintroduce a browser Supabase client.** The only remaining use is
`lib/stores.ts`, the connected-store registry, which runs server-side and falls
back to the env-var store when Supabase is unreachable — that fallback is why
the app keeps working with the Supabase project paused.

## Rules that came from real bugs

- **Never leave a third-party call unguarded after a successful write.** The
  status routes updated the store, then wrote to Supabase without a try/catch —
  so an unreachable Supabase reported "Update failed" for an order that had in
  fact shipped and whose customer had already been emailed.
- **Fetching a caller-supplied URL goes through `lib/safe-fetch.ts`.** The photo
  editor and AI Studio accept an image URL; without the guard that request
  originates inside the deployment and can reach cloud metadata and the private
  network. It resolves the host first, refuses private/loopback/link-local/CGNAT
  addresses, rejects non-http(s) schemes, and will not follow redirects.
- **Writes go through a per-table column allowlist** so a crafted body cannot
  set an id or a column that was never meant to be writable.

## Order status

`Mark Shipped` and `Mark Delivered` call the store, which is the source of
truth, and the store sends the customer email. Both accept `notify: false` for
recording something that already happened — an order delivered a week ago should
not email anyone now. `Mark Delivered` is deliberately available from
`processing`, so a delivered order need not pass through `shipped` and fire that
email.

Store statuses are `pending → processing → shipped → delivered`, plus
`cancelled`. There is no "completed"; nothing advances automatically.

## Photo tools

`/api/store/remove-bg` shells out to `scripts/process-image.py` (rembg +
Pillow, installed in the Dockerfile). Selections are a **list of regions**: each
is segmented on its own and composited back onto the union bounding box, because
a tight crop around one subject is what the model handles best and it stops a
large subject's mask swallowing a smaller one. One rembg pass per region against
a 90s timeout, so a dozen regions may time out. The editor is **mouse-only** —
no touch handlers.
