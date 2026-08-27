"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Search, SlidersHorizontal, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { TRANSACTION_TYPES, CATEGORIES } from "@/lib/property/enums";
import { DUR, EASE_IN, EASE_OUT, useMotionPrefs } from "@/lib/motion";
import { cn } from "@/lib/utils";

const FILTER_KEYS = ["q", "txn", "cat", "locality"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

/** Text filters round-trip to the server, so they wait for a pause in typing. */
const TYPING_PAUSE_MS = 300;

export function CatalogueFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const m = useMotionPrefs();

  const [pending, startTransition] = React.useTransition();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const current = React.useCallback(
    (k: FilterKey) => params.get(k) ?? "",
    [params],
  );

  // Text inputs are locally controlled so a keystroke is never held up by the
  // network — the URL catches up once typing pauses.
  const [q, setQ] = React.useState(() => current("q"));
  const [locality, setLocality] = React.useState(() => current("locality"));

  // Declared before `commit`, which writes to it. See the sync effect below.
  const echo = React.useRef({ q: params.get("q") ?? "", locality: params.get("locality") ?? "" });

  const commit = React.useCallback(
    (next: Partial<Record<FilterKey, string | null>>) => {
      const p = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (!v) p.delete(k);
        else p.set(k, v);
      }
      if ("q" in next) echo.current.q = next.q ?? "";
      if ("locality" in next) echo.current.locality = next.locality ?? "";
      const qs = p.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [params, pathname, router],
  );

  // Debounce the two free-text filters. Selects commit immediately — a tap is
  // already a deliberate, finished action.
  React.useEffect(() => {
    if (q === current("q")) return;
    const id = setTimeout(() => commit({ q: q || null }), TYPING_PAUSE_MS);
    return () => clearTimeout(id);
  }, [q, current, commit]);

  React.useEffect(() => {
    if (locality === current("locality")) return;
    const id = setTimeout(() => commit({ locality: locality || null }), TYPING_PAUSE_MS);
    return () => clearTimeout(id);
  }, [locality, current, commit]);

  /**
   * Pull the URL back into local state — but ONLY when the change came from
   * outside this component (back button, a chip removed, a link).
   *
   * Without the guard, picking a select mid-sentence rewrites the URL, which
   * re-runs this sync and wipes the half-typed search box before its debounce
   * has fired. Tracking what we last wrote lets us tell our own echo apart
   * from a genuine external navigation.
   */
  React.useEffect(() => {
    const urlQ = current("q");
    if (urlQ !== echo.current.q) {
      echo.current.q = urlQ;
      setQ(urlQ);
    }
    const urlLocality = current("locality");
    if (urlLocality !== echo.current.locality) {
      echo.current.locality = urlLocality;
      setLocality(urlLocality);
    }
  }, [current]);

  const active = FILTER_KEYS.filter((k) => current(k));
  const advancedCount = active.filter((k) => k !== "q").length;

  const clearAll = () => {
    echo.current = { q: "", locality: "" };
    setQ("");
    setLocality("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  };

  const chipLabel = (k: FilterKey): string => {
    const v = current(k);
    if (k === "txn") return TRANSACTION_TYPES.find((t) => t.value === v)?.label ?? v;
    if (k === "cat") return CATEGORIES.find((c) => c.value === v)?.label ?? v;
    if (k === "q") return `“${v}”`;
    return v;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ── Bar ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-subtle"
            strokeWidth={1.5}
            aria-hidden
          />
          <label htmlFor="catalogue-search" className="sr-only">
            Search properties
          </label>
          <Input
            id="catalogue-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title or locality"
            className="pl-10"
          />
          <AnimatePresence>
            {pending && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DUR.fast }}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-ink-subtle"
                aria-hidden
              >
                <Loader2 className="size-4 animate-spin" />
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Phone: everything else lives in a sheet with real tap targets. */}
        <Button
          variant="outline"
          size="icon"
          className="relative shrink-0 sm:hidden"
          onClick={() => setSheetOpen(true)}
          aria-label={
            advancedCount ? `Filters, ${advancedCount} applied` : "Filters"
          }
        >
          <SlidersHorizontal />
          {advancedCount > 0 && (
            <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-accent text-xs font-medium text-accent-fg">
              {advancedCount}
            </span>
          )}
        </Button>

        {/* Desktop: inline, no extra tap to reach a filter. */}
        <div className="hidden items-center gap-2 sm:flex">
          <FilterSelect
            label="Deal"
            value={current("txn")}
            onChange={(v) => commit({ txn: v })}
            options={TRANSACTION_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            allLabel="All deals"
          />
          <FilterSelect
            label="Category"
            value={current("cat")}
            onChange={(v) => commit({ cat: v })}
            options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            allLabel="All categories"
          />
          <div className="w-40">
            <label htmlFor="catalogue-locality" className="sr-only">Locality</label>
            <Input
              id="catalogue-locality"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              placeholder="Locality"
            />
          </div>
        </div>
      </div>

      {/* ── Active filters ── */}
      <AnimatePresence initial={false}>
        {active.length > 0 && (
          <motion.div
            key="chips"
            initial={m.animate ? { opacity: 0, height: 0 } : { opacity: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0, transition: { duration: DUR.fast, ease: EASE_IN } }}
            transition={{ duration: DUR.base, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-2">
              {active.map((k) => (
                <motion.button
                  key={k}
                  layout={m.animate}
                  type="button"
                  onClick={() => {
                    if (k === "q") setQ("");
                    if (k === "locality") setLocality("");
                    commit({ [k]: null });
                  }}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-elevated pr-2 pl-3",
                    "text-xs font-medium text-ink shadow-sm",
                    "transition-colors duration-160 ease-out-expo hover:border-line-strong hover:bg-subtle",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  )}
                  aria-label={`Remove filter ${chipLabel(k)}`}
                >
                  {chipLabel(k)}
                  <X className="size-3.5 text-ink-subtle" aria-hidden />
                </motion.button>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className="rounded-sm px-2 text-xs font-medium text-ink-muted underline decoration-line-strong underline-offset-4 transition-colors duration-160 hover:text-ink"
              >
                Clear all
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile sheet ── */}
      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Filters"
        description="Narrow the catalogue. Leave anything unset to include everything."
        footer={
          <div className="flex items-center gap-3">
            <Button variant="ghost" block onClick={clearAll} disabled={active.length === 0}>
              Clear all
            </Button>
            <Button block onClick={() => setSheetOpen(false)}>
              Show results
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-7 pt-1">
          <ChipField
            label="Deal type"
            value={current("txn")}
            onChange={(v) => commit({ txn: v })}
            options={TRANSACTION_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            allLabel="Any"
          />
          <ChipField
            label="Category"
            value={current("cat")}
            onChange={(v) => commit({ cat: v })}
            options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            allLabel="Any"
          />
          <div className="flex flex-col gap-2">
            <label
              htmlFor="sheet-locality"
              className="text-micro uppercase text-ink-muted"
            >
              Locality
            </label>
            <Input
              id="sheet-locality"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              placeholder="e.g. Yelahanka"
            />
          </div>
        </div>
      </Sheet>
    </div>
  );
}

/* ─────────────────────────── pieces ─────────────────────────── */

function FilterSelect({
  label, value, onChange, options, allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string | null) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  const id = `filter-${label.toLowerCase()}`;
  return (
    <>
      <label htmlFor={id} className="sr-only">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn(
          "h-11 rounded-md border bg-elevated px-3 text-sm font-medium shadow-sm",
          "transition-[border-color,box-shadow] duration-160 ease-out-expo",
          "focus:border-accent focus:ring-3 focus:ring-accent/15 focus:outline-none",
          value
            ? "border-accent-line text-ink"
            : "border-line text-ink-muted hover:border-line-strong",
        )}
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </>
  );
}

/** Big tappable chips — never a cramped dropdown on a phone. */
function ChipField({
  label, value, onChange, options, allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string | null) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-micro uppercase text-ink-muted">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {[{ value: "", label: allLabel }, ...options].map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value || "any"}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.value || null)}
              className={cn(
                "inline-flex h-11 items-center rounded-md border px-4 text-sm font-medium",
                "transition-[background-color,border-color,color] duration-160 ease-out-expo",
                "active:scale-97",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                on
                  ? "border-accent bg-accent text-accent-fg shadow-sm"
                  : "border-line bg-elevated text-ink hover:border-line-strong hover:bg-subtle",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
