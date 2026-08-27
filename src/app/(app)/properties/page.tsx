import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CatalogueGrid } from "@/components/property/CatalogueGrid";
import { CatalogueCount } from "@/components/property/CatalogueCount";
import { CatalogueFilters } from "@/components/property/CatalogueFilters";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LIVE_STATUSES } from "@/lib/property/enums";
import { Plus, SearchX, AlertTriangle, Building2 } from "lucide-react";
import type { PropertyRow, PropertyMediaRow } from "@/lib/property/types";

export const dynamic = "force-dynamic";

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q         = typeof sp.q === "string" ? sp.q : "";
  const txn       = typeof sp.txn === "string" ? sp.txn : "";
  const cat       = typeof sp.cat === "string" ? sp.cat : "";
  const locality  = typeof sp.locality === "string" ? sp.locality : "";

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("properties")
    .select("*")
    .in("status", LIVE_STATUSES as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(60);

  if (txn) query = query.eq("transaction_type", txn);
  if (cat) query = query.eq("category", cat);
  if (locality) query = query.ilike("locality", `%${locality}%`);
  if (q) query = query.or(`title.ilike.%${q}%,locality.ilike.%${q}%,address_text.ilike.%${q}%`);

  const { data: properties = [], error } = await query;
  const list = (properties ?? []) as PropertyRow[];

  const ids = list.map(p => p.id);
  const { data: media = [] } = ids.length
    ? await supabase
        .from("property_media")
        .select("*")
        .in("property_id", ids)
        .order("sort_order", { ascending: true })
    : { data: [] as PropertyMediaRow[] };

  const coverByProp: Record<string, PropertyMediaRow> = {};
  for (const m of (media ?? []) as PropertyMediaRow[]) {
    if (!coverByProp[m.property_id] || m.is_cover) coverByProp[m.property_id] = m;
  }

  const isFiltered = Boolean(q || txn || cat || locality);

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      {/* ── Header ── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-micro uppercase text-ink-muted">Catalogue</p>
          <h1 className="mt-3 text-h1 text-ink">Live properties</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            {list.length > 0 ? (
              <>
                <CatalogueCount value={list.length} singular="property" plural="properties" />
                {isFiltered ? " match your filters." : " currently on the market."}
              </>
            ) : (
              "Nothing live yet — add your first property to start the catalogue."
            )}
          </p>
        </div>

        {/* On a phone the thumb-zone route to the same place is the bottom
            nav's Add tab, so this stays from sm up. */}
        <Link href="/properties/new" className="hidden shrink-0 sm:block">
          <Button size="lg">
            <Plus aria-hidden /> Add property
          </Button>
        </Link>
      </header>

      {/* ── Controls ── */}
      <CatalogueFilters />

      {/* ── Results ── */}
      {error ? (
        <EmptyState
          tone="error"
          icon={<AlertTriangle className="size-6" strokeWidth={1.75} aria-hidden />}
          title="Couldn't load your properties"
          description={error.message}
          action={
            <Link href="/properties">
              <Button variant="outline" size="lg">Try again</Button>
            </Link>
          }
        />
      ) : list.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={<SearchX className="size-6" strokeWidth={1.75} aria-hidden />}
            title="No properties match those filters"
            description="Try widening the search, or clear the filters to see everything that's live."
            action={
              <Link href="/properties">
                <Button variant="outline" size="lg">Clear filters</Button>
              </Link>
            }
          />
        ) : (
          <EmptyState
            icon={<Building2 className="size-6" strokeWidth={1.75} aria-hidden />}
            title="Your catalogue is empty"
            description="Add your first property and it stays with you forever — live, negotiating, or closed. Nothing is ever deleted."
            action={
              <Link href="/properties/new">
                <Button size="lg"><Plus aria-hidden /> Add your first property</Button>
              </Link>
            }
          />
        )
      ) : (
        <CatalogueGrid items={list} covers={coverByProp} />
      )}
    </div>
  );
}
