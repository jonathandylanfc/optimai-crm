"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket, Plus, Trash2, Eye, EyeOff } from "lucide-react";

type CADiscount = {
  id: number;
  code: string;
  discountPct: number;
  maxUses: number | null;
  uses: number;
  active: boolean | number;
  notes: string | null;
  expiresAt: string | null;
  createdAt: string;
};

async function fetchDiscounts(): Promise<CADiscount[]> {
  const res = await fetch("/api/ca-discounts");
  if (!res.ok) throw new Error("Failed to load discount codes");
  return res.json();
}

export function DiscountsSection() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ["ca-discounts"], queryFn: fetchDiscounts });
  const [error, setError] = useState("");

  const create = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/ca-discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Create failed");
      return body;
    },
    onSuccess: () => { setError(""); qc.invalidateQueries({ queryKey: ["ca-discounts"] }); },
    onError: (e) => setError(e instanceof Error ? e.message : "Create failed"),
  });

  const update = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Record<string, unknown> }) => {
      const res = await fetch(`/api/ca-discounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ca-discounts"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/ca-discounts/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Delete failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ca-discounts"] }),
  });

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const maxUsesRaw = fd.get("maxUses") as string;
    const expiryRaw = fd.get("expiresAt") as string;
    create.mutate({
      code: fd.get("code") as string,
      discountPct: parseInt(fd.get("discountPct") as string, 10) || 0,
      maxUses: maxUsesRaw ? parseInt(maxUsesRaw, 10) : null,
      notes: (fd.get("notes") as string) || null,
      expiresAt: expiryRaw ? `${expiryRaw}T23:59:59` : null,
      active: true,
    }, {
      onSuccess: () => (e.target as HTMLFormElement).reset(),
    });
  }

  const inputClass = "bg-secondary border-border focus:border-accent text-foreground placeholder:text-muted-foreground";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Discount Codes</h2>
        <p className="text-sm text-muted-foreground mt-1">Create promo codes customers can apply at checkout</p>
      </div>

      {/* Create form */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <div className="space-y-1 lg:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Code *</label>
              <Input name="code" required placeholder="SAVE10" className={`${inputClass} uppercase`} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">% off *</label>
              <Input name="discountPct" type="number" min={1} max={100} required placeholder="10" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Max uses</label>
              <Input name="maxUses" type="number" min={1} placeholder="∞" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Expires</label>
              <Input name="expiresAt" type="date" className={inputClass} />
            </div>
            <Button type="submit" disabled={create.isPending} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Plus className="w-4 h-4 mr-1.5" />
              {create.isPending ? "Adding…" : "Add code"}
            </Button>
            <div className="space-y-1 lg:col-span-6">
              <Input name="notes" placeholder="Notes (optional) — e.g. Instagram promo" className={inputClass} />
            </div>
          </form>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Code</th>
                <th className="text-left px-4 py-3 font-medium">Discount</th>
                <th className="text-left px-4 py-3 font-medium">Usage</th>
                <th className="text-left px-4 py-3 font-medium">Expires</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0"><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                ))
              ) : isError ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-destructive">Could not load discount codes.</td></tr>
              ) : (data ?? []).length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No discount codes yet. Create one above.</td></tr>
              ) : (
                (data ?? []).map((d) => {
                  const active = !!d.active;
                  const maxed = d.maxUses != null && d.uses >= d.maxUses;
                  const expired = d.expiresAt != null && new Date(d.expiresAt) < new Date();
                  return (
                    <tr key={d.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                      <td className="px-4 py-3 font-mono font-semibold text-foreground">{d.code}</td>
                      <td className="px-4 py-3 text-foreground">{d.discountPct}% off</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.uses}{d.maxUses != null ? ` / ${d.maxUses}` : ""}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {d.expiresAt ? new Date(d.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {!active ? (
                          <Badge className="bg-muted text-muted-foreground border-border">Inactive</Badge>
                        ) : expired ? (
                          <Badge className="bg-destructive/20 text-destructive border-destructive/30">Expired</Badge>
                        ) : maxed ? (
                          <Badge className="bg-chart-3/20 text-chart-3 border-chart-3/30">Used up</Badge>
                        ) : (
                          <Badge className="bg-accent/20 text-accent border-accent/30">Active</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title={active ? "Deactivate" : "Activate"}
                            onClick={() => update.mutate({ id: d.id, payload: { active: !active } })}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                          >
                            {active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => remove.mutate(d.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Ticket className="w-3.5 h-3.5" />
        Customers enter these at checkout. Percentage comes off the whole order before shipping.
      </p>
    </div>
  );
}
