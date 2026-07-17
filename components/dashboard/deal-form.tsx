"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const DEAL_STAGES = ["Lead", "Qualified", "Proposal", "Negotiation"] as const;

export function DealForm({
  open,
  onClose,
  defaultStage,
}: {
  open: boolean;
  onClose: () => void;
  defaultStage?: string;
}) {
  const qc = useQueryClient();
  const [stage, setStage] = useState(defaultStage ?? "Lead");
  const [teamMemberId, setTeamMemberId] = useState<string>("");
  const [error, setError] = useState("");

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", "options"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("team_members").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const createDeal = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const supabase = createClient();
      const { error } = await supabase.from("deals").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Failed to create deal"),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    createDeal.mutate({
      company: fd.get("company") as string,
      contact_name: (fd.get("contact_name") as string) || null,
      contact_email: (fd.get("contact_email") as string) || null,
      value: parseFloat(fd.get("value") as string) || 0,
      probability: parseInt(fd.get("probability") as string, 10) || 20,
      stage,
      status: "pending",
      days_in_stage: 0,
      team_member_id: teamMemberId || null,
      close_date: (fd.get("close_date") as string) || null,
    });
  }

  const inputClass = "bg-secondary border-border focus:border-accent text-foreground placeholder:text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Deal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Company *</label>
            <Input name="company" required placeholder="e.g. Acme Corp" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Contact name</label>
              <Input name="contact_name" placeholder="Jane Smith" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Contact email</label>
              <Input name="contact_email" type="email" placeholder="jane@acme.com" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Value ($) *</label>
              <Input name="value" type="number" min={0} step={0.01} required placeholder="0.00" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Probability (%)</label>
              <Input name="probability" type="number" min={0} max={100} defaultValue={20} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Stage</label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger className="bg-secondary border-border w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Rep</label>
              <Select value={teamMemberId} onValueChange={setTeamMemberId}>
                <SelectTrigger className="bg-secondary border-border w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {(teamMembers ?? []).map((m: { id: string; name: string }) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Expected close date</label>
            <Input name="close_date" type="date" className={inputClass} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={createDeal.isPending}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {createDeal.isPending ? "Creating…" : "Create Deal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
