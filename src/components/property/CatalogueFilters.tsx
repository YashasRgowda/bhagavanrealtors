"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TRANSACTION_TYPES, CATEGORIES } from "@/lib/property/enums";
import { Search, X } from "lucide-react";

export function CatalogueFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function update(next: Record<string, string | null>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v) p.delete(k);
      else p.set(k, v);
    }
    router.replace(`${pathname}?${p.toString()}`);
  }

  const hasFilters = ["q", "txn", "cat", "locality"].some(k => params.get(k));

  return (
    <div className="rounded-xl border border-border bg-card p-2.5 shadow-2xs">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {/* Search */}
        <div className="relative col-span-2 md:col-span-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
            strokeWidth={1.75}
          />
          <Input
            defaultValue={params.get("q") ?? ""}
            placeholder="Search title, locality, building…"
            className="border-transparent bg-muted pl-9 shadow-none hover:border-border-strong"
            onChange={(e) => update({ q: e.target.value || null })}
          />
        </div>

        <Select
          defaultValue={params.get("txn") ?? ""}
          onChange={(e) => update({ txn: e.target.value || null })}
          className="border-transparent bg-muted shadow-none hover:border-border-strong"
        >
          <option value="">All deals</option>
          {TRANSACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>

        <Select
          defaultValue={params.get("cat") ?? ""}
          onChange={(e) => update({ cat: e.target.value || null })}
          className="border-transparent bg-muted shadow-none hover:border-border-strong"
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>

        <Input
          defaultValue={params.get("locality") ?? ""}
          placeholder="Locality"
          className="border-transparent bg-muted shadow-none hover:border-border-strong"
          onChange={(e) => update({ locality: e.target.value || null })}
        />
      </div>

      {hasFilters && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => router.replace(pathname)}
            className="inline-flex items-center gap-1 rounded-sm px-1.5 py-1 text-[0.6875rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3 w-3" /> Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
