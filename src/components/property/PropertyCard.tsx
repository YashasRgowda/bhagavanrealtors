"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ImageIcon, Maximize2, BedDouble, MapPin } from "lucide-react";
import { StatusPill } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { PlateImage } from "@/components/ui/plate-image";
import { formatArea } from "@/lib/format/area";
import { STATUS_META, PROPERTY_TYPES } from "@/lib/property/enums";
import { layoutIds, useMotionPrefs } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { PropertyRow, PropertyMediaRow } from "@/lib/property/types";

export function PropertyCard({
  p,
  cover,
  priority = false,
}: {
  p: PropertyRow;
  cover: PropertyMediaRow | null;
  /** True for the first row — those images are above the fold. */
  priority?: boolean;
}) {
  const m = useMotionPrefs();
  const meta = STATUS_META[p.status];

  const typeLabel =
    (PROPERTY_TYPES[p.category] as ReadonlyArray<{ value: string; label: string }>)
      .find((t) => t.value === p.property_type)?.label ?? p.property_type;

  const title = p.title || `${typeLabel} in ${p.locality || p.city || ""}`;
  const bhk = p.bhk ? (p.bhk === "1RK" ? "1 RK" : `${p.bhk} BHK`) : null;
  const priceSuffix = p.transaction_type === "rent" ? "/mo" : undefined;

  return (
    <Link
      href={`/properties/${p.id}`}
      className={cn(
        "group block h-full rounded-lg",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      )}
    >
      <motion.article
        whileTap={m.animate ? { scale: 0.985 } : undefined}
        transition={{ duration: 0.12 }}
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-lg border border-line bg-elevated shadow-sm",
          "transition-[box-shadow,border-color,transform] duration-220 ease-out-expo",
          /* Tailwind v4 already gates `hover:` behind (hover: hover), so this
             lift never fires from a tap on a phone. */
          "group-hover:-translate-y-0.5 group-hover:border-line-strong group-hover:shadow-md",
        )}
      >
        {/* ── Cover ── */}
        <div className="relative">
          <motion.div
            layoutId={m.animate ? layoutIds.propertyImage(p.id) : undefined}
            className="aspect-16/10 w-full overflow-hidden sm:aspect-4/3"
          >
            <PlateImage
              src={cover?.thumb_url || cover?.url}
              alt=""
              priority={priority}
              sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, 100vw"
              className="size-full"
              imgClassName="transition-transform duration-500 ease-out-expo group-hover:scale-103"
              fallback={
                <span className="flex flex-col items-center gap-1.5 text-ink-subtle">
                  <ImageIcon className="size-6" strokeWidth={1.25} aria-hidden />
                  <span className="text-xs">No photo yet</span>
                </span>
              }
            />
          </motion.div>

          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <StatusPill status={p.status} label={meta.label} onPhoto size="sm" />
            {p.is_featured && (
              <span className="inline-flex h-6 items-center rounded-full bg-accent px-2 text-xs font-medium text-accent-fg shadow-sm">
                Hot
              </span>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-sm font-semibold tracking-snug text-ink">
              {title}
            </h3>
            {(p.locality || p.city) && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-muted">
                <MapPin className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
                <span className="truncate">{[p.locality, p.city].filter(Boolean).join(", ")}</span>
              </p>
            )}
          </div>

          {/* Key specs — icons are supporting, every one keeps its label. */}
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            <li className="truncate">{typeLabel}</li>
            {bhk && (
              <li className="flex items-center gap-1">
                <BedDouble className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
                {bhk}
              </li>
            )}
            {p.area_value && (
              <li className="flex items-center gap-1">
                <Maximize2 className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
                {formatArea(p.area_value, p.area_unit)}
              </li>
            )}
          </ul>

          <div className="mt-auto flex items-baseline justify-between gap-2 border-t border-line-subtle pt-3">
            {p.price ? (
              <Money
                rupees={p.price}
                suffix={priceSuffix}
                className="text-h3 text-ink"
              />
            ) : (
              <span className="text-sm font-medium text-ink-muted">On request</span>
            )}
            {p.is_negotiable && p.transaction_type === "sale" && (
              <span className="text-xs text-ink-subtle">Negotiable</span>
            )}
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
