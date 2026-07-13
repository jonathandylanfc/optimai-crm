"use client";

import { useQuery } from "@tanstack/react-query";

async function fetchForecasting() {
  const res = await fetch("/api/ca-forecasting");
  if (!res.ok) throw new Error("Failed to fetch forecasting data");
  return res.json();
}

export function useForecasting() {
  return useQuery({
    queryKey: ["ca-forecasting"],
    queryFn: fetchForecasting,
    refetchInterval: 120_000,
  });
}
