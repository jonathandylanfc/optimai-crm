"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  XCircle,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-client";
import { useDeals } from "@/lib/hooks/use-deals";
import { Skeleton } from "@/components/ui/skeleton";
import { DealForm } from "@/components/dashboard/deal-form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusConfig = {
  won: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", label: "Won" },
  pending: { icon: Clock, color: "text-warning", bg: "bg-warning/10", label: "Pending" },
  lost: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Lost" },
};

export function DealsSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"company" | "value" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { data: rawDeals, isLoading } = useDeals();
  const qc = useQueryClient();

  const updateDeal = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const supabase = createClient();
      const { error } = await supabase.from("deals").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  const deleteDeal = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  function toggleSort(col: "company" | "value") {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir(col === "company" ? "asc" : "desc");
    }
  }

  const deals = (rawDeals ?? []).map((d: {
    id: string; company: string; contact_name?: string; contact_email?: string;
    value: number; stage: string; status: string; close_date?: string;
    team_members?: { name: string } | null;
  }) => ({
    id: d.id,
    company: d.company,
    contact: d.contact_name ?? "—",
    email: d.contact_email ?? "—",
    value: Number(d.value),
    stage: d.stage,
    status: (d.status as keyof typeof statusConfig) ?? "pending",
    closeDate: d.close_date ?? "—",
    rep: d.team_members?.name ?? "—",
  }));

  const filteredDeals = deals
    .filter((deal) => {
      const matchesSearch =
        deal.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.contact.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = selectedFilter === "all" || deal.status === selectedFilter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (!sortBy) return 0;
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "company") return a.company.localeCompare(b.company) * dir;
      return (a.value - b.value) * dir;
    });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">View and manage all your deals in one place</p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 h-9 pl-9 pr-4 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-accent transition-all duration-200"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {["all", "won", "pending", "lost"].map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                  selectedFilter === filter
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          Add Deal
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <button onClick={() => toggleSort("company")} className={cn("flex items-center gap-1 transition-colors", sortBy === "company" ? "text-foreground" : "hover:text-foreground")}>
                    Company
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <button onClick={() => toggleSort("value")} className={cn("flex items-center gap-1 transition-colors", sortBy === "value" ? "text-foreground" : "hover:text-foreground")}>
                    Value
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stage</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rep</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Close Date</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={8} className="py-3 px-4">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                : filteredDeals.map((deal, index) => {
                    const status = statusConfig[deal.status] ?? statusConfig.pending;
                    const StatusIcon = status.icon;
                    return (
                      <tr
                        key={deal.id}
                        className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors duration-150 cursor-pointer animate-in fade-in slide-in-from-left-2"
                        style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center text-xs font-semibold text-muted-foreground">
                              {deal.company.charAt(0)}
                            </div>
                            <span className="text-sm font-medium text-foreground">{deal.company}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="text-sm text-foreground">{deal.contact}</p>
                            <p className="text-xs text-muted-foreground">{deal.email}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm font-semibold text-foreground">
                            ${deal.value.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-1 rounded-md bg-secondary text-xs font-medium text-foreground">
                            {deal.stage}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium", status.bg, status.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-muted-foreground">{deal.rep}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-muted-foreground">{deal.closeDate}</span>
                        </td>
                        <td className="py-4 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              {deal.status !== "won" && (
                                <DropdownMenuItem
                                  onClick={() => updateDeal.mutate({ id: deal.id, payload: { status: "won", stage: "closed_won" } })}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-success" />
                                  Mark Won
                                </DropdownMenuItem>
                              )}
                              {deal.status !== "lost" && (
                                <DropdownMenuItem
                                  onClick={() => updateDeal.mutate({ id: deal.id, payload: { status: "lost", stage: "closed_lost" } })}
                                >
                                  <XCircle className="w-3.5 h-3.5 mr-2 text-destructive" />
                                  Mark Lost
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => deleteDeal.mutate(deal.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/30">
          <span className="text-sm text-muted-foreground">
            Showing {filteredDeals.length} of {deals.length} deals
          </span>
        </div>
      </div>

      {formOpen && <DealForm open onClose={() => setFormOpen(false)} />}
    </div>
  );
}
