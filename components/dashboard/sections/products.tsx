"use client";

import { useState, useTransition, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package, Search, Plus, DollarSign, Tag, Eye, EyeOff,
  Star, Pencil, Trash2, MoreHorizontal, Upload, ImageIcon, X,
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
import {
  useCAProducts,
  useCreateCAProduct,
  useUpdateCAProduct,
  useDeleteCAProduct,
} from "@/lib/hooks/use-ca-products";
import type { CAProduct, CAProductPayload } from "@/app/actions/ca-products";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "v4h2yok3";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "OPTIMAI";

async function uploadToCloudinary(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data.secure_url as string;
}

function ImageUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError("");
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleFile(file);
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Product Image</label>
      {value ? (
        <div className="relative group w-full h-40 rounded-lg overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Product" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onChange("")}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="w-full h-40 rounded-lg border-2 border-dashed border-border hover:border-accent/50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer bg-secondary/30 hover:bg-secondary/50"
        >
          {uploading ? (
            <>
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading…</p>
            </>
          ) : (
            <>
              <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Drop an image or click to upload</p>
            </>
          )}
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function ProductForm({
  open,
  onClose,
  editProduct,
}: {
  open: boolean;
  onClose: () => void;
  editProduct: CAProduct | null;
}) {
  const createProduct = useCreateCAProduct();
  const updateProduct = useUpdateCAProduct();
  const [imageUrl, setImageUrl] = useState(editProduct?.imageUrl ?? "");
  const [isPending, startTransition] = useTransition();
  const isEditing = !!editProduct;

  // Reset image when dialog opens with a different product
  const prevIdRef = useRef<number | null>(null);
  const currentId = editProduct?.id ?? null;
  if (currentId !== prevIdRef.current) {
    prevIdRef.current = currentId;
    if (imageUrl !== (editProduct?.imageUrl ?? "")) {
      setImageUrl(editProduct?.imageUrl ?? "");
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const priceDollars = parseFloat(fd.get("price") as string) || 0;
    const payload: CAProductPayload = {
      name: fd.get("name") as string,
      description: fd.get("description") as string,
      category: fd.get("category") as string,
      priceCents: Math.round(priceDollars * 100),
      imageUrl,
      stock: parseInt(fd.get("stock") as string, 10) || 0,
      popular: fd.get("popular") === "on",
      active: fd.get("active") === "on",
    };
    startTransition(async () => {
      if (isEditing) {
        await updateProduct.mutateAsync({ id: editProduct.id, payload });
      } else {
        await createProduct.mutateAsync(payload);
      }
      onClose();
    });
  }

  const inputClass = "bg-secondary border-border focus:border-accent text-foreground placeholder:text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Product" : "New Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <ImageUploader value={imageUrl} onChange={setImageUrl} />

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Name *</label>
            <Input name="name" required defaultValue={editProduct?.name} placeholder="e.g. LED Interior Kit" className={inputClass} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Description *</label>
            <textarea
              name="description"
              required
              rows={3}
              defaultValue={editProduct?.description}
              placeholder="Describe the product…"
              className="w-full rounded-md border px-3 py-2 text-sm bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Category *</label>
              <Input name="category" required defaultValue={editProduct?.category} placeholder="e.g. Lighting" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Price ($) *</label>
              <Input
                name="price"
                type="number"
                min={0.01}
                step={0.01}
                required
                defaultValue={editProduct ? (editProduct.priceCents / 100).toFixed(2) : ""}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Stock</label>
              <Input name="stock" type="number" min={0} defaultValue={editProduct?.stock ?? 0} className={inputClass} />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" name="popular" defaultChecked={editProduct?.popular} className="w-4 h-4 accent-accent" />
              <span className="text-muted-foreground">Featured / Popular</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" name="active" defaultChecked={editProduct?.active ?? true} className="w-4 h-4 accent-accent" />
              <span className="text-muted-foreground">Visible on storefront</span>
            </label>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={isPending || !imageUrl}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {isPending ? "Saving…" : isEditing ? "Save Changes" : "Add Product"}
            </Button>
          </div>
          {!imageUrl && (
            <p className="text-xs text-muted-foreground text-center -mt-2">Upload a photo before saving</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProductsSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CAProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CAProduct | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const { data: products, isLoading, error } = useCAProducts();
  const deleteProduct = useDeleteCAProduct();
  const [isDeleting, startDeleteTransition] = useTransition();

  const filtered = (products ?? []).filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalProducts = (products ?? []).length;
  const activeCount = (products ?? []).filter((p) => p.active).length;
  const popularCount = (products ?? []).filter((p) => p.popular).length;
  const totalValue = (products ?? []).reduce((s, p) => s + p.priceCents * p.stock, 0);

  function openAdd() { setEditTarget(null); setFormOpen(true); }
  function openEdit(p: CAProduct) { setEditTarget(p); setFormOpen(true); }

  function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteError("");
    startDeleteTransition(async () => {
      try {
        await deleteProduct.mutateAsync(deleteTarget.id);
        setDeleteTarget(null);
      } catch (e) {
        setDeleteError(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <Package className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-muted-foreground font-medium">Could not connect to the car accessories store</p>
        <p className="text-sm text-destructive/80 max-w-sm font-mono bg-secondary px-3 py-1.5 rounded">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
        <p className="text-sm text-muted-foreground/60 max-w-sm">
          Make sure <code className="bg-secondary px-1 rounded">CAR_ACCESSORIES_URL</code>,{" "}
          <code className="bg-secondary px-1 rounded">CAR_ACCESSORIES_API_SECRET</code>, and{" "}
          <code className="bg-secondary px-1 rounded">INTERNAL_API_SECRET</code> (on the car accessories app) are all set and matching.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          : [
              { label: "Total Products", value: totalProducts.toString(), icon: Package, color: "text-foreground" },
              { label: "Live on Store", value: activeCount.toString(), icon: Eye, color: "text-accent" },
              { label: "Featured", value: popularCount.toString(), icon: Star, color: "text-chart-3" },
              { label: "Inventory Value", value: `$${(totalValue / 100).toLocaleString()}`, icon: DollarSign, color: "text-chart-1" },
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

      {/* Search + add */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-[280px] bg-secondary border-border focus:border-accent"
          />
        </div>
        <Button onClick={openAdd} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Product grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Package className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">No products found</p>
          <Button onClick={openAdd} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="w-4 h-4 mr-1.5" />
            Add your first product
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product, index) => (
            <Card
              key={product.id}
              className="border-border bg-card hover:border-accent/50 transition-all duration-300 group overflow-hidden animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Image */}
              <div className="relative h-40 bg-secondary overflow-hidden">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                )}
                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {product.popular && (
                    <Badge className="bg-chart-3/90 text-white border-0 text-xs">
                      <Star className="w-3 h-3 mr-1" />Featured
                    </Badge>
                  )}
                  {!product.active && (
                    <Badge className="bg-background/90 text-muted-foreground border-border text-xs">
                      <EyeOff className="w-3 h-3 mr-1" />Hidden
                    </Badge>
                  )}
                </div>
                {/* Actions overlay */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-background/80 text-foreground hover:bg-background">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={() => openEdit(product)}>
                        <Pencil className="w-3.5 h-3.5 mr-2" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => { setDeleteError(""); setDeleteTarget(product); }}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Info */}
              <CardContent className="p-3">
                <p className="font-medium text-foreground truncate text-sm">{product.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Tag className="w-3 h-3" />{product.category}
                  </span>
                  <span className="text-sm font-semibold text-accent">
                    ${(product.priceCents / 100).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Stock: {product.stock}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProductForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        editProduct={editTarget}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setDeleteError(""); } }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be permanently removed from the storefront.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-destructive px-1">{deleteError}</p>}
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
