"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart, Search, Plus, DollarSign, Clock, CheckCircle2,
  XCircle, Pencil, Trash2, MoreHorizontal, Filter,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOrders, useCreateOrder, useUpdateOrder, useDeleteOrder } from "@/lib/hooks/use-orders";
import type { OrderStatus, OrderPayload } from "@/app/actions/orders";

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-chart-3/20 text-chart-3 border-chart-3/30",
  processing: "bg-accent/20 text-accent border-accent/30",
  fulfilled: "bg-chart-1/20 text-chart-1 border-chart-1/30",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

const STATUS_ICONS: Record<OrderStatus, React.ElementType> = {
  pending: Clock,
  processing: ShoppingCart,
  fulfilled: CheckCircle2,
  cancelled: XCircle,
};

type MappedOrder = {
  id: string;
  title: string;
  customer_name: string;
  status: OrderStatus;
  value: number;
  notes: string;
  created_at: string;
};

function OrderForm({
  open,
  onClose,
  editOrder,
}: {
  open: boolean;
  onClose: () => void;
  editOrder: MappedOrder | null;
}) {
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const [isPending, startTransition] = useTransition();

  const isEditing = !!editOrder;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: OrderPayload = {
      title: fd.get("title") as string,
      customer_name: (fd.get("customer_name") as string) || undefined,
      status: fd.get("status") as OrderStatus,
      value: Number(fd.get("value")) || 0,
      notes: (fd.get("notes") as string) || undefined,
    };

    startTransition(async () => {
      if (isEditing) {
        await updateOrder.mutateAsync({ id: editOrder.id, payload });
      } else {
        await createOrder.mutateAsync(payload);
      }
      onClose();
    });
  }

  const inputClass =
    "bg-secondary border-border focus:border-accent text-foreground placeholder:text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Order" : "New Order"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Order Title *</label>
            <Input
              name="title"
              required
              defaultValue={editOrder?.title}
              placeholder="e.g. Q3 Media Buy — Acme Corp"
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Customer</label>
            <Input
              name="customer_name"
              defaultValue={editOrder?.customer_name}
              placeholder="Client name"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Value ($)</label>
              <Input
                name="value"
                type="number"
                min={0}
                step={0.01}
                defaultValue={editOrder?.value}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <select
                name="status"
                defaultValue={editOrder?.status ?? "pending"}
                className="w-full h-9 rounded-md border px-3 text-sm bg-secondary border-border text-foreground focus:outline-none focus:border-accent"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Notes</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={editOrder?.notes}
              placeholder="Optional notes…"
              className="w-full rounded-md border px-3 py-2 text-sm bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {isPending ? "Saving…" : isEditing ? "Save Changes" : "Create Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function OrdersSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MappedOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MappedOrder | null>(null);

  const { data: rawOrders, isLoading } = useOrders();
  const deleteOrder = useDeleteOrder();
  const [isDeleting, startDeleteTransition] = useTransition();

  const orders: MappedOrder[] = (rawOrders ?? []).map((o: {
    id: string; title: string; customer_name?: string; status: string;
    value?: number; notes?: string; created_at: string;
  }) => ({
    id: o.id,
    title: o.title,
    customer_name: o.customer_name ?? "—",
    status: (o.status as OrderStatus) ?? "pending",
    value: Number(o.value ?? 0),
    notes: o.notes ?? "",
    created_at: o.created_at,
  }));

  const filtered = orders.filter((o) => {
    const matchesSearch =
      o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !selectedStatus || o.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.value, 0);
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const fulfilledCount = orders.filter((o) => o.status === "fulfilled").length;
  const fulfillmentRate = orders.length ? Math.round((fulfilledCount / orders.length) * 100) : 0;

  function openAdd() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(o: MappedOrder) {
    setEditTarget(o);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startDeleteTransition(async () => {
      await deleteOrder.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    });
  }

  const statuses: OrderStatus[] = ["pending", "processing", "fulfilled", "cancelled"];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          : [
              { label: "Total Orders", value: orders.length.toString(), icon: ShoppingCart, color: "text-foreground" },
              { label: "Revenue", value: `$${(totalRevenue / 1000).toFixed(1)}K`, icon: DollarSign, color: "text-accent" },
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
              className="pl-10 w-[280px] bg-secondary border-border focus:border-accent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {statuses.map((s) => (
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
        <Button onClick={openAdd} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="w-4 h-4 mr-2" />
          New Order
        </Button>
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
                      <p className="text-muted-foreground font-medium">No orders yet</p>
                      <Button onClick={openAdd} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                        <Plus className="w-4 h-4 mr-1.5" />
                        Create your first order
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((order, index) => {
                  const StatusIcon = STATUS_ICONS[order.status];
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors group animate-in fade-in slide-in-from-bottom-1"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">{order.title}</p>
                          {order.notes && (
                            <p className="text-xs text-muted-foreground truncate max-w-[240px] mt-0.5">{order.notes}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{order.customer_name}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        ${order.value.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${STATUS_COLORS[order.status]} border flex items-center gap-1 w-fit capitalize`}>
                          <StatusIcon className="w-3 h-3" />
                          {order.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(order.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary opacity-0 group-hover:opacity-100 transition-all duration-200">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem onClick={() => openEdit(order)}>
                              <Pencil className="w-3.5 h-3.5 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(order)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <OrderForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        editOrder={editTarget}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete order?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
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
