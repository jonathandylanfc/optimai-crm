"use client";

import { Card, CardContent } from "@/components/ui/card";
import { RevenueChart } from "@/components/dashboard/charts/revenue-chart";
import { PipelineOverview } from "@/components/dashboard/charts/pipeline-overview";
import { RecentDeals } from "@/components/dashboard/recent-deals";
import { DollarSign, TrendingUp, Users, Target, ShoppingCart, Package, Calendar } from "lucide-react";
import { useOverviewMetrics } from "@/lib/hooks/use-overview";
import { Skeleton } from "@/components/ui/skeleton";

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

export function OverviewSection() {
  const { data, isLoading, isError } = useOverviewMetrics();

  const storeCards = [
    {
      label: "Store Revenue",
      value: formatCurrency(data?.storeRevenue ?? 0),
      sub: `${formatCurrency(data?.storeRevenueThisMonth ?? 0)} this month`,
      icon: DollarSign,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Total Orders",
      value: String(data?.storeOrderCount ?? 0),
      sub: `${data?.storeOrdersThisMonth ?? 0} this month`,
      icon: ShoppingCart,
      color: "text-chart-1",
      bg: "bg-chart-1/10",
    },
    {
      label: "Store Customers",
      value: String(data?.storeCustomerCount ?? 0),
      sub: "Unique buyers",
      icon: Users,
      color: "text-chart-3",
      bg: "bg-chart-3/10",
    },
    {
      label: "Active CRM Deals",
      value: String(data?.activeDeals ?? 0),
      sub: `${data?.conversionRate ?? 0}% win rate`,
      icon: Target,
      color: "text-foreground",
      bg: "bg-secondary",
    },
  ];

  const topProducts: { name: string; sold: number; revenueCents: number }[] = data?.topProducts ?? [];

  return (
    <div className="space-y-6">
      {/* Store performance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : isError
          ? <p className="col-span-4 text-sm text-destructive">Failed to load metrics.</p>
          : storeCards.map((card, i) => (
              <Card key={card.label} className="border-border bg-card hover:border-muted-foreground/30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 60}ms` }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                      <card.icon className={`w-4.5 h-4.5 ${card.color}`} />
                    </div>
                    <span className="text-sm text-muted-foreground">{card.label}</span>
                  </div>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={data?.revenue} isLoading={isLoading} />
        </div>
        <PipelineOverview data={data?.deals} isLoading={isLoading} />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentDeals data={data?.deals} isLoading={isLoading} />

        {/* Top products */}
        <div className="bg-card border border-border rounded-xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 mb-5">
            <Package className="w-4 h-4 text-accent" />
            <h3 className="text-base font-semibold text-foreground">Top Products</h3>
          </div>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}</div>
          ) : topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No sales data yet</p>
          ) : (
            <div className="space-y-3">
              {topProducts.slice(0, 5).map((p: { name: string; sold: number; revenueCents: number }, i: number) => {
                const maxSold = topProducts[0]?.sold ?? 1;
                return (
                  <div key={p.name} className="space-y-1 animate-in fade-in slide-in-from-right-2" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground truncate max-w-[180px]">{p.name}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{p.sold} sold · ${(p.revenueCents / 100).toFixed(0)}</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-700"
                        style={{ width: `${(p.sold / maxSold) * 100}%`, transitionDelay: `${i * 100}ms` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
