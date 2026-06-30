"use client";

import { cn } from "@/lib/utils";
import { ArrowUpRight, Clock, CheckCircle2, XCircle } from "lucide-react";

const deals = [
  {
    company: "Acme Corp",
    value: "$125,000",
    status: "won",
    date: "2 hours ago",
    rep: "Sarah Chen",
  },
  {
    company: "TechStart Inc",
    value: "$89,500",
    status: "pending",
    date: "5 hours ago",
    rep: "Mike Johnson",
  },
  {
    company: "GlobalFin",
    value: "$245,000",
    status: "pending",
    date: "1 day ago",
    rep: "Emily Davis",
  },
  {
    company: "DataSync Solutions",
    value: "$67,800",
    status: "lost",
    date: "2 days ago",
    rep: "James Wilson",
  },
  {
    company: "CloudBase Ltd",
    value: "$178,000",
    status: "won",
    date: "3 days ago",
    rep: "Sarah Chen",
  },
];

const statusConfig = {
  won: {
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/10",
    label: "Won",
  },
  pending: {
    icon: Clock,
    color: "text-warning",
    bg: "bg-warning/10",
    label: "Pending",
  },
  lost: {
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    label: "Lost",
  },
};

type DealRow = { id: string; name?: string; value: number; stage: string; created_at: string; customers?: { name?: string; company?: string } };

function stageToStatus(stage: string): keyof typeof statusConfig {
  if (stage === "closed_won") return "won";
  if (stage === "closed_lost") return "lost";
  return "pending";
}

export function RecentDeals({ data: liveData, isLoading }: { data?: DealRow[]; isLoading?: boolean }) {
  const displayDeals = liveData && liveData.length > 0
    ? liveData.slice(0, 5).map((d) => ({
        company: d.customers?.company ?? d.customers?.name ?? d.name ?? "Unknown",
        value: `$${d.value.toLocaleString()}`,
        status: stageToStatus(d.stage),
        date: new Date(d.created_at).toLocaleDateString(),
        rep: "—",
      }))
    : deals;

  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">Recent Deals</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Latest activity</p>
        </div>
        <button className="flex items-center gap-1 text-sm text-accent hover:text-accent/80 font-medium transition-colors group">
          View all
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>

      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-secondary/30 animate-pulse" />
            ))
          : displayDeals.map((deal, index) => {
              const status = statusConfig[deal.status as keyof typeof statusConfig];
              const StatusIcon = status.icon;
              return (
                <div
                  key={index}
                  className="group flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-all duration-200 cursor-pointer animate-in fade-in slide-in-from-left-2"
                  style={{ animationDelay: `${(index + 3) * 100}ms`, animationFillMode: "both" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-sm font-semibold text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent transition-all duration-200">
                      {deal.company.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{deal.company}</p>
                      <p className="text-xs text-muted-foreground">{deal.rep} • {deal.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">{deal.value}</span>
                    <div className={cn("flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium", status.bg, status.color)}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
