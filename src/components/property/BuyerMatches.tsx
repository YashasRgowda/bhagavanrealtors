import Link from "next/link";
import { UserSearch } from "lucide-react";
import { BuyerMatchRow } from "@/components/match/MatchList";
import { buyersFor, type MatchProperty, type MatchRequirement } from "@/lib/match/engine";
import type { RequirementRow } from "@/lib/requirement/types";
import type { PropertyRow } from "@/lib/property/types";

/**
 * "Who is waiting for exactly this."
 *
 * Confirmed and unverifiable matches stay in separate blocks and the headline
 * count only ever counts confirmed, so the number can be trusted. The prose
 * that used to explain each block is gone — the section labels and a single
 * short line carry it.
 */
export function BuyerMatches({
  prop, requirements, title,
}: {
  prop: PropertyRow;
  requirements: RequirementRow[];
  title: string;
}) {
  const { matches, needsCheck } = buyersFor(
    prop as MatchProperty,
    requirements as MatchRequirement[],
  );

  if (matches.length === 0 && needsCheck.length === 0) {
    return (
      <section className="flex flex-col gap-4">
        <SectionHead label="Buyers waiting" count={0} />
        <div className="rounded-lg border border-dashed border-line-strong bg-elevated px-5 py-10 text-center">
          <UserSearch className="mx-auto size-5 text-ink-subtle" strokeWidth={1.75} aria-hidden />
          <p className="mt-3 text-sm text-ink-muted">
            No buyer on your register is looking for this yet.
          </p>
          <Link
            href="/requirements/new"
            className="mt-2 inline-block text-sm font-medium text-accent-text underline decoration-accent-line underline-offset-4 hover:decoration-accent"
          >
            Add a buyer
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      {matches.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionHead label="Buyers waiting" count={matches.length} />
          <ul className="flex flex-col gap-3">
            {matches.map(({ requirement, result }) => (
              <li key={requirement.id}>
                <BuyerMatchRow
                  requirement={requirement as RequirementRow}
                  result={result}
                  propertyTitle={title}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {needsCheck.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionHead
            label="Possibly interested"
            count={needsCheck.length}
            note="This listing is missing a detail they asked about"
          />
          <ul className="flex flex-col gap-3">
            {needsCheck.map(({ requirement, result }) => (
              <li key={requirement.id}>
                <BuyerMatchRow
                  requirement={requirement as RequirementRow}
                  result={result}
                  propertyTitle={title}
                  needsCheck
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function SectionHead({ label, count, note }: { label: string; count: number; note?: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 className="text-micro uppercase text-ink-muted">
        {label}{count > 0 ? ` · ${count}` : ""}
      </h2>
      <span className="h-px flex-1 bg-line" aria-hidden />
      {note && <span className="text-xs text-ink-subtle">{note}</span>}
    </div>
  );
}
