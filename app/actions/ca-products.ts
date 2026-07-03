"use server";

const BASE_URL = (process.env.CAR_ACCESSORIES_URL ?? "").replace(/\/$/, "");
const SECRET = process.env.CAR_ACCESSORIES_API_SECRET ?? "";

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SECRET}`,
  };
}

export interface CAProduct {
  id: number;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  imageUrl: string;
  stock: number;
  popular: boolean;
  active: boolean;
  createdAt: string;
}

export interface CAProductPayload {
  name: string;
  description: string;
  category: string;
  priceCents: number;
  imageUrl: string;
  stock: number;
  popular: boolean;
  active: boolean;
}

export async function fetchCAProducts(): Promise<CAProduct[]> {
  const res = await fetch(`${BASE_URL}/api/products`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
  return res.json();
}

export async function createCAProduct(payload: CAProductPayload): Promise<CAProduct> {
  const res = await fetch(`${BASE_URL}/api/products`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create product: ${res.status}`);
  return res.json();
}

export async function updateCAProduct(id: number, payload: Partial<CAProductPayload>): Promise<CAProduct> {
  const res = await fetch(`${BASE_URL}/api/products/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update product: ${res.status}`);
  return res.json();
}

export async function deleteCAProduct(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/products/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to delete product: ${res.status}`);
  }
}
