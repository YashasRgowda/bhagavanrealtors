import Link from "next/link";
import { Check, HelpCircle, MessageCircle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPhoneIN, normalizeIndianMobile } from "@/lib/format/phone";
import { budgetLabel } from "@/lib/requirement/summary";
import { URGENCY_META, type RequirementRow } from "@/lib/requirement/types";
import type { MatchResult } from "@/lib/match/engine";
import { cn } from "@/lib/utils";

/**
 * The engine confirms the deal type first ("Wants to buy"). Beside a property
 * of that exact deal type it tells the dealer nothing, so it is dropped at
 * display time. The engine's output is untouched.
 */
const IMPLIED = new Set(["Wants to buy", "Wants to rent", "Wants a lease"]);

function initials(name: string): string {
  const words = name.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w.charAt(0)));
  return words.slice(0, 2).map(w => w.charAt(0).toUpperCase()).join("") || "?";
}

/**
 * One buyer who matches this property, with the reasons spelled out.
 *
 * The reasons are not decoration — they are how the dealer trusts the result.
 * A match he cannot explain is a match he will not act on.
 */
export function BuyerMatchRow({
  requirement, result, propertyTitle, needsCheck = false,
}: {
  requirement: RequirementRow;
  result: MatchResult;
  propertyTitle: string;
  needsCheck?: boolean;
}) {
  const phone = requirement.buyer_phone;
  const digits = phone ? normalizeIndianMobile(phone) : "";
  const wa = digits.length === 10 ? `91${digits}` : digits;
  const message = `Hi ${requirement.buyer_name}, I have a property that fits what you're looking for: ${propertyTitle}. Shall I share the details?`;
  const budget = budgetLabel(requirement);
  const reasons = result.reasons.filter(r => !IMPLIED.has(r));

  return (
    <div className="relative flex gap-3.5 rounded-lg border border-line bg-elevated p-4 shadow-sm transition-[border-color,box-shadow] duration-220 ease-out-expo hover:border-line-strong hover:shadow-md">
      <span
        className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-subtle text-sm font-semibold text-accent-text"
        aria-hidden
      >
        {initials(requirement.buyer_name)}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <Link
              href={`/requirements/${requirement.id}`}
              className="stretch-target rounded-sm text-sm font-semibold tracking-snug text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {requirement.buyer_name}
            </Link>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
              {phone && <span>{formatPhoneIN(phone)}</span>}
              {budget && <span className="text-ink-subtle">·</span>}
              {budget && <span>{budget}</span>}
            </p>
          </div>

          <div className="relative z-10 flex shrink-0 items-center gap-1.5">
            {requirement.urgency === "immediate" && !needsCheck && (
              <Badge tone="warning" size="sm">{URGENCY_META.immediate.label}</Badge>
            )}
            {phone && (
              <>
                <a
                  href={`tel:${digits}`}
                  aria-label={`Call ${requirement.buyer_name}`}
                  className="grid size-10 place-items-center rounded-md border border-line bg-elevated text-ink transition-colors duration-160 pointer-coarse:size-11 hover:border-line-strong hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Phone className="size-4" aria-hidden />
                </a>
                <a
                  href={`https://wa.me/${wa}?text=${encodeURIComponent(message)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`WhatsApp ${requirement.buyer_name}`}
                  className="grid size-10 place-items-center rounded-md border border-line bg-elevated text-ink transition-colors duration-160 pointer-coarse:size-11 hover:border-line-strong hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <MessageCircle className="size-4" aria-hidden />
                </a>
              </>
            )}
          </div>
        </div>

        <ul className={cn("flex flex-wrap gap-1.5", !reasons.length && !result.gaps.length && "hidden")}>
          {reasons.map(r => (
            <li
              key={r}
              className="inline-flex items-center gap-1 rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent-text"
            >
              <Check className="size-3 shrink-0" strokeWidth={3} aria-hidden /> {r}
            </li>
          ))}
          {result.gaps.map(g => (
            <li
              key={g}
              className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs text-ink-muted"
            >
              <HelpCircle className="size-3 shrink-0" strokeWidth={2} aria-hidden /> {g}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
