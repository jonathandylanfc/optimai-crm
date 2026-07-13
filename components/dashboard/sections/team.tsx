"use client";

import { useState, useEffect, useTransition } from "react";
import { cn } from "@/lib/utils";
import { Trophy, Target, TrendingUp, TrendingDown, Mail, Phone, MoreHorizontal, Plus, Pencil, Trash2, User } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MemberRow {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar?: string | null;
  quota: number;
  rank?: number | null;
  deals?: { id: string; value: number; stage: string }[];
}

interface MemberPayload {
  name: string;
  role: string;
  email: string;
  quota: number;
}

function useTeam() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*, deals(id, value, stage)")
        .order("rank", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as MemberRow[];
    },
  });
}

function useCreateMember() {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async (payload: MemberPayload) => {
      const { error } = await supabase.from("team_members").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });
}

function useUpdateMember() {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<MemberPayload> }) => {
      const { error } = await supabase.from("team_members").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });
}

function useDeleteMember() {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });
}

const EMPTY: MemberPayload = { name: "", role: "", email: "", quota: 0 };

function MemberForm({ open, onClose, editMember }: {
  open: boolean;
  onClose: () => void;
  editMember: MemberRow | null;
}) {
  const [form, setForm] = useState<MemberPayload>(EMPTY);
  const [isPending, start] = useTransition();
  const create = useCreateMember();
  const update = useUpdateMember();

  useEffect(() => {
    if (editMember) {
      setForm({ name: editMember.name, role: editMember.role, email: editMember.email, quota: editMember.quota });
    } else {
      setForm(EMPTY);
    }
  }, [editMember, open]);

  function set(k: keyof MemberPayload, v: string | number) { setForm((p) => ({ ...p, [k]: v })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      if (editMember) {
        await update.mutateAsync({ id: editMember.id, payload: form });
      } else {
        await create.mutateAsync(form);
      }
      onClose();
    });
  }

  const cls = "bg-secondary border-border focus:border-accent";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editMember ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Full Name *</Label>
            <Input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Jane Smith" className={cls} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Role / Title</Label>
            <Input value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="e.g. Sales Manager" className={cls} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@company.com" className={cls} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Monthly Revenue Target ($)</Label>
            <Input
              type="number" min={0} step={100}
              value={form.quota || ""}
              onChange={(e) => set("quota", parseFloat(e.target.value) || 0)}
              placeholder="e.g. 10000" className={cls}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground">
              {isPending ? "Saving…" : editMember ? "Save Changes" : "Add Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MemberCard({ member, index, onEdit, onDelete }: {
  member: MemberRow; index: number; onEdit: () => void; onDelete: () => void;
}) {
  const revenue = (member.deals ?? []).filter((d) => d.stage === "closed_won").reduce((s, d) => s + Number(d.value), 0);
  const dealsCount = (member.deals ?? []).filter((d) => d.stage === "closed_won").length;
  const quotaPercentage = member.quota > 0 ? Math.min((revenue / member.quota) * 100, 200) : 0;
  const isAboveQuota = quotaPercentage >= 100;

  return (
    <div
      className="group bg-card border border-border rounded-xl p-5 hover:border-accent/50 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent/80 to-chart-1 flex items-center justify-center text-sm font-bold text-accent-foreground">
              {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            {(member.rank ?? 99) <= 3 && (
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-warning flex items-center justify-center">
                <Trophy className="w-3 h-3 text-background" />
              </div>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">{member.name}</h4>
            <p className="text-xs text-muted-foreground">{member.role || "—"}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={onEdit}><Pencil className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Revenue Closed</p>
          <p className="text-lg font-bold text-foreground">${(revenue / 1000).toFixed(1)}K</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Deals Won</p>
          <p className="text-lg font-bold text-foreground">{dealsCount}</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Quota Attainment</span>
          <span className={cn("font-medium", isAboveQuota ? "text-accent" : "text-foreground")}>
            {quotaPercentage.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-700", isAboveQuota ? "bg-accent" : "bg-chart-3")}
            style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
          />
        </div>
        {member.quota > 0 && (
          <p className="text-xs text-muted-foreground mt-1">Target: ${member.quota.toLocaleString()}/mo</p>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          {member.email && (
            <a href={`mailto:${member.email}`} className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors">
              <Mail className="w-4 h-4" />
            </a>
          )}
        </div>
        <div className={cn("flex items-center gap-1 text-sm font-medium", isAboveQuota ? "text-accent" : "text-muted-foreground")}>
          {isAboveQuota ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {quotaPercentage.toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

export function TeamSection() {
  const [chartLoaded, setChartLoaded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MemberRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MemberRow | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const { data: rawTeam, isLoading } = useTeam();
  const deleteMember = useDeleteMember();

  useEffect(() => {
    const t = setTimeout(() => setChartLoaded(true), 400);
    return () => clearTimeout(t);
  }, []);

  const team: MemberRow[] = rawTeam ?? [];

  const totalRevenue = team.reduce((acc, m) => acc + (m.deals ?? []).filter((d) => d.stage === "closed_won").reduce((s, d) => s + Number(d.value), 0), 0);
  const totalDeals = team.reduce((acc, m) => acc + (m.deals ?? []).filter((d) => d.stage === "closed_won").length, 0);
  const avgQuota = team.filter((m) => m.quota > 0).length > 0
    ? team.reduce((acc, m) => {
        const rev = (m.deals ?? []).filter((d) => d.stage === "closed_won").reduce((s, d) => s + Number(d.value), 0);
        return acc + (m.quota > 0 ? Math.min((rev / m.quota) * 100, 200) : 0);
      }, 0) / team.filter((m) => m.quota > 0).length
    : 0;

  const performanceData = team.map((m) => {
    const rev = (m.deals ?? []).filter((d) => d.stage === "closed_won").reduce((s, d) => s + Number(d.value), 0);
    return { name: m.name.split(" ")[0], revenue: Math.round(rev / 1000), quota: Math.round(Number(m.quota) / 1000) };
  });

  function openEdit(m: MemberRow) { setEditTarget(m); setFormOpen(true); }
  function openAdd() { setEditTarget(null); setFormOpen(true); }

  function confirmDelete() {
    if (!deleteTarget) return;
    startDelete(async () => {
      await deleteMember.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : [
              { label: "Team Revenue", value: `$${(totalRevenue / 1000).toFixed(1)}K`, icon: Target, color: "text-accent", bg: "bg-accent/10" },
              { label: "Deals Won", value: String(totalDeals), icon: TrendingUp, color: "text-chart-1", bg: "bg-chart-1/10" },
              { label: "Avg Quota Attainment", value: `${avgQuota.toFixed(0)}%`, icon: Trophy, color: "text-success", bg: "bg-success/10" },
            ].map((stat, i) => (
              <div key={stat.label} className="bg-card border border-border rounded-xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            ))}
      </div>

      {/* Chart */}
      {team.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">Revenue vs Target</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Individual performance comparison</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-chart-1" /><span className="text-muted-foreground">Revenue (k)</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" /><span className="text-muted-foreground">Target (k)</span></div>
            </div>
          </div>
          <div className={`h-[250px] transition-opacity duration-700 ${chartLoaded ? "opacity-100" : "opacity-0"}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.005 260)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "oklch(0.65 0 0)", fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "oklch(0.65 0 0)", fontSize: 12 }} tickFormatter={(v) => `$${v}k`} dx={-10} />
                <Tooltip
                  contentStyle={{ backgroundColor: "oklch(0.12 0.005 260)", border: "1px solid oklch(0.22 0.005 260)", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "oklch(0.95 0 0)", fontWeight: 600 }}
                  formatter={(value: number) => [`$${value}k`, ""]}
                />
                <Bar dataKey="quota" fill="oklch(0.65 0 0 / 0.2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenue" fill="oklch(0.7 0.18 220)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Members */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Team Members</h3>
        <Button onClick={openAdd} size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Member
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      ) : team.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
          <User className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">No team members yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1 mb-4">Add your first team member to start tracking performance</p>
          <Button onClick={openAdd} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Member
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {team.map((member, index) => (
            <MemberCard key={member.id} member={member} index={index} onEdit={() => openEdit(member)} onDelete={() => setDeleteTarget(member)} />
          ))}
        </div>
      )}

      <MemberForm open={formOpen} onClose={() => { setFormOpen(false); setEditTarget(null); }} editMember={editTarget} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove them from the team. Their linked deals will remain.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
