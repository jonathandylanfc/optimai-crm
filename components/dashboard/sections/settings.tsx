"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Store,
  Database,
  Wand2,
  ImageIcon,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ArrowDownUp,
} from "lucide-react";

type ServiceStatus = { ok: boolean; configured?: boolean; url?: string | null; error: string | null };

type StatusResponse = {
  store: ServiceStatus;
  supabase: ServiceStatus;
  ai: ServiceStatus;
  cloudinary: ServiceStatus;
  gemini?: ServiceStatus;
};

function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <Badge className="bg-accent/20 text-accent border-accent/30 flex items-center gap-1">
      <CheckCircle2 className="w-3 h-3" />
      Connected
    </Badge>
  ) : (
    <Badge className="bg-destructive/20 text-destructive border-destructive/30 flex items-center gap-1">
      <XCircle className="w-3 h-3" />
      Not working
    </Badge>
  );
}

export function SettingsSection() {
  const qc = useQueryClient();
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: status, isLoading, refetch, isFetching } = useQuery<StatusResponse>({
    queryKey: ["settings-status"],
    queryFn: async () => {
      const res = await fetch("/api/settings/status");
      if (!res.ok) throw new Error("Status check failed");
      return res.json();
    },
    staleTime: 30_000,
  });

  async function runSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/orders/sync-store", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSyncResult(`Sync failed: ${data.error ?? res.status}`);
      } else {
        setSyncResult(`Done — ${data.synced} new order${data.synced === 1 ? "" : "s"} synced, ${data.skipped} already up to date.`);
        qc.invalidateQueries({ queryKey: ["ca-orders"] });
        qc.invalidateQueries({ queryKey: ["overview"] });
      }
    } catch {
      setSyncResult("Sync failed: network error");
    } finally {
      setSyncing(false);
    }
  }

  const services = status
    ? [
        {
          id: "store",
          name: "Car Accessories Store",
          description: status.store.url ?? "Storefront API connection",
          icon: Store,
          ok: status.store.ok,
          error: status.store.error,
        },
        {
          id: "supabase",
          name: "Supabase (CRM Database)",
          description: "Customers, deals, orders, team",
          icon: Database,
          ok: status.supabase.ok,
          error: status.supabase.error,
        },
        {
          id: "ai",
          name: "AI Image Processing",
          description: "Background removal & enhancement (rembg)",
          icon: Wand2,
          ok: status.ai.ok,
          error: status.ai.error,
        },
        {
          id: "gemini",
          name: "AI Studio Shot (Gemini)",
          description: "Generative studio product photos",
          icon: Wand2,
          ok: status.gemini?.ok ?? false,
          error: status.gemini?.error ?? "GEMINI_API_KEY not detected — add it to this service and redeploy.",
        },
        {
          id: "cloudinary",
          name: "Cloudinary",
          description: "Product image hosting",
          icon: ImageIcon,
          ok: status.cloudinary.ok,
          error: status.cloudinary.error,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connection health and data tools for your store + CRM
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Re-check
        </Button>
      </div>

      {/* Connections */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">Connections</CardTitle>
          <CardDescription>Live status of every service this dashboard depends on</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
              : services.map((service, index) => (
                  <div
                    key={service.id}
                    className="p-4 rounded-lg border border-border bg-secondary/30 hover:border-muted-foreground/30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                    style={{ animationDelay: `${index * 75}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${service.ok ? "bg-accent/20" : "bg-destructive/10"}`}>
                          <service.icon className={`w-5 h-5 ${service.ok ? "text-accent" : "text-destructive"}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{service.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{service.description}</p>
                        </div>
                      </div>
                      <StatusBadge ok={service.ok} />
                    </div>
                    {!service.ok && service.error && (
                      <p className="mt-3 text-xs text-destructive/80 font-mono bg-destructive/5 rounded px-2 py-1.5 break-all">
                        {service.error}
                      </p>
                    )}
                  </div>
                ))}
          </div>
        </CardContent>
      </Card>

      {/* Data tools */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">Data Tools</CardTitle>
          <CardDescription>Keep the CRM in sync with the storefront</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <ArrowDownUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">Sync store orders</p>
                <p className="text-sm text-muted-foreground">
                  Import any store orders missing from the CRM (new orders sync automatically)
                </p>
              </div>
            </div>
            <Button
              onClick={runSync}
              disabled={syncing}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing…
                </>
              ) : (
                "Run Sync"
              )}
            </Button>
          </div>
          {syncResult && (
            <p className={`text-sm px-1 ${syncResult.startsWith("Done") ? "text-accent" : "text-destructive"}`}>
              {syncResult}
            </p>
          )}

          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Store className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Open storefront</p>
                <p className="text-sm text-muted-foreground">View the live car accessories store</p>
              </div>
            </div>
            {status?.store.url ? (
              <Button variant="outline" asChild>
                <a href={status.store.url} target="_blank" rel="noopener noreferrer">
                  Visit
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                </a>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                Not configured
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
