"use client";

import { useEffect, useState } from "react";
import { Store, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type StorePublic = { id: string; name: string; active: boolean };

const COOKIE = "active_store_id";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function StoreSwitcher() {
  const [stores, setStores] = useState<StorePublic[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((d: { stores?: StorePublic[] }) => {
        const list = d.stores ?? [];
        setStores(list);
        const cookie = readCookie(COOKIE);
        const chosen = (cookie && list.find((s) => s.id === cookie)?.id)
          || list.find((s) => s.active)?.id
          || list[0]?.id
          || null;
        setActiveId(chosen);
      })
      .catch(() => {});
  }, []);

  function select(id: string) {
    if (id === activeId) return;
    document.cookie = `${COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${60 * 60 * 24 * 365}`;
    // Reload so every section re-fetches against the newly selected store
    window.location.reload();
  }

  if (stores.length === 0) return null;

  const active = stores.find((s) => s.id === activeId) ?? stores[0];

  // Single store — show a static label (nothing to switch to)
  if (stores.length === 1) {
    return (
      <div className="hidden md:flex items-center gap-2 px-3 h-9 rounded-lg bg-secondary/60 border border-border text-sm text-foreground">
        <Store className="w-4 h-4 text-accent" />
        <span className="max-w-[140px] truncate">{active.name}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 h-9 rounded-lg bg-secondary/60 border border-border text-sm text-foreground hover:border-accent transition-colors">
          <Store className="w-4 h-4 text-accent" />
          <span className="max-w-[140px] truncate">{active.name}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {stores.map((s) => (
          <DropdownMenuItem key={s.id} onClick={() => select(s.id)} className="flex items-center justify-between">
            <span className="truncate">{s.name}</span>
            {s.id === active.id && <Check className="w-3.5 h-3.5 text-accent shrink-0 ml-2" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
