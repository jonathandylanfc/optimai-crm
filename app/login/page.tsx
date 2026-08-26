"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Sign in failed.");
        setBusy(false);
        return;
      }
      // Only ever return to a path on this site — a full URL here would let a
      // crafted link bounce someone straight off to an attacker's page.
      const target = params.get("redirectTo") ?? "/";
      router.replace(target.startsWith("/") && !target.startsWith("//") ? target : "/");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">SalesOps</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter the password to continue.</p>
      </div>
      <input
        type="password"
        value={password}
        onChange={(e) => { setPassword(e.target.value); setError(null); }}
        autoFocus
        autoComplete="current-password"
        placeholder="Password"
        className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={busy || !password}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90 disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
