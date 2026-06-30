"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-client";

export function useForecasting() {
  return useQuery({
    queryKey: ["forecasting"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("forecast_data")
        .select("*")
        .order("year", { ascending: true })
        .order("month", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
