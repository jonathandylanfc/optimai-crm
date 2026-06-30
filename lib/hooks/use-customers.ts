"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export interface CustomerPayload {
  name: string;
  industry?: string;
  tier: "Enterprise" | "Growth" | "Starter";
  location?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  health_score?: number;
  trend?: "up" | "down" | "stable";
  contract_value?: number;
  contract_length_months?: number;
  payment_date?: string;
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async (payload: CustomerPayload) => {
      const { data, error } = await supabase.from("customers").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<CustomerPayload> }) => {
      const { data, error } = await supabase.from("customers").update(payload).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}
