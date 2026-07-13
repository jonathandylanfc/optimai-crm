"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, Search, Plus, MapPin, Mail, Phone, DollarSign,
  Calendar, ExternalLink, Star, TrendingUp, TrendingDown, Filter,
  Pencil, Trash2, MoreHorizontal, FileText, Clock, ShoppingCart,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCustomers } from "@/lib/hooks/use-customers";
import { useQuery } from "@tanstack/react-query";
import { deleteCustomer as deleteCustomerAction } from "@/app/actions/customers";
import { useQueryClient } from "@tanstack/react-query";
import { CustomerForm } from "./customer-form";

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-chart-3/20 text-chart-3 border-chart-3/30",
  processing: "bg-accent/20 text-accent border-accent/30",
  fulfilled: "bg-chart-1/20 text-chart-1 border-chart-1/30",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

function CustomerStoreOrders({ email }: { email: string }) {
  const { data: allOrders, isLoading } = useQuery({
    queryKey: ["ca-orders"],
    queryFn: () => fetch("/api/ca-orders").then((r) => r.json()),
    staleTime: 60_000,
  });

  if (isLoading) return <Skeleton className="h-12 w-full mt-3" />;

  const orders = (allOrders ?? []).filter(
    (o: { customerEmail: string }) => o.customerEmail?.toLowerCase() === email.toLowerCase()
  ).slice(0, 5);

  if (orders.length === 0) return (
    <p className="text-xs text-muted-foreground mt-3 text-center py-2">No store purchases yet.</p>
  );

  const STATUS_MAP: Record<string, string> = { shipped: "processing", delivered: "fulfilled" };

  return (
    <div className="mt-3 space-y-1.5">
      {orders.map((o: { id: number; status: string; totalCents: number; items: { productName: string; quantity: number }[]; createdAt: string }) => {
        const displayStatus = STATUS_MAP[o.status] ?? o.status;
        const summary = o.items?.slice(0, 2).map((it: { productName: string; quantity: number }) => `${it.quantity}× ${it.productName}`).join(", ") || `Order #${o.id}`;
        return (
          <div key={o.id} className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-border last:border-0">
            <span className="text-foreground truncate max-w-[160px]">{summary}</span>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={`${ORDER_STATUS_COLORS[displayStatus] ?? "bg-secondary"} border text-[10px] py-0 px-1.5 capitalize`}>{displayStatus}</Badge>
              <span className="text-muted-foreground font-medium">${(o.totalCents / 100).toFixed(2)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

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

type MappedCustomer = {
  id: string;
  name: string;
  industry: string;
  tier: string;
  location: string;
  contact: string;
  email: string;
  phone: string;
  totalRevenue: number;
  activeDeals: number;
  healthScore: number;
  trend: string;
  lastContact: string;
  contractValue: number;
  contractLengthMonths: number | null;
  paymentDate: string | null;
};

export function CustomersSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MappedCustomer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MappedCustomer | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<string | null>(null);

  const { data: rawCustomers, isLoading } = useCustomers();
  const qc = useQueryClient();
  const [isDeleting, startDeleteTransition] = useTransition();

  const customers: MappedCustomer[] = (rawCustomers ?? []).map((c: {
    id: string; name: string; industry?: string; tier: string;
    location?: string; contact_name?: string; email?: string; phone?: string;
    health_score?: number; trend?: string; last_contact_at?: string;
    contract_value?: number; contract_length_months?: number | null; payment_date?: string | null;
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
    totalRevenue: (c.deals ?? []).reduce((s, d) => s + Number(d.value), 0),
    activeDeals: (c.deals ?? []).filter((d) => !["closed_won", "closed_lost"].includes(d.stage)).length,
    healthScore: c.health_score ?? 0,
    trend: c.trend ?? "stable",
    lastContact: formatLastContact(c.last_contact_at ?? null),
    contractValue: Number(c.contract_value ?? 0),
    contractLengthMonths: c.contract_length_months ?? null,
    paymentDate: c.payment_date ?? null,
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

  function openAdd() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(c: MappedCustomer) {
    setEditTarget(c);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startDeleteTransition(async () => {
      await deleteCustomerAction(deleteTarget.id);
      await qc.refetchQueries({ queryKey: ["customers"] });
      setDeleteTarget(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          : [
              { label: "Total Clients", value: customers.length.toString(), icon: Building2, color: "text-foreground" },
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

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-[280px] bg-secondary border-border focus:border-accent"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
        <Button onClick={openAdd} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Client cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)
          : filteredCustomers.length === 0
          ? (
            <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">No clients yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1 mb-4">Add your first advertising client to get started</p>
              <Button onClick={openAdd} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </div>
          )
          : filteredCustomers.map((customer, index) => (
              <Card
                key={customer.id}
                className="border-border bg-card hover:border-accent/50 transition-all duration-300 group animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <CardContent className="p-5">
                  {/* Header */}
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
                    <div className="flex items-center gap-2">
                      <Badge className={`${tierColors[customer.tier] ?? tierColors.Starter} border`}>
                        {customer.tier}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => openEdit(customer)}>
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(customer)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{customer.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{customer.phone}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
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

                  {/* Contract info */}
                  {(customer.contractValue > 0 || customer.contractLengthMonths || customer.paymentDate) && (
                    <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-secondary/50 border border-border">
                      {customer.contractValue > 0 && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span className="font-semibold text-foreground">${customer.contractValue.toLocaleString()}</span>
                        </div>
                      )}
                      {customer.contractLengthMonths && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>{customer.contractLengthMonths}mo</span>
                        </div>
                      )}
                      {customer.paymentDate && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground ml-auto">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>{new Date(customer.paymentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Health score */}
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

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      <Calendar className="w-3.5 h-3.5 mr-1.5" />
                      Schedule
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      <Mail className="w-3.5 h-3.5 mr-1.5" />
                      Email
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedOrders(expandedOrders === customer.id ? null : customer.id)}
                      title="Store orders"
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(customer)}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Store orders panel */}
                  {expandedOrders === customer.id && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Store Orders</p>
                      <CustomerStoreOrders email={customer.email} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Add / Edit form */}
      <CustomerForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        editCustomer={editTarget}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this client and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
