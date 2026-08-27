"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormGrid, FormSection } from "@/components/ui/form";
import { CATEGORIES, PROPERTY_TYPES, TRANSACTION_TYPES, BHK_OPTIONS, SOURCES } from "@/lib/property/enums";
import { AREA_UNITS } from "@/lib/format/area";
import { formatINRShort } from "@/lib/format/currency";
import { isIndianPhoneLenient } from "@/lib/format/phone";
import { URGENCY_META, type RequirementRow, type Urgency } from "@/lib/requirement/types";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";

type Draft = {
  buyer_name: string;
  buyer_phone: string;
  buyer_alt_phone: string;
  source: string;
  notes: string;
  transaction_type: "sale" | "rent" | "lease";
  categories: string[];
  property_types: string[];
  bhk_min: string;
  bhk_max: string;
  budget_min: string;
  budget_max: string;
  area_min: string;
  area_max: string;
  area_unit: string;
  localities: string[];
  city: string;
  urgency: Urgency;
};

const empty: Draft = {
  buyer_name: "", buyer_phone: "", buyer_alt_phone: "", source: "walkin", notes: "",
  transaction_type: "sale", categories: [], property_types: [],
  bhk_min: "", bhk_max: "", budget_min: "", budget_max: "",
  area_min: "", area_max: "", area_unit: "sqft",
  localities: [], city: "Bengaluru", urgency: "soon",
};

const digits = (s: string) => s.replace(/\D/g, "");
const num = (s: string) => (s.trim() === "" ? null : Number(digits(s)));
const dec = (s: string) => (s.trim() === "" ? null : Number(s.replace(/[^\d.]/g, "")));

/** Multi-select rendered as ink chips — same language as the rest of the app. */
function ChipGroup({
  options, selected, onToggle,
}: {
  options: ReadonlyArray<{ value: string; label: string }>;
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            aria-pressed={on}
            className={cn(
              "rounded-full border px-3.5 py-2 text-[0.8125rem] transition-all duration-200",
              on
                ? "border-foreground bg-foreground font-medium text-background"
                : "border-border bg-card hover:border-foreground/35 hover:bg-muted/40",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function RequirementForm({ existing }: { existing?: RequirementRow }) {
  const router = useRouter();
  const [d, setD] = useState<Draft>(() =>
    existing
      ? {
          buyer_name: existing.buyer_name ?? "",
          buyer_phone: existing.buyer_phone ?? "",
          buyer_alt_phone: existing.buyer_alt_phone ?? "",
          source: existing.source ?? "walkin",
          notes: existing.notes ?? "",
          transaction_type: existing.transaction_type,
          categories: existing.categories ?? [],
          property_types: existing.property_types ?? [],
          bhk_min: existing.bhk_min ?? "",
          bhk_max: existing.bhk_max ?? "",
          budget_min: existing.budget_min?.toString() ?? "",
          budget_max: existing.budget_max?.toString() ?? "",
          area_min: existing.area_min?.toString() ?? "",
          area_max: existing.area_max?.toString() ?? "",
          area_unit: existing.area_unit ?? "sqft",
          localities: existing.localities ?? [],
          city: existing.city ?? "Bengaluru",
          urgency: existing.urgency ?? "soon",
        }
      : empty,
  );
  const [localityDraft, setLocalityDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (patch: Partial<Draft>) => setD(prev => ({ ...prev, ...patch }));

  const typeChoices = useMemo(() => {
    const cats = d.categories.length ? d.categories : CATEGORIES.map(c => c.value);
    return cats.flatMap(c =>
      (PROPERTY_TYPES[c as keyof typeof PROPERTY_TYPES] as ReadonlyArray<{
        value: string; label: string; rentOnly?: boolean; saleOnly?: boolean;
      }>).filter(t => {
        if (d.transaction_type === "sale" && t.rentOnly) return false;
        if (d.transaction_type !== "sale" && t.saleOnly) return false;
        return true;
      }),
    );
  }, [d.categories, d.transaction_type]);

  function toggle(key: "categories" | "property_types", v: string) {
    setD(prev => {
      const list = prev[key];
      const next = list.includes(v) ? list.filter(x => x !== v) : [...list, v];
      // Narrowing categories must not leave orphaned types selected.
      if (key === "categories") {
        const allowed = new Set(
          (next.length ? next : CATEGORIES.map(c => c.value)).flatMap(c =>
            (PROPERTY_TYPES[c as keyof typeof PROPERTY_TYPES] as ReadonlyArray<{ value: string }>)
              .map(t => t.value),
          ),
        );
        return { ...prev, categories: next, property_types: prev.property_types.filter(t => allowed.has(t)) };
      }
      return { ...prev, [key]: next };
    });
  }

  function addLocality() {
    const v = localityDraft.trim();
    if (!v) return;
    if (!d.localities.some(x => x.toLowerCase() === v.toLowerCase())) {
      set({ localities: [...d.localities, v] });
    }
    setLocalityDraft("");
  }

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!d.buyer_name.trim()) e.push("Buyer name is required");
    if (d.buyer_phone && !isIndianPhoneLenient(d.buyer_phone)) e.push("Buyer phone doesn't look valid");
    const bmin = num(d.budget_min), bmax = num(d.budget_max);
    if (bmin !== null && bmax !== null && bmin > bmax) e.push("Minimum budget is higher than the maximum");
    const amin = dec(d.area_min), amax = dec(d.area_max);
    if (amin !== null && amax !== null && amin > amax) e.push("Minimum area is larger than the maximum");
    const rank = (b: string) => BHK_OPTIONS.indexOf(b as (typeof BHK_OPTIONS)[number]);
    if (d.bhk_min && d.bhk_max && rank(d.bhk_min) > rank(d.bhk_max)) e.push("Minimum BHK is higher than the maximum");
    return e;
  }, [d]);

  async function save() {
    setBusy(true); setErr(null);
    try {
      const payload = {
        buyer_name: d.buyer_name.trim(),
        buyer_phone: d.buyer_phone.trim() || null,
        buyer_alt_phone: d.buyer_alt_phone.trim() || null,
        source: d.source || null,
        notes: d.notes.trim() || null,
        transaction_type: d.transaction_type,
        categories: d.categories,
        property_types: d.property_types,
        bhk_min: d.bhk_min || null,
        bhk_max: d.bhk_max || null,
        budget_min: num(d.budget_min),
        budget_max: num(d.budget_max),
        area_min: dec(d.area_min),
        area_max: dec(d.area_max),
        area_unit: d.area_unit || "sqft",
        localities: d.localities,
        city: d.city.trim() || null,
        urgency: d.urgency,
      };
      const res = await fetch(
        existing ? `/api/requirements/${existing.id}` : "/api/requirements",
        {
          method: existing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error((await res.text()) || "Save failed");
      const { id } = await res.json();
      router.replace(`/requirements/${existing?.id ?? id}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  const showBhk = d.categories.length === 0 || d.categories.includes("residential");

  return (
    <div className="space-y-6 pb-24">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="eyebrow">The buyer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <FormGrid>
            <Field label="Name" required>
              <Input value={d.buyer_name} onChange={e => set({ buyer_name: e.target.value })} placeholder="e.g. Suresh Reddy" />
            </Field>
            <Field label="Phone" hint="So you can call them the moment something matches.">
              <Input inputMode="tel" value={d.buyer_phone} onChange={e => set({ buyer_phone: e.target.value })} placeholder="10-digit mobile" />
            </Field>
            <Field label="Alt phone">
              <Input inputMode="tel" value={d.buyer_alt_phone} onChange={e => set({ buyer_alt_phone: e.target.value })} />
            </Field>
            <Field label="How you met them">
              <Select value={d.source} onChange={e => set({ source: e.target.value })}>
                {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </Field>
          </FormGrid>

          <Field label="How soon">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(URGENCY_META) as Urgency[]).map(u => {
                const on = d.urgency === u;
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => set({ urgency: u })}
                    className={cn(
                      "rounded-lg border px-3.5 py-2.5 text-left transition-all duration-200",
                      on ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/35",
                    )}
                  >
                    <span className="block text-[0.8125rem] font-medium">{URGENCY_META[u].label}</span>
                    <span className={cn("mt-0.5 block text-[0.6875rem]", on ? "text-background/60" : "text-muted-foreground")}>
                      {URGENCY_META[u].blurb}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="eyebrow">What they want</CardTitle>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Leave anything blank to mean &ldquo;no preference&rdquo; — blank never narrows the search.
          </p>
        </CardHeader>
        <CardContent className="space-y-7">
          <FormSection title="Deal type">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {TRANSACTION_TYPES.map(t => {
                const on = d.transaction_type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set({ transaction_type: t.value, property_types: [] })}
                    className={cn(
                      "rounded-lg border p-3.5 text-left transition-all duration-200",
                      on ? "border-foreground bg-foreground text-background shadow-sm" : "border-border bg-card hover:border-foreground/35 hover:bg-muted/40",
                    )}
                  >
                    <span className="font-display text-lg leading-tight">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </FormSection>

          <FormSection title="Category" description="Pick none to search every category.">
            <ChipGroup options={CATEGORIES} selected={d.categories} onToggle={v => toggle("categories", v)} />
          </FormSection>

          <FormSection title="Property type" description="Pick none to allow any type in those categories.">
            <ChipGroup options={typeChoices} selected={d.property_types} onToggle={v => toggle("property_types", v)} />
          </FormSection>

          <FormSection title="Budget" description={d.transaction_type === "rent" ? "Monthly rent." : "Total price."}>
            <FormGrid>
              <Field label="Minimum (₹)">
                <Input inputMode="numeric" value={d.budget_min} onChange={e => set({ budget_min: digits(e.target.value) })} placeholder="No minimum" />
                {num(d.budget_min) ? <p className="mt-1 text-xs text-muted-foreground">{formatINRShort(num(d.budget_min)!)}</p> : null}
              </Field>
              <Field label="Maximum (₹)">
                <Input inputMode="numeric" value={d.budget_max} onChange={e => set({ budget_max: digits(e.target.value) })} placeholder="No maximum" />
                {num(d.budget_max) ? <p className="mt-1 text-xs text-muted-foreground">{formatINRShort(num(d.budget_max)!)}</p> : null}
              </Field>
            </FormGrid>
          </FormSection>

          <FormSection title="Size" description="Units are converted automatically when matching.">
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
              <Field label="Minimum area"><Input inputMode="decimal" value={d.area_min} onChange={e => set({ area_min: e.target.value })} placeholder="Any" /></Field>
              <Field label="Maximum area"><Input inputMode="decimal" value={d.area_max} onChange={e => set({ area_max: e.target.value })} placeholder="Any" /></Field>
              <Field label="Unit">
                <Select value={d.area_unit} onChange={e => set({ area_unit: e.target.value })}>
                  {AREA_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </Select>
              </Field>
            </div>
          </FormSection>

          {showBhk && (
            <FormSection title="Bedrooms">
              <FormGrid>
                <Field label="At least">
                  <Select value={d.bhk_min} onChange={e => set({ bhk_min: e.target.value })}>
                    <option value="">Any</option>
                    {BHK_OPTIONS.map(b => <option key={b} value={b}>{b === "1RK" ? "1 RK" : `${b} BHK`}</option>)}
                  </Select>
                </Field>
                <Field label="At most">
                  <Select value={d.bhk_max} onChange={e => set({ bhk_max: e.target.value })}>
                    <option value="">Any</option>
                    {BHK_OPTIONS.map(b => <option key={b} value={b}>{b === "1RK" ? "1 RK" : `${b} BHK`}</option>)}
                  </Select>
                </Field>
              </FormGrid>
            </FormSection>
          )}

          <FormSection title="Where" description="Add every area they'd accept. No areas means anywhere.">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={localityDraft}
                  onChange={e => setLocalityDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addLocality(); }
                  }}
                  placeholder="Type an area and press Enter — e.g. Yelahanka"
                />
                <Button type="button" variant="outline" onClick={addLocality} className="shrink-0">Add</Button>
              </div>
              {d.localities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {d.localities.map(l => (
                    <span key={l} className="inline-flex items-center gap-1.5 rounded-full border border-foreground bg-foreground px-3 py-1.5 text-[0.8125rem] font-medium text-background">
                      {l}
                      <button
                        type="button"
                        onClick={() => set({ localities: d.localities.filter(x => x !== l) })}
                        aria-label={`Remove ${l}`}
                        className="opacity-60 transition-opacity hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <Field label="City"><Input value={d.city} onChange={e => set({ city: e.target.value })} /></Field>
            </div>
          </FormSection>

          <FormSection title="Notes">
            <Textarea rows={3} value={d.notes} onChange={e => set({ notes: e.target.value })} placeholder="Anything else — school nearby, vaastu, floor preference…" />
          </FormSection>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <div className="rounded-lg border border-[color:var(--danger)]/25 bg-[color:var(--danger)]/5 p-4 text-sm">
          <p className="font-medium text-[color:var(--danger)]">Fix these before saving</p>
          <ul className="mt-2 space-y-1 text-[color:var(--danger)]/85">
            {errors.map(e => <li key={e}>· {e}</li>)}
          </ul>
        </div>
      )}
      {err && (
        <p className="rounded-md border border-[color:var(--danger)]/25 bg-[color:var(--danger)]/5 px-3 py-2.5 text-sm text-[color:var(--danger)]">{err}</p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl pb-safe md:pb-0">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-3.5">
          <Link
            href={existing ? `/requirements/${existing.id}` : "/requirements"}
            className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Discard
          </Link>
          <Button size="lg" onClick={save} disabled={busy || errors.length > 0}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {existing ? "Save changes" : "Add requirement"}
          </Button>
        </div>
      </div>
    </div>
  );
}
