"use client";

import { useState } from "react";
import { Plus, MoreHorizontal, Clock, DollarSign, User, Building2 } from "lucide-react";
import { usePipeline, usePipelineRealtime } from "@/lib/hooks/use-pipeline";
import { Skeleton } from "@/components/ui/skeleton";
import { DealForm } from "@/components/dashboard/deal-form";

const STAGE_ORDER = ["Lead", "Qualified", "Proposal", "Negotiation"];

interface DealRow {
  id: string;
  company: string;
  value: number;
  probability: number | null;
  days_in_stage: number | null;
  team_members?: { name: string } | null;
}

function DealCard({ deal, index }: { deal: DealRow; index: number }) {
  return (
    <div
      className="group bg-background border border-border rounded-lg p-4 cursor-grab active:cursor-grabbing hover:border-accent/50 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium text-foreground truncate max-w-[120px]">{deal.company}</span>
        </div>
        <button className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm text-foreground font-semibold mb-3">
        <DollarSign className="w-3.5 h-3.5 text-accent" />
        ${Number(deal.value).toLocaleString()}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {deal.team_members?.name ?? "—"}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {deal.days_in_stage ?? 0}d
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Probability</span>
          <span className="text-foreground font-medium">{deal.probability ?? 0}%</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${deal.probability ?? 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function PipelineSection() {
  const { data: rawDeals, isLoading, refetch } = usePipeline();
  usePipelineRealtime(refetch);
  const [formStage, setFormStage] = useState<string | null>(null);

  const stages = STAGE_ORDER.map((stageName) => {
    const stageDeals = (rawDeals ?? []).filter((d: { stage: string }) => d.stage === stageName);
    const total = stageDeals.reduce((s: number, d: { value: number }) => s + Number(d.value), 0);
    return { id: stageName.toLowerCase(), name: stageName, deals: stageDeals, total };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage and track your sales pipeline</p>
        <button
          onClick={() => setFormStage("Lead")}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          Add Deal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stages.map((stage, stageIndex) => (
          <div
            key={stage.id}
            className="bg-card border border-border rounded-xl p-4 min-h-[200px] sm:min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${stageIndex * 100}ms`, animationFillMode: "both" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{stage.name}</h3>
                <span className="px-2 py-0.5 bg-secondary rounded-md text-xs font-medium text-muted-foreground">
                  {stage.deals.length}
                </span>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                ${(stage.total / 1000).toFixed(0)}k
              </span>
            </div>

            <div className="space-y-3">
              {isLoading
                ? Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-lg" />
                  ))
                : stage.deals.map((d, dealIndex: number) => { const deal = d as unknown as DealRow; return (
                    <DealCard key={deal.id} deal={deal} index={dealIndex} />
                  ); })}
            </div>

            <button
              onClick={() => setFormStage(stage.name)}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-accent/50 hover:bg-secondary/50 transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Add deal
            </button>
          </div>
        ))}
      </div>

      {formStage !== null && (
        <DealForm open onClose={() => setFormStage(null)} defaultStage={formStage} />
      )}
    </div>
  );
}
