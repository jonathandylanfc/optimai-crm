"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { crmApi } from "@/lib/crm-api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CustomerRow = any;

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: () => crmApi.get<CustomerRow[]>("customers"),
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
  return useMutation({
    mutationFn: (payload: CustomerPayload) => crmApi.post<CustomerRow>("customers", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CustomerPayload> }) =>
      crmApi.patch<CustomerRow>(`customers/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => crmApi.del<null>(`customers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}
