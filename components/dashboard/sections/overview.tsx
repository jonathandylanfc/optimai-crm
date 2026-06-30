"use client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { RevenueChart } from "@/components/dashboard/charts/revenue-chart";
import { PipelineOverview } from "@/components/dashboard/charts/pipeline-overview";
import { RecentDeals } from "@/components/dashboard/recent-deals";
import { TopPerformers } from "@/components/dashboard/top-performers";
import { DollarSign, TrendingUp, Users, Target } from "lucide-react";
import { useOverviewMetrics } from "@/lib/hooks/use-overview";
import { Skeleton } from "@/components/ui/skeleton";

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export function OverviewSection() {
  const { data, isLoading, isError } = useOverviewMetrics();

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))
        ) : isError ? (
          <p className="col-span-4 text-sm text-destructive">Failed to load metrics.</p>
        ) : (
          <>
            <MetricCard
              title="Total Revenue"
              value={formatCurrency(data?.totalRevenue ?? 0)}
              change="+12.5%"
              changeType="positive"
              icon={DollarSign}
              delay={0}
            />
            <MetricCard
              title="Conversion Rate"
              value={`${data?.conversionRate ?? "0"}%`}
              change="+3.2%"
              changeType="positive"
              icon={TrendingUp}
              delay={1}
            />
            <MetricCard
              title="Active Deals"
              value={String(data?.activeDeals ?? 0)}
              change="-5"
              changeType="negative"
              icon={Target}
              delay={2}
            />
            <MetricCard
              title="New Leads"
              value={String(data?.newLeads ?? 0)}
              change="+18.3%"
              changeType="positive"
              icon={Users}
              delay={3}
            />
          </>
        )}
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
        <TopPerformers isLoading={isLoading} />
      </div>
    </div>
  );
}
