"use client";

import { useQuery } from "@tanstack/react-query";

async function fetchReports() {
  const [orders, analytics] = await Promise.all([
    fetch("/api/ca-orders").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    fetch("/api/ca-analytics").then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  return { orders, analytics };
}

export function useReports() {
  return useQuery({
    queryKey: ["ca-reports"],
    queryFn: fetchReports,
    refetchInterval: 120_000,
  });
}
