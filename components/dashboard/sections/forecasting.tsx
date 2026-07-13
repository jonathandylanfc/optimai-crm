"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle2, RefreshCw, ShoppingCart,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts";
import { useForecasting } from "@/lib/hooks/use-forecasting";
import { Skeleton } from "@/components/ui/skeleton";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n}`;
}

export function ForecastingSection() {
  const { data, isLoading, refetch } = useForecasting();

  const chartData = data?.chartData ?? [];
  const quarterlyData = data?.quarterlyData ?? [];
  const risks: { id: number; title: string; description: string; impact: string; severity: string }[] = data?.risks ?? [];
  const kpis = data?.kpis ?? null;

  const scenarios = kpis
    ? [
        { name: "Conservative", probability: 80, revenue: kpis.currentQRevenue * 0.8, color: "oklch(0.65 0.2 25)" },
        { name: "Base Case", probability: 60, revenue: kpis.currentQRevenue, color: "oklch(0.7 0.18 145)" },
        { name: "Optimistic", probability: 35, revenue: kpis.currentQRevenue * 1.3, color: "oklch(0.7 0.18 220)" },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Sales Forecasting</h2>
          <p className="text-sm text-muted-foreground mt-1">Projections based on your actual store sales data</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : [
              {
                label: "Current Quarter",
                value: fmt(kpis?.currentQRevenue ?? 0),
                subtext: `${kpis?.orderCount ?? 0} total orders`,
                icon: Target,
                trend: null,
                trendUp: true,
              },
              {
                label: "Monthly Run Rate",
                value: fmt(kpis?.forecastBase ?? 0),
                subtext: "3-month rolling avg",
                icon: TrendingUp,
                trend: null,
                trendUp: true,
              },
              {
                label: "Forecast Accuracy",
                value: kpis?.forecastAccuracy ? `${kpis.forecastAccuracy}%` : "—",
                subtext: "Historical match rate",
                icon: CheckCircle2,
                trend: null,
                trendUp: true,
              },
              {
                label: "Cancel Rate",
                value: `${kpis?.cancelRate ?? 0}%`,
                subtext: kpis?.cancelRate && kpis.cancelRate > 10 ? "Above 10% threshold" : "Within normal range",
                icon: AlertTriangle,
                trend: null,
                trendUp: !kpis?.cancelRate || kpis.cancelRate <= 10,
              },
            ].map((stat) => (
              <Card key={stat.label} className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-semibold text-foreground mt-1">{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{stat.subtext}</p>
                    </div>
                    <stat.icon className={`w-5 h-5 ${stat.trendUp ? "text-accent" : "text-chart-3"}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Revenue chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Revenue — Actual vs Forecast</CardTitle>
            <div className="hidden sm:flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span className="text-muted-foreground">Actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-chart-1" />
                <span className="text-muted-foreground">Forecast</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                <span className="text-muted-foreground">Target</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : chartData.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-3">
              <ShoppingCart className="w-10 h-10 opacity-30" />
              <p className="text-sm">No order data yet — place your first order to see forecasting</p>
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.7 0.18 145)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.7 0.18 145)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.7 0.18 220)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.7 0.18 220)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.005 260)" />
                  <XAxis dataKey="month" stroke="oklch(0.65 0 0)" fontSize={12} />
                  <YAxis stroke="oklch(0.65 0 0)" fontSize={12} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "oklch(0.12 0.005 260)", border: "1px solid oklch(0.22 0.005 260)", borderRadius: "8px", color: "oklch(0.95 0 0)" }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                  />
                  <Area type="monotone" dataKey="target" stroke="oklch(0.65 0 0)" strokeDasharray="5 5" fill="none" strokeWidth={1} />
                  <Area type="monotone" dataKey="forecast" stroke="oklch(0.7 0.18 220)" fill="url(#forecastGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="actual" stroke="oklch(0.7 0.18 145)" fill="url(#actualGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quarterly breakdown */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Quarterly Breakdown ({new Date().getFullYear()})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : quarterlyData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quarterlyData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.005 260)" />
                    <XAxis dataKey="quarter" stroke="oklch(0.65 0 0)" fontSize={12} />
                    <YAxis stroke="oklch(0.65 0 0)" fontSize={12} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "oklch(0.12 0.005 260)", border: "1px solid oklch(0.22 0.005 260)", borderRadius: "8px", color: "oklch(0.95 0 0)" }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} formatter={(v) => <span style={{ color: "oklch(0.65 0 0)" }}>{v}</span>} />
                    <Bar dataKey="committed" name="Committed" fill="oklch(0.7 0.18 145)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="bestCase" name="Best Case" fill="oklch(0.7 0.18 220)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="projected" name="Projected" fill="oklch(0.22 0.005 260)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scenarios */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Quarter Scenarios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)
              : scenarios.map((s, i) => (
                  <div key={s.name} className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-muted-foreground/30 transition-colors animate-in fade-in slide-in-from-right-2" style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-8 rounded-full" style={{ backgroundColor: s.color }} />
                        <div>
                          <p className="font-medium text-foreground text-sm">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.probability}% probability</p>
                        </div>
                      </div>
                      <p className="text-xl font-semibold text-foreground">{fmt(s.revenue)}</p>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${s.probability}%`, backgroundColor: s.color }} />
                    </div>
                  </div>
                ))}
          </CardContent>
        </Card>
      </div>

      {/* Risk factors */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Risk Factors</CardTitle>
            <Badge variant="outline" className={risks.length > 0 ? "text-chart-3 border-chart-3/30" : "text-accent border-accent/30"}>
              {risks.length > 0 ? (
                <><AlertTriangle className="w-3 h-3 mr-1" />{risks.length} identified</>
              ) : (
                <><CheckCircle2 className="w-3 h-3 mr-1" />All clear</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : risks.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-accent opacity-60" />
              No risk factors detected — your store is performing well.
            </div>
          ) : (
            <div className="space-y-3">
              {risks.map((risk, i) => (
                <div key={risk.id} className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-chart-3/30 transition-colors animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 75}ms` }}>
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${risk.severity === "high" ? "bg-destructive" : "bg-chart-3"}`} />
                      <div>
                        <p className="font-medium text-foreground text-sm">{risk.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{risk.description}</p>
                      </div>
                    </div>
                    <Badge className={risk.severity === "high" ? "bg-destructive/20 text-destructive border-destructive/30 ml-2 shrink-0" : "bg-chart-3/20 text-chart-3 border-chart-3/30 ml-2 shrink-0"}>
                      {risk.impact}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
