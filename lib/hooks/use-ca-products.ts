"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCAProduct,
  updateCAProduct,
  deleteCAProduct,
  type CAProductPayload,
  type CAProduct,
} from "@/app/actions/ca-products";

export function useCAProducts() {
  return useQuery({
    queryKey: ["ca-products"],
    queryFn: async (): Promise<CAProduct[]> => {
      const res = await fetch("/api/ca-products");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to load products (${res.status})`);
      }
      return res.json();
    },
  });
}

export function useCreateCAProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CAProductPayload) => createCAProduct(payload),
    onSuccess: () => qc.refetchQueries({ queryKey: ["ca-products"] }),
  });
}

export function useUpdateCAProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CAProductPayload> }) =>
      updateCAProduct(id, payload),
    onSuccess: () => qc.refetchQueries({ queryKey: ["ca-products"] }),
  });
}

export function useDeleteCAProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCAProduct(id),
    onSuccess: () => qc.refetchQueries({ queryKey: ["ca-products"] }),
  });
}
