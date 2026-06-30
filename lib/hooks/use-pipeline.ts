"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase-client";

export function usePipeline() {
  return useQuery({
    queryKey: ["pipeline"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("deals")
        .select("id, company, value, stage, probability, days_in_stage, team_members(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePipelineRealtime(refetch: () => void) {
  const supabase = createClient();
  useEffect(() => {
    const channel = supabase
      .channel("pipeline-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, refetch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
}
