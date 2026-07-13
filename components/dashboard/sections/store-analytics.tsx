"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ProductsSection } from "@/components/dashboard/sections/products";
import {
  DollarSign,
  ShoppingCart,
  Star,
  Package,
  AlertTriangle,
  TrendingUp,
  Tag,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type AnalyticsData = {
  totalRevenueCents: number;
  orderCount: number;
  revenueThisMonthCents: number;
  ordersThisMonthCount: number;
  ordersByStatus: Record<string, number>;
  topProducts: { id: number; name: string; imageUrl: string; sold: number; revenueCents: number }[];
  recentOrders: { id: number; customerName: string; status: string; totalCents: number; createdAt: string }[];
  reviewCount: number;
  averageRating: number | null;
  recentReviews: { id: number; rating: number; body: string; createdAt: string; productName: string }[];
  discountCodesIssued: number;
  discountCodesUsed: number;
  lowStock: { id: number; name: string; stock: number }[];
};

function formatDollars(cents: number) {
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}K`;
  return `$${dollars.toFixed(2)}`;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-chart-3/20 text-chart-3 border-chart-3/30",
  processing: "bg-accent/20 text-accent border-accent/30",
  shipped: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  delivered: "bg-chart-1/20 text-chart-1 border-chart-1/30",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  pending: Clock,
  processing: ShoppingCart,
  shipped: Package,
  delivered: CheckCircle2,
  cancelled: XCircle,
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
  delay,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
  delay?: number;
}) {
  return (
    <Card
      className="border-border bg-card hover:border-muted-foreground/30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${(delay ?? 0) * 80}ms`, animationFillMode: "both" }}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-2xl font-semibold mt-1 ${iconColor}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <Icon className={`w-8 h-8 ${iconColor} opacity-40`} />
        </div>
      </CardContent>
    </Card>
  );
}

type StoreTab = "overview" | "products" | "reviews";

export function StoreAnalyticsSection() {
  const [tab, setTab] = useState<StoreTab>("overview");

  return (
    <div className="space-y-4">
      <SubTabs active={tab} onChange={setTab} />
      {tab === "overview" && <StoreOverview />}
      {tab === "products" && <ProductsSection />}
      {tab === "reviews" && <ReviewsSection />}
    </div>
  );
}

function SubTabs({ active, onChange }: { active: StoreTab; onChange: (t: StoreTab) => void }) {
  const tabs: { key: StoreTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "products", label: "Products" },
    { key: "reviews", label: "Reviews" },
  ];
  return (
    <div className="flex gap-1 border-b border-border pb-0">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
            active === key
              ? "border-accent text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ReviewsSection() {
  const { data, isLoading, isError } = useQuery<AnalyticsData>({
    queryKey: ["ca-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/ca-analytics");
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
  });

  const stars = (rating: number) => "★".repeat(rating) + "☆".repeat(5 - rating);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Customer Reviews</h2>
        <p className="text-sm text-muted-foreground mt-1">Recent reviews from the storefront</p>
      </div>

      {isError && (
        <p className="text-sm text-destructive">Could not load review data.</p>
      )}

      <div className="grid grid-cols-1 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : (data?.recentReviews ?? []).length === 0
          ? <p className="text-sm text-muted-foreground py-8 text-center">No reviews yet.</p>
          : (data?.recentReviews ?? []).map((review) => (
              <Card key={review.id} className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground mb-1">{review.productName}</p>
                      <p className="text-amber-400 text-sm mb-2">{stars(review.rating)}</p>
                      {review.body && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{review.body}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {!isLoading && (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <Star className="w-8 h-8 text-chart-3 opacity-60 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-foreground">
              {data?.averageRating ? data.averageRating.toFixed(1) : "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              avg rating across {data?.reviewCount ?? 0} reviews
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StoreOverview() {
  const qc = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState<{ id: number; customerName: string } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const { data, isLoading, isError } = useQuery<AnalyticsData>({
    queryKey: ["ca-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/ca-analytics");
      if (!res.ok) throw new Error(`Failed to fetch analytics: ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
  });

  async function confirmCancel() {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      await fetch("/api/orders/cancel-store-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeOrderId: cancelTarget.id }),
      });
      await qc.invalidateQueries({ queryKey: ["ca-analytics"] });
    } finally {
      setIsCancelling(false);
      setCancelTarget(null);
    }
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
        <AlertTriangle className="w-10 h-10 opacity-40" />
        <p className="font-medium">Could not load store data.</p>
        <p className="text-sm">Check that CAR_ACCESSORIES_URL and CAR_ACCESSORIES_API_SECRET are set.</p>
      </div>
    );
  }

  const skeletonCards = Array.from({ length: 4 }).map((_, i) => (
    <Skeleton key={i} className="h-24 rounded-xl" />
  ));

  const stars = data?.averageRating
    ? "★".repeat(Math.round(data.averageRating)) + "☆".repeat(5 - Math.round(data.averageRating))
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Store Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">Live data from the car accessories storefront</p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? skeletonCards
          : [
              {
                label: "Total Revenue",
                value: formatDollars(data!.totalRevenueCents),
                sub: `${formatDollars(data!.revenueThisMonthCents)} this month`,
                icon: DollarSign,
                iconColor: "text-accent",
              },
              {
                label: "Total Orders",
                value: data!.orderCount.toLocaleString(),
                sub: `${data!.ordersThisMonthCount} this month`,
                icon: ShoppingCart,
                iconColor: "text-foreground",
              },
              {
                label: "Avg Rating",
                value: data!.averageRating ? `${data!.averageRating.toFixed(1)} / 5` : "No reviews",
                sub: data!.reviewCount ? `${data!.reviewCount} reviews` : undefined,
                icon: Star,
                iconColor: "text-chart-3",
              },
              {
                label: "Discount Codes",
                value: `${data!.discountCodesUsed} / ${data!.discountCodesIssued}`,
                sub: "used / issued",
                icon: Tag,
                iconColor: "text-chart-1",
              },
            ].map((stat, i) => (
              <StatCard key={stat.label} {...stat} delay={i} />
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by status */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(data!.ordersByStatus).map(([status, count]) => {
                  const Icon = STATUS_ICONS[status] ?? ShoppingCart;
                  const colorClass = STATUS_COLORS[status] ?? "bg-muted/20 text-muted-foreground border-muted/30";
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <Badge className={`${colorClass} border flex items-center gap-1.5 capitalize`}>
                        <Icon className="w-3 h-3" />
                        {status}
                      </Badge>
                      <span className="text-sm font-semibold text-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top products */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : data!.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No sales data yet.</p>
            ) : (
              <div className="space-y-3">
                {data!.topProducts.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sold} units · {formatDollars(p.revenueCents)}</p>
                    </div>
                    <TrendingUp className="w-4 h-4 text-chart-1 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : data!.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Customer</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Total</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Date</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {data!.recentOrders.map((order) => {
                    const Icon = STATUS_ICONS[order.status] ?? ShoppingCart;
                    const colorClass = STATUS_COLORS[order.status] ?? "bg-muted/20 text-muted-foreground border-muted/30";
                    return (
                      <tr key={order.id} className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors group">
                        <td className="px-4 py-3 font-medium text-foreground">{order.customerName}</td>
                        <td className="px-4 py-3">
                          <Badge className={`${colorClass} border flex items-center gap-1 w-fit capitalize text-xs`}>
                            <Icon className="w-3 h-3" />
                            {order.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">{formatDollars(order.totalCents)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          {order.status !== "cancelled" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setCancelTarget({ id: order.id, customerName: order.customerName })}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) setCancelTarget(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription>
              Order for {cancelTarget?.customerName} will be cancelled and they will receive a cancellation email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? "Cancelling…" : "Cancel Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Review stats + Low stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Customer Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-foreground">
                    {data!.averageRating ? data!.averageRating.toFixed(1) : "—"}
                  </span>
                  {stars && (
                    <span className="text-amber-400 text-lg">{stars}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{data!.reviewCount} total reviews</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-chart-3" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : data!.lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">All products well stocked.</p>
            ) : (
              <div className="space-y-2">
                {data!.lowStock.map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <p className="text-sm text-foreground truncate max-w-[200px]">{p.name}</p>
                    <Badge
                      className={
                        p.stock === 0
                          ? "bg-destructive/20 text-destructive border-destructive/30 border"
                          : "bg-chart-3/20 text-chart-3 border-chart-3/30 border"
                      }
                    >
                      {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
