import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PageHeader } from "@/components/layout/PageHeader";
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
  const coverByProp = new Map<string, PropertyMediaRow>();
  for (const m of (media ?? []) as PropertyMediaRow[]) {
    if (!coverByProp.has(m.property_id) || m.is_cover) coverByProp.set(m.property_id, m);
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Archive"
        title="Closed & parked"
        description="Sold, rented, leased or parked. Nothing here is deleted — reactivate any property at any time."
      />

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-card px-6 py-16 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <Archive className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <p className="mt-5 font-display text-xl">Nothing archived yet</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
            Properties land here the moment a deal closes or you park them.
          </p>
        </div>
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
