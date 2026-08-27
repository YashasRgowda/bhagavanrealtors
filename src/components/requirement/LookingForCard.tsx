import { BedDouble, Building2, MapPin, Maximize2, StickyNote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { areaLabel, bhkLabel, budgetLabel, typeLabel } from "@/lib/requirement/summary";
import { TRANSACTION_TYPES } from "@/lib/property/enums";
import type { RequirementRow } from "@/lib/requirement/types";

/**
 * "What they want", stated once and stated plainly.
 *
 * Mirrors the register card so the same buyer looks the same in both places:
 * budget carries the display weight, everything else is a labelled spec. The
 * previous page reduced all of this to a grey subtitle — "Under ₹1 Cr · 2 BHK+"
 * — which buried the only figure the dealer actually negotiates on.
 */
export function LookingForCard({ r }: { r: RequirementRow }) {
  const budget = budgetLabel(r);
  const deal = TRANSACTION_TYPES.find(t => t.value === r.transaction_type)?.label ?? r.transaction_type;

  const specs = [
    { icon: BedDouble, label: "Bedrooms", value: bhkLabel(r) },
    { icon: Maximize2, label: "Size",     value: areaLabel(r) },
    { icon: Building2, label: "Type",     value: typeLabel(r) },
    { icon: MapPin,    label: "Where",    value: r.localities.length ? r.localities.join(", ") : r.city },
  ].filter((s): s is { icon: typeof MapPin; label: string; value: string } => Boolean(s.value));

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-micro uppercase text-ink-muted">Looking for</h2>
        <span className="text-sm text-ink-muted">{deal}</span>
      </div>

      <p className="mt-3 text-display text-ink">
        {budget ?? <span className="text-h2 text-ink-subtle">No budget set</span>}
      </p>

      {specs.length > 0 && (
        <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-line-subtle pt-5 sm:grid-cols-4">
          {specs.map(({ icon: Icon, label, value }) => (
            <div key={label} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-micro uppercase text-ink-muted">
                <Icon className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
                {label}
              </dt>
              <dd className="mt-1.5 truncate text-sm font-medium text-ink" title={value}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {r.notes && (
        <p className="mt-5 flex items-start gap-2 border-t border-line-subtle pt-5 text-sm text-ink-muted">
          <StickyNote className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          <span className="whitespace-pre-line">{r.notes}</span>
        </p>
      )}
    </Card>
  );
}
