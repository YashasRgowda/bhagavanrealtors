import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RequirementCard } from "@/components/requirement/RequirementCard";
import { type RequirementRow } from "@/lib/requirement/types";
import { LIVE_STATUSES } from "@/lib/property/enums";
import { buyersFor, type MatchProperty, type MatchRequirement } from "@/lib/match/engine";
import { Plus, UserSearch } from "lucide-react";
import type { PropertyRow } from "@/lib/property/types";

export const dynamic = "force-dynamic";

export default async function RequirementsPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: reqs = [] }, { data: props = [] }] = await Promise.all([
    supabase.from("requirements").select("*")
      .order("status", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase.from("properties").select("*").in("status", LIVE_STATUSES as unknown as string[]),
  ]);

  const requirements = (reqs ?? []) as RequirementRow[];
  const properties = (props ?? []) as PropertyRow[];

  // Count live properties waiting for each buyer. Confirmed matches only —
  // anything that could not be verified is never presented as a number here.
  const matchCount = new Map<string, number>();
  for (const r of requirements) {
    let n = 0;
    for (const p of properties) {
      const { matches } = buyersFor(p as MatchProperty, [r as MatchRequirement]);
      if (matches.length) n++;
    }
    matchCount.set(r.id, n);
  }

  const active = requirements.filter(r => r.status === "active");
  const closed = requirements.filter(r => r.status !== "active");

  // Surfaced in the header because it is the one number worth acting on today.
  const withMatches = active.filter(r => (matchCount.get(r.id) ?? 0) > 0).length;

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-micro uppercase text-ink-muted">Buyers</p>
          <h1 className="mt-3 text-h1 text-ink">Requirement register</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            {active.length === 0
              ? "Write down what each buyer wants — the app then tells you the moment a property fits."
              : withMatches > 0
                ? <>
                    <span className="font-medium text-ink">
                      {withMatches} of {active.length}
                    </span>
                    {` ${active.length === 1 ? "buyer has" : "buyers have"} something waiting for them right now.`}
                  </>
                : `${active.length} active ${active.length === 1 ? "buyer" : "buyers"} waiting. Every new property is checked against this list.`}
          </p>
        </div>

        <Link href="/requirements/new" className="hidden shrink-0 sm:block">
          <Button size="lg"><Plus aria-hidden /> Add buyer</Button>
        </Link>
      </header>

      {requirements.length === 0 ? (
        <EmptyState
          icon={<UserSearch className="size-6" strokeWidth={1.75} aria-hidden />}
          title="No buyers on record yet"
          description={
            <>
              You already carry these in your head — &ldquo;2 BHK in Yelahanka under 50
              lakh&rdquo;. Write them down once and never lose one again.
            </>
          }
          action={
            <Link href="/requirements/new">
              <Button size="lg"><Plus aria-hidden /> Add your first buyer</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-10">
          {active.length > 0 && (
            <RequirementGrid rows={active} counts={matchCount} />
          )}

          {closed.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-micro uppercase text-ink-muted">
                  Closed · {closed.length}
                </h2>
                <span className="h-px flex-1 bg-line" aria-hidden />
              </div>
              <RequirementGrid rows={closed} counts={matchCount} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function RequirementGrid({
  rows, counts,
}: {
  rows: RequirementRow[];
  counts: Map<string, number>;
}) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map(r => (
        <li key={r.id}>
          <RequirementCard r={r} matches={counts.get(r.id) ?? 0} />
        </li>
      ))}
    </ul>
  );
}
