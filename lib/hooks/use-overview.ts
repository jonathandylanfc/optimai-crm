"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-client";

export function useOverviewMetrics() {
  return useQuery({
    queryKey: ["overview", "metrics"],
    queryFn: async () => {
      const supabase = createClient();
      const [revenueRes, dealsRes, customersRes, storeRes] = await Promise.all([
        supabase.from("revenue_metrics").select("*").order("period_date", { ascending: false }).limit(12),
        supabase.from("deals").select("id, value, stage, created_at"),
        supabase.from("customers").select("id, created_at"),
        fetch("/api/ca-analytics").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (revenueRes.error) throw revenueRes.error;
      if (dealsRes.error) throw dealsRes.error;
      if (customersRes.error) throw customersRes.error;

      const revenue = revenueRes.data ?? [];
      const deals = dealsRes.data ?? [];
      const customers = customersRes.data ?? [];

      const crmRevenue = revenue.reduce((s: number, r: { revenue?: number }) => s + (r.revenue ?? 0), 0);
      const storeRevenueCents: number = storeRes?.totalRevenueCents ?? 0;
      const storeRevenue = storeRevenueCents / 100;
      // Show store revenue when CRM revenue_metrics table is empty
      const totalRevenue = crmRevenue > 0 ? crmRevenue : storeRevenue;

      const activeDeals = deals.filter((d: { stage: string }) => !["closed_won", "closed_lost"].includes(d.stage)).length;
      const closedWon = deals.filter((d: { stage: string }) => d.stage === "closed_won");
      const conversionRate = deals.length > 0 ? ((closedWon.length / deals.length) * 100).toFixed(1) : "0";
      const newLeads = customers.length;

      return {
        totalRevenue,
        storeRevenue,
        storeOrderCount: storeRes?.orderCount ?? 0,
        storeOrdersThisMonth: storeRes?.ordersThisMonthCount ?? 0,
        activeDeals,
        conversionRate,
        newLeads,
        revenue,
        deals,
      };
    },
    refetchInterval: 60_000,
  });
}
