"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Search, DollarSign, ShoppingBag, UserPlus } from "lucide-react";

// Storefront customers — everyone with an account on the shop, with what they
// have actually bought. Reads the store directly, same source as the Orders
// section.
//
// This used to render a B2B sales CRM record out of Supabase: account tier,
// industry, health score, contract value, contract length. Those are fields for
// selling annual software contracts to companies; nothing filled them in for a
// shop selling valve caps to individuals. Order count and lifetime spend are
// the numbers that mean something here.
type StoreCustomer = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  orderCount: number;
  totalSpentCents: number;
};

function money(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function CustomersSection() {
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["ca-customers"],
    queryFn: async (): Promise<StoreCustomer[]> => {
      const res = await fetch("/api/ca-customers");
      if (!res.ok) throw new Error("Failed to load customers");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const customers = data ?? [];
  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.email.toLowerCase().includes(query.toLowerCase())
  );

  const totalSpent = customers.reduce((s, c) => s + c.totalSpentCents, 0);
  const withOrders = customers.filter((c) => c.orderCount > 0).length;

  const stats = [
    { label: "Accounts", value: String(customers.length), icon: Users, color: "text-foreground" },
    { label: "Have Ordered", value: String(withOrders), icon: ShoppingBag, color: "text-chart-1" },
    { label: "Lifetime Revenue", value: money(totalSpent), icon: DollarSign, color: "text-accent" },
    {
      label: "Avg per Customer",
      value: money(customers.length ? Math.round(totalSpent / customers.length) : 0),
      icon: UserPlus,
      color: "text-chart-3",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          : stats.map((s) => (
              <Card key={s.label} className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                      <p className={`text-2xl font-semibold mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                    <s.icon className={`w-8 h-8 ${s.color} opacity-50`} />
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search customers…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 bg-secondary border-border focus:border-accent"
        />
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              {customers.length === 0 ? "No customer accounts yet." : "No customers match that search."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Customer</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Orders</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Lifetime Spend</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/40">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.orderCount}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{money(c.totalSpentCents)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
