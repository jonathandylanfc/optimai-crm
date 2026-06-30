"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Trophy, Target, TrendingUp, TrendingDown, Mail, Phone, MoreHorizontal } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useTeam } from "@/lib/hooks/use-team";
import { Skeleton } from "@/components/ui/skeleton";

interface MemberRow {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar?: string | null;
  quota: number;
  rank?: number | null;
  deals?: { id: string; value: number; stage: string }[];
}

function TeamMemberCard({ member, index }: { member: MemberRow; index: number }) {
  const revenue = (member.deals ?? []).reduce((s, d) => s + Number(d.value), 0);
  const dealsCount = (member.deals ?? []).length;
  const quotaPercentage = member.quota > 0 ? (revenue / member.quota) * 100 : 0;
  const isAboveQuota = quotaPercentage >= 100;

  return (
    <div
      className="group bg-card border border-border rounded-xl p-5 hover:border-accent/50 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent/80 to-chart-1 flex items-center justify-center text-sm font-bold text-accent-foreground">
              {member.avatar ?? member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            {(member.rank ?? 99) <= 3 && (
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-warning flex items-center justify-center">
                <Trophy className="w-3 h-3 text-background" />
              </div>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">{member.name}</h4>
            <p className="text-xs text-muted-foreground">{member.role}</p>
          </div>
        </div>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary opacity-0 group-hover:opacity-100 transition-all duration-200">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Revenue</p>
          <p className="text-lg font-bold text-foreground">${(revenue / 1000).toFixed(0)}k</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Deals Closed</p>
          <p className="text-lg font-bold text-foreground">{dealsCount}</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Quota Attainment</span>
          <span className={cn("font-medium", isAboveQuota ? "text-success" : "text-foreground")}>
            {quotaPercentage.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-700", isAboveQuota ? "bg-success" : "bg-accent")}
            style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors">
            <Mail className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors">
            <Phone className="w-4 h-4" />
          </button>
        </div>
        <div className={cn("flex items-center gap-1 text-sm font-medium", isAboveQuota ? "text-success" : "text-destructive")}>
          {isAboveQuota ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {quotaPercentage.toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

export function TeamSection() {
  const [chartLoaded, setChartLoaded] = useState(false);
  const { data: rawTeam, isLoading } = useTeam();

  useEffect(() => {
    const timer = setTimeout(() => setChartLoaded(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const team: MemberRow[] = rawTeam ?? [];

  const totalRevenue = team.reduce((acc, m) => acc + (m.deals ?? []).reduce((s, d) => s + Number(d.value), 0), 0);
  const totalDeals = team.reduce((acc, m) => acc + (m.deals ?? []).length, 0);
  const avgQuota = team.length
    ? team.reduce((acc, m) => {
        const rev = (m.deals ?? []).reduce((s, d) => s + Number(d.value), 0);
        return acc + (m.quota > 0 ? (rev / m.quota) * 100 : 0);
      }, 0) / team.length
    : 0;

  const performanceData = team.map((m) => {
    const rev = (m.deals ?? []).reduce((s, d) => s + Number(d.value), 0);
    return { name: m.name.split(" ")[0], revenue: Math.round(rev / 1000), quota: Math.round(Number(m.quota) / 1000) };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : [
              { label: "Team Revenue", value: `$${(totalRevenue / 1000000).toFixed(2)}M`, icon: Target, color: "text-accent", bg: "bg-accent/10" },
              { label: "Total Deals", value: String(totalDeals), icon: TrendingUp, color: "text-chart-1", bg: "bg-chart-1/10" },
              { label: "Avg Quota Attainment", value: `${avgQuota.toFixed(0)}%`, icon: Trophy, color: "text-success", bg: "bg-success/10" },
            ].map((stat, i) => (
              <div key={stat.label} className={`bg-card border border-border rounded-xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-500`} style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-foreground">Revenue vs Quota</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Individual performance comparison</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-chart-1" />
              <span className="text-muted-foreground">Revenue (k)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
              <span className="text-muted-foreground">Quota (k)</span>
            </div>
          </div>
        </div>
        {isLoading
          ? <Skeleton className="h-[250px] w-full" />
          : (
            <div className={`h-[250px] transition-opacity duration-700 ${chartLoaded ? "opacity-100" : "opacity-0"}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.005 260)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "oklch(0.65 0 0)", fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "oklch(0.65 0 0)", fontSize: 12 }} tickFormatter={(v) => `$${v}k`} dx={-10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "oklch(0.12 0.005 260)", border: "1px solid oklch(0.22 0.005 260)", borderRadius: "8px", fontSize: "12px" }}
                    labelStyle={{ color: "oklch(0.95 0 0)", fontWeight: 600 }}
                    itemStyle={{ color: "oklch(0.65 0 0)" }}
                    formatter={(value: number) => [`$${value}k`, ""]}
                  />
                  <Bar dataKey="quota" fill="oklch(0.65 0 0 / 0.2)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" fill="oklch(0.7 0.18 220)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-4">Team Members</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)
            : team.map((member, index) => (
                <TeamMemberCard key={member.id} member={member} index={index} />
              ))}
        </div>
      </div>
    </div>
  );
}
