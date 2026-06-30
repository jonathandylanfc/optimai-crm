"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateCustomer, useUpdateCustomer, type CustomerPayload } from "@/lib/hooks/use-customers";
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
};

export function CustomerForm({ open, onClose, editCustomer }: CustomerFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const create = useCreateCustomer();
  const update = useUpdateCustomer();

  const isEdit = !!editCustomer;
  const isPending = create.isPending || update.isPending;

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
    };

    if (isEdit && editCustomer) {
      await update.mutateAsync({ id: editCustomer.id, payload });
    } else {
      await create.mutateAsync(payload);
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[560px] bg-card border-border">
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
