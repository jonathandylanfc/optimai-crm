"use client";

import { useState, useTransition, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package, Search, Plus, DollarSign, Tag, Eye, EyeOff,
  Star, Pencil, Trash2, MoreHorizontal, Upload, ImageIcon, X, Sparkles, Scissors, Crop as CropIcon, Copy, ChevronLeft, ChevronRight,
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
import type { CAProduct, CAProductPayload, CAVariantPayload } from "@/app/actions/ca-products";

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

type CropRect = { x: number; y: number; w: number; h: number };

function CropModal({
  src,
  busy,
  onCancel,
  onConfirm,
}: {
  src: string;
  busy: "remove-bg" | "enhance" | "studio" | null;
  onCancel: () => void;
  onConfirm: (mode: "remove-bg" | "enhance", crop: CropRect) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  // Selection box in pixels, relative to the rendered image
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [drawing, setDrawing] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  function relative(e: React.MouseEvent) {
    const img = imgRef.current;
    if (!img) return { x: 0, y: 0 };
    const b = img.getBoundingClientRect();
    return {
      x: Math.min(Math.max(e.clientX - b.left, 0), b.width),
      y: Math.min(Math.max(e.clientY - b.top, 0), b.height),
    };
  }

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const p = relative(e);
    startRef.current = p;
    setDrawing(true);
    setBox({ x: p.x, y: p.y, w: 0, h: 0 });
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!drawing || !startRef.current) return;
    const p = relative(e);
    const s = startRef.current;
    setBox({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
  }
  function onMouseUp() {
    setDrawing(false);
  }

  function confirm(mode: "remove-bg" | "enhance") {
    const img = imgRef.current;
    if (!img || !box || box.w < 6 || box.h < 6) {
      // No usable selection — process the whole image
      onConfirm(mode, { x: 0, y: 0, w: 1, h: 1 });
      return;
    }
    const b = img.getBoundingClientRect();
    onConfirm(mode, {
      x: box.x / b.width,
      y: box.y / b.height,
      w: box.w / b.width,
      h: box.h / b.height,
    });
  }

  const hasSelection = !!box && box.w >= 6 && box.h >= 6;

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onCancel(); }}>
      <DialogContent className="bg-card border-border sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Select the item to keep</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-1">
          Drag a box around the one item you want. Everything outside the box is discarded before the background is removed.
        </p>
        <div className="relative select-none overflow-hidden rounded-lg border border-border bg-secondary/40 flex items-center justify-center" style={{ maxHeight: "55vh" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            className="max-h-[55vh] w-auto object-contain cursor-crosshair"
          />
          {box && (
            <div
              className="pointer-events-none absolute border-2 border-accent bg-accent/10"
              style={{ left: box.x, top: box.y, width: box.w, height: box.h,
                // offset by the image's position within the flex container
                transform: `translate(${(imgRef.current?.offsetLeft ?? 0)}px, ${(imgRef.current?.offsetTop ?? 0)}px)` }}
            />
          )}
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => setBox(null)}
            disabled={!box || !!busy}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            Reset selection
          </button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} disabled={!!busy}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => confirm("remove-bg")}
              disabled={!!busy}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Scissors className="w-3.5 h-3.5 mr-1.5" />
              {busy === "remove-bg" ? "Processing…" : hasSelection ? "Remove BG from selection" : "Remove BG (whole image)"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MultiImageUploader({
  images,
  coverUrl,
  onImagesChange,
  onCoverChange,
  label = "Product Photos",
}: {
  images: string[];
  coverUrl: string;
  onImagesChange: (urls: string[]) => void;
  onCoverChange: (url: string) => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [processing, setProcessing] = useState<"remove-bg" | "enhance" | "studio" | null>(null);
  const [aiError, setAiError] = useState("");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    setUploadError("");
    setUploading(true);
    try {
      const uploads = await Promise.all(
        Array.from(files)
          .filter((f) => f.type.startsWith("image/"))
          .map((f) => uploadToCloudinary(f))
      );
      const next = [...images, ...uploads];
      onImagesChange(next);
      if (!coverUrl && next.length > 0) onCoverChange(next[0]);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function addUrlDirectly() {
    const url = urlInput.trim();
    if (!url) return;
    const next = images.includes(url) ? images : [...images, url];
    onImagesChange(next);
    onCoverChange(url);
    setUrlInput("");
  }

  async function runAi(mode: "remove-bg" | "enhance", crop?: { x: number; y: number; w: number; h: number }) {
    const source = urlInput.trim() || coverUrl.trim();
    if (!source) return;
    try {
      const parsed = new URL(source);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch {
      setAiError("Please enter a full image URL starting with https://");
      return;
    }
    setProcessing(mode);
    setAiError("");
    try {
      const res = await fetch("/api/store/remove-bg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: source, mode, ...(crop ? { crop } : {}) }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setAiError(data.error ?? "Unknown error");
      } else {
        const url = data.url;
        const next = images.includes(url) ? images : [url, ...images];
        onImagesChange(next);
        onCoverChange(url);
        setUrlInput("");
        setCropSrc(null);
      }
    } catch {
      setAiError("Request failed");
    } finally {
      setProcessing(null);
    }
  }

  function openCrop() {
    const source = urlInput.trim() || coverUrl.trim();
    if (!source) return;
    try {
      const parsed = new URL(source);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch {
      setAiError("Please enter a full image URL starting with https://");
      return;
    }
    setAiError("");
    setCropSrc(source);
  }

  async function runStudio() {
    const source = urlInput.trim() || coverUrl.trim();
    if (!source) return;
    try {
      const parsed = new URL(source);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch {
      setAiError("Please enter a full image URL starting with https://");
      return;
    }
    setProcessing("studio");
    setAiError("");
    try {
      const res = await fetch("/api/store/ai-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: source }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setAiError(data.error ?? "Unknown error");
      } else {
        const url = data.url;
        // Add as a NEW image but don't overwrite the cover — you review it first
        const next = images.includes(url) ? images : [url, ...images];
        onImagesChange(next);
        onCoverChange(url);
        setUrlInput("");
      }
    } catch {
      setAiError("Request failed");
    } finally {
      setProcessing(null);
    }
  }

  function removeImage(url: string) {
    const next = images.filter((u) => u !== url);
    onImagesChange(next);
    if (coverUrl === url) onCoverChange(next[0] ?? "");
  }

  // Reorder photos within the list. The first photo is treated as the cover
  // wherever cover follows order (variants), and reordering is handy for the
  // product gallery too.
  function moveImage(from: number, to: number) {
    if (to < 0 || to >= images.length || from === to) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onImagesChange(next);
  }

  const allImages = images.length > 0 ? images : coverUrl ? [coverUrl] : [];
  const aiBusy = processing !== null;
  const hasAiSource = !!(urlInput.trim() || coverUrl.trim());

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>

      {/* URL input row — always visible at top */}
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrlDirectly(); } }}
            placeholder="Paste image URL (e.g. from Amazon)…"
            className="flex-1 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={addUrlDirectly}
            disabled={!urlInput.trim()}
            className="shrink-0 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-40 transition-colors"
          >
            Add
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => runAi("remove-bg")}
            disabled={aiBusy || !hasAiSource}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary disabled:opacity-40"
          >
            <Scissors className="w-3.5 h-3.5" />
            {processing === "remove-bg" ? "Processing…" : "Remove Background"}
          </button>
          <button
            type="button"
            onClick={() => runAi("enhance")}
            disabled={aiBusy || !hasAiSource}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition hover:bg-accent/90 disabled:opacity-40"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {processing === "enhance" ? "Processing…" : "Enhance for Selling"}
          </button>
          <button
            type="button"
            onClick={openCrop}
            disabled={aiBusy || !hasAiSource}
            title="Pick one item from a photo with several, then remove its background"
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary disabled:opacity-40"
          >
            <CropIcon className="w-3.5 h-3.5" />
            Crop & Remove
          </button>
          <button
            type="button"
            onClick={runStudio}
            disabled={aiBusy || !hasAiSource}
            title="Generative AI: reshoot the product on a clean studio background with better lighting. Review before saving."
            className="flex items-center gap-1.5 rounded-md border border-chart-3/40 bg-chart-3/10 px-3 py-1.5 text-xs font-medium text-chart-3 transition hover:bg-chart-3/20 disabled:opacity-40"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {processing === "studio" ? "Generating…" : "AI Studio Shot"}
          </button>
        </div>
        {processing === "studio" && (
          <p className="text-[11px] text-muted-foreground/60">Generative AI reshoot — this can take 10–20 s. Review the result before saving; it may subtly alter the product.</p>
        )}
        {aiBusy && (
          <p className="text-[11px] text-muted-foreground/60">Takes ~15–30 s on first use while the AI model loads…</p>
        )}
        {aiError && <p className="text-xs text-destructive">{aiError}</p>}
      </div>

      {cropSrc && (
        <CropModal
          src={cropSrc}
          busy={processing}
          onCancel={() => setCropSrc(null)}
          onConfirm={(mode, crop) => runAi(mode, crop)}
        />
      )}

      {/* Photo grid */}
      {allImages.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {allImages.map((url, idx) => {
            const isCover = url === coverUrl;
            const canReorder = images.length > 1 && idx < images.length;
            return (
              <div
                key={url}
                className={`relative group aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                  isCover ? "border-accent" : "border-transparent hover:border-accent/40"
                }`}
                onClick={() => onCoverChange(url)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                {isCover && (
                  <span className="absolute bottom-1 left-1 text-[10px] font-semibold bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeImage(url); }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                >
                  <X className="w-3 h-3" />
                </button>
                {canReorder && (
                  <div className="absolute inset-x-0 bottom-0 flex justify-between px-1 pb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      title="Move earlier"
                      disabled={idx === 0}
                      onClick={(e) => { e.stopPropagation(); moveImage(idx, idx - 1); }}
                      className="w-5 h-5 rounded bg-black/60 text-white flex items-center justify-center hover:bg-black/80 disabled:opacity-0"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Move later"
                      disabled={idx === images.length - 1}
                      onClick={(e) => { e.stopPropagation(); moveImage(idx, idx + 1); }}
                      className="w-5 h-5 rounded bg-black/60 text-white flex items-center justify-center hover:bg-black/80 disabled:opacity-0"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files); }}
            onDragOver={(e) => e.preventDefault()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-accent/50 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground bg-secondary/30 hover:bg-secondary/50 disabled:opacity-50"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span className="text-[10px] font-medium">Upload or drop</span>
              </>
            )}
          </button>
        </div>
      )}

      {allImages.length === 0 && (
        <div
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-accent/50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer bg-secondary/30 hover:bg-secondary/50"
        >
          {uploading ? (
            <>
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading…</p>
            </>
          ) : (
            <>
              <ImageIcon className="w-7 h-7 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Drop files or click to upload</p>
            </>
          )}
        </div>
      )}

      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

type SizeGroup = { size: string; rows: CAVariantPayload[] };

function blankRow(size: string, color: string | null): CAVariantPayload {
  return { name: size, color, priceCents: null, stock: 50, imageUrl: null, images: [] };
}

// Group the flat variant list by size (name), preserving order.
function groupBySize(variants: CAVariantPayload[]): SizeGroup[] {
  const order: string[] = [];
  const map = new Map<string, CAVariantPayload[]>();
  for (const v of variants) {
    if (!map.has(v.name)) { map.set(v.name, []); order.push(v.name); }
    map.get(v.name)!.push(v);
  }
  return order.map((size) => ({ size, rows: map.get(size)! }));
}

function VariantsEditor({
  variants,
  onChange,
}: {
  variants: CAVariantPayload[];
  onChange: (v: CAVariantPayload[]) => void;
}) {
  const groups = groupBySize(variants);

  // Flatten groups back to the variant list the rest of the app expects,
  // stamping each row's name with its group's size.
  function commit(next: SizeGroup[]) {
    // Drop any empty image URLs so a blank/broken entry can never stick as a
    // "black" cover photo.
    onChange(next.flatMap((g) => g.rows.map((r) => ({ ...r, name: g.size, images: r.images.filter(Boolean) }))));
  }

  const renameSize = (gi: number, size: string) =>
    commit(groups.map((g, i) => (i === gi ? { ...g, size } : g)));
  const removeSize = (gi: number) => commit(groups.filter((_, i) => i !== gi));
  const addSize = () => commit([...groups, { size: "", rows: [blankRow("", null)] }]);
  const addColor = (gi: number) =>
    commit(groups.map((g, i) => (i === gi ? { ...g, rows: [...g.rows, blankRow(g.size, "")] } : g)));
  const updateRow = (gi: number, ri: number, field: keyof CAVariantPayload, value: string | number | null | string[]) =>
    commit(groups.map((g, i) => (i === gi ? { ...g, rows: g.rows.map((r, j) => (j === ri ? { ...r, [field]: value } : r)) } : g)));
  const removeRow = (gi: number, ri: number) =>
    commit(
      groups
        .map((g, i) => (i === gi ? { ...g, rows: g.rows.filter((_, j) => j !== ri) } : g))
        .filter((g) => g.rows.length > 0)
    );
  const duplicateRow = (gi: number, ri: number) =>
    commit(
      groups.map((g, i) => {
        if (i !== gi) return g;
        const r = g.rows[ri];
        const copy: CAVariantPayload = { ...r, images: [...r.images] };
        return { ...g, rows: [...g.rows.slice(0, ri + 1), copy, ...g.rows.slice(ri + 1)] };
      })
    );

  const inputBase =
    "rounded-md border border-border bg-secondary px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground">
          Sizes &amp; colors <span className="text-xs text-muted-foreground/60">(one card per size)</span>
        </label>
        <button type="button" onClick={addSize} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium">
          <Plus className="w-3.5 h-3.5" /> Add size
        </button>
      </div>

      {groups.length === 0 && (
        <p className="text-xs text-muted-foreground/50 italic">No variants — product has a single price and stock.</p>
      )}

      {groups.map((g, gi) => (
        <div key={gi} className="rounded-lg border border-border p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={g.size}
              onChange={(e) => renameSize(gi, e.target.value)}
              placeholder="Size (e.g. Medium — 2 Compartments)"
              className={`flex-1 font-medium ${inputBase}`}
            />
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {g.rows.length} {g.rows.length === 1 ? "variant" : "colors"}
            </span>
            <button
              type="button"
              onClick={() => removeSize(gi)}
              title="Remove this size (and its colors)"
              className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {g.rows.map((r, ri) => (
            <div key={ri} className="rounded-md border border-border/60 bg-secondary/20 p-2 space-y-1.5">
              <div className="grid grid-cols-[1fr_84px_64px_auto] gap-1.5 items-center">
                <input
                  type="text"
                  value={r.color ?? ""}
                  onChange={(e) => updateRow(gi, ri, "color", e.target.value || null)}
                  placeholder="Color (e.g. Black) — leave blank for none"
                  className={inputBase}
                />
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={r.priceCents !== null ? (r.priceCents / 100).toFixed(2) : ""}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateRow(gi, ri, "priceCents", isNaN(val) ? null : Math.round(val * 100));
                  }}
                  placeholder="Price"
                  className={inputBase}
                />
                <input
                  type="number"
                  min={0}
                  value={r.stock}
                  onChange={(e) => updateRow(gi, ri, "stock", parseInt(e.target.value, 10) || 0)}
                  placeholder="Stock"
                  className={inputBase}
                />
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => duplicateRow(gi, ri)}
                    title="Duplicate this color (keeps its photos)"
                    className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(gi, ri)}
                    title="Remove this color"
                    className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <MultiImageUploader
                label="Photos (first = cover; drag arrows to reorder)"
                images={r.images}
                coverUrl={r.images[0] ?? ""}
                onImagesChange={(imgs) => updateRow(gi, ri, "images", imgs.filter(Boolean))}
                onCoverChange={(url) => {
                  if (!url) return; // never let an empty cover re-add a blank photo
                  updateRow(gi, ri, "images", [url, ...r.images.filter((u) => u && u !== url)]);
                }}
              />
            </div>
          ))}

          <button type="button" onClick={() => addColor(gi)} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium">
            <Plus className="w-3 h-3" /> Add color to this size
          </button>
        </div>
      ))}

      {groups.length > 0 && (
        <p className="text-[10px] text-muted-foreground/50">
          Each <strong>size</strong> is a card; add <strong>colors</strong> inside it, each with its own price, stock, and photos (first photo = cover). The storefront shows a size picker, then a color picker. Leave a color&apos;s price blank to use the product&apos;s base price.
        </p>
      )}
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
  const [images, setImages] = useState<string[]>(editProduct?.images ?? []);
  const [variants, setVariants] = useState<CAVariantPayload[]>(
    editProduct?.variants?.map((v) => ({ name: v.name, color: v.color, priceCents: v.priceCents, stock: v.stock, imageUrl: v.imageUrl, images: (v.images ?? []).filter(Boolean) })) ?? []
  );
  const [isPending, startTransition] = useTransition();
  const isEditing = !!editProduct;

  // Reset state when dialog opens with a different product
  const prevIdRef = useRef<number | null>(null);
  const currentId = editProduct?.id ?? null;
  if (currentId !== prevIdRef.current) {
    prevIdRef.current = currentId;
    if (imageUrl !== (editProduct?.imageUrl ?? "")) {
      setImageUrl(editProduct?.imageUrl ?? "");
    }
    const nextImages = editProduct?.images ?? [];
    if (JSON.stringify(images) !== JSON.stringify(nextImages)) {
      setImages(nextImages);
    }
    const nextVariants = editProduct?.variants?.map((v) => ({ name: v.name, color: v.color, priceCents: v.priceCents, stock: v.stock, imageUrl: v.imageUrl, images: (v.images ?? []).filter(Boolean) })) ?? [];
    if (JSON.stringify(variants) !== JSON.stringify(nextVariants)) {
      setVariants(nextVariants);
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
      images,
      stock: parseInt(fd.get("stock") as string, 10) || 0,
      popular: fd.get("popular") === "on",
      active: fd.get("active") === "on",
      // Keep each variant's cover thumbnail in sync with its first photo.
      variants: variants.map((v) => ({ ...v, imageUrl: v.images[0] ?? v.imageUrl ?? null })),
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
      <DialogContent className="bg-card border-border sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Product" : "New Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <MultiImageUploader
            images={images}
            coverUrl={imageUrl}
            onImagesChange={setImages}
            onCoverChange={setImageUrl}
          />

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

          <VariantsEditor variants={variants} onChange={setVariants} />

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
  const [activeCategory, setActiveCategory] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CAProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CAProduct | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const { data: products, isLoading, error } = useCAProducts();
  const deleteProduct = useDeleteCAProduct();
  const updateProduct = useUpdateCAProduct();
  const [isDeleting, startDeleteTransition] = useTransition();

  const categories = ["All", ...Array.from(new Set((products ?? []).map((p) => p.category))).sort()];

  const filtered = (products ?? []).filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

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
          Check the store connection in <span className="text-foreground">Settings → Connected Stores</span> — the selected store must be reachable and its API secret must match.
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

      {/* Category tabs */}
      {!isLoading && categories.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((cat) => {
            const count = cat === "All"
              ? (products ?? []).length
              : (products ?? []).filter((p) => p.category === cat).length;
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-1.5 ${
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
              >
                {cat}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? "bg-accent-foreground/20 text-accent-foreground" : "bg-border text-muted-foreground"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

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
                {/* Actions — always visible */}
                <div className="absolute top-2 right-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-background/80 text-foreground hover:bg-background">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => openEdit(product)}>
                        <Pencil className="w-3.5 h-3.5 mr-2" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateProduct.mutate({ id: product.id, payload: { active: !product.active } })}>
                        {product.active
                          ? <><EyeOff className="w-3.5 h-3.5 mr-2" />Hide</>
                          : <><Eye className="w-3.5 h-3.5 mr-2" />Publish</>}
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
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">Stock: {product.stock}</p>
                  {(product.variants?.length ?? 0) > 0 && (
                    <span className="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                      {product.variants.length} variants
                    </span>
                  )}
                </div>
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
