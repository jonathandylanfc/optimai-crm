"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-client";

export function useDeals() {
  return useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("deals")
        .select("*, customers(name, company), team_members(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdateDealStage() {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase.from("deals").update({ stage }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });
}
