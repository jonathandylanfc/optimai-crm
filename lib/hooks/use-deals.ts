"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { crmApi } from "@/lib/crm-api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DealRow = any;

export function useDeals() {
  return useQuery({
    queryKey: ["deals"],
    queryFn: () => crmApi.get<DealRow[]>("deals"),
  });
}

export function useUpdateDealStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      crmApi.patch<DealRow>(`deals/${id}`, { stage }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });
}
