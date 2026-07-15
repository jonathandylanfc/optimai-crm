"use client";

import { Trophy, TrendingUp, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-client";
import { Skeleton } from "@/components/ui/skeleton";

function useTopPerformers() {
  return useQuery({
    queryKey: ["top-performers"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: deals, error } = await supabase
        .from("deals")
        .select("value, team_member_id, team_members(id, name)")
        .eq("stage", "closed_won");
      if (error) throw error;

      const map = new Map<string, { name: string; deals: number; revenue: number }>();
      for (const d of deals ?? []) {
        const member = d.team_members as unknown as { id: string; name: string } | null;
        if (!member) continue;
        const existing = map.get(member.id);
        if (existing) {
          existing.deals += 1;
          existing.revenue += Number(d.value);
        } else {
          map.set(member.id, { name: member.name, deals: 1, revenue: Number(d.value) });
        }
      }

      return Array.from(map.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    },
    refetchInterval: 60_000,
  });
}

export function TopPerformers({ isLoading: parentLoading }: { isLoading?: boolean }) {
  const { data: performers, isLoading } = useTopPerformers();
  const loading = parentLoading || isLoading;

  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">Top Performers</h3>
          <p className="text-sm text-muted-foreground mt-0.5">By closed won revenue</p>
        </div>
        <div className="flex items-center gap-1 text-warning">
          <Trophy className="w-5 h-5" />
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
        ) : !performers || performers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Users className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground text-center">No closed deals yet.</p>
            <p className="text-xs text-muted-foreground/60 text-center">Performers appear here once deals are won.</p>
          </div>
        ) : (
          performers.map((person, index) => (
            <div
              key={person.name}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-all duration-200 animate-in fade-in slide-in-from-right-2"
              style={{ animationDelay: `${(index + 4) * 100}ms`, animationFillMode: "both" }}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/80 to-chart-1 flex items-center justify-center text-sm font-semibold text-accent-foreground">
                    {person.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  {index < 3 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-warning text-[10px] font-bold flex items-center justify-center text-background">
                      {index + 1}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{person.name}</p>
                  <p className="text-xs text-muted-foreground">{person.deals} deal{person.deals !== 1 ? "s" : ""} closed</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">
                  ${person.revenue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <div className="flex items-center justify-end gap-1 text-xs text-accent">
                  <TrendingUp className="w-3 h-3" />
                  Won
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
