"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface CustomerPayload {
  name: string;
  industry?: string;
  tier: "Enterprise" | "Growth" | "Starter";
  location?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  health_score?: number;
  trend?: "up" | "down" | "stable";
  contract_value?: number;
  contract_length_months?: number;
  payment_date?: string;
}

export async function createCustomer(payload: CustomerPayload) {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("customers")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data;
}

export async function updateCustomer(id: string, payload: Partial<CustomerPayload>) {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("customers")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data;
}

export async function deleteCustomer(id: string) {
  const supabase = getServiceClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
