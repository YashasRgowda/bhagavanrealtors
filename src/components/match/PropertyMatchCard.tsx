import Link from "next/link";
import { Check, HelpCircle } from "lucide-react";
import { PlateImage } from "@/components/ui/plate-image";
import { Money } from "@/components/ui/money";
import { ImageIcon } from "lucide-react";
import { formatArea } from "@/lib/format/area";
import { PROPERTY_TYPES } from "@/lib/property/enums";
import type { MatchResult } from "@/lib/match/engine";
import type { PropertyRow, PropertyMediaRow } from "@/lib/property/types";
import { cn } from "@/lib/utils";

/**
 * The engine always confirms the deal type first ("Wants to buy"). On a
 * buyer's own page every match is their deal type by definition, so showing it
 * is a chip that tells the dealer nothing. Dropped at display time only — the
 * engine's output is untouched.
 */
const IMPLIED = new Set(["Wants to buy", "Wants to rent", "Wants a lease"]);

export function PropertyMatchCard({
  p,
  cover,
  result,
  needsCheck = false,
}: {
  p: PropertyRow;
  cover: PropertyMediaRow | null;
  result: MatchResult;
  needsCheck?: boolean;
}) {
  const typeLabel =
    (PROPERTY_TYPES[p.category] as ReadonlyArray<{ value: string; label: string }>)
      .find(t => t.value === p.property_type)?.label ?? p.property_type;

  const title = p.title || `${typeLabel} in ${p.locality || p.city || ""}`;
  const specs = [
    typeLabel,
    p.bhk ? (p.bhk === "1RK" ? "1 RK" : `${p.bhk} BHK`) : null,
    p.area_value ? formatArea(p.area_value, p.area_unit) : null,
    p.locality,
  ].filter(Boolean).join(" · ");

  const reasons = result.reasons.filter(r => !IMPLIED.has(r));

  return (
    <Link
      href={`/properties/${p.id}`}
      className={cn(
        "group flex gap-4 rounded-lg border border-line bg-elevated p-3 shadow-sm",
        "transition-[box-shadow,border-color,transform] duration-220 ease-out-expo",
        "hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      )}
    >
      <PlateImage
        src={cover?.thumb_url || cover?.url}
        alt=""
        sizes="112px"
        className="aspect-4/3 w-24 shrink-0 rounded-md sm:w-28"
        fallback={<ImageIcon className="size-5" strokeWidth={1.25} aria-hidden />}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-sm font-semibold tracking-snug text-ink">
            {title}
          </h3>
          <span className="shrink-0 text-h3 text-ink">
            <Money rupees={p.price} suffix={p.transaction_type === "rent" ? "/mo" : undefined} />
          </span>
        </div>

        <p className="line-clamp-1 text-xs text-ink-muted">{specs}</p>

        <ul className="mt-auto flex flex-wrap gap-1.5 pt-1">
          {reasons.map(r => (
            <li
              key={r}
              className="inline-flex items-center gap-1 rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent-text"
            >
              <Check className="size-3 shrink-0" strokeWidth={3} aria-hidden /> {r}
            </li>
          ))}
          {needsCheck && result.gaps.map(g => (
            <li
              key={g}
              className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs text-ink-muted"
            >
              <HelpCircle className="size-3 shrink-0" strokeWidth={2} aria-hidden /> {g}
            </li>
          ))}
        </ul>
      </div>
    </Link>
  );
}
