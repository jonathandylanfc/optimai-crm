"use client";

import { useState, useEffect } from "react";
import { useReports } from "@/lib/hooks/use-reports";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3, TrendingUp, PieChart as PieChartIcon, Package,
  DollarSign, ShoppingCart, XCircle, Clock,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_COLORS: Record<string, string> = {
  pending: "oklch(0.75 0.18 55)",
  processing: "oklch(0.7 0.18 220)",
  shipped: "oklch(0.7 0.15 300)",
  delivered: "oklch(0.7 0.18 145)",
  cancelled: "oklch(0.65 0.2 25)",
};

type StoreOrder = {
  id: number;
  status: string;
  totalCents: number;
  createdAt: string;
  customerEmail: string;
};

type TopProduct = { name: string; sold: number; revenueCents: number };

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-accent/50 transition-all duration-300">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

export function ReportsSection() {
  const [chartsLoaded, setChartsLoaded] = useState(false);
  const { data, isLoading } = useReports();

  useEffect(() => {
    const t = setTimeout(() => setChartsLoaded(true), 400);
    return () => clearTimeout(t);
  }, []);

  const orders: StoreOrder[] = data?.orders ?? [];
  const analytics = data?.analytics;

  // Monthly revenue (last 12 months, non-cancelled)
  const now = new Date();
  const revenueByMonth: Record<string, number> = {};
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    revenueByMonth[key] = (revenueByMonth[key] ?? 0) + o.totalCents;
  }
  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    return { month: MONTH_NAMES[d.getMonth()], revenue: Math.round((revenueByMonth[key] ?? 0) / 100) };
  });

  // Status breakdown (pie)
  const statusCounts: Record<string, number> = {};
  for (const o of orders) {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
  }
  const statusData = Object.entries(statusCounts)
    .map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] ?? "oklch(0.65 0 0)" }))
    .sort((a, b) => b.value - a.value);

  // Summary stats
  const totalRevenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.totalCents, 0);
  const totalOrders = orders.length;
  const cancelRate = totalOrders > 0 ? Math.round((statusCounts.cancelled ?? 0) / totalOrders * 100) : 0;
  const uniqueCustomers = new Set(orders.map((o) => o.customerEmail).filter(Boolean)).size;

  const topProducts: TopProduct[] = analytics?.topProducts ?? [];

  return (
    <div className="space-y-6">
      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
          : [
              { label: "Total Revenue", value: `$${(totalRevenue / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: "All time (excl. cancelled)", icon: DollarSign, color: "bg-accent/10 text-accent" },
              { label: "Total Orders", value: String(totalOrders), sub: `${statusCounts.delivered ?? 0} delivered`, icon: ShoppingCart, color: "bg-chart-1/10 text-chart-1" },
              { label: "Unique Customers", value: String(uniqueCustomers), sub: "Distinct buyers", icon: TrendingUp, color: "bg-chart-3/10 text-chart-3" },
              { label: "Cancel Rate", value: `${cancelRate}%`, sub: `${statusCounts.cancelled ?? 0} cancelled`, icon: XCircle, color: cancelRate > 10 ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground" },
            ].map((s) => (
              <StatCard key={s.label} label={s.label} value={s.value} sub={s.sub} icon={s.icon} color={s.color} />
            ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly revenue bar chart */}
        <div className="bg-card border border-border rounded-xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">Monthly Revenue</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Store orders — last 12 months</p>
            </div>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className={`h-[250px] transition-opacity duration-700 ${chartsLoaded ? "opacity-100" : "opacity-0"}`}>
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.005 260)" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "oklch(0.65 0 0)", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "oklch(0.65 0 0)", fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`} dx={-5} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "oklch(0.12 0.005 260)", border: "1px solid oklch(0.22 0.005 260)", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="oklch(0.7 0.18 220)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Order status pie */}
        <div className="bg-card border border-border rounded-xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-foreground">Order Status Breakdown</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Distribution across all orders</p>
          </div>
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : statusData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No orders yet</div>
          ) : (
            <div className={`flex flex-col sm:flex-row items-center gap-6 sm:gap-8 transition-opacity duration-700 ${chartsLoaded ? "opacity-100" : "opacity-0"}`}>
              <div className="w-[160px] h-[160px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                      {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2.5">
                {statusData.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between animate-in fade-in" style={{ animationDelay: `${(i + 3) * 80}ms` }}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-sm text-foreground capitalize">{s.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{s.value} <span className="text-muted-foreground font-normal text-xs">({totalOrders > 0 ? Math.round(s.value / totalOrders * 100) : 0}%)</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top products */}
      {topProducts.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          <div className="flex items-center gap-2 mb-5">
            <Package className="w-4 h-4 text-accent" />
            <h3 className="text-base font-semibold text-foreground">Top Products by Sales</h3>
          </div>
          <div className="space-y-4">
            {topProducts.map((p, i) => {
              const maxSold = topProducts[0]?.sold ?? 1;
              return (
                <div key={p.name} className="animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-foreground font-medium truncate max-w-[200px]">{p.name}</span>
                    <div className="text-right shrink-0 ml-4">
                      <span className="text-foreground font-semibold">${(p.revenueCents / 100).toLocaleString()}</span>
                      <span className="text-muted-foreground text-xs ml-2">{p.sold} sold</span>
                    </div>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${(p.sold / maxSold) * 100}%`, transitionDelay: `${i * 80}ms` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order pipeline status */}
      <div className="bg-card border border-border rounded-xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
        <div className="flex items-center gap-2 mb-5">
          <Clock className="w-4 h-4 text-chart-3" />
          <h3 className="text-base font-semibold text-foreground">Order Pipeline</h3>
          <span className="text-xs text-muted-foreground ml-auto">{totalOrders} total orders</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {["pending", "processing", "shipped", "delivered", "cancelled"].map((status) => {
            const count = statusCounts[status] ?? 0;
            const pct = totalOrders > 0 ? Math.round(count / totalOrders * 100) : 0;
            const icon = { pending: Clock, processing: ShoppingCart, shipped: TrendingUp, delivered: BarChart3, cancelled: XCircle }[status] ?? Clock;
            const Icon = icon;
            return (
              <div key={status} className="rounded-lg bg-secondary/50 border border-border p-3 text-center">
                <Icon className="w-4 h-4 mx-auto mb-2 text-muted-foreground" style={{ color: STATUS_COLORS[status] }} />
                <p className="text-xl font-bold text-foreground">{count}</p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">{status}</p>
                <p className="text-xs text-muted-foreground/60">{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
