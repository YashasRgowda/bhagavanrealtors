import Link from "next/link";
import {
  ArrowRight, BedDouble, Building2, MapPin, Maximize2, MessageCircle, Phone,
} from "lucide-react";
import { Badge, StatusPill } from "@/components/ui/badge";
import { areaLabel, bhkLabel, budgetLabel, typeLabel } from "@/lib/requirement/summary";
import { formatPhoneIN, normalizeIndianMobile } from "@/lib/format/phone";
import { REQUIREMENT_STATUS_META, URGENCY_META, type RequirementRow } from "@/lib/requirement/types";
import { cn } from "@/lib/utils";

/** "Deepa Nair" → DN · "Anitha & Vinay" → AV */
function initials(name: string): string {
  const words = name.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w.charAt(0)));
  return words.slice(0, 2).map(w => w.charAt(0).toUpperCase()).join("") || "?";
}

/**
 * One buyer on the register.
 *
 * Composed around the two questions a dealer actually asks: what is their
 * budget, and is there anything to call them about? Budget gets the display
 * treatment because it is money and it is the field every decision turns on —
 * previously it sat in a grey pill indistinguishable from "Flat / Apartment".
 * The match count is the only other thing that earns colour.
 */
export function RequirementCard({
  r,
  matches,
}: {
  r: RequirementRow;
  /** Confirmed live properties matching this requirement. */
  matches: number;
}) {
  const budget = budgetLabel(r);
  const closed = r.status !== "active";
  const digits = r.buyer_phone ? normalizeIndianMobile(r.buyer_phone) : "";
  const wa = digits.length === 10 ? `91${digits}` : digits;

  const specs = [
    { icon: BedDouble, text: bhkLabel(r) },
    { icon: Maximize2, text: areaLabel(r) },
    { icon: Building2, text: typeLabel(r) },
  ].filter((s): s is { icon: typeof BedDouble; text: string } => Boolean(s.text));

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-lg border border-line bg-elevated p-5 shadow-sm",
        "transition-[box-shadow,border-color,transform] duration-220 ease-out-expo",
        "hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md",
        "focus-within:border-line-strong",
        closed && "opacity-70",
      )}
    >
      {/* ── Identity ── */}
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold",
            closed ? "bg-inset text-ink-muted" : "bg-accent-subtle text-accent-text",
          )}
          aria-hidden
        >
          {initials(r.buyer_name)}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-h3 text-ink">
            <Link
              href={`/requirements/${r.id}`}
              className="stretch-target rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {r.buyer_name}
            </Link>
          </h3>
          {r.buyer_phone && (
            <p className="mt-0.5 truncate text-sm text-ink-muted">
              {formatPhoneIN(r.buyer_phone)}
            </p>
          )}
        </div>

        <div className="shrink-0">
          {closed ? (
            <StatusPill
              status={r.status === "fulfilled" ? "sold" : "parked"}
              label={REQUIREMENT_STATUS_META[r.status].label}
              size="sm"
            />
          ) : r.urgency === "immediate" ? (
            <Badge tone="warning" size="sm">{URGENCY_META.immediate.label}</Badge>
          ) : null}
        </div>
      </div>

      {/* ── What they want ── */}
      <div className="mt-4 mb-5 flex flex-col gap-2">
        {budget ? (
          <p className="text-h2 text-ink">{budget}</p>
        ) : (
          <p className="text-sm text-ink-subtle">No budget set</p>
        )}

        {specs.length > 0 && (
          <ul className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-sm text-ink-muted">
            {specs.map(({ icon: Icon, text }) => (
              <li key={text} className="flex min-w-0 items-center gap-1.5">
                <Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
                <span className="truncate">{text}</span>
              </li>
            ))}
          </ul>
        )}

        {r.localities.length > 0 && (
          <p className="flex items-start gap-1.5 text-sm text-ink-muted">
            <MapPin className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden />
            <span className="line-clamp-1">{r.localities.join(", ")}</span>
          </p>
        )}

        {r.notes && (
          <p className="line-clamp-1 text-sm text-ink-subtle">{r.notes}</p>
        )}
      </div>

      {/* ── The reason to act ── */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line-subtle pt-4">
        {matches > 0 ? (
          <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
            <span className="size-2 shrink-0 rounded-full bg-accent" aria-hidden />
            <span className="truncate">
              {matches} {matches === 1 ? "property matches" : "properties match"}
            </span>
          </p>
        ) : (
          <p className="truncate text-sm text-ink-subtle">No matches yet</p>
        )}

        {/* Sits above the stretched link so these stay real controls. */}
        <div className="relative z-10 flex shrink-0 items-center gap-1.5">
          {r.buyer_phone && !closed && (
            <>
              <a
                href={`tel:${digits}`}
                aria-label={`Call ${r.buyer_name}`}
                className="grid size-10 place-items-center rounded-md border border-line bg-elevated text-ink transition-colors duration-160 pointer-coarse:size-11 hover:border-line-strong hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Phone className="size-4" aria-hidden />
              </a>
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`WhatsApp ${r.buyer_name}`}
                className="grid size-10 place-items-center rounded-md border border-line bg-elevated text-ink transition-colors duration-160 pointer-coarse:size-11 hover:border-line-strong hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <MessageCircle className="size-4" aria-hidden />
              </a>
            </>
          )}
          <ArrowRight
            className="size-4 text-ink-subtle transition-transform duration-220 ease-out-expo group-hover:translate-x-0.5"
            aria-hidden
          />
        </div>
      </div>
    </article>
  );
}
