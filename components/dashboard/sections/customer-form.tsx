"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCustomer, updateCustomer, type CustomerPayload } from "@/app/actions/customers";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface CustomerFormProps {
  open: boolean;
  onClose: () => void;
  editCustomer?: {
    id: string;
    name: string;
    industry: string;
    tier: string;
    location: string;
    contact: string;
    email: string;
    phone: string;
    healthScore: number;
    trend: string;
    contractValue: number;
    contractLengthMonths: number | null;
    paymentDate: string | null;
  } | null;
}

type Tier = "Enterprise" | "Growth" | "Starter";
type Trend = "up" | "down" | "stable";

interface FormState {
  name: string;
  industry: string;
  tier: Tier;
  location: string;
  contact_name: string;
  email: string;
  phone: string;
  health_score: number;
  trend: Trend;
  contract_value: string;
  contract_length_months: string;
  payment_date: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  industry: "",
  tier: "Starter",
  location: "",
  contact_name: "",
  email: "",
  phone: "",
  health_score: 80,
  trend: "stable",
  contract_value: "",
  contract_length_months: "",
  payment_date: "",
};

export function CustomerForm({ open, onClose, editCustomer }: CustomerFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();
  const qc = useQueryClient();
  const isEdit = !!editCustomer;

  useEffect(() => {
    if (editCustomer) {
      setForm({
        name: editCustomer.name,
        industry: editCustomer.industry === "—" ? "" : editCustomer.industry,
        tier: editCustomer.tier as Tier,
        location: editCustomer.location === "—" ? "" : editCustomer.location,
        contact_name: editCustomer.contact === "—" ? "" : editCustomer.contact,
        email: editCustomer.email === "—" ? "" : editCustomer.email,
        phone: editCustomer.phone === "—" ? "" : editCustomer.phone,
        health_score: editCustomer.healthScore,
        trend: editCustomer.trend as Trend,
        contract_value: editCustomer.contractValue > 0 ? String(editCustomer.contractValue) : "",
        contract_length_months: editCustomer.contractLengthMonths != null ? String(editCustomer.contractLengthMonths) : "",
        payment_date: editCustomer.paymentDate ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editCustomer, open]);

  function set(field: keyof FormState, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: CustomerPayload = {
      name: form.name.trim(),
      industry: form.industry.trim() || undefined,
      tier: form.tier,
      location: form.location.trim() || undefined,
      contact_name: form.contact_name.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      health_score: form.health_score,
      trend: form.trend,
      contract_value: form.contract_value ? parseFloat(form.contract_value) : undefined,
      contract_length_months: form.contract_length_months ? parseInt(form.contract_length_months) : undefined,
      payment_date: form.payment_date || undefined,
    };

    startTransition(async () => {
      if (isEdit && editCustomer) {
        await updateCustomer(editCustomer.id, payload);
      } else {
        await createCustomer(payload);
      }
      await qc.refetchQueries({ queryKey: ["customers"] });
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[580px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isEdit ? "Edit Client" : "Add New Client"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Company info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm text-muted-foreground">Company Name *</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Acme Auto Group"
                className="bg-secondary border-border focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Industry</Label>
              <Input
                value={form.industry}
                onChange={(e) => set("industry", e.target.value)}
                placeholder="e.g. Automotive"
                className="bg-secondary border-border focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Location</Label>
              <Input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="e.g. Miami, FL"
                className="bg-secondary border-border focus:border-accent"
              />
            </div>
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Contact Name</Label>
              <Input
                value={form.contact_name}
                onChange={(e) => set("contact_name", e.target.value)}
                placeholder="e.g. John Smith"
                className="bg-secondary border-border focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="john@company.com"
                className="bg-secondary border-border focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="bg-secondary border-border focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Account Tier</Label>
              <Select value={form.tier} onValueChange={(v) => set("tier", v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                  <SelectItem value="Growth">Growth</SelectItem>
                  <SelectItem value="Starter">Starter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contract details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Contract</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Contract Value</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={form.contract_value}
                    onChange={(e) => set("contract_value", e.target.value)}
                    placeholder="5,000"
                    className="pl-7 bg-secondary border-border focus:border-accent"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Length (months)</Label>
                <Select
                  value={form.contract_length_months}
                  onValueChange={(v) => set("contract_length_months", v)}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 month</SelectItem>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                    <SelectItem value="24">24 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Payment Date</Label>
                <Input
                  type="date"
                  value={form.payment_date}
                  onChange={(e) => set("payment_date", e.target.value)}
                  className="bg-secondary border-border focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Health & Trend */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">
                Health Score <span className="text-xs">({form.health_score}%)</span>
              </Label>
              <input
                type="range"
                min={0}
                max={100}
                value={form.health_score}
                onChange={(e) => set("health_score", parseInt(e.target.value))}
                className="w-full accent-accent"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Account Trend</Label>
              <Select value={form.trend} onValueChange={(v) => set("trend", v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="up">↑ Growing</SelectItem>
                  <SelectItem value="stable">→ Stable</SelectItem>
                  <SelectItem value="down">↓ Declining</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90 min-w-[100px]" disabled={isPending}>
              {isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
              ) : isEdit ? "Save Changes" : "Add Client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
