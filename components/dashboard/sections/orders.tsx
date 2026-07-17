"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart, Search, DollarSign, Clock, CheckCircle2,
  XCircle, MoreHorizontal, Filter, Truck, PackageCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type StoreStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
type CrmStatus = "pending" | "processing" | "fulfilled" | "cancelled";

const STATUS_MAP: Record<StoreStatus, CrmStatus> = {
  pending: "pending",
  processing: "processing",
  shipped: "processing",
  delivered: "fulfilled",
  cancelled: "cancelled",
};

const STATUS_COLORS: Record<CrmStatus, string> = {
  pending: "bg-chart-3/20 text-chart-3 border-chart-3/30",
  processing: "bg-accent/20 text-accent border-accent/30",
  fulfilled: "bg-chart-1/20 text-chart-1 border-chart-1/30",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

const STATUS_ICONS: Record<CrmStatus, React.ElementType> = {
  pending: Clock,
  processing: ShoppingCart,
  fulfilled: CheckCircle2,
  cancelled: XCircle,
};

type StoreOrder = {
  id: number;
  customerName: string;
  customerEmail: string;
  status: StoreStatus;
  totalCents: number;
  shippingAddress: string;
  trackingNumber: string | null;
  createdAt: string;
  items: { productName: string; quantity: number; priceCents: number }[];
};

type DisplayOrder = StoreOrder & { crmStatus: CrmStatus };

async function fetchOrders(): Promise<StoreOrder[]> {
  const res = await fetch("/api/ca-orders");
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

export function OrdersSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<CrmStatus | null>(null);
  const [cancelTarget, setCancelTarget] = useState<DisplayOrder | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [shipTarget, setShipTarget] = useState<DisplayOrder | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");

  const { data: raw, isLoading, refetch } = useQuery({
    queryKey: ["ca-orders"],
    queryFn: fetchOrders,
    refetchInterval: 60_000,
  });

  const orders: DisplayOrder[] = (raw ?? []).map((o) => ({
    ...o,
    crmStatus: STATUS_MAP[o.status] ?? "pending",
  }));

  const filtered = orders.filter((o) => {
    const matchesSearch =
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(o.id).includes(searchQuery);
    const matchesStatus = !selectedStatus || o.crmStatus === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = orders.filter((o) => o.crmStatus !== "cancelled").reduce((s, o) => s + o.totalCents, 0);
  const pendingCount = orders.filter((o) => o.crmStatus === "pending").length;
  const fulfilledCount = orders.filter((o) => o.crmStatus === "fulfilled").length;
  const fulfillmentRate = orders.length ? Math.round((fulfilledCount / orders.length) * 100) : 0;

  async function updateStoreOrder(storeOrderId: number, payload: { status?: StoreStatus; trackingNumber?: string | null }) {
    setIsUpdating(true);
    setUpdateError("");
    try {
      const res = await fetch("/api/orders/update-store-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeOrderId, ...payload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUpdateError(data.error ?? "Update failed");
        return false;
      }
      await refetch();
      return true;
    } catch {
      setUpdateError("Network error");
      return false;
    } finally {
      setIsUpdating(false);
    }
  }

  async function confirmShip() {
    if (!shipTarget) return;
    const ok = await updateStoreOrder(shipTarget.id, {
      status: "shipped",
      trackingNumber: trackingInput.trim() || null,
    });
    if (ok) {
      setShipTarget(null);
      setTrackingInput("");
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      await fetch("/api/orders/cancel-store-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeOrderId: cancelTarget.id }),
      });
      await refetch();
    } finally {
      setIsCancelling(false);
      setCancelTarget(null);
    }
  }

  const crmStatuses: CrmStatus[] = ["pending", "processing", "fulfilled", "cancelled"];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          : [
              { label: "Total Orders", value: orders.length.toString(), icon: ShoppingCart, color: "text-foreground" },
              { label: "Revenue", value: `$${(totalRevenue / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, color: "text-accent" },
              { label: "Pending", value: pendingCount.toString(), icon: Clock, color: "text-chart-3" },
              { label: "Fulfillment Rate", value: `${fulfillmentRate}%`, icon: CheckCircle2, color: "text-chart-1" },
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
              placeholder="Search orders…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-[280px] bg-secondary border-border focus:border-accent"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {crmStatuses.map((s) => (
              <Button
                key={s}
                variant={selectedStatus === s ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus(selectedStatus === s ? null : s)}
                className={selectedStatus === s ? "bg-accent text-accent-foreground capitalize" : "capitalize"}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders table */}
      <Card className="border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Value</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td colSpan={6} className="px-4 py-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ShoppingCart className="w-10 h-10 text-muted-foreground/30" />
                      <p className="text-muted-foreground font-medium">No orders found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((order, index) => {
                  const StatusIcon = STATUS_ICONS[order.crmStatus];
                  const itemSummary = order.items
                    .map((it) => `${it.quantity}× ${it.productName}`)
                    .join(", ");
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors group animate-in fade-in slide-in-from-bottom-1"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">Order #{order.id}</p>
                          {itemSummary && (
                            <p className="text-xs text-muted-foreground truncate max-w-[240px] mt-0.5">{itemSummary}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-foreground">{order.customerName}</p>
                          <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        ${(order.totalCents / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${STATUS_COLORS[order.crmStatus]} border flex items-center gap-1 w-fit capitalize`}>
                          <StatusIcon className="w-3 h-3" />
                          {order.status === "shipped" ? "shipped" : order.crmStatus}
                        </Badge>
                        {order.trackingNumber && (
                          <p className="text-[10px] font-mono text-muted-foreground mt-1">{order.trackingNumber}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {order.crmStatus !== "cancelled" && order.status !== "delivered" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {(order.status === "pending" || order.status === "processing") && (
                                <DropdownMenuItem
                                  onClick={() => { setTrackingInput(order.trackingNumber ?? ""); setUpdateError(""); setShipTarget(order); }}
                                >
                                  <Truck className="w-3.5 h-3.5 mr-2" />
                                  Mark Shipped…
                                </DropdownMenuItem>
                              )}
                              {order.status === "shipped" && (
                                <DropdownMenuItem
                                  onClick={() => updateStoreOrder(order.id, { status: "delivered" })}
                                  disabled={isUpdating}
                                >
                                  <PackageCheck className="w-3.5 h-3.5 mr-2" />
                                  Mark Delivered
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-chart-3 focus:text-chart-3"
                                onClick={() => setCancelTarget(order)}
                              >
                                <XCircle className="w-3.5 h-3.5 mr-2" />
                                Cancel Order
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!shipTarget} onOpenChange={(o) => { if (!o) { setShipTarget(null); setTrackingInput(""); setUpdateError(""); } }}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark order #{shipTarget?.id} as shipped</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              {shipTarget?.customerName} will receive a shipping notification email
              {trackingInput.trim() ? " with the tracking number below" : ""}.
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Tracking number <span className="text-xs text-muted-foreground/60">(optional)</span></label>
              <Input
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                placeholder="e.g. 9400 1000 0000 0000 0000 00"
                className="bg-secondary border-border focus:border-accent font-mono"
              />
            </div>
            {updateError && <p className="text-sm text-destructive">{updateError}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setShipTarget(null); setTrackingInput(""); }} disabled={isUpdating}>
                Back
              </Button>
              <Button
                onClick={confirmShip}
                disabled={isUpdating}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Truck className="w-4 h-4 mr-2" />
                {isUpdating ? "Updating…" : "Mark Shipped"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) setCancelTarget(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription>
              Order #{cancelTarget?.id} for {cancelTarget?.customerName} will be marked as cancelled and the customer will receive a cancellation email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              disabled={isCancelling}
              className="bg-chart-3/90 text-white hover:bg-chart-3"
            >
              {isCancelling ? "Cancelling…" : "Cancel Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
