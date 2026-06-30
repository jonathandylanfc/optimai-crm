"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-client";

export function useOverviewMetrics() {
  return useQuery({
    queryKey: ["overview", "metrics"],
    queryFn: async () => {
      const supabase = createClient();
      const [revenueRes, dealsRes, customersRes] = await Promise.all([
        supabase.from("revenue_metrics").select("*").order("period_date", { ascending: false }).limit(12),
        supabase.from("deals").select("id, value, stage, created_at"),
        supabase.from("customers").select("id, created_at"),
      ]);
      if (revenueRes.error) throw revenueRes.error;
      if (dealsRes.error) throw dealsRes.error;
      if (customersRes.error) throw customersRes.error;

      const revenue = revenueRes.data ?? [];
      const deals = dealsRes.data ?? [];
      const customers = customersRes.data ?? [];

      const totalRevenue = revenue.reduce((s, r) => s + (r.revenue ?? 0), 0);
      const activeDeals = deals.filter((d) => !["closed_won", "closed_lost"].includes(d.stage)).length;
      const closedWon = deals.filter((d) => d.stage === "closed_won");
      const conversionRate = deals.length > 0 ? ((closedWon.length / deals.length) * 100).toFixed(1) : "0";
      const newLeads = customers.length;

      return { totalRevenue, activeDeals, conversionRate, newLeads, revenue, deals };
    },
    refetchInterval: 60_000,
  });
}
