import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PropertyCard } from "@/components/property/PropertyCard";
import { CatalogueFilters } from "@/components/property/CatalogueFilters";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { LIVE_STATUSES } from "@/lib/property/enums";
import { Plus, SearchX } from "lucide-react";
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

  const coverByProp = new Map<string, PropertyMediaRow>();
  for (const m of (media ?? []) as PropertyMediaRow[]) {
    if (!coverByProp.has(m.property_id) || m.is_cover) coverByProp.set(m.property_id, m);
  }

  const isFiltered = Boolean(q || txn || cat || locality);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Catalogue"
        title="Live properties"
        description={
          list.length
            ? `${list.length} ${list.length === 1 ? "property" : "properties"} currently on the market.`
            : "Nothing live yet — add your first property to start the catalogue."
        }
        action={
          <Link href="/properties/new">
            <Button size="lg">
              <Plus className="h-4 w-4" /> Add property
            </Button>
          </Link>
        }
      />

      <CatalogueFilters />

      {error && (
        <p className="rounded-md border border-[color:var(--danger)]/25 bg-[color:var(--danger)]/5 px-3 py-2.5 text-sm text-[color:var(--danger)]">
          Couldn&apos;t load properties: {error.message}
        </p>
      )}

      {list.length === 0 ? (
        isFiltered ? <NoMatches /> : <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
          {list.map(p => (
            <PropertyCard key={p.id} p={p} cover={coverByProp.get(p.id) ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong bg-card px-6 py-16 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-foreground text-background">
        <Plus className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h2 className="mt-6 font-display text-2xl leading-tight">Your catalogue is empty</h2>
      <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Add your first property and it stays with you forever — live, negotiating,
        or closed. Nothing is ever deleted.
      </p>
      <Link href="/properties/new" className="mt-7 inline-block">
        <Button size="lg">
          <Plus className="h-4 w-4" /> Add your first property
        </Button>
      </Link>
    </div>
  );
}

function NoMatches() {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong bg-card px-6 py-14 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <p className="mt-5 font-display text-xl">No properties match those filters</p>
      <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
        Try widening the search, or clear the filters above.
      </p>
    </div>
  );
}
