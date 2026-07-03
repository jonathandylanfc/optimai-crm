"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCAProducts,
  createCAProduct,
  updateCAProduct,
  deleteCAProduct,
  type CAProductPayload,
} from "@/app/actions/ca-products";

export function useCAProducts() {
  return useQuery({
    queryKey: ["ca-products"],
    queryFn: fetchCAProducts,
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
