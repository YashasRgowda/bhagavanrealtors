import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatINRShort } from "@/lib/format/currency";
import { formatArea } from "@/lib/format/area";
import { STATUS_META, PROPERTY_TYPES } from "@/lib/property/enums";
import { ImageIcon } from "lucide-react";
import type { PropertyRow, PropertyMediaRow } from "@/lib/property/types";

export function PropertyCard({ p, cover }: { p: PropertyRow; cover: PropertyMediaRow | null }) {
  const meta = STATUS_META[p.status];
  const typeLabel = (() => {
    const list = PROPERTY_TYPES[p.category] as ReadonlyArray<{ value: string; label: string }>;
    return list.find(t => t.value === p.property_type)?.label ?? p.property_type;
  })();

  const priceLabel = (() => {
    if (!p.price) return "On request";
    if (p.transaction_type === "rent") return formatINRShort(p.price);
    if (p.transaction_type === "lease") return formatINRShort(p.price);
    return formatINRShort(p.price);
  })();
  const priceSuffix =
    p.transaction_type === "rent" ? "/mo" : p.transaction_type === "lease" ? " lease" : "";

  const subtitle = [
    typeLabel,
    p.bhk ? (p.bhk === "1RK" ? "1 RK" : `${p.bhk} BHK`) : null,
    p.locality || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/properties/${p.id}`}
      className="lift group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xs hover:border-border-strong hover:shadow-md"
    >
      {/* ─── Cover ─── */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {cover?.thumb_url || cover?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.thumb_url || cover.url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.045]"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-faint">
            <ImageIcon className="h-7 w-7" strokeWidth={1.25} />
          </div>
        )}

        {/* Legibility scrim under the status chip */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/25 to-transparent opacity-70"
        />

        <div className="absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
          <Badge variant={meta.variant}>{meta.label}</Badge>
          {p.is_featured && (
            <span className="rounded-full bg-white/95 px-2 py-1 text-[0.625rem] font-semibold uppercase leading-none tracking-[0.09em] text-[#0a0a0a] shadow-2xs">
              Hot
            </span>
          )}
        </div>
      </div>

      {/* ─── Body ─── */}
      <div className="flex flex-1 flex-col p-3.5">
        <p className="line-clamp-1 text-[0.8125rem] font-semibold leading-snug tracking-[-0.012em]">
          {p.title || `${typeLabel} in ${p.locality || p.city || ""}`}
        </p>
        <p className="mt-1 line-clamp-1 text-[0.6875rem] leading-snug text-muted-foreground">
          {subtitle}
        </p>

        <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-border pt-3">
          <span className="tabular font-display text-[1.0625rem] leading-none">
            {priceLabel}
            {priceSuffix && (
              <span className="ml-0.5 font-sans text-[0.625rem] font-medium tracking-normal text-muted-foreground">
                {priceSuffix}
              </span>
            )}
          </span>
          {p.area_value ? (
            <span className="tabular shrink-0 text-[0.6875rem] text-muted-foreground">
              {formatArea(p.area_value, p.area_unit)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
