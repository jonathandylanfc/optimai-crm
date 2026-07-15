"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-client";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function useOverviewMetrics() {
  return useQuery({
    queryKey: ["overview", "metrics"],
    queryFn: async () => {
      const supabase = createClient();
      const [dealsRes, customersRes, storeRes, ordersRes] = await Promise.all([
        supabase.from("deals").select("id, value, stage, created_at"),
        supabase.from("customers").select("id, created_at"),
        fetch("/api/ca-analytics").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/ca-orders").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      ]);
      if (dealsRes.error) throw dealsRes.error;
      if (customersRes.error) throw customersRes.error;

      const deals = dealsRes.data ?? [];
      const customers = customersRes.data ?? [];
      const storeOrders: { status: string; totalCents: number; createdAt: string }[] = ordersRes ?? [];

      // Build 12-month revenue chart from store orders
      const now = new Date();
      const revenueByMonth: Record<string, number> = {};
      for (const o of storeOrders) {
        if (o.status === "cancelled") continue;
        const d = new Date(o.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        revenueByMonth[key] = (revenueByMonth[key] ?? 0) + o.totalCents;
      }

      // Last 12 months
      const storeMonthlyRevenue = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const rev = Math.round((revenueByMonth[key] ?? 0) / 100);
        return {
          period_date: d.toISOString(),
          month: MONTH_NAMES[d.getMonth()],
          revenue: rev,
          target: Math.round(rev * 1.1),
        };
      });

      const storeRevenueCents: number = storeRes?.totalRevenueCents ?? 0;
      const storeRevenue = storeRevenueCents / 100;
      const storeRevenueThisMonth = Math.round((storeRes?.revenueThisMonthCents ?? 0) / 100);

      const activeDeals = deals.filter((d: { stage: string }) => !["closed_won", "closed_lost"].includes(d.stage)).length;
      const closedWon = deals.filter((d: { stage: string }) => d.stage === "closed_won");
      const conversionRate = deals.length > 0 ? ((closedWon.length / deals.length) * 100).toFixed(1) : "0";

      // Store customers = unique emails from orders
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uniqueEmails = new Set((storeOrders as any[]).map((o) => o.customerEmail).filter(Boolean));
      const storeCustomerCount = uniqueEmails.size;

      return {
        totalRevenue: storeRevenue,
        storeRevenue,
        storeRevenueThisMonth,
        storeOrderCount: storeRes?.orderCount ?? 0,
        storeOrdersThisMonth: storeRes?.ordersThisMonthCount ?? 0,
        storeCustomerCount,
        activeDeals,
        conversionRate,
        newLeads: customers.length,
        revenue: storeMonthlyRevenue,
        deals,
        topProducts: storeRes?.topProducts ?? [],
      };
    },
    refetchInterval: 60_000,
  });
}
