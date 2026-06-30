"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-client";

export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("team_members")
        .select("*, deals(id, value, stage)")
        .order("rank", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
