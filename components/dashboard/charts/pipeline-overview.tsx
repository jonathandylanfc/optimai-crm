"use client";

import { useState, useEffect } from "react";

const FALLBACK_STAGES = [
  { name: "Lead", value: 45, count: 892, color: "bg-chart-1" },
  { name: "Qualified", value: 28, count: 556, color: "bg-chart-2" },
  { name: "Proposal", value: 18, count: 357, color: "bg-chart-3" },
  { name: "Negotiation", value: 9, count: 179, color: "bg-accent" },
];

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-chart-1", qualified: "bg-chart-2",
  proposal: "bg-chart-3", negotiation: "bg-accent",
  closed_won: "bg-success", closed_lost: "bg-destructive",
};

type DealRow = { stage: string; value: number };

export function PipelineOverview({ data: liveDeals, isLoading }: { data?: DealRow[]; isLoading?: boolean }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const stages = (() => {
    if (!liveDeals || liveDeals.length === 0) return FALLBACK_STAGES;
    const counts: Record<string, { count: number; value: number }> = {};
    liveDeals.forEach((d) => {
      if (!counts[d.stage]) counts[d.stage] = { count: 0, value: 0 };
      counts[d.stage].count += 1;
      counts[d.stage].value += d.value;
    });
    const total = liveDeals.length;
    return Object.entries(counts).map(([stage, { count, value }]) => ({
      name: stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: Math.round((count / total) * 100),
      count,
      color: STAGE_COLORS[stage] ?? "bg-chart-1",
    }));
  })();

  const totalPipelineValue = liveDeals
    ? liveDeals.reduce((s, d) => s + d.value, 0)
    : 4_800_000;

  return (
    <div className="bg-card border border-border rounded-xl p-5 h-[380px] animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-foreground">Pipeline Stages</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Distribution by stage</p>
      </div>

      <div className="space-y-5">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 rounded bg-secondary/30 animate-pulse" />)
          : stages.map((stage, index) => (
          <div key={stage.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{stage.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{stage.count}</span>
                <span className="text-sm font-semibold text-foreground">{stage.value}%</span>
              </div>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full ${stage.color} rounded-full transition-all duration-1000 ease-out`}
                style={{
                  width: isLoaded ? `${stage.value}%` : "0%",
                  transitionDelay: `${index * 150}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-5 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Pipeline Value</span>
          <span className="text-xl font-bold text-foreground">
            {totalPipelineValue >= 1_000_000
              ? `$${(totalPipelineValue / 1_000_000).toFixed(1)}M`
              : `$${(totalPipelineValue / 1_000).toFixed(0)}K`}
          </span>
        </div>
      </div>
    </div>
  );
}
