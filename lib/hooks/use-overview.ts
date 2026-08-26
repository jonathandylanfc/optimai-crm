"use client";

import { useQuery } from "@tanstack/react-query";


const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function useOverviewMetrics() {
  return useQuery({
    queryKey: ["overview", "metrics"],
    queryFn: async () => {
      // Everything here comes from the storefront now. The deal/lead metrics
      // that used to sit alongside these were B2B sales-pipeline figures with
      // nothing feeding them.
      const [storeRes, ordersRes, customersRes] = await Promise.all([
        fetch("/api/ca-analytics").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/ca-orders").then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch("/api/ca-customers").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      ]);
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

      // Registered accounts that haven't ordered yet — the storefront's
      // equivalent of a lead.
      const accounts: { orderCount: number }[] = customersRes ?? [];
      const newLeads = accounts.filter((c) => (c.orderCount ?? 0) === 0).length;

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
        newLeads,
        revenue: storeMonthlyRevenue,
        topProducts: storeRes?.topProducts ?? [],
      };
    },
    refetchInterval: 60_000,
  });
}
