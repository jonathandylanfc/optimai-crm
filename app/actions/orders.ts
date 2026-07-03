"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type OrderStatus = "pending" | "processing" | "fulfilled" | "cancelled";

export interface OrderPayload {
  title: string;
  customer_name?: string;
  customer_id?: string;
  status: OrderStatus;
  value: number;
  notes?: string;
}

export async function createOrder(payload: OrderPayload) {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data;
}

export async function updateOrder(id: string, payload: Partial<OrderPayload>) {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data;
}

export async function deleteOrder(id: string) {
  const supabase = getServiceClient();
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
