"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, Search, Plus, MapPin, Mail, Phone, DollarSign,
  Calendar, ExternalLink, Star, TrendingUp, TrendingDown, Filter,
} from "lucide-react";
import { useCustomers } from "@/lib/hooks/use-customers";

const tierColors: Record<string, string> = {
  Enterprise: "bg-accent/20 text-accent border-accent/30",
  Growth: "bg-chart-1/20 text-chart-1 border-chart-1/30",
  Starter: "bg-muted text-muted-foreground border-border",
};

function formatLastContact(ts: string | null): string {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  return `${Math.floor(days / 7)} weeks ago`;
}

export function CustomersSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const { data: rawCustomers, isLoading } = useCustomers();

  const customers = (rawCustomers ?? []).map((c: {
    id: string; name: string; industry?: string; tier: string;
    location?: string; contact_name?: string; email?: string; phone?: string;
    health_score?: number; trend?: string; last_contact_at?: string;
    deals?: { id: string; value: number; stage: string }[];
  }) => ({
    id: c.id,
    name: c.name,
    industry: c.industry ?? "—",
    tier: c.tier,
    location: c.location ?? "—",
    contact: c.contact_name ?? "—",
    email: c.email ?? "—",
    phone: c.phone ?? "—",
    totalRevenue: (c.deals ?? []).reduce((s: number, d: { value: number }) => s + Number(d.value), 0),
    activeDeals: (c.deals ?? []).filter((d: { stage: string }) => !["closed_won","closed_lost"].includes(d.stage)).length,
    healthScore: c.health_score ?? 0,
    trend: c.trend ?? "stable",
    lastContact: formatLastContact(c.last_contact_at ?? null),
  }));

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contact.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = !selectedTier || c.tier === selectedTier;
    return matchesSearch && matchesTier;
  });

  const totalRevenue = customers.reduce((acc, c) => acc + c.totalRevenue, 0);
  const avgHealthScore = customers.length
    ? Math.round(customers.reduce((acc, c) => acc + c.healthScore, 0) / customers.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          : [
              { label: "Total Customers", value: customers.length.toString(), icon: Building2, color: "text-foreground" },
              { label: "Total Revenue", value: `$${(totalRevenue / 1000000).toFixed(2)}M`, icon: DollarSign, color: "text-accent" },
              { label: "Avg Health Score", value: `${avgHealthScore}%`, icon: Star, color: "text-chart-3" },
              { label: "Active Deals", value: customers.reduce((acc, c) => acc + c.activeDeals, 0).toString(), icon: TrendingUp, color: "text-chart-1" },
            ].map((stat) => (
              <Card key={stat.label} className="border-border bg-card hover:border-muted-foreground/30 transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className={`text-2xl font-semibold mt-1 ${stat.color}`}>{stat.value}</p>
                    </div>
                    <stat.icon className={`w-8 h-8 ${stat.color} opacity-50`} />
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-[280px] bg-secondary border-border focus:border-accent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {["Enterprise", "Growth", "Starter"].map((tier) => (
              <Button
                key={tier}
                variant={selectedTier === tier ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTier(selectedTier === tier ? null : tier)}
                className={selectedTier === tier ? "bg-accent text-accent-foreground" : ""}
              >
                {tier}
              </Button>
            ))}
          </div>
        </div>
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)
          : filteredCustomers.map((customer, index) => (
              <Card
                key={customer.id}
                className="border-border bg-card hover:border-accent/50 transition-all duration-300 group animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12 bg-secondary">
                        <AvatarFallback className="bg-secondary text-foreground font-semibold">
                          {customer.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">
                          {customer.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{customer.industry}</p>
                      </div>
                    </div>
                    <Badge className={`${tierColors[customer.tier] ?? tierColors.Starter} border`}>
                      {customer.tier}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        {customer.location}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        {customer.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        {customer.phone}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Revenue</span>
                        <span className="font-medium text-foreground">${customer.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Active Deals</span>
                        <span className="font-medium text-foreground">{customer.activeDeals}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Last Contact</span>
                        <span className="font-medium text-foreground">{customer.lastContact}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Health Score</span>
                      {customer.trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-accent" />}
                      {customer.trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-destructive" />}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{
                            width: `${customer.healthScore}%`,
                            backgroundColor:
                              customer.healthScore >= 80
                                ? "oklch(0.7 0.18 145)"
                                : customer.healthScore >= 60
                                ? "oklch(0.75 0.18 55)"
                                : "oklch(0.65 0.2 25)",
                          }}
                        />
                      </div>
                      <span className={`text-sm font-semibold ${
                        customer.healthScore >= 80 ? "text-accent" : customer.healthScore >= 60 ? "text-chart-3" : "text-destructive"
                      }`}>
                        {customer.healthScore}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      <Calendar className="w-3.5 h-3.5 mr-1.5" />
                      Schedule
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      <Mail className="w-3.5 h-3.5 mr-1.5" />
                      Email
                    </Button>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
