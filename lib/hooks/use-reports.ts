"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-client";

export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const supabase = createClient();
      const [reportsRes, revenueRes] = await Promise.all([
        supabase.from("reports").select("*").order("created_at", { ascending: false }),
        supabase.from("revenue_metrics").select("*").order("year", { ascending: true }),
      ]);
      if (reportsRes.error) throw reportsRes.error;
      if (revenueRes.error) throw revenueRes.error;
      return { reports: reportsRes.data ?? [], revenue: revenueRes.data ?? [] };
    },
  });
}
