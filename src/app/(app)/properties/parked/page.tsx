import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CatalogueGrid } from "@/components/property/CatalogueGrid";
import { CatalogueCount } from "@/components/property/CatalogueCount";
import { EmptyState } from "@/components/ui/empty-state";
import { CLOSED_STATUSES } from "@/lib/property/enums";
import { Archive } from "lucide-react";
import type { PropertyRow, PropertyMediaRow } from "@/lib/property/types";

export const dynamic = "force-dynamic";

export default async function ParkedPage() {
  const supabase = await createSupabaseServerClient();
  const { data: properties = [] } = await supabase
    .from("properties")
    .select("*")
    .in("status", CLOSED_STATUSES as unknown as string[])
    .order("closed_at", { ascending: false, nullsFirst: false })
    .limit(60);
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

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <header className="min-w-0">
        <p className="text-micro uppercase text-ink-muted">Archive</p>
        <h1 className="mt-3 text-h1 text-ink">Closed &amp; parked</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          {list.length > 0 ? (
            <>
              <CatalogueCount value={list.length} singular="property" plural="properties" />
              {" sold, rented, leased or parked. Nothing here is deleted — reactivate any of them at any time."}
            </>
          ) : (
            "Sold, rented, leased or parked. Nothing here is deleted — reactivate any property at any time."
          )}
        </p>
      </header>

      {list.length === 0 ? (
        <EmptyState
          icon={<Archive className="size-6" strokeWidth={1.75} aria-hidden />}
          title="Nothing archived yet"
          description="Properties land here the moment a deal closes or you park them."
        />
      ) : (
        <CatalogueGrid items={list} covers={coverByProp} />
      )}
    </div>
  );
}
