"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PipelineRow = any;

export function usePipeline() {
  return useQuery({
    queryKey: ["pipeline"],
    queryFn: async () => {
      const res = await fetch("/api/crm/pipeline");
      if (!res.ok) throw new Error("Failed to load pipeline");
      return (await res.json()) as PipelineRow[];
    },
  });
}

// Was a Supabase Realtime subscription over the anon key. Realtime honours RLS,
// so with anon denied it delivers nothing — and the subscription needed that
// public key in the browser, which is what we're removing. Polling instead:
// this is a low-volume table and the section is only open while someone is
// looking at it.
export function usePipelineRealtime(refetch: () => void) {
  useEffect(() => {
    const id = setInterval(refetch, 30_000);
    return () => clearInterval(id);
  }, [refetch]);
}
