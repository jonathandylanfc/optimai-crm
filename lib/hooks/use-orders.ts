"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-client";
import type { OrderPayload } from "@/app/actions/orders";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useOrdersRealtime(refetch: () => void) {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("orders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);
}

export function useOrdersByCustomer(customerId: string | null) {
  return useQuery({
    queryKey: ["orders", "customer", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      if (!customerId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("orders")
        .select("id, title, value, status, created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async (payload: OrderPayload) => {
      const { data, error } = await supabase.from("orders").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.refetchQueries({ queryKey: ["orders"] }),
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<OrderPayload> }) => {
      const { data, error } = await supabase.from("orders").update(payload).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.refetchQueries({ queryKey: ["orders"] }),
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.refetchQueries({ queryKey: ["orders"] }),
  });
}
