"use server";

import { activeStore } from "@/lib/stores";

async function conn() {
  const store = await activeStore();
  if (!store) throw new Error("No store connected. Add one in Settings → Connected Stores.");
  return {
    baseUrl: store.baseUrl,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${store.secret}` },
  };
}

export interface CAVariant {
  id: number;
  name: string;
  priceCents: number | null;
  stock: number;
  imageUrl: string | null;
  sortOrder: number;
}

export interface CAVariantPayload {
  name: string;
  priceCents: number | null;
  stock: number;
  imageUrl: string | null;
}

export interface CAProduct {
  id: number;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  imageUrl: string;
  images: string[];
  stock: number;
  popular: boolean;
  active: boolean;
  createdAt: string;
  variants: CAVariant[];
}

export interface CAProductPayload {
  name: string;
  description: string;
  category: string;
  priceCents: number;
  imageUrl: string;
  images: string[];
  stock: number;
  popular: boolean;
  active: boolean;
  variants: CAVariantPayload[];
}

export async function fetchCAProducts(): Promise<CAProduct[]> {
  const { baseUrl, headers } = await conn();
  const res = await fetch(`${baseUrl}/api/products`, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
  return res.json();
}

export async function createCAProduct(payload: CAProductPayload): Promise<CAProduct> {
  const { baseUrl, headers } = await conn();
  const res = await fetch(`${baseUrl}/api/products`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create product: ${res.status}`);
  return res.json();
}

export async function updateCAProduct(id: number, payload: Partial<CAProductPayload>): Promise<CAProduct> {
  const { baseUrl, headers } = await conn();
  const res = await fetch(`${baseUrl}/api/products/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update product: ${res.status}`);
  return res.json();
}

export async function deleteCAProduct(id: number): Promise<void> {
  const { baseUrl, headers } = await conn();
  const res = await fetch(`${baseUrl}/api/products/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to delete product: ${res.status}`);
  }
}
