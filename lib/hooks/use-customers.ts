"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-client";

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("customers")
        .select("*, deals(id, name, value, stage)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
