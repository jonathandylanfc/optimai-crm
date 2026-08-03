"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Store, Plus, Trash2, Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type StorePublic = {
  id: string;
  name: string;
  slug: string | null;
  base_url: string;
  active: boolean;
  hasSecret: boolean;
};

const SETUP_SQL = `create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  base_url text not null,
  api_secret text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);`;

export function ConnectedStoresSection() {
  const [stores, setStores] = useState<StorePublic[]>([]);
  const [registryReady, setRegistryReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSetup, setShowSetup] = useState(false);

  // Add form
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [testMsg, setTestMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stores");
      const data = await res.json();
      setStores(data.stores ?? []);
      setRegistryReady(!!data.registryReady);
    } catch {
      setError("Could not load stores");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function test() {
    setTestState("testing");
    setTestMsg("");
    try {
      const res = await fetch("/api/stores/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_url: url, api_secret: secret }),
      });
      const data = await res.json();
      setTestState(data.ok ? "ok" : "fail");
      setTestMsg(data.ok ? "Connected successfully" : data.error);
    } catch {
      setTestState("fail");
      setTestMsg("Test failed");
    }
  }

  async function addStore(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, base_url: url, api_secret: secret }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (/relation .*stores.* does not exist|Could not find the table/i.test(data.error ?? "")) {
          setShowSetup(true);
          setError("The stores table doesn't exist yet — run the setup SQL below in Supabase first.");
        } else {
          setError(data.error ?? "Failed to add store");
        }
        return;
      }
      setName(""); setUrl(""); setSecret(""); setTestState("idle"); setTestMsg("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function importEnv() {
    setError("");
    const res = await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import-env" }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (/relation .*stores.* does not exist|Could not find the table/i.test(data.error ?? "")) {
        setShowSetup(true);
        setError("Run the setup SQL below in Supabase first, then import.");
      } else setError(data.error ?? "Import failed");
      return;
    }
    await load();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/stores/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await load();
  }
  async function remove(id: string) {
    await fetch(`/api/stores/${id}`, { method: "DELETE" });
    await load();
  }

  const inputClass = "bg-secondary border-border focus:border-accent text-foreground placeholder:text-muted-foreground";

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Store className="w-4 h-4 text-accent" /> Connected Stores
        </CardTitle>
        <p className="text-sm text-muted-foreground">Manage every storefront from one CRM — switch between them from the top bar</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!registryReady && stores.length > 0 && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-accent/10 border border-accent/30">
            <p className="text-sm text-foreground">
              Your current store is connected via environment variables. Import it into the registry to add and switch between multiple stores.
            </p>
            <Button size="sm" onClick={importEnv} className="shrink-0 bg-accent hover:bg-accent/90 text-accent-foreground">Import</Button>
          </div>
        )}

        {/* Existing stores */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-2">
            {stores.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 border border-border">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">{s.name}</p>
                    {s.active
                      ? <Badge className="bg-accent/20 text-accent border-accent/30">Active</Badge>
                      : <Badge className="bg-muted text-muted-foreground border-border">Off</Badge>}
                    {s.id === "env-default" && <Badge className="bg-secondary text-muted-foreground border-border">env</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{s.base_url}</p>
                </div>
                {s.id !== "env-default" && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => patch(s.id, { active: !s.active })} title={s.active ? "Disable" : "Enable"}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary">
                      {s.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => remove(s.id)} title="Remove"
                      className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add store */}
        <form onSubmit={addStore} className="space-y-2 pt-2 border-t border-border">
          <p className="text-sm font-medium text-foreground pt-2">Add a store</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Store name" className={inputClass} />
            <Input value={url} onChange={(e) => { setUrl(e.target.value); setTestState("idle"); }} required placeholder="https://store.example.com" className={inputClass} />
            <Input value={secret} onChange={(e) => { setSecret(e.target.value); setTestState("idle"); }} required type="password" placeholder="INTERNAL_API_SECRET" className={inputClass} />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={test} disabled={!url || !secret || testState === "testing"}>
              {testState === "testing" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
              Test connection
            </Button>
            {testState === "ok" && <span className="text-xs text-accent flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{testMsg}</span>}
            {testState === "fail" && <span className="text-xs text-destructive flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />{testMsg}</span>}
            <Button type="submit" size="sm" disabled={saving} className="ml-auto bg-accent hover:bg-accent/90 text-accent-foreground">
              <Plus className="w-3.5 h-3.5 mr-1.5" />{saving ? "Adding…" : "Add store"}
            </Button>
          </div>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {(showSetup || (!registryReady && stores.length <= 1)) && (
          <div className="text-xs text-muted-foreground space-y-1.5 pt-2 border-t border-border">
            <button onClick={() => setShowSetup((v) => !v)} className="text-accent hover:underline">
              {showSetup ? "Hide" : "First-time setup:"} run this once in your Supabase SQL editor
            </button>
            {showSetup && (
              <pre className="bg-secondary/60 border border-border rounded-md p-3 overflow-x-auto text-[11px] text-foreground whitespace-pre">{SETUP_SQL}</pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
